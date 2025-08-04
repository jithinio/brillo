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

    // Test Polar connectivity first
    try {
      // Quick connectivity test
      await polar.organizations.get({ id: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID! })
    } catch (connectivityError: any) {
      console.error('❌ Polar connectivity test failed:', connectivityError)
      
      // Handle specific error cases
      if (connectivityError.statusCode === 401 || 
          (connectivityError.message && connectivityError.message.includes('invalid_token'))) {
        return NextResponse.json({ 
          error: 'Subscription services temporarily unavailable',
          details: 'Our billing system is currently under maintenance. Please try again later.',
          code: 'POLAR_UNAVAILABLE'
        }, { status: 503 })
      }
      
      // For other errors, continue but log them
      console.warn('⚠️ Polar connectivity issue, continuing with request...')
    }

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

        const activeSubscription = subscriptions.result?.items?.find((sub: any) => 
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
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: error && typeof error === 'object' && 'statusCode' in error ? (error as any).statusCode : undefined,
      body: error && typeof error === 'object' && 'body' in error ? (error as any).body : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCustomerPortal(profile: any, polar: any) {
  let customerId = profile.polar_customer_id

  try {
    // If no customer ID exists, create one automatically
    if (!customerId) {
      console.log('🔍 No customer ID found, creating new customer for user:', profile.id)
      
      // Create supabase client to update profile
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Get user's email for customer creation
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) {
        console.error('❌ No email found for user:', profile.id)
        return NextResponse.json({ error: 'User email not found' }, { status: 400 })
      }

      try {
        // Import the customer creation function
        const { createOrGetCustomer } = await import('@/lib/polar-client')
        
        // Create customer in Polar
        const customer = await createOrGetCustomer(
          user.email, 
          profile.full_name || profile.first_name || user.email.split('@')[0]
        )

        if (!customer) {
          console.error('❌ Failed to create customer for email:', user.email)
          return NextResponse.json({ error: 'Unable to create customer account' }, { status: 500 })
        }

        customerId = customer.id
        console.log('✅ Created new customer:', customerId)

        // Update profile with new customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ polar_customer_id: customerId })
          .eq('id', profile.id)

        if (updateError) {
          console.error('❌ Failed to update profile with customer ID:', updateError)
          // Continue anyway since customer was created
        } else {
          console.log('✅ Updated profile with customer ID:', customerId)
        }

      } catch (customerError) {
        console.error('❌ Customer creation failed:', customerError)
        return NextResponse.json({ 
          error: 'Unable to create customer account',
          details: customerError instanceof Error ? customerError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    console.log('🔍 Creating customer portal session for customer:', customerId)

    // First, verify the customer exists
    try {
      const customer = await polar.customers.get({
        id: customerId
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
        customerId: customerId,
        details: customerError instanceof Error ? customerError.message : 'Unknown error'
      }, { status: 404 })
    }

    // Create customer portal session using the latest SDK method
    const returnUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings?tab=subscription`
    console.log('🔍 Using return URL:', returnUrl)
    
    const portalSession = await polar.customerSessions.create({
      customerId: customerId,
      returnUrl: returnUrl
    })

    console.log('✅ Portal session created successfully:', {
      portalSession,
      url: portalSession?.customerPortalUrl,
      customerId: customerId
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
    if (error && typeof error === 'object' && 'response' in error) {
      const errorResponse = error.response as any
      console.error('❌ Response error:', {
        status: errorResponse?.status,
        statusText: errorResponse?.statusText,
        data: errorResponse?.data
      })
    }
    
    console.error('❌ Error details:', {
      name: error && typeof error === 'object' && 'name' in error ? (error as any).name : undefined,
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: error && typeof error === 'object' && 'statusCode' in error ? (error as any).statusCode : undefined,
      body: error && typeof error === 'object' && 'body' in error ? (error as any).body : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      customerId: customerId
    })
    
    return NextResponse.json({ 
      error: 'Failed to create customer portal session',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error && typeof error === 'object' && 'name' in error ? (error as any).name : 'UnknownError'
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

        const activeSubscription = subscriptions.result?.items?.find((sub: any) => 
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