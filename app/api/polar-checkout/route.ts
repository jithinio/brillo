// Polar checkout route using NextJS adapter
import { Checkout } from "@polar-sh/nextjs"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { POLAR_PRODUCT_IDS, POLAR_CONFIG } from "@/lib/polar-client"

// Use the Polar NextJS adapter directly
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const planId = searchParams.get("plan")
    const uid = searchParams.get("uid")
    
    if (!uid) {
      return new Response(
        JSON.stringify({ error: "User ID required" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get user auth details for email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(uid)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User auth not found" }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Map plan to Polar product ID
    const productMap = {
      'pro_monthly': POLAR_PRODUCT_IDS.PRO_MONTHLY,
      'pro_yearly': POLAR_PRODUCT_IDS.PRO_YEARLY,
    } as const
    
    const productId = productMap[planId as keyof typeof productMap] || POLAR_PRODUCT_IDS.PRO_MONTHLY
    
    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Invalid product ID configuration" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create a new request with the proper query parameters for the NextJS adapter
    const checkoutUrl = new URL(req.url)
    checkoutUrl.searchParams.delete('plan') // Remove our custom param
    checkoutUrl.searchParams.delete('uid') // Remove our custom param
    
    // Set the NextJS adapter expected params
    checkoutUrl.searchParams.set('products', productId)
    checkoutUrl.searchParams.set('customerEmail', user.email!)
    
    if (profile.full_name || profile.first_name) {
      checkoutUrl.searchParams.set('customerName', profile.full_name || profile.first_name)
    }
    
    // Use external ID for linking to Supabase user
    checkoutUrl.searchParams.set('customerExternalId', uid)
    
    // Add metadata as URL-encoded JSON string as per Polar docs
    const metadata = {
      userId: uid,
      supabaseUserId: uid,
    }
    checkoutUrl.searchParams.set('metadata', JSON.stringify(metadata))
    
    // Create the request for the adapter
    const adapterRequest = new NextRequest(checkoutUrl, {
      headers: req.headers,
    })
    
    // Use the Polar Checkout handler
    const handler = Checkout({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      successUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard?upgrade=success&plan=${planId}`,
      server: POLAR_CONFIG.sandbox ? "sandbox" : "production",
    })
    
    return handler(adapterRequest)
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
