// Polar subscription management API route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPolarClient, createOrGetCustomer } from '@/lib/polar-client'

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase configuration')
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

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
      console.error('❌ Authentication failed:', authError?.message)
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
      console.error('❌ Profile not found for user:', user.id)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate Polar configuration before creating client
    if (!process.env.POLAR_ACCESS_TOKEN) {
      console.error('❌ Missing POLAR_ACCESS_TOKEN')
      return NextResponse.json({ 
        error: 'Subscription services not configured',
        details: 'Billing system is not properly configured. Please contact support.',
        code: 'POLAR_NOT_CONFIGURED'
      }, { status: 503 })
    }

    if (!process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID) {
      console.error('❌ Missing NEXT_PUBLIC_POLAR_ORGANIZATION_ID')
      return NextResponse.json({ 
        error: 'Subscription services not configured',
        details: 'Billing system is not properly configured. Please contact support.',
        code: 'POLAR_NOT_CONFIGURED'
      }, { status: 503 })
    }

    let polar
    try {
      polar = createPolarClient()
    } catch (clientError: any) {
      console.error('❌ Failed to create Polar client:', clientError)
      return NextResponse.json({ 
        error: 'Subscription services unavailable',
        details: 'Unable to connect to billing system. Please try again later.',
        code: 'POLAR_CLIENT_ERROR'
      }, { status: 503 })
    }

    // Test Polar connectivity first
    try {
      // Quick connectivity test
      await polar.organizations.get({ id: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID! })
      console.log('✅ Polar connectivity test passed')
    } catch (connectivityError: any) {
      console.error('❌ Polar connectivity test failed:', {
        message: connectivityError.message,
        statusCode: connectivityError.statusCode,
        organizationId: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
      })
      
      // Handle specific error cases
      if (connectivityError.statusCode === 401 || 
          (connectivityError.message && connectivityError.message.includes('invalid_token'))) {
        return NextResponse.json({ 
          error: 'Subscription services temporarily unavailable',
          details: 'Our billing system is currently under maintenance. Please try again later.',
          code: 'POLAR_UNAUTHORIZED'
        }, { status: 503 })
      }
      
      if (connectivityError.statusCode === 404) {
        return NextResponse.json({ 
          error: 'Subscription services misconfigured',
          details: 'Billing system configuration is invalid. Please contact support.',
          code: 'POLAR_ORG_NOT_FOUND'
        }, { status: 503 })
      }
      
      // For other errors, continue but log them
      console.warn('⚠️ Polar connectivity issue, continuing with request...', connectivityError.message)
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

// Helper function to create portal session with multiple fallback strategies
async function createPortalSession(polar: any, customerId?: string, userEmail?: string) {
  const returnUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings?tab=subscription`
  
  console.log('🔍 Starting portal session creation with:', {
    hasCustomerId: !!customerId,
    hasUserEmail: !!userEmail,
    returnUrl: returnUrl
  })
  
  // First, let's try to test if the customerSessions API exists
  console.log('🔍 Testing Polar SDK customer sessions capabilities...')
  console.log('🔍 Available methods on polar object:', Object.keys(polar))
  console.log('🔍 customerSessions available?:', !!polar.customerSessions)
  
  if (polar.customerSessions) {
    console.log('🔍 customerSessions methods:', Object.getOwnPropertyNames(polar.customerSessions))
    
    // Strategy 1: Try with customer ID (the proper way)
    if (customerId) {
      try {
        console.log('🔍 Attempting customerSessions.create with customer ID:', customerId)
        const session = await polar.customerSessions.create({
          customerId: customerId
        })
        
        console.log('🔍 CustomerSessions response:', {
          hasSession: !!session,
          sessionKeys: session ? Object.keys(session) : [],
          hasCustomerPortalUrl_underscore: !!session?.customer_portal_url,
          customerPortalUrl_underscore: session?.customer_portal_url,
          hasCustomerPortalUrl_camelCase: !!session?.customerPortalUrl,
          customerPortalUrl_camelCase: session?.customerPortalUrl,
          fullResponse: JSON.stringify(session, null, 2)
        })
        
        // Check for the proper customer_portal_url property (from API docs)
        if (session?.customer_portal_url) {
          console.log('✅ CustomerSessions API worked! Using customer_portal_url:', session.customer_portal_url)
          return {
            url: session.customer_portal_url,
            message: 'Opening secure customer session portal'
          }
        }
        
        // Also check for camelCase version (in case SDK converts it)
        if (session?.customerPortalUrl) {
          console.log('✅ CustomerSessions API worked! Using customerPortalUrl:', session.customerPortalUrl)
          return {
            url: session.customerPortalUrl,
            message: 'Opening secure customer session portal'
          }
        }
      } catch (apiError: any) {
        console.error('❌ CustomerSessions API with customer ID failed:', {
          message: apiError?.message,
          statusCode: apiError?.statusCode,
          body: apiError?.body
        })
      }
    }
    
    // Strategy 2: Try with email if customer ID failed
    if (userEmail) {
      try {
        console.log('🔍 Attempting customerSessions.create with email:', userEmail)
        const session = await polar.customerSessions.create({
          customerEmail: userEmail
        })
        
        console.log('🔍 CustomerSessions email response:', {
          hasSession: !!session,
          sessionKeys: session ? Object.keys(session) : [],
          hasCustomerPortalUrl: !!session?.customer_portal_url,
          customerPortalUrl: session?.customer_portal_url
        })
        
        if (session?.customer_portal_url) {
          console.log('✅ CustomerSessions API worked with email!')
          return {
            url: session.customer_portal_url,
            message: 'Opening secure customer session portal'
          }
        }
        
        if (session?.customerPortalUrl) {
          console.log('✅ CustomerSessions API worked with email (camelCase)!')
          return {
            url: session.customerPortalUrl,
            message: 'Opening secure customer session portal'
          }
        }
      } catch (apiError: any) {
        console.error('❌ CustomerSessions API with email failed:', {
          message: apiError?.message,
          statusCode: apiError?.statusCode,
          body: apiError?.body
        })
      }
    }
    
    // Strategy 3: Try minimal params as last resort
    try {
      console.log('🔍 Attempting customerSessions.create with minimal parameters...')
      const session = await polar.customerSessions.create({})
      
      console.log('🔍 CustomerSessions minimal response:', {
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : [],
        hasCustomerPortalUrl: !!session?.customer_portal_url,
        customerPortalUrl: session?.customer_portal_url
      })
      
      if (session?.customer_portal_url) {
        console.log('✅ CustomerSessions API worked with minimal params!')
        return {
          url: session.customer_portal_url,
          message: 'Opening customer session portal'
        }
      }
      
      if (session?.customerPortalUrl) {
        console.log('✅ CustomerSessions API worked with minimal params (camelCase)!')
        return {
          url: session.customerPortalUrl,
          message: 'Opening customer session portal'
        }
      }
    } catch (apiError: any) {
      console.error('❌ CustomerSessions API minimal params failed:', {
        message: apiError?.message,
        statusCode: apiError?.statusCode,
        body: apiError?.body
      })
    }
  }
  
  // Use Polar customer portal URL as a working fallback
  try {
    console.log('🔍 Using Polar customer portal URL fallback...')
    
    // Get the organization ID from environment variables
    const organizationId = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
    
    if (!organizationId) {
      throw new Error('Missing NEXT_PUBLIC_POLAR_ORGANIZATION_ID environment variable')
    }
    
    // Get the organization slug from environment variables
    // We need the slug (like "align-labs") not the UUID
    const organizationSlug = process.env.POLAR_ORGANIZATION_SLUG || 'align-labs'
    
    // Construct the proper customer portal URL format
    // Format: https://polar.sh/{org-slug}/portal
    const portalUrl = `https://polar.sh/${organizationSlug}/portal`
    
    console.log('✅ Redirecting to Polar customer portal:', portalUrl)
    return {
      url: portalUrl,
      message: 'Redirecting to customer portal - please log in with your email'
    }
  } catch (error: any) {
    console.error('❌ Customer portal URL construction failed:', error.message)
  }
  
  console.error('❌ All portal creation strategies failed')
  throw new Error('All portal creation strategies failed')
}

