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
  if (!profile.polar_customer_id) {
    return NextResponse.json({ error: 'No customer found' }, { status: 404 })
  }

  try {
    // With the NextJS adapter, we'll redirect to the portal endpoint
    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const portalUrl = `${baseUrl}/api/polar/portal`

    return NextResponse.json({ portalUrl })

  } catch (error) {
    logger.error('Failed to create portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
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
