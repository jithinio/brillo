// Polar checkout route using NextJS adapter
import { Checkout } from "@polar-sh/nextjs"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { POLAR_PRODUCT_IDS, POLAR_CONFIG } from "@/lib/polar-client"

// First, let's create a handler that prepares the checkout data
async function prepareCheckoutParams(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const planId = searchParams.get("plan")
  const uid = searchParams.get("uid")
  
  if (!uid) {
    throw new Error("User ID required")
  }
  
  // Get user details from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  
  if (profileError || !profile) {
    throw new Error("User not found")
  }
  
  // Get user auth details for email
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(uid)
  
  if (userError || !user) {
    throw new Error("User auth not found")
  }
  
  // Map plan to Polar product ID
  const productMap = {
    'pro_monthly': POLAR_PRODUCT_IDS.PRO_MONTHLY,
    'pro_yearly': POLAR_PRODUCT_IDS.PRO_YEARLY,
  } as const
  
  const productId = productMap[planId as keyof typeof productMap] || POLAR_PRODUCT_IDS.PRO_MONTHLY
  
  // Create URL with proper parameters for Polar checkout
  const checkoutUrl = new URL(req.url)
  checkoutUrl.searchParams.set('products', productId)
  checkoutUrl.searchParams.set('customerEmail', user.email!)
  checkoutUrl.searchParams.set('customerName', profile.full_name || profile.first_name || '')
  
  // Add customer ID if available
  if (profile.polar_customer_id) {
    checkoutUrl.searchParams.set('customerId', profile.polar_customer_id)
  }
  
  // Add metadata
  const metadata = {
    userId: uid,
    supabaseUserId: uid,
  }
  checkoutUrl.searchParams.set('metadata', encodeURIComponent(JSON.stringify(metadata)))
  
  // Create a new request with the updated URL
  return new NextRequest(checkoutUrl, {
    headers: req.headers,
  })
}

// Use the Polar NextJS adapter
export const GET = async (req: NextRequest) => {
  try {
    // Prepare the checkout parameters
    const preparedReq = await prepareCheckoutParams(req)
    
    // Use the Polar Checkout handler
    const handler = Checkout({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      successUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard?upgrade=success`,
      server: POLAR_CONFIG.sandbox ? "sandbox" : "production",
    })
    
    return handler(preparedReq)
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
