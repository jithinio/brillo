// Polar subscription management API route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPolarClient } from '@/lib/polar-client'

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
  
  // Strategy 1: Try with customer ID if available
  if (customerId) {
    try {
      console.log('🔍 Attempting portal creation with customer ID:', customerId)
      const portalSession = await polar.customerSessions.create({
        customerId: customerId,
        returnUrl: returnUrl
      })
      
      if (portalSession && portalSession.customerPortalUrl) {
        console.log('✅ Portal session created with customer ID')
        return {
          url: portalSession.customerPortalUrl,
          message: 'Opening billing portal'
        }
      }
    } catch (error: any) {
      console.log('❌ Portal creation with customer ID failed:', error.message)
    }
  }
  
  // Strategy 2: Try with email if available
  if (userEmail) {
    try {
      console.log('🔍 Attempting portal creation with email:', userEmail)
      const portalSession = await polar.customerSessions.create({
        customerEmail: userEmail,
        returnUrl: returnUrl
      })
      
      if (portalSession && portalSession.customerPortalUrl) {
        console.log('✅ Portal session created with email')
        return {
          url: portalSession.customerPortalUrl,
          message: 'Opening billing portal using email authentication'
        }
      }
    } catch (error: any) {
      console.log('❌ Portal creation with email failed:', error.message)
    }
  }
  
  // Strategy 3: Try without any customer identification (guest mode)
  try {
    console.log('🔍 Attempting anonymous portal creation...')
    const portalSession = await polar.customerSessions.create({
      returnUrl: returnUrl
    })
    
    if (portalSession && portalSession.customerPortalUrl) {
      console.log('✅ Anonymous portal session created')
      return {
        url: portalSession.customerPortalUrl,
        message: 'Opening billing portal - please log in with your email'
      }
    }
  } catch (error: any) {
    console.log('❌ Anonymous portal creation failed:', error.message)
  }
  
  throw new Error('All portal creation strategies failed')
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
      const { data: { user }, error: userFetchError } = await supabase.auth.admin.getUserById(profile.id)
      if (userFetchError) {
        console.error('❌ Failed to fetch user data:', userFetchError)
        return NextResponse.json({ 
          error: 'Unable to access user information',
          details: 'Failed to retrieve user data from authentication service.'
        }, { status: 500 })
      }
      
      if (!user?.email) {
        console.error('❌ No email found for user:', profile.id)
        return NextResponse.json({ 
          error: 'User email not found',
          details: 'Customer account requires a valid email address.'
        }, { status: 400 })
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
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Unable to create customer account'
        let details = 'An unexpected error occurred while creating your billing account.'
        
        if (customerError?.message) {
          if (customerError.message.includes('Billing services are currently unavailable')) {
            details = 'Our billing system is temporarily unavailable. Please try again in a few minutes.'
          } else if (customerError.message.includes('already exists but cannot be retrieved')) {
            // Special handling for existing customer that can't be retrieved
            console.log('🔄 Customer exists but can\'t be retrieved, attempting email-based portal access...')
            
            // Try to create portal session with just email (newer Polar API feature)
            try {
              const returnUrl = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings?tab=subscription`
              
              // First try creating session with email instead of customer ID
              const portalSession = await polar.customerSessions.create({
                customerEmail: user.email,
                returnUrl: returnUrl,
              })
              
              if (portalSession && portalSession.customerPortalUrl) {
                console.log('✅ Created email-based portal session successfully')
                return NextResponse.json({ 
                  portalUrl: portalSession.customerPortalUrl,
                  message: 'Opening billing portal using email authentication'
                })
              }
            } catch (emailPortalError: any) {
              console.error('❌ Email-based portal creation failed:', emailPortalError)
              
              // Last resort: try without any customer identification
              try {
                const portalSession = await polar.customerSessions.create({
                  returnUrl: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/dashboard/settings`,
                })
                
                if (portalSession && portalSession.customerPortalUrl) {
                  console.log('✅ Created anonymous portal session successfully')
                  return NextResponse.json({ 
                    portalUrl: portalSession.customerPortalUrl,
                    message: 'Opening billing portal - please log in with your email'
                  })
                }
              } catch (guestError: any) {
                console.error('❌ Anonymous portal creation also failed:', guestError)
              }
            }
            
            details = 'A customer account already exists but is not accessible. Please contact support to resolve this issue.'
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

    console.log('🔍 Creating customer portal session for customer:', customerId)

    // Get user email for fallback portal creation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    const userEmail = user?.email

    // Use the robust portal creation helper
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