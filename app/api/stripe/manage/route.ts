// Stripe subscription management API route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createStripeClient } from '@/lib/stripe-client'

export async function POST(request: NextRequest) {
  try {
    // Create supabase client with request context for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const stripe = createStripeClient()

    switch (action) {
      case 'cancel':
        return await handleCancelSubscription(profile, stripe)
      
      case 'portal':
        return await handleCustomerPortal(profile, stripe)
      
      case 'resume':
        return await handleResumeSubscription(profile, stripe)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Subscription management error:', error)
    return NextResponse.json({ 
      error: 'Failed to manage subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCancelSubscription(profile: any, stripe: any) {
  try {
    const subscriptionId = profile.stripe_subscription_id

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    return NextResponse.json({ 
      message: 'Subscription will be cancelled at the end of the current billing period',
      success: true 
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCustomerPortal(profile: any, stripe: any) {
  try {
    const customerId = profile.stripe_customer_id

    if (!customerId) {
      return NextResponse.json({ 
        error: 'No customer account found. Please contact support.',
        details: 'You need to have an active or past subscription to access the billing portal.'
      }, { status: 404 })
    }

    const returnUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings?tab=subscription`

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ 
      portalUrl: session.url,
      message: 'Opening billing portal...',
      success: true 
    })

  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json({ 
      error: 'Failed to create billing portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleResumeSubscription(profile: any, stripe: any) {
  try {
    const subscriptionId = profile.stripe_subscription_id

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Resume subscription
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    })

    return NextResponse.json({ 
      message: 'Subscription resumed successfully',
      success: true 
    })

  } catch (error) {
    console.error('Resume subscription error:', error)
    return NextResponse.json({ 
      error: 'Failed to resume subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
