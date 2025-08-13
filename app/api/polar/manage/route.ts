// Polar subscription management route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  createPolarClient, 
  cancelPolarSubscription, 
  updatePolarSubscription,
  createCustomerPortalSession 
} from '@/lib/polar-client'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const polar = createPolarClient()

    switch (action) {
      case 'cancel':
        return await handleCancelSubscription(profile, polar)
      
      case 'resume':
        return await handleResumeSubscription(profile, polar)
        
      case 'portal':
        return await handleCustomerPortal(profile, polar)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Subscription management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    )
  }
}

async function handleCancelSubscription(profile: any, polar: any) {
  if (!profile.polar_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  try {
    // Cancel subscription at period end
    await updatePolarSubscription(profile.polar_subscription_id, true)

    // Update local database
    await supabase
      .from('profiles')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    logger.info('Subscription set to cancel', { 
      userId: profile.id,
      subscriptionId: profile.polar_subscription_id 
    }, 'SUBSCRIPTION')

    return NextResponse.json({ 
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    })

  } catch (error) {
    logger.error('Failed to cancel subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

async function handleCustomerPortal(profile: any, polar: any) {
  try {
    // Check if user has a polar_customer_id
    if (!profile.polar_customer_id || !profile.polar_subscription_id) {
      logger.warn('Missing Polar IDs for user, attempting auto-sync', { 
        userId: profile.id,
        hasCustomerId: !!profile.polar_customer_id,
        hasSubscriptionId: !!profile.polar_subscription_id
      })
      
      // Try to sync subscription data automatically
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.id)
        
        if (authUser?.email) {
          logger.info('Attempting to sync Polar subscription by email:', authUser.email)
          
          // Import and use syncPolarSubscription
          const { syncPolarSubscription, POLAR_PRODUCT_IDS } = await import('@/lib/polar-client')
          const polarSubscription = await syncPolarSubscription(authUser.email)
          
          if (polarSubscription && polarSubscription.customerId) {
            // Map product ID to plan ID
            let planId = 'free'
            if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
              planId = 'pro_monthly'
            } else if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
              planId = 'pro_yearly'
            }
            
            // Update profile with found subscription data
            await supabase
              .from('profiles')
              .update({
                polar_customer_id: polarSubscription.customerId,
                subscription_plan_id: planId,
                subscription_status: polarSubscription.status,
                polar_subscription_id: polarSubscription.subscriptionId,
                subscription_current_period_end: polarSubscription.currentPeriodEnd,
                cancel_at_period_end: polarSubscription.cancelAtPeriodEnd,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.id)
            
            logger.info('Auto-synced Polar subscription data', { 
              userId: profile.id,
              customerId: polarSubscription.customerId,
              subscriptionId: polarSubscription.subscriptionId
            })
            
            // Update profile object for this request
            profile.polar_customer_id = polarSubscription.customerId
            profile.polar_subscription_id = polarSubscription.subscriptionId
          } else {
            // No subscription found
            return NextResponse.json({ 
              error: 'No active subscription found',
              details: 'You need an active subscription to access the billing portal.',
              suggestion: 'Please subscribe to a plan first.'
            }, { status: 404 })
          }
        } else {
          return NextResponse.json({ 
            error: 'No customer account found',
            details: 'Unable to retrieve account information.'
          }, { status: 404 })
        }
      } catch (syncError) {
        logger.error('Failed to auto-sync subscription:', syncError)
        return NextResponse.json({ 
          error: 'No customer account found',
          details: 'Failed to sync subscription data. Please try syncing manually from Settings.',
          suggestion: 'Go to Settings → Subscription → Click "Sync Data"'
        }, { status: 404 })
      }
    }

    // Use the NextJS adapter portal endpoint with proper customer ID
    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const portalUrl = `${baseUrl}/api/polar/portal?customer_id=${encodeURIComponent(profile.polar_customer_id)}`
    
    logger.info('Generated portal URL for customer', { 
      userId: profile.id, 
      customerId: profile.polar_customer_id,
      portalUrl 
    })

    return NextResponse.json({ 
      portalUrl,
      message: 'Opening billing portal...',
      success: true 
    })

  } catch (error) {
    logger.error('Failed to create portal session:', error)
    return NextResponse.json({
      error: 'Failed to create billing portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleResumeSubscription(profile: any, polar: any) {
  if (!profile.polar_subscription_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  if (!profile.cancel_at_period_end) {
    return NextResponse.json({ error: 'Subscription is not set to cancel' }, { status: 400 })
  }

  try {
    // Resume subscription (remove cancel at period end)
    await updatePolarSubscription(profile.polar_subscription_id, false)

    // Update local database
    await supabase
      .from('profiles')
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    logger.info('Subscription resumed', { 
      userId: profile.id,
      subscriptionId: profile.polar_subscription_id 
    }, 'SUBSCRIPTION')

    return NextResponse.json({ 
      success: true,
      message: 'Subscription has been resumed'
    })

  } catch (error) {
    logger.error('Failed to resume subscription:', error)
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    )
  }
}
