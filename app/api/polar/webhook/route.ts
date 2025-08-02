// Polar webhook handler
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPolarWebhook } from '@/lib/polar-client'
import { POLAR_CONFIG } from '@/lib/config/environment'

// Use service role for webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('polar-signature') || ''

    // Verify webhook signature
    if (!verifyPolarWebhook(body, signature, POLAR_CONFIG.webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Polar webhook received:', event.type)

    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data)
        break

      case 'payment.succeeded':
        await handlePaymentSucceeded(event.data)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.data)
        break

      default:
        console.log('Unhandled webhook event:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    console.log('Processing subscription created:', subscription.id)

    // Find user by customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('polar_customer_id', subscription.customerId)
      .single()

    if (!profile) {
      console.error('Profile not found for customer:', subscription.customerId)
      return
    }

    // Determine plan ID based on product
    const planId = subscription.productId === process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
      ? 'pro_monthly'
      : 'pro_yearly'

    const status = planId === 'pro_monthly' ? 'pro_monthly' : 'pro_yearly'

    // Update user subscription
    await supabase
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_plan_id: planId,
        subscription_current_period_start: new Date(subscription.currentPeriodStart),
        subscription_current_period_end: new Date(subscription.currentPeriodEnd),
        polar_subscription_id: subscription.id
      })
      .eq('id', profile.id)

    // Log the event
    await logSubscriptionEvent(
      profile.id,
      'subscribed',
      'free',
      planId,
      subscription.id,
      subscription.customerId
    )

    console.log('Subscription created successfully for user:', profile.id)

  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log('Processing subscription updated:', subscription.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (!profile) {
      console.error('Profile not found for subscription:', subscription.id)
      return
    }

    const oldPlanId = profile.subscription_plan_id
    const newPlanId = subscription.productId === process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
      ? 'pro_monthly'
      : 'pro_yearly'

    const status = newPlanId === 'pro_monthly' ? 'pro_monthly' : 'pro_yearly'

    await supabase
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_plan_id: newPlanId,
        subscription_current_period_start: new Date(subscription.currentPeriodStart),
        subscription_current_period_end: new Date(subscription.currentPeriodEnd)
      })
      .eq('id', profile.id)

    // Log the event
    await logSubscriptionEvent(
      profile.id,
      'updated',
      oldPlanId,
      newPlanId,
      subscription.id,
      subscription.customerId
    )

    console.log('Subscription updated successfully for user:', profile.id)

  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    console.log('Processing subscription cancelled:', subscription.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (!profile) {
      console.error('Profile not found for subscription:', subscription.id)
      return
    }

    const oldPlanId = profile.subscription_plan_id

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_plan_id: 'free',
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        polar_subscription_id: null
      })
      .eq('id', profile.id)

    // Log the event
    await logSubscriptionEvent(
      profile.id,
      'cancelled',
      oldPlanId,
      'free',
      subscription.id,
      subscription.customerId
    )

    console.log('Subscription cancelled successfully for user:', profile.id)

  } catch (error) {
    console.error('Error handling subscription cancelled:', error)
  }
}

async function handlePaymentSucceeded(payment: any) {
  try {
    console.log('Processing payment succeeded:', payment.id)
    
    // Log payment success
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('polar_customer_id', payment.customerId)
      .single()

    if (profile) {
      await logSubscriptionEvent(
        profile.id,
        'payment_succeeded',
        null,
        null,
        payment.subscriptionId,
        payment.customerId,
        { paymentId: payment.id, amount: payment.amount }
      )
    }

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    console.log('Processing payment failed:', payment.id)
    
    // Log payment failure
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('polar_customer_id', payment.customerId)
      .single()

    if (profile) {
      await logSubscriptionEvent(
        profile.id,
        'payment_failed',
        null,
        null,
        payment.subscriptionId,
        payment.customerId,
        { paymentId: payment.id, error: payment.failureReason }
      )
    }

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  fromPlanId?: string | null,
  toPlanId?: string | null,
  subscriptionId?: string | null,
  customerId?: string | null,
  metadata: any = {}
) {
  try {
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        from_plan_id: fromPlanId,
        to_plan_id: toPlanId,
        polar_subscription_id: subscriptionId,
        polar_customer_id: customerId,
        metadata
      })
  } catch (error) {
    console.error('Error logging subscription event:', error)
  }
}