// Unified Subscription Sync Endpoint (Polar only)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncPolarSubscription, POLAR_PRODUCT_IDS } from '@/lib/polar-client'
import { logger } from '@/lib/logger'
import { emitSynced, emitFailed } from '@/lib/subscription-events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, recovery = false } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    logger.info('🔄 Unified subscription sync started', { userId, recovery })

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

    // Check Polar configuration
    const { POLAR_CONFIG } = await import('@/lib/config/environment')
    if (!POLAR_CONFIG.isConfigured) {
      logger.warn('Polar is not configured')
      return NextResponse.json({ 
        error: 'Payment provider not configured',
        synced: false
      }, { status: 503 })
    }

    // Try to sync by customer ID or email
    let polarSubscription = null
    
    if (profile.polar_customer_id) {
      // Sync by customer ID
      polarSubscription = await syncPolarSubscription(profile.polar_customer_id)
    } else {
      // Try to sync by email
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
      
      if (authUser?.email) {
        logger.info('Attempting sync by email:', authUser.email)
        polarSubscription = await syncPolarSubscription(authUser.email)
      }
    }

    if (polarSubscription) {
      // Map product ID to plan ID
      let planId = 'free'
      if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
        planId = 'pro_monthly'
      } else if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
        planId = 'pro_yearly'
      }

      // Update profile with subscription data
      const updateData = {
        subscription_plan_id: planId,
        subscription_status: polarSubscription.status,
        polar_customer_id: polarSubscription.customerId || profile.polar_customer_id,
        polar_subscription_id: polarSubscription.subscriptionId,
        subscription_current_period_end: polarSubscription.currentPeriodEnd,
        cancel_at_period_end: polarSubscription.cancelAtPeriodEnd,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      logger.info('✅ Subscription synced successfully', { 
        userId, 
        planId,
        status: polarSubscription.status
      }, 'SUBSCRIPTION')

      // Emit sync event
      await emitSynced(userId, {
        planId,
        status: polarSubscription.status,
        customerId: polarSubscription.customerId,
        subscriptionId: polarSubscription.subscriptionId,
        currentPeriodEnd: polarSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd
      })

      // Log to subscription history
      await logSubscriptionEvent(userId, 'synced', profile.subscription_plan_id, planId, {
        subscriptionId: polarSubscription.subscriptionId,
        recovery
      })

      return NextResponse.json({ 
        success: true,
        synced: true,
        message: `Subscription synced successfully`,
        subscription: {
          planId,
          status: polarSubscription.status,
          currentPeriodEnd: polarSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd
        }
      })
    } else {
      // No subscription found
      if (!recovery && profile.subscription_plan_id && profile.subscription_plan_id !== 'free') {
        // Don't clear pro subscription on first sync failure
        logger.warn('⚠️ Sync failed but preserving existing pro subscription', { userId })
        
        return NextResponse.json({ 
          warning: 'Sync inconclusive',
          message: 'Unable to verify subscription. Existing access preserved.',
          preserved: true,
          currentPlan: profile.subscription_plan_id,
          synced: false
        })
      }

      // Clear subscription data
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

      await emitSynced(userId, {
        planId: 'free',
        status: 'inactive'
      })

      return NextResponse.json({ 
        success: true,
        synced: true,
        message: 'No active subscription found',
        subscription: {
          planId: 'free',
          status: 'inactive'
        }
      })
    }
  } catch (error: any) {
    logger.error('Sync error:', error)
    
    // Emit failure event
    await emitFailed(
      request.json().then(data => data.userId).catch(() => 'unknown'),
      error
    )

    return NextResponse.json({
      error: 'Internal server error',
      details: error.message || 'Unknown error',
      synced: false
    }, { status: 500 })
  }
}

// Helper function to log subscription events
async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  fromPlanId: string | null,
  toPlanId: string,
  metadata: any = {}
) {
  try {
    // Check if subscription_events table exists
    const { error } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        from_plan_id: fromPlanId || 'free',
        to_plan_id: toPlanId,
        provider: 'polar',
        metadata
      })

    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist
      logger.error('Failed to log subscription event:', error)
    }
  } catch (error) {
    // Silently fail if logging doesn't work
    logger.debug('Subscription event logging failed:', error)
  }
}
