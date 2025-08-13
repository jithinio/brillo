// Stripe client configuration (now using Polar)
import Stripe from 'stripe'
import { STRIPE_CONFIG, FEATURE_FLAGS, isPolarConfigured } from './config/environment'
import * as PolarClient from './polar-client'

// Server-side Stripe client (redirects to Polar when enabled)
export function createStripeClient() {
  if (FEATURE_FLAGS.USE_POLAR) {
    throw new Error('Stripe is disabled. Please use Polar client instead.')
  }
  
  if (!STRIPE_CONFIG.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe operations')
  }

  return new Stripe(STRIPE_CONFIG.secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  })
}

// Polar client (now the primary payment processor)
export function createPolarClient() {
  if (FEATURE_FLAGS.USE_POLAR) {
    return PolarClient.createPolarClient()
  }
  console.warn('⚠️ Polar is not enabled. Using Stripe instead.')
  return null
}

// Helper to check if payment processor is available
export async function isStripeAvailable(): Promise<boolean> {
  if (FEATURE_FLAGS.USE_POLAR) {
    return PolarClient.isPolarAvailable()
  }
  
  try {
    const stripe = createStripeClient()
    await stripe.products.list({ limit: 1 })
    return true
  } catch (error: any) {
    console.warn('Stripe availability check failed:', error.message)
    return false
  }
}

// Polar availability check
export async function isPolarAvailable(): Promise<boolean> {
  if (FEATURE_FLAGS.USE_POLAR) {
    return PolarClient.isPolarAvailable()
  }
  return false
}

// For backward compatibility
export const createPolarServerClient = createPolarClient
export const createPolarClientClient = createPolarClient
export const createStripeServerClient = createStripeClient

// Webhook signature verification
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = createStripeClient()
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

// Legacy Polar webhook verification (deprecated)
export function verifyPolarWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  console.warn('⚠️ verifyPolarWebhook is deprecated. Use verifyStripeWebhook instead.')
  return false
}

// Price IDs mapping (Stripe)
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: STRIPE_CONFIG.priceIds.proMonthly,
  PRO_YEARLY: STRIPE_CONFIG.priceIds.proYearly,
} as const

// Polar product IDs (now active)
export const POLAR_PRODUCT_IDS = FEATURE_FLAGS.USE_POLAR ? PolarClient.POLAR_PRODUCT_IDS : {
  PRO_MONTHLY: '',
  PRO_YEARLY: '',
} as const

// Helper to create checkout session (Stripe or Polar)
export async function createCheckoutSession(
  priceId: string,
  userId: string,
  userEmail: string,
  successUrl?: string,
  cancelUrl?: string
) {
  // Use Polar if enabled
  if (FEATURE_FLAGS.USE_POLAR) {
    // Map Stripe price ID to Polar product ID
    let productId = priceId
    if (priceId === STRIPE_PRICE_IDS.PRO_MONTHLY) {
      productId = POLAR_PRODUCT_IDS.PRO_MONTHLY
    } else if (priceId === STRIPE_PRICE_IDS.PRO_YEARLY) {
      productId = POLAR_PRODUCT_IDS.PRO_YEARLY
    }
    
    return PolarClient.createCheckoutSession(productId, userId, userEmail, successUrl)
  }
  
  const stripe = createStripeClient()

  try {
    // First, try to find or create customer
    let customer: Stripe.Customer | null = null
    
    // Search for existing customer by metadata
    const existingCustomers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId, // Store Supabase user ID in metadata
        },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?upgrade=success`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard?upgrade=cancelled`,
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Remove automatic tax for regions where it's not supported
      // automatic_tax: {
      //   enabled: true,
      // },
    })

    return session.url
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

// Helper to get or create customer (Stripe or Polar)
export async function getOrCreateStripeCustomer(userId: string, email: string, name?: string) {
  // Use Polar if enabled
  if (FEATURE_FLAGS.USE_POLAR) {
    return PolarClient.getOrCreatePolarCustomer(userId, email, name)
  }
  
  const stripe = createStripeClient()

  try {
    // Create new customer (skip search to avoid regional issues)
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: userId,
      },
    })

    return customer
  } catch (error) {
    console.error('Failed to create customer:', error)
    throw error
  }
}

// Helper to create billing portal session (Stripe or Polar)
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  // Use Polar if enabled
  if (FEATURE_FLAGS.USE_POLAR) {
    return PolarClient.createCustomerPortalSession(customerId)
  }
  
  const stripe = createStripeClient()

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  } catch (error) {
    console.error('Failed to create billing portal session:', error)
    throw new Error('Failed to create billing portal session')
  }
}

// Legacy Polar customer function (deprecated)
export async function createOrGetCustomer(email: string, name?: string) {
  console.warn('⚠️ createOrGetCustomer is deprecated. Use getOrCreateStripeCustomer instead.')
  return null
}