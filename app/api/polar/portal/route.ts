// Polar customer portal route using NextJS adapter
import { CustomerPortal } from "@polar-sh/nextjs"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { POLAR_CONFIG } from "@/lib/polar-client"

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: POLAR_CONFIG.sandbox ? "sandbox" : "production",
  
  getCustomerId: async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    
    // First check if customer_id is provided directly in the query
    const directCustomerId = searchParams.get('customer_id')
    if (directCustomerId) {
      console.log('Using direct customer ID from query:', directCustomerId)
      return directCustomerId
    }
    
    // Otherwise, authenticate and get customer ID from user profile
    const queryToken = searchParams.get('token')
    const authHeader = req.headers.get('authorization')
    
    let token: string | null = null
    
    if (queryToken) {
      token = queryToken
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    }
    
    if (!token) {
      throw new Error('No authorization token or customer ID provided')
    }
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
    
    // Get the user
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }
    
    // Get the user's profile with Polar customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_customer_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.polar_customer_id) {
      throw new Error('No Polar customer ID found')
    }
    
    console.log('Using customer ID from user profile:', profile.polar_customer_id)
    return profile.polar_customer_id
  },
})