async function handleCustomerPortal(profile: any, polar: any) {
  let customerId = profile.polar_customer_id

  try {
    // Create supabase client to get user information
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's email first (needed for all operations)
    const { data: { user }, error: userFetchError } = await supabase.auth.admin.getUserById(profile.id)
    
    if (userFetchError) {
      console.error('❌ Failed to fetch user data:', userFetchError)
      return NextResponse.json({ 
        error: 'Unable to access user information',
        details: 'Failed to retrieve user data from authentication service.'
      }, { status: 500 })
    }
    
    const userEmail = user?.email
    
    console.log('🔍 User information:', {
      hasEmail: !!userEmail,
      email: userEmail,
      hasCustomerId: !!customerId,
      customerId: customerId
    })

    // If no customer ID exists, create one automatically
    if (!customerId && userEmail) {
      console.log('🔍 No customer ID found, creating new customer for user:', profile.id)

      try {
        // Import the customer creation function
        const { createOrGetCustomer } = await import('@/lib/polar-client')
        
        // Create customer in Polar
        const customer = await createOrGetCustomer(
          user.email, 
          profile.full_name || profile.first_name || user.email.split('@')[0]
        )

        if (!customer) {
          console.log('⚠️ Customer creation returned null, this should not happen with the updated logic')
          return NextResponse.json({ 
            error: 'Unable to create customer account',
            details: 'Customer creation returned no result. This may be due to email domain restrictions or billing system limits.'
          }, { status: 500 })
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

      } catch (customerError: any) {
        console.error('❌ Customer creation failed:', {
          message: customerError?.message,
          statusCode: customerError?.statusCode,
          email: user.email,
          stack: customerError?.stack
        })
        
        // Special handling for existing customer that can't be retrieved
        if (customerError?.message && customerError.message.includes('already exists but cannot be retrieved')) {
          console.log('🔄 Customer exists but can\'t be retrieved, will use alternative portal access methods at the end...')
          // Don't return an error here, let it fall through to use the main createPortalSession helper
          // which has the same fallback strategies but in a more robust way
        } else {
          // For other types of errors, return the specific error
          // Provide more specific error messages based on the error type
          let errorMessage = 'Unable to create customer account'
          let details = 'An unexpected error occurred while creating your billing account.'
          
          if (customerError?.message) {
            if (customerError.message.includes('Billing services are currently unavailable')) {
              details = 'Our billing system is temporarily unavailable. Please try again in a few minutes.'
            } else if (customerError.message.includes('not a valid email address')) {
              details = 'Your email address is not accepted by our billing system. Please contact support.'
            } else {
              details = customerError.message
            }
          }
          
          return NextResponse.json({ 
            error: errorMessage,
            details: details
          }, { status: 500 })
        }
      }
    }

    // Use the robust portal creation helper (handles all fallback strategies)
    const portalResult = await createPortalSession(polar, customerId, userEmail)

    return NextResponse.json({ 
      portalUrl: portalResult.url,
      message: portalResult.message,
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
    
    // Provide more user-friendly error messages
    let finalErrorMessage = 'Failed to create customer portal session'
    let finalDetails = error instanceof Error ? error.message : 'Unknown error'
    
    if (error instanceof Error && error.message === 'All portal creation strategies failed') {
      finalErrorMessage = 'Unable to access billing portal'
      finalDetails = 'We are unable to connect you to the billing portal at this time. This may be due to an existing customer account issue. Please contact support for assistance.'
    }
    
    return NextResponse.json({ 
      error: finalErrorMessage,
      details: finalDetails,
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