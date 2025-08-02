// Polar subscription details API route to fetch detailed subscription information
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
    const subscriptionId = searchParams.get('subscriptionId')

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 })
    }

    const polar = createPolarClient()

    try {
      // Get detailed subscription information
      const subscription = await polar.subscriptions.get({
        id: subscriptionId
      })

      console.log('🔍 Polar subscription details:', {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      })

      return NextResponse.json({ 
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd
        },
        success: true 
      })

    } catch (polarError) {
      console.error('❌ Polar API error:', polarError)
      return NextResponse.json({ 
        error: 'Failed to fetch subscription details from Polar',
        details: polarError instanceof Error ? polarError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Subscription details API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch subscription details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}