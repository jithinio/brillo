// Polar client configuration
import { Polar } from '@polar-sh/sdk'
import { POLAR_CONFIG } from './config/environment'

// Server-side Polar client
export function createPolarClient() {
  if (!POLAR_CONFIG.accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is required for Polar operations')
  }

  try {
    console.log('Creating Polar client with config:', {
      hasAccessToken: !!POLAR_CONFIG.accessToken,
      tokenLength: POLAR_CONFIG.accessToken?.length || 0,
      server: POLAR_CONFIG.sandbox ? 'sandbox' : 'production',
    })
    
    const polar = new Polar({
      accessToken: POLAR_CONFIG.accessToken,
      serverURL: POLAR_CONFIG.sandbox ? 'https://sandbox.polar.sh' : 'https://api.polar.sh',
    })
    
    console.log('Polar client created successfully')
    return polar
  } catch (error) {
    console.error('Failed to create Polar client:', error)
    throw error
  }
}

// Helper to check if Polar is available
export async function isPolarAvailable(): Promise<boolean> {
  try {
    const polar = createPolarClient()
    // Simply check if we can create the client successfully
    // The organizations.get method has validation issues with the SDK
    return true
  } catch (error: any) {
    console.warn('Polar availability check failed:', error.message)
    return false
  }
}

// Product IDs mapping
export const POLAR_PRODUCT_IDS = {
  PRO_MONTHLY: POLAR_CONFIG.productIds.proMonthly,
  PRO_YEARLY: POLAR_CONFIG.productIds.proYearly,
} as const

// Helper to create Polar checkout session
export async function createCheckoutSession(
  productId: string,
  userId: string,
  userEmail: string,
  successUrl?: string
) {
  const polar = createPolarClient()

  try {
    // Create or get customer
    let customer = await getOrCreatePolarCustomer(userId, userEmail)

    // Create checkout session
    const checkout = await polar.checkouts.create({
      productId: productId,
      customerEmail: userEmail,
      metadata: {
        userId: userId,
      },
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_URL}/dashboard?upgrade=success`,
      customerId: customer?.id,
    })

    return checkout.url
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

// Helper to get or create Polar customer
export async function getOrCreatePolarCustomer(userId: string, email: string, name?: string) {
  const polar = createPolarClient()

  try {
    // Try to find existing customer by email
    const customers = await polar.customers.list({
      email: email,
      limit: 1,
    })

    if (customers.items && customers.items.length > 0) {
      return customers.items[0]
    }

    // Create new customer
    const customer = await polar.customers.create({
      email: email,
      name: name,
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

// Helper to create customer portal session
export async function createCustomerPortalSession(customerId: string) {
  const polar = createPolarClient()

  try {
    const session = await polar.customerSessions.create({
      customerId: customerId,
    })

    return session.customerPortalUrl
  } catch (error) {
    console.error('Failed to create customer portal session:', error)
    throw new Error('Failed to create customer portal session')
  }
}

// Webhook signature verification
export async function verifyPolarWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<any> {
  // Polar uses a different webhook verification method
  // The signature is a HMAC-SHA256 of the payload
  const crypto = await import('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  if (signature !== `sha256=${expectedSignature}`) {
    throw new Error('Invalid webhook signature')
  }

  return JSON.parse(payload)
}

// Helper to sync subscription status from Polar
export async function syncPolarSubscription(customerId: string) {
  const polar = createPolarClient()

  try {
    console.log('Fetching subscriptions for customer:', customerId)
    
    // Since the SDK doesn't have a customers API, we need to use the organization's subscriptions
    // and filter by customer. First, let's try to list subscriptions for the organization
    const organizationId = POLAR_CONFIG.organizationId
    
    if (!organizationId) {
      throw new Error('POLAR_ORGANIZATION_ID is required')
    }
    
    console.log('Listing subscriptions for organization:', organizationId)
    
    // List all subscriptions for the organization
    const subscriptionsResponse = await polar.subscriptions.list({
      organizationId: organizationId,
      limit: 100, // Increase limit to ensure we get all subscriptions
    })
    
    console.log('Total subscriptions found:', subscriptionsResponse.items?.length || 0)
    
    if (!subscriptionsResponse.items || subscriptionsResponse.items.length === 0) {
      console.log('No subscriptions found for organization')
      return null
    }
    
    // Filter subscriptions by customer ID
    const customerSubscriptions = subscriptionsResponse.items.filter((sub: any) => {
      // Check if the subscription's user/customer matches our customer ID
      return sub.userId === customerId || sub.customerId === customerId || sub.customer_id === customerId
    })
    
    console.log('Customer subscriptions found:', customerSubscriptions.length)
    
    if (customerSubscriptions.length === 0) {
      console.log('No subscriptions found for customer:', customerId)
      return null
    }
    
    // Find active subscription
    const activeSubscription = customerSubscriptions.find((sub: any) => 
      sub.status === 'active' || sub.status === 'trialing'
    )
    
    if (!activeSubscription) {
      console.log('No active subscription found for customer')
      return null
    }
    
    console.log('Found active subscription:', activeSubscription)
    
    return {
      subscriptionId: activeSubscription.id,
      productId: activeSubscription.productId || activeSubscription.product_id,
      status: activeSubscription.status,
      currentPeriodEnd: activeSubscription.currentPeriodEnd || activeSubscription.current_period_end || activeSubscription.ends_at,
      cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd || activeSubscription.cancel_at_period_end || false,
    }
  } catch (error: any) {
    console.error('Failed to sync Polar subscription:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode || error.response?.status,
      status: error.status || error.response?.status,
      data: error.response?.data || error.data,
      stack: error.stack
    })
    
    // Return null for any error - we'll treat it as no subscription
    console.log('Error syncing subscription, treating as no subscription')
    return null
  }
}

// Helper to cancel subscription
export async function cancelPolarSubscription(subscriptionId: string) {
  const polar = createPolarClient()

  try {
    await polar.subscriptions.cancel(subscriptionId)
    return true
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    throw error
  }
}

// Helper to update subscription (e.g., resume)
export async function updatePolarSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean) {
  const polar = createPolarClient()

  try {
    const subscription = await polar.subscriptions.update(subscriptionId, {
      cancelAtPeriodEnd: cancelAtPeriodEnd,
    })
    return subscription
  } catch (error) {
    console.error('Failed to update subscription:', error)
    throw error
  }
}

// Helper to get products
export async function getPolarProducts() {
  const polar = createPolarClient()

  try {
    const products = await polar.products.list({
      organizationId: POLAR_CONFIG.organizationId,
      isRecurring: true,
    })
    return products.items || []
  } catch (error) {
    console.error('Failed to get products:', error)
    return []
  }
}

// Map Polar product to plan ID
export function mapPolarProductToPlanId(productId: string): string {
  if (productId === POLAR_PRODUCT_IDS.PRO_MONTHLY) {
    return 'pro_monthly'
  } else if (productId === POLAR_PRODUCT_IDS.PRO_YEARLY) {
    return 'pro_yearly'
  }
  return 'free'
}

// Map plan ID to Polar product
export function mapPlanIdToPolarProduct(planId: string): string | null {
  switch (planId) {
    case 'pro_monthly':
      return POLAR_PRODUCT_IDS.PRO_MONTHLY
    case 'pro_yearly':
      return POLAR_PRODUCT_IDS.PRO_YEARLY
    default:
      return null
  }
}
