// Polar subscriptions API route to fetch subscription details
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPolarClient } from '@/lib/polar-client'

export async function GET(request: NextRequest) {
  try {
    // Create supabase client with request context for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    const polar = createPolarClient()

    try {
      // List subscriptions for the customer
      const subscriptions = await polar.subscriptions.list({
        customerId: customerId,
        limit: 10
      })

      console.log('🔍 Polar subscriptions response:', subscriptions)

      // Find the most recent active subscription
      const activeSubscription = subscriptions.result?.items?.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      )

      if (activeSubscription) {
        console.log('✅ Found active subscription:', {
          id: activeSubscription.id,
          status: activeSubscription.status,
          customerId: activeSubscription.customerId
        })

        return NextResponse.json({ 
          subscriptionId: activeSubscription.id,
          status: activeSubscription.status,
          success: true 
        })
      } else {
        console.log('❌ No active subscription found for customer:', customerId)
        return NextResponse.json({ 
          subscriptionId: null,
          message: 'No active subscription found',
          success: true 
        })
      }

    } catch (polarError) {
      console.error('❌ Polar API error:', polarError)
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions from Polar',
        details: polarError instanceof Error ? polarError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Subscriptions API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}