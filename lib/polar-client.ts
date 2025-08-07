// Polar SDK client configuration
import { Polar } from '@polar-sh/sdk'
import { POLAR_CONFIG } from './config/environment'

// Polar client with Organization Access Token
export function createPolarClient() {
  if (!POLAR_CONFIG.accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is required for Polar operations')
  }

  // Force production mode for active Polar accounts
  // Change this to "sandbox" only if you're using sandbox tokens
  const serverMode = "production"
  
  console.log(`🔍 Polar client connecting to: ${serverMode} mode`)
  
  return new Polar({
    accessToken: POLAR_CONFIG.accessToken,
    server: serverMode,
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
    // Try to find existing customer first with expanded search
    try {
      console.log('Searching for existing customer with email:', email)
      const customers = await polar.customers.list({ 
        email,
        limit: 100 // Increase limit to ensure we find the customer
      })
      
      if (customers.items && customers.items.length > 0) {
        // Find exact email match
        const exactMatch = customers.items.find(c => c.email === email)
        if (exactMatch) {
          console.log('Found existing customer (exact match):', exactMatch.id)
          return exactMatch
        }
        
        // If no exact match but we have results, use the first one
        console.log('Found existing customer (first result):', customers.items[0].id)
        return customers.items[0]
      }
      
      console.log('No existing customer found in search results')
    } catch (listError: any) {
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
      
      // Try comprehensive search strategies
      try {
        console.log('Customer exists error detected, trying comprehensive search...')
        
        // Strategy 1: Search with higher limit and no email filter
        console.log('Strategy 1: Searching all customers...')
        const allCustomers = await polar.customers.list({ 
          limit: 200 // Get more customers
        })
        
        if (allCustomers.items && allCustomers.items.length > 0) {
          const exactMatch = allCustomers.items.find(c => c.email === email)
          if (exactMatch) {
            console.log('Found existing customer via comprehensive search:', exactMatch.id)
            return exactMatch
          }
        }
        
        // Strategy 2: Search with pagination
        console.log('Strategy 2: Trying paginated search...')
        let page = 1
        while (page <= 3) { // Search first 3 pages
          try {
            const pagedResult = await polar.customers.list({ 
              limit: 100,
              page
            })
            
            if (pagedResult.items && pagedResult.items.length > 0) {
              const exactMatch = pagedResult.items.find(c => c.email === email)
              if (exactMatch) {
                console.log(`Found existing customer on page ${page}:`, exactMatch.id)
                return exactMatch
              }
            }
            
            if (!pagedResult.items || pagedResult.items.length < 100) {
              break // No more pages
            }
            page++
          } catch (pageError) {
            console.log(`Page ${page} search failed:`, pageError.message)
            break
          }
        }
        
      } catch (retryError: any) {
        console.error('Failed to retrieve existing customer with comprehensive search:', retryError.message)
      }
      
      // If we still can't find it, throw a specific error for the API to handle
      console.log('⚠️ Customer exists but cannot be retrieved, will use alternative approach')
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