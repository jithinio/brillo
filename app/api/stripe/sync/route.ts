// Stripe subscription sync endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createStripeClient } from '@/lib/stripe-client'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 =================== STRIPE SYNC STARTED ===================')
    console.log('🔄 Request URL:', request.url)
    console.log('🔄 Request method:', request.method)
    console.log('🔄 Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Get authentication header
    const authHeader = request.headers.get('authorization')
    console.log('🔄 Auth header present:', !!authHeader)
    console.log('🔄 Auth header (first 50 chars):', authHeader?.substring(0, 50))
    
    if (!authHeader) {
      console.error('❌ No authorization header')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'No authorization header provided',
        synced: false
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Check authentication using the service role client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed',
        message: authError?.message || 'Invalid token'
      }, { status: 401 })
    }

    console.log('🔍 Syncing subscription for user:', user.id, user.email)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return NextResponse.json({ 
        error: 'User profile not found',
        message: 'Your user profile could not be found in the database',
        synced: false
      }, { status: 404 })
    }

    let stripe: any
    try {
      stripe = createStripeClient()
    } catch (error) {
      console.error('❌ Failed to create Stripe client:', error)
      return NextResponse.json({
        error: 'Stripe configuration error',
        message: 'Failed to initialize Stripe client. Please check configuration.',
        synced: false
      }, { status: 500 })
    }
    
    // Try to find the customer in Stripe
    let stripeCustomer: Stripe.Customer | null = null
    
    try {
      // Method 1: Check if we have a stored customer ID
      if (profile.stripe_customer_id) {
        try {
          console.log('🔍 Checking stored customer ID:', profile.stripe_customer_id)
          stripeCustomer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer
          console.log('✅ Found customer by stored ID:', stripeCustomer.id)
        } catch (error) {
          console.log('⚠️ Stored customer ID invalid, will search by email')
          stripeCustomer = null
        }
      }

      // Method 2: Search by email if customer not found
      if (!stripeCustomer && user.email) {
        try {
          console.log('🔍 Searching for customer by email:', user.email)
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 10  // Increase limit to check multiple matches
          })
          
          if (customers.data.length > 0) {
            // Try to find exact email match first
            const exactMatch = customers.data.find(c => c.email === user.email)
            stripeCustomer = exactMatch || customers.data[0]
            console.log('✅ Found customer by email:', stripeCustomer.id)
          } else {
            console.log('ℹ️ No customer found by email in Stripe')
          }
        } catch (emailSearchError: any) {
          console.log('⚠️ Email search failed:', emailSearchError.message)
          // Continue to next method or treat as no customer found
        }
      }
    } catch (stripeError: any) {
      console.error('❌ Stripe API error during customer search:', stripeError)
      
      // If it's a search unavailable error, treat as "no customer found"
      if (stripeError.message && stripeError.message.includes('search feature is temporarily unavailable')) {
        console.log('🔍 Stripe search unavailable in region, treating as no customer found')
        return NextResponse.json({
          synced: false,
          message: "No subscription found. You haven't subscribed to any plan yet.",
          error: null
        })
      }
      
      // For other Stripe API errors, return a more generic error
      return NextResponse.json({
        error: 'Stripe API error',
        message: 'Unable to verify subscription status. Please try again later.',
        details: stripeError.message,
        synced: false
      }, { status: 500 })
    }

    if (!stripeCustomer) {
      console.log('ℹ️ No customer found in Stripe')
      return NextResponse.json({
        synced: false,
        message: "No subscription found. You haven't subscribed to any plan yet.",
        error: null
      })
    }

    console.log('🔍 Fetching subscriptions for customer:', stripeCustomer.id)
    
    let subscriptions: any
    try {
      // Get all subscriptions for this customer
      subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomer.id,
        status: 'all', // Include active, past_due, canceled, etc.
        limit: 10
      })

      console.log(`📋 Found ${subscriptions.data.length} subscription(s)`)
    } catch (stripeError: any) {
      console.error('❌ Stripe API error during subscription fetch:', stripeError)
      return NextResponse.json({
        error: 'Stripe API error',
        message: 'Failed to fetch subscriptions from Stripe. Please try again later.',
        details: stripeError.message,
        synced: false
      }, { status: 500 })
    }

    // Find the most recent active or past_due subscription
    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active' || sub.status === 'past_due'
    )

    if (!activeSubscription) {
      // Check if there are any subscriptions at all
      if (subscriptions.data.length === 0) {
        console.log('ℹ️ No subscriptions found for customer')
        return NextResponse.json({
          synced: false,
          message: "No subscription found. You haven't subscribed to any plan yet.",
          error: null
        })
      } else {
        console.log('ℹ️ Found subscriptions but none are active')
        const mostRecentSub = subscriptions.data[0]
        console.log('📋 Most recent subscription status:', mostRecentSub.status)
        
        return NextResponse.json({
          synced: false,
          message: `No active subscription found. Your last subscription status was: ${mostRecentSub.status}`,
          error: null
        })
      }
    }

    console.log('✅ Found active subscription:', activeSubscription.id)
    console.log('📋 Subscription details:', {
      id: activeSubscription.id,
      status: activeSubscription.status,
      priceId: activeSubscription.items.data[0]?.price.id,
      currentPeriodStart: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end
    })

    // Get the price ID and determine plan
    const priceId = activeSubscription.items.data[0]?.price.id
    let planId = 'free'
    
    if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
      planId = 'pro_monthly'
    } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
      planId = 'pro_yearly'
    }

    console.log('📋 Mapped plan ID:', planId)

    // Update the user profile with complete Stripe data
    const updateData = {
      stripe_customer_id: stripeCustomer.id,
      stripe_subscription_id: activeSubscription.id,
      stripe_price_id: priceId,
      subscription_status: activeSubscription.status,
      subscription_plan_id: planId,
      subscription_current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: activeSubscription.cancel_at_period_end || false
    }

    console.log('💾 Updating profile with:', updateData)

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update subscription data',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Profile updated successfully')

    // Log the sync event for tracking
    try {
      await supabase.from('subscription_events').insert({
        user_id: user.id,
        event_type: 'manual_sync_stripe',
        to_plan_id: planId,
        subscription_id: activeSubscription.id,
        customer_id: stripeCustomer.id,
        metadata: { 
          sync_method: 'stripe_api',
          subscription_status: activeSubscription.status,
          price_id: priceId,
          cancel_at_period_end: activeSubscription.cancel_at_period_end
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to log sync event:', logError)
      // Don't fail the entire sync for logging issues
    }

    console.log('🎉 =================== STRIPE SYNC COMPLETED ===================')

    return NextResponse.json({
      synced: true,
      customerId: stripeCustomer.id,
      subscriptionId: activeSubscription.id,
      planId: planId,
      status: activeSubscription.status,
      message: planId !== 'free' 
        ? `Successfully synced your ${planId.replace('_', ' ')} subscription!`
        : "Subscription data synced successfully!"
    })

  } catch (error) {
    console.error('💥 Stripe sync error:', error)
    
    return NextResponse.json({
      error: 'Failed to sync subscription data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
