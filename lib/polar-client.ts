// Polar SDK client configuration
import { Polar } from '@polar-sh/sdk'
import { POLAR_CONFIG } from './config/environment'

// Polar client with Organization Access Token
export function createPolarClient() {
  if (!POLAR_CONFIG.accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is required for Polar operations')
  }

  return new Polar({
    accessToken: POLAR_CONFIG.accessToken,
    server: process.env.NODE_ENV === 'production' ? "production" : "sandbox",
  })
}

// Helper to check if Polar is available
export async function isPolarAvailable(): Promise<boolean> {
  try {
    const polar = createPolarClient()
    await polar.organizations.get({ id: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID! })
    return true
  } catch (error: any) {
    console.warn('Polar availability check failed:', error.message)
    return false
  }
}

// For backward compatibility - both server and client use the same token
export const createPolarServerClient = createPolarClient
export const createPolarClientClient = createPolarClient

// Webhook signature verification
export function verifyPolarWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) {
    console.error('Missing webhook secret or signature')
    return false
  }

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

// Product IDs mapping (you'll get these from Polar dashboard)
export const POLAR_PRODUCT_IDS = {
  PRO_MONTHLY: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID || '',
  PRO_YEARLY: process.env.POLAR_PRO_YEARLY_PRODUCT_ID || '',
} as const

// Helper to get checkout URL
export async function createCheckoutSession(
  productId: string,
  customerId?: string,
  successUrl?: string,
  cancelUrl?: string
) {
  const polar = createPolarClient()

  try {
    // Validate product exists and is accessible
    try {
      const products = await polar.products.list({})
      const productExists = products.items?.some(p => p.id === productId)
      if (!productExists) {
        console.warn(`Product ${productId} not found in accessible products list`)
        // Still try to create checkout - product might exist but not be listed due to permissions
      }
    } catch (listError) {
      console.warn('Could not validate product existence:', listError.message)
    }

    const checkoutData: any = {
      products: [productId], // Products should be an array of product ID strings
      successUrl: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?upgrade=success`,
      cancelUrl: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard?upgrade=cancelled`,
    }

    // Only add customerId if provided
    if (customerId) {
      checkoutData.customerId = customerId
    }

    console.log('Creating checkout with data:', { 
      products: checkoutData.products, 
      customerId: customerId ? 'provided' : 'guest',
      successUrl: checkoutData.successUrl,
      cancelUrl: checkoutData.cancelUrl
    })

    const checkout = await polar.checkouts.create(checkoutData)
    console.log('Checkout created successfully:', checkout.url)

    return checkout.url
  } catch (error) {
    console.error('Failed to create checkout session:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body,
      productId
    })
    throw new Error('Failed to create checkout session')
  }
}

// Helper to create or get customer
export async function createOrGetCustomer(email: string, name?: string) {
  const polar = createPolarClient()

  try {
    // Try to find existing customer first
    try {
      const customers = await polar.customers.list({ email })
      if (customers.items && customers.items.length > 0) {
        console.log('Found existing customer:', customers.items[0].id)
        return customers.items[0]
      }
    } catch (listError) {
      console.log('Could not list customers, will try to create:', listError.message)
    }

    // Create new customer
    console.log('Creating new customer with email:', email)
    const customer = await polar.customers.create({
      email,
      name,
      // organizationId is automatically inferred from the Organization Access Token
    })

    console.log('Successfully created customer:', customer.id)
    return customer
  } catch (error) {
    console.error('Customer creation failed with details:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body,
      email: email
    })
    
    // Handle account under review or API unavailable
    if (error.statusCode === 401 || 
        (error.message && error.message.includes('invalid_token'))) {
      throw new Error('Billing services are currently unavailable. Please try again later.')
    }
    
    // Check if customer already exists error
    if (error.message && (
      error.message.includes('customer with this email address already exists') ||
      error.message.includes('already exists') ||
      (error.body && typeof error.body === 'string' && 
       error.body.includes('customer with this email address already exists'))
    )) {
      console.log('Customer already exists, attempting to retrieve by email search')
      
      // Try one more time to find the customer
      try {
        const searchResult = await polar.customers.list({ 
          email: email,
          limit: 100 // Increase limit in case there are many customers
        })
        
        if (searchResult.items && searchResult.items.length > 0) {
          // Find the exact match
          const exactMatch = searchResult.items.find(c => c.email === email)
          if (exactMatch) {
            console.log('Found existing customer on retry:', exactMatch.id)
            return exactMatch
          }
          
          // If no exact match, return the first one
          console.log('Found existing customer (first match):', searchResult.items[0].id)
          return searchResult.items[0]
        }
      } catch (retryError) {
        console.error('Failed to retrieve existing customer:', retryError)
      }
      
      // If we still can't find it, throw a more helpful error
      throw new Error(`Customer with email ${email} already exists but cannot be retrieved. This might be due to organization context changes.`)
    }
    
    // If email domain is invalid, return null to use guest checkout
    if (error.message && (
      error.message.includes('not a valid email address') ||
      error.message.includes('does not accept email') ||
      (error.statusCode === 422 && error.body && typeof error.body === 'string' && 
       error.body.includes('not a valid email address'))
    )) {
      console.log('Invalid email domain detected, will use guest checkout')
      return null
    }
    
    throw new Error(`Failed to manage customer: ${error.message}`)
  }
}