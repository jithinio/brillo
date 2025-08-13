// Emergency recovery endpoint for Polar subscription data
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncPolarSubscription, POLAR_PRODUCT_IDS } from '@/lib/polar-client'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email required' }, { status: 400 })
    }

    logger.info('🚨 Recovery mode activated for user', { userId, email })

    // Get user profile
    let profile
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        profile = data
      }
    }

    // Get user email if not provided
    let userEmail = email
    if (!userEmail && profile) {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.id)
      userEmail = authUser?.email
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'Unable to determine user email' }, { status: 400 })
    }

    logger.info('🔍 Attempting to recover subscription for email:', userEmail)

    // Try to sync subscription by email
    const polarSubscription = await syncPolarSubscription(userEmail)

    if (!polarSubscription) {
      logger.warn('❌ No subscription found for email:', userEmail)
      return NextResponse.json({ 
        error: 'No subscription found',
        details: 'No active Polar subscription found for this email'
      }, { status: 404 })
    }

    logger.info('✅ Found subscription!', {
      subscriptionId: polarSubscription.subscriptionId,
      customerId: polarSubscription.customerId,
      productId: polarSubscription.productId,
      status: polarSubscription.status
    })

    // Map product ID to plan ID
    let planId = 'free'
    if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
      planId = 'pro_monthly'
    } else if (polarSubscription.productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
      planId = 'pro_yearly'
    }

    // Get the user ID to update
    const targetUserId = profile?.id || userId
    if (!targetUserId) {
      // Try to find user by email
      const { data: userData } = await supabase.auth.admin.listUsers()
      const user = userData?.users?.find(u => u.email === userEmail)
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      profile = { id: user.id }
    }

    // Update profile with recovered subscription data
    const { error: updateError } = await supabase
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
      .eq('id', profile.id || targetUserId)

    if (updateError) {
      logger.error('❌ Failed to update profile:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: updateError.message
      }, { status: 500 })
    }

    logger.info('🎉 Successfully recovered subscription data!', {
      userId: profile.id || targetUserId,
      customerId: polarSubscription.customerId,
      subscriptionId: polarSubscription.subscriptionId,
      planId
    })

    return NextResponse.json({ 
      success: true,
      message: 'Subscription data recovered successfully',
      recovered: {
        userId: profile.id || targetUserId,
        email: userEmail,
        customerId: polarSubscription.customerId,
        subscriptionId: polarSubscription.subscriptionId,
        planId,
        status: polarSubscription.status
      }
    })

  } catch (error) {
    logger.error('Recovery error:', error)
    return NextResponse.json({ 
      error: 'Recovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
