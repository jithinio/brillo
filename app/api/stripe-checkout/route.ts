// Stripe checkout route
import { NextRequest, NextResponse } from "next/server"
import { createStripeClient, STRIPE_PRICE_IDS } from "@/lib/stripe-client"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const planId = searchParams.get("plan")
    const uid = searchParams.get("uid")
    
    if (!uid) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
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
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Get user auth details for email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(uid)
    
    if (userError || !user) {
      return NextResponse.json({ error: "User auth not found" }, { status: 404 })
    }
    
    // Map plan to Stripe price ID
    const priceMap = {
      'pro_monthly': STRIPE_PRICE_IDS.PRO_MONTHLY,
      'pro_yearly': STRIPE_PRICE_IDS.PRO_YEARLY,
    } as const
    
    const priceId = priceMap[planId as keyof typeof priceMap] || STRIPE_PRICE_IDS.PRO_MONTHLY
    
    const stripe = createStripeClient()
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Get or create customer
    let customerId = profile.stripe_customer_id
    
    // If we have a customer ID, verify it exists in Stripe
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
      } catch (error) {
        console.log('Customer not found in Stripe, will create new one:', customerId)
        customerId = null // Reset to create a new customer
      }
    }
    
    if (!customerId) {
      // Create new customer (skip search API)
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile.full_name || profile.first_name || undefined,
        metadata: {
          userId: uid,
        },
      })
      customerId = customer.id
      
      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', uid)
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
      subscription_data: {
        metadata: {
          userId: uid,
        },
      },
      allow_promotion_codes: true,
      // Remove automatic tax for regions where it's not supported
      // automatic_tax: {
      //   enabled: true,
      // },
    })

    return NextResponse.redirect(session.url!)
    
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Usage: /api/stripe-checkout?plan=pro_monthly&uid={user.id}