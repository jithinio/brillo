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
    logger.info('Checkout created', { checkoutId: (data as any).id })
  },
  
  onCheckoutUpdated: async (data) => {
    logger.info('Checkout updated', { checkoutId: (data as any).id, status: (data as any).status })
  },
  
  onOrderCreated: async (data) => {
    await handleOrderCreated(data)
  },
  
  onCustomerCreated: async (data) => {
    logger.info('Customer created', { customerId: (data as any).id })
  },
  
  onCustomerUpdated: async (data) => {
    logger.info('Customer updated', { customerId: (data as any).id })
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
    // Log the full subscription object to understand its structure
    logger.info('Subscription created webhook received', { 
      subscriptionData: JSON.stringify(subscription),
      hasMetadata: !!subscription.metadata,
      metadata: subscription.metadata
    })
    
    // Try multiple ways to find the user ID
    let userId = subscription.metadata?.userId || subscription.metadata?.supabaseUserId
    
    // If no userId in metadata, try to find by customer ID
    if (!userId && (subscription.customer_id || subscription.customerId || subscription.customer?.id)) {
      const customerId = subscription.customer_id || subscription.customerId || subscription.customer?.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('polar_customer_id', customerId)
        .single()
      
      if (profile) {
        userId = profile.id
        logger.info('Found user by customer ID lookup', { userId, customerId })
      }
    }
    
    if (!userId) {
      logger.warn('No userId found in subscription created webhook', {
        metadata: subscription.metadata,
        customerId: subscription.customer_id || subscription.customerId,
        customer: subscription.customer
      })
      return
    }

    const planId = mapPolarProductToPlanId(subscription.product_id || subscription.productId || subscription.product?.id)
    
    // Extract customer ID from various possible fields
    const customerId = subscription.customer_id || subscription.customerId || subscription.customer?.id
    
    if (!customerId) {
      logger.error('No customer ID found in subscription', { subscription })
    }

    await supabase
      .from('profiles')
      .update({
        subscription_plan_id: planId,
        subscription_status: subscription.status,
        polar_customer_id: customerId,
        polar_subscription_id: subscription.id,
        subscription_current_period_end: subscription.current_period_end || subscription.currentPeriodEnd || subscription.ends_at,
        cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancelAtPeriodEnd || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    logger.info('Subscription created and saved', { 
      userId, 
      planId, 
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status
    }, 'SUBSCRIPTION')
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

    logger.info('Subscription updated', { 
      userId: subscription.metadata.userId, 
      planId, 
      status: subscription.status 
    }, 'SUBSCRIPTION')
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

    logger.info('Subscription canceled', { 
      userId: subscription.metadata.userId,
      subscriptionId: subscription.id 
    }, 'SUBSCRIPTION')
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
    logger.info('Order created webhook received', {
      orderData: JSON.stringify(order),
      hasMetadata: !!order.metadata,
      metadata: order.metadata
    })
    
    const userId = order.metadata?.userId || order.metadata?.supabaseUserId
    if (!userId) {
      logger.warn('No userId in order metadata', { 
        metadata: order.metadata,
        customerId: order.customer_id,
        customer: order.customer 
      })
      return
    }

    // If order has subscription info, save it early (in case subscription webhook is delayed)
    if (order.subscription_id && order.customer_id) {
      logger.info('Order contains subscription info, saving early', {
        userId,
        customerId: order.customer_id,
        subscriptionId: order.subscription_id
      })
      
      // Check if we already have these IDs saved
      const { data: profile } = await supabase
        .from('profiles')
        .select('polar_customer_id, polar_subscription_id')
        .eq('id', userId)
        .single()
      
      // Only update if not already set
      if (!profile?.polar_customer_id || !profile?.polar_subscription_id) {
        await supabase
          .from('profiles')
          .update({
            polar_customer_id: order.customer_id,
            polar_subscription_id: order.subscription_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        logger.info('Saved customer/subscription IDs from order', {
          userId,
          customerId: order.customer_id,
          subscriptionId: order.subscription_id
        })
      }
    }

    logger.paymentLog('Order created', { 
      userId, 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      customerId: order.customer_id,
      subscriptionId: order.subscription_id
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
    
    // Find user by multiple methods
    let userId = data.metadata?.userId || data.metadata?.supabaseUserId
    
    // If no metadata userId, try to find by customer external_id (which we set to user ID)
    if (!userId && data.external_id) {
      userId = data.external_id
    }
    
    if (!userId && customerEmail) {
      // Try to find user by email in profiles table first (faster)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single()
      
      if (profileData) {
        userId = profileData.id
      } else {
        // Fallback to auth admin query
        try {
          const { data: userData } = await supabase.auth.admin.listUsers()
          const user = userData?.users?.find(u => u.email === customerEmail)
          userId = user?.id
        } catch (authError) {
          logger.error('Error querying auth users:', authError)
        }
      }
    }
    
    if (!userId) {
      logger.warn('No user found for customer state change', { 
        customerId, 
        email: customerEmail,
        external_id: data.external_id,
        metadata: data.metadata
      })
      return
    }
    
    logger.info('Found user for customer state change', { 
      userId, 
      customerId, 
      email: customerEmail,
      method: data.metadata?.userId ? 'metadata' : 
              data.external_id ? 'external_id' : 
              'email_lookup'
    })
    
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
      
      logger.info('Customer state updated with active subscription', { 
        userId, 
        customerId,
        planId,
        subscriptionId: subscription.id
      }, 'SUBSCRIPTION')
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
      
      logger.info('Customer state updated - no active subscription', { 
        userId, 
        customerId
      }, 'SUBSCRIPTION')
    }
  } catch (error) {
    logger.error('Error handling customer state change', error)
    throw error
  }
}
