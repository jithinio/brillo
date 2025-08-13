// Polar subscription sync route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncPolarSubscription } from '@/lib/polar-client'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Polar sync endpoint called')
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    logger.info('Syncing Polar subscription for user:', userId)
    
    // Check if Polar is configured
    const { POLAR_CONFIG } = await import('@/lib/config/environment')
    if (!POLAR_CONFIG.isConfigured) {
      logger.warn('Polar is not configured properly')
      return NextResponse.json({ 
        error: 'Payment provider not configured',
        details: 'Polar configuration is missing',
        synced: false
      }, { status: 503 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('User profile not found:', profileError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If no Polar customer ID, user has no subscription
    if (!profile.polar_customer_id) {
      logger.info('No Polar customer ID found, setting to free plan')
      
      await supabase
        .from('profiles')
        .update({
          subscription_plan_id: 'free',
          subscription_status: 'inactive',
          polar_subscription_id: null,
          subscription_current_period_end: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return NextResponse.json({ 
        success: true,
        subscription: {
          planId: 'free',
          status: 'inactive'
        }
      })
    }

    try {
      // Sync subscription from Polar
      console.log('Syncing Polar subscription for customer:', profile.polar_customer_id)
      const polarSubscription = await syncPolarSubscription(profile.polar_customer_id)

      if (polarSubscription) {
        // Map product ID to plan ID
        let planId = 'free'
        const { POLAR_PRODUCT_IDS } = await import('@/lib/polar-client')
        
        if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
          planId = 'pro_monthly'
        } else if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
          planId = 'pro_yearly'
        }

        // Update profile with subscription data
        await supabase
          .from('profiles')
          .update({
            subscription_plan_id: planId,
            subscription_status: polarSubscription.status,
            polar_subscription_id: polarSubscription.subscriptionId,
            subscription_current_period_end: polarSubscription.currentPeriodEnd,
            cancel_at_period_end: polarSubscription.cancelAtPeriodEnd,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        logger.info('Subscription synced from Polar', { 
          userId, 
          planId,
          status: polarSubscription.status
        }, 'SUBSCRIPTION')

        return NextResponse.json({ 
          success: true,
          synced: true,
          message: `Subscription synced successfully`,
          planId,
          subscription: {
            planId,
            status: polarSubscription.status,
            currentPeriodEnd: polarSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd
          }
        })
      } else {
        // No active subscription found
        await supabase
          .from('profiles')
          .update({
            subscription_plan_id: 'free',
            subscription_status: 'inactive',
            polar_subscription_id: null,
            subscription_current_period_end: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        return NextResponse.json({ 
          success: true,
          synced: true,
          message: 'No active subscription found',
          planId: 'free',
          subscription: {
            planId: 'free',
            status: 'inactive'
          }
        })
      }
    } catch (error) {
      logger.error('Failed to sync Polar subscription:', error)
      
      // On error, default to free plan
      await supabase
        .from('profiles')
        .update({
          subscription_plan_id: 'free',
          subscription_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return NextResponse.json({ 
        error: 'Failed to sync subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error('Sync route error:', error)
    logger.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        synced: false
      },
      { status: 500 }
    )
  }
}
