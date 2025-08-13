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

    // If no Polar customer ID, try to find subscription by email
    if (!profile.polar_customer_id) {
      logger.info('No Polar customer ID found, trying email lookup:', userId)
      
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        
        if (authUser?.email) {
          logger.info('Attempting to find Polar subscription by email:', authUser.email)
          
          // Use syncPolarSubscription with email as fallback
          const polarSubscription = await syncPolarSubscription(authUser.email)
          
          if (polarSubscription) {
            // Map product ID to plan ID
            let planId = 'free'
            const { POLAR_PRODUCT_IDS } = await import('@/lib/polar-client')
            
            if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
              planId = 'pro_monthly'
            } else if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
              planId = 'pro_yearly'
            }
            
            // Found subscription by email - update profile with full subscription data
            await supabase
              .from('profiles')
              .update({
                polar_customer_id: polarSubscription.customerId || authUser.email, // Use actual customer ID if available
                subscription_plan_id: planId,
                subscription_status: polarSubscription.status,
                polar_subscription_id: polarSubscription.subscriptionId,
                subscription_current_period_end: polarSubscription.currentPeriodEnd,
                cancel_at_period_end: polarSubscription.cancelAtPeriodEnd,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId)
            
            logger.info('Subscription synced from Polar by email', { 
              userId, 
              email: authUser.email,
              planId,
              status: polarSubscription.status
            }, 'SUBSCRIPTION')
            
            return NextResponse.json({ 
              success: true,
              synced: true,
              message: 'Subscription found and synced by email',
              planId,
              subscription: {
                planId,
                status: polarSubscription.status,
                currentPeriodEnd: polarSubscription.currentPeriodEnd,
                cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd
              }
            })
          }
        }
      } catch (emailSyncError) {
        logger.error('Error syncing by email:', emailSyncError)
      }
      
      // No subscription found - but check if user already has subscription data
      logger.info('No subscription found via sync')
      
      // Check current subscription status before clearing
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('subscription_plan_id, subscription_status, polar_subscription_id')
        .eq('id', userId)
        .single()
      
      // Only clear if user is already on free plan or has no subscription
      if (!currentProfile?.subscription_plan_id || currentProfile.subscription_plan_id === 'free') {
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
          error: 'No subscription found',
          details: 'User has no Polar customer ID and no subscription found by email',
          synced: false
        }, { status: 404 })
      } else {
        // User has existing subscription data - don't clear it!
        logger.warn('⚠️ Sync failed but user has existing subscription data - preserving it', {
          userId,
          currentPlan: currentProfile.subscription_plan_id,
          currentStatus: currentProfile.subscription_status
        })
        
        return NextResponse.json({ 
          error: 'Sync failed but existing subscription preserved',
          details: 'Unable to sync with Polar, but keeping existing subscription data. Contact support if issues persist.',
          preserved: true,
          currentPlan: currentProfile.subscription_plan_id
        }, { status: 404 })
      }
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
            polar_customer_id: polarSubscription.customerId || profile.polar_customer_id, // Update customer ID if returned
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
        // No active subscription found via API
        logger.warn('No active subscription found for customer:', profile.polar_customer_id)
        
        // Check if this is a legitimate cancellation or API issue
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('subscription_plan_id, subscription_status')
          .eq('id', userId)
          .single()
        
        // Only clear if user is already free or this looks like a real cancellation
        if (!currentProfile?.subscription_plan_id || 
            currentProfile.subscription_plan_id === 'free' ||
            currentProfile.subscription_status === 'canceled') {
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
        } else {
          // Preserve existing subscription data
          logger.warn('⚠️ API shows no subscription but user has pro plan - preserving data', {
            userId,
            currentPlan: currentProfile.subscription_plan_id
          })
          
          return NextResponse.json({ 
            warning: 'Subscription sync inconclusive',
            message: 'Polar API returned no active subscription, but existing pro subscription preserved. This may be a temporary issue.',
            preserved: true,
            currentPlan: currentProfile.subscription_plan_id,
            synced: false
          })
        }
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
