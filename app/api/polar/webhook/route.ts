// Polar webhook handler using NextJS adapter
import { Webhooks } from "@polar-sh/nextjs"
import { createClient } from '@supabase/supabase-js'
import { mapPolarProductToPlanId } from '@/lib/polar-client'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  
  onSubscriptionCreated: async (data) => {
    await handleSubscriptionCreated(data)
  },
  
  onSubscriptionUpdated: async (data) => {
    await handleSubscriptionUpdated(data)
  },
  
  onSubscriptionCanceled: async (data) => {
    await handleSubscriptionCanceled(data)
  },
  
  onSubscriptionActive: async (data) => {
    await handleSubscriptionUpdated(data)
  },
  
  onCheckoutCreated: async (data) => {
    logger.info('Checkout created', { checkoutId: data.id })
  },
  
  onCheckoutUpdated: async (data) => {
    logger.info('Checkout updated', { checkoutId: data.id, status: data.status })
  },
  
  onOrderCreated: async (data) => {
    await handleOrderCreated(data)
  },
  
  onCustomerCreated: async (data) => {
    logger.info('Customer created', { customerId: data.id })
  },
  
  onCustomerUpdated: async (data) => {
    logger.info('Customer updated', { customerId: data.id })
  },
  
  // This is the key webhook for customer state management
  onCustomerStateChanged: async (data) => {
    await handleCustomerStateChanged(data)
  },
  
  // Catch-all for any unhandled events
  onPayload: async (payload) => {
    logger.info('Unhandled webhook event', { eventType: payload.type })
  }
})

async function handleSubscriptionCreated(subscription: any) {
  try {
    const userId = subscription.metadata?.userId
    if (!userId) {
      logger.warn('No userId in subscription metadata')
      return
    }

    const planId = mapPolarProductToPlanId(subscription.productId)

    await supabase
      .from('profiles')
      .update({
        subscription_plan_id: planId,
        subscription_status: subscription.status,
        polar_customer_id: subscription.customerId,
        polar_subscription_id: subscription.id,
        subscription_current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: subscription.cancelAtPeriodEnd || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    logger.subscriptionLog('Subscription created', { userId, planId, subscriptionId: subscription.id })
  } catch (error) {
    logger.error('Error handling subscription created', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const userId = subscription.metadata?.userId
    if (!userId) {
      // Try to find user by customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('polar_customer_id', subscription.customerId)
        .single()
      
      if (!profile) {
        logger.warn('No user found for subscription update')
        return
      }
      subscription.metadata = { userId: profile.id }
    }

    const planId = mapPolarProductToPlanId(subscription.productId)

    await supabase
      .from('profiles')
      .update({
        subscription_plan_id: planId,
        subscription_status: subscription.status,
        subscription_current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: subscription.cancelAtPeriodEnd || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.metadata.userId)

    logger.subscriptionLog('Subscription updated', { 
      userId: subscription.metadata.userId, 
      planId, 
      status: subscription.status 
    })
  } catch (error) {
    logger.error('Error handling subscription updated', error)
    throw error
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  try {
    const userId = subscription.metadata?.userId
    if (!userId) {
      // Try to find user by customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('polar_customer_id', subscription.customerId)
        .single()
      
      if (!profile) {
        logger.warn('No user found for subscription cancellation')
        return
      }
      subscription.metadata = { userId: profile.id }
    }

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.metadata.userId)

    logger.subscriptionLog('Subscription canceled', { 
      userId: subscription.metadata.userId,
      subscriptionId: subscription.id 
    })
  } catch (error) {
    logger.error('Error handling subscription canceled', error)
    throw error
  }
}

async function handleCheckoutCreated(checkout: any) {
  logger.info('Checkout created', { checkoutId: checkout.id })
}

async function handleCheckoutUpdated(checkout: any) {
  logger.info('Checkout updated', { checkoutId: checkout.id, status: checkout.status })
}

async function handleOrderCreated(order: any) {
  try {
    const userId = order.metadata?.userId
    if (!userId) {
      logger.warn('No userId in order metadata')
      return
    }

    logger.paymentLog('Order created', { 
      userId, 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    })
  } catch (error) {
    logger.error('Error handling order created', error)
    throw error
  }
}

// New handler for customer state changes - this is the recommended way to handle customer data
async function handleCustomerStateChanged(data: any) {
  try {
    const customerId = data.id
    const customerEmail = data.email
    
    // The customer state includes all subscriptions and benefits
    const activeSubscriptions = data.subscriptions?.filter((sub: any) => 
      sub.status === 'active' || sub.status === 'trialing'
    ) || []
    
    // Find user by email or metadata
    let userId = data.metadata?.userId
    
    if (!userId && customerEmail) {
      // Try to find user by email
      const { data: userData } = await supabase.auth.admin.listUsers()
      const user = userData?.users?.find(u => u.email === customerEmail)
      userId = user?.id
    }
    
    if (!userId) {
      logger.warn('No user found for customer state change', { customerId, email: customerEmail })
      return
    }
    
    // Update user profile with the latest customer state
    if (activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0]
      const planId = mapPolarProductToPlanId(subscription.product_id || subscription.productId)
      
      await supabase
        .from('profiles')
        .update({
          subscription_plan_id: planId,
          subscription_status: subscription.status,
          polar_customer_id: customerId,
          polar_subscription_id: subscription.id,
          subscription_current_period_end: subscription.current_period_end || subscription.ends_at,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      logger.subscriptionLog('Customer state updated with active subscription', { 
        userId, 
        customerId,
        planId,
        subscriptionId: subscription.id
      })
    } else {
      // No active subscriptions - set to free
      await supabase
        .from('profiles')
        .update({
          subscription_plan_id: 'free',
          subscription_status: 'inactive',
          polar_customer_id: customerId,
          polar_subscription_id: null,
          subscription_current_period_end: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      logger.subscriptionLog('Customer state updated - no active subscription', { 
        userId, 
        customerId
      })
    }
  } catch (error) {
    logger.error('Error handling customer state change', error)
    throw error
  }
}
