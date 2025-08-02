// Polar subscription management API route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPolarClient } from '@/lib/polar-client'

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
    console.log('🔍 Received action:', action)

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔍 User profile:', {
      userId: user.id,
      hasProfile: !!profile,
      polarCustomerId: profile?.polar_customer_id,
      polarSubscriptionId: profile?.polar_subscription_id
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const polar = createPolarClient()

    switch (action) {
      case 'cancel':
        console.log('🔍 Handling cancel subscription')
        return await handleCancelSubscription(profile, polar)
      
      case 'portal':
        console.log('🔍 Handling customer portal')
        return await handleCustomerPortal(profile, polar)
      
      case 'resume':
        console.log('🔍 Handling resume subscription')
        return await handleResumeSubscription(profile, polar)
      
      default:
        console.log('❌ Invalid action received:', action)
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

async function handleCancelSubscription(profile: any, polar: any) {
  try {
    let subscriptionId = profile.polar_subscription_id

    // If we don't have a subscription ID, try to fetch it from Polar
    if (!subscriptionId && profile.polar_customer_id) {
      try {
        console.log('🔍 Fetching subscription ID from Polar for cancellation')
        const subscriptions = await polar.subscriptions.list({
          customerId: profile.polar_customer_id,
          limit: 10
        })

        const activeSubscription = subscriptions.result?.items?.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        )

        if (activeSubscription) {
          subscriptionId = activeSubscription.id
          console.log('✅ Found subscription ID for cancellation:', subscriptionId)
        }
      } catch (error) {
        console.error('❌ Failed to fetch subscription from Polar:', error)
      }
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    console.log('🔍 Cancelling subscription:', subscriptionId)

    // Use the latest SDK method for subscription cancellation
    await polar.subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true // Cancel at the end of current period
      }
    })

    return NextResponse.json({ 
      message: 'Subscription will be cancelled at the end of the current billing period',
      success: true 
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    })
    return NextResponse.json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCustomerPortal(profile: any, polar: any) {
  try {
    if (!profile.polar_customer_id) {
      console.error('❌ No customer ID found in profile:', profile)
      return NextResponse.json({ error: 'No customer account found' }, { status: 404 })
    }

    console.log('🔍 Creating customer portal session for customer:', profile.polar_customer_id)

    // First, verify the customer exists
    try {
      const customer = await polar.customers.get({
        id: profile.polar_customer_id
      })
      console.log('✅ Customer found:', {
        id: customer.id,
        email: customer.email,
        name: customer.name
      })
    } catch (customerError) {
      console.error('❌ Customer not found:', customerError)
      return NextResponse.json({ 
        error: 'Customer not found in Polar',
        customerId: profile.polar_customer_id,
        details: customerError.message
      }, { status: 404 })
    }

    // Create customer portal session using the latest SDK method
    const returnUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings?tab=subscription`
    console.log('🔍 Using return URL:', returnUrl)
    
    const portalSession = await polar.customerSessions.create({
      customerId: profile.polar_customer_id,
      returnUrl: returnUrl
    })

    console.log('✅ Portal session created successfully:', {
      portalSession,
      url: portalSession?.customerPortalUrl,
      customerId: profile.polar_customer_id
    })

    if (!portalSession || !portalSession.customerPortalUrl) {
      console.error('❌ Portal session created but no URL returned:', portalSession)
      return NextResponse.json({ 
        error: 'Portal session created but no URL returned',
        debug: portalSession
      }, { status: 500 })
    }

    return NextResponse.json({ 
      portalUrl: portalSession.customerPortalUrl,
      success: true 
    })

  } catch (error) {
    console.error('❌ Customer portal error:', error)
    
    // Enhanced error logging
    if (error?.response) {
      console.error('❌ Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
    }
    
    console.error('❌ Error details:', {
      name: error?.name,
      message: error?.message,
      statusCode: error?.statusCode,
      body: error?.body,
      stack: error?.stack,
      customerId: profile.polar_customer_id
    })
    
    return NextResponse.json({ 
      error: 'Failed to create customer portal session',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.name || 'UnknownError'
    }, { status: 500 })
  }
}

async function handleResumeSubscription(profile: any, polar: any) {
  try {
    let subscriptionId = profile.polar_subscription_id

    // If we don't have a subscription ID, try to fetch it from Polar
    if (!subscriptionId && profile.polar_customer_id) {
      try {
        console.log('🔍 Fetching subscription ID from Polar for resume')
        const subscriptions = await polar.subscriptions.list({
          customerId: profile.polar_customer_id,
          limit: 10
        })

        const activeSubscription = subscriptions.result?.items?.find(sub => 
          sub.status === 'active' || sub.status === 'trialing' || sub.status === 'canceled'
        )

        if (activeSubscription) {
          subscriptionId = activeSubscription.id
          console.log('✅ Found subscription ID for resume:', subscriptionId)
        }
      } catch (error) {
        console.error('❌ Failed to fetch subscription from Polar:', error)
      }
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    console.log('🔍 Resuming subscription:', subscriptionId)

    await polar.subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        cancelAtPeriodEnd: false // Resume subscription
      }
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