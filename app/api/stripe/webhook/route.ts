// Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStripeWebhook } from '@/lib/stripe-client'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error('Webhook secret not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 401 })
    }

    let event: Stripe.Event

    try {
      event = verifyStripeWebhook(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      logger.error('Webhook signature verification failed', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.stripeLog('Webhook event received', { eventType: event.type })

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info('Unhandled webhook event', { eventType: event.type })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error('Webhook processing error', error)
    return NextResponse.json({
      error: 'Webhook processing failed'
    }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    logger.stripeLog('Subscription created', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer 
    })
    
    const customerId = subscription.customer as string
    let userId = subscription.metadata.userId
    
    if (!userId) {
      logger.warn('No userId found in subscription metadata')
      // Try to find user by customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()
      
      if (!profile) {
        logger.error('Could not find user for customer', { customerId })
        return
      }
      
      userId = profile.id
    }
    
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id
    
    // Map price ID to plan ID
    let planId = 'free'
    if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
      planId = 'pro_monthly'
    } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
      planId = 'pro_yearly'
    }
    
    // Update user profile - but handle "incomplete" status properly
    const subscriptionStatus = subscription.status === 'incomplete' && subscription.latest_invoice
      ? 'incomplete' // Keep as incomplete, will be updated on payment success
      : subscription.status
    
    logger.stripeLog('Setting subscription status', { 
      status: subscriptionStatus, 
      originalStatus: subscription.status 
    })
    
    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        subscription_status: subscriptionStatus,
        subscription_plan_id: planId,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false
      })
      .eq("id", userId)
    
    if (error) {
      logger.error('Failed to update profile on subscription created', error)
      return
    }
    
    logger.stripeLog('Profile updated successfully for subscription creation')
    
    // Log the event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_created',
      from_plan_id: 'free',
      to_plan_id: planId,
      subscription_id: subscription.id,
      customer_id: customerId,
      metadata: { 
        subscription_status: subscription.status,
        price_id: priceId
      }
    })
    
  } catch (error) {
    logger.error('Error in subscription created handler', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    logger.stripeLog('Subscription updated', { subscriptionId: subscription.id })
    
    const customerId = subscription.customer as string
    const userId = subscription.metadata.userId
    
    if (!userId) {
      logger.warn('No userId found in subscription metadata for update')
      return
    }
    
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id
    
    // Map price ID to plan ID
    let planId = 'free'
    if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
      planId = 'pro_monthly'
    } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
      planId = 'pro_yearly'
    }
    
    await supabase
      .from("profiles")
      .update({
        subscription_status: subscription.status,
        subscription_plan_id: planId,
        stripe_price_id: priceId,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq("id", userId)
      
    console.log('✅ Subscription updated for user:', userId)
    
  } catch (error) {
    console.error('❌ Error in subscription updated handler:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('❌ Subscription deleted:', subscription.id)
    
    const userId = subscription.metadata.userId
    
    if (!userId) {
      console.warn('⚠️ No userId found in subscription metadata')
      return
    }
    
    // Reset user to free plan
    await supabase
      .from("profiles")
      .update({
        subscription_status: 'canceled',
        subscription_plan_id: 'free',
        cancel_at_period_end: false,
      })
      .eq("id", userId)
      
    console.log('✅ Subscription deletion processed for user:', userId)
    
    // Log the event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_canceled',
      from_plan_id: subscription.items.data[0]?.price.id === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ? 'pro_monthly' : 'pro_yearly',
      to_plan_id: 'free',
      subscription_id: subscription.id,
      customer_id: subscription.customer as string,
      metadata: { 
        subscription_status: 'canceled'
      }
    })
    
  } catch (error) {
    console.error('❌ Error in subscription deleted handler:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('💰 Payment succeeded:', invoice.id)
    
    if (!invoice.subscription) return // One-time payment, not a subscription
    
    const customerId = invoice.customer as string
    const subscriptionId = invoice.subscription as string
    
    // Find user by customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (profile) {
      // CRITICAL: When payment succeeds, we need to activate the subscription
      // This handles the case where subscription was initially "incomplete"
      console.log('💰 Activating subscription after successful payment for user:', profile.id)
      
      // Get the subscription details from Stripe to update the status
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Get the price ID to determine the plan
      const priceId = subscription.items.data[0]?.price.id
      let planId = 'free'
      if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
        planId = 'pro_monthly'
      } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
        planId = 'pro_yearly'
      }
      
      // Update subscription status to active
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active', // Force to active on successful payment
          subscription_plan_id: planId,
          stripe_subscription_id: subscriptionId,
          subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end
        })
        .eq('id', profile.id)
      
      if (updateError) {
        console.error('❌ Failed to activate subscription after payment:', updateError)
      } else {
        console.log('✅ Subscription activated successfully for user:', profile.id)
      }
      
      // Log payment success event
      await supabase.from('subscription_events').insert({
        user_id: profile.id,
        event_type: 'payment_succeeded',
        subscription_id: subscriptionId,
        customer_id: customerId,
        metadata: { 
          invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          subscription_activated: true
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error in payment succeeded handler:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('💸 Payment failed:', invoice.id)
    
    if (!invoice.subscription) return // One-time payment, not a subscription
    
    const customerId = invoice.customer as string
    const subscriptionId = invoice.subscription as string
    
    // Log payment failure
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (profile) {
      await supabase.from('subscription_events').insert({
        user_id: profile.id,
        event_type: 'payment_failed',
        subscription_id: subscriptionId,
        customer_id: customerId,
        metadata: { 
          invoice_id: invoice.id,
          error: 'Payment failed'
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error in payment failed handler:', error)
  }
}