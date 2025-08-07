import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Polar sync endpoint called')
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.error('❌ Failed to get user from token:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ User found:', user.id)

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('polar_customer_id, id, full_name, subscription_plan_id, polar_subscription_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Failed to get profile:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('🔍 Profile data:', {
      id: profile.id,
      userEmail: user.email,
      polarCustomerId: profile.polar_customer_id,
      subscriptionPlanId: profile.subscription_plan_id,
      polarSubscriptionId: profile.polar_subscription_id
    })

    // If already has customer ID, return it
    if (profile.polar_customer_id) {
      console.log('✅ Customer ID already exists:', profile.polar_customer_id)
      return NextResponse.json({ 
        customerId: profile.polar_customer_id,
        subscriptionId: profile.polar_subscription_id,
        synced: false,
        message: 'Customer ID already exists'
      })
    }

    // If user has subscription but no customer ID, try to find it via Polar API
    if (profile.subscription_plan_id && profile.subscription_plan_id !== 'free') {
      console.log('🔍 User has subscription but no customer ID, searching Polar...')
      
      try {
        const { createPolarClient } = await import('@/lib/polar-client')
        const polar = createPolarClient()
        
        // Strategy 1: Search for existing customer by email
        console.log('🔍 Searching for customer by email:', user.email)
        
        try {
          const customers = await polar.customers.list({ 
            email: user.email,
            limit: 100
          })
          
          console.log('🔍 Customer search results:', {
            hasItems: !!customers.items,
            itemCount: customers.items?.length || 0
          })
          
          if (customers.items && customers.items.length > 0) {
            const customer = customers.items.find(c => c.email === user.email) || customers.items[0]
            if (customer) {
              console.log('✅ Found existing customer:', customer.id)
              
              // Update profile with customer ID
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ polar_customer_id: customer.id })
                .eq('id', user.id)

              if (updateError) {
                console.error('❌ Failed to update profile:', updateError)
                return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
              }
              
              console.log('✅ Updated profile with customer ID')
              
              return NextResponse.json({ 
                customerId: customer.id,
                subscriptionId: profile.polar_subscription_id,
                synced: true,
                message: 'Found and synced existing customer'
              })
            }
          }
        } catch (searchError) {
          console.log('❌ Customer search failed:', searchError)
        }
        
        // Strategy 2: Search via subscriptions if direct customer search fails
        console.log('🔍 Trying to find customer via subscriptions...')
        
        try {
          const subscriptions = await polar.subscriptions.list({
            limit: 100
          })
          
          console.log('🔍 Subscription search results:', {
            hasItems: !!subscriptions.result?.items,
            itemCount: subscriptions.result?.items?.length || 0
          })
          
          if (subscriptions.result?.items && subscriptions.result.items.length > 0) {
            // Look for active Pro subscriptions
            const activeSubscription = subscriptions.result.items.find(sub => {
              const isActive = sub.status === 'active' || sub.status === 'trialing'
              const isProPlan = sub.product?.name?.toLowerCase().includes('pro') || 
                               sub.productId?.toLowerCase().includes('pro')
              return isActive && isProPlan
            })
            
            if (activeSubscription && activeSubscription.customerId) {
              console.log('✅ Found customer ID from subscription:', activeSubscription.customerId)
              
              // Update profile with customer and subscription IDs
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  polar_customer_id: activeSubscription.customerId,
                  polar_subscription_id: activeSubscription.id 
                })
                .eq('id', user.id)

              if (updateError) {
                console.error('❌ Failed to update profile:', updateError)
                return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
              }
              
              console.log('✅ Updated profile with customer and subscription IDs')
              
              return NextResponse.json({ 
                customerId: activeSubscription.customerId,
                subscriptionId: activeSubscription.id,
                synced: true,
                message: 'Found customer via subscription data'
              })
            }
          }
        } catch (subscriptionError) {
          console.log('❌ Subscription search failed:', subscriptionError)
        }
        
        // Strategy 3: Try to create customer if none found
        console.log('🔍 No existing customer found, attempting to create...')
        
        try {
          const { createOrGetCustomer } = await import('@/lib/polar-client')
          const customer = await createOrGetCustomer(
            user.email!,
            profile.full_name || user.email!.split('@')[0]
          )

          if (customer && customer.id) {
            console.log('✅ Created new customer:', customer.id)
            
            // Update profile with new customer ID
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ polar_customer_id: customer.id })
              .eq('id', user.id)

            if (updateError) {
              console.error('❌ Failed to update profile:', updateError)
              return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
            }
            
            console.log('✅ Updated profile with new customer ID')
            
            return NextResponse.json({ 
              customerId: customer.id,
              subscriptionId: profile.polar_subscription_id,
              synced: true,
              message: 'Created new customer'
            })
          }
        } catch (createError) {
          console.log('❌ Customer creation failed:', createError)
        }
        
      } catch (polarError) {
        console.error('❌ Polar API error:', polarError)
        return NextResponse.json({ 
          error: 'Polar API error',
          details: polarError instanceof Error ? polarError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // If we get here, we couldn't sync
    console.log('❌ Could not sync customer ID')
    return NextResponse.json({ 
      error: 'Could not sync customer ID',
      message: 'Unable to find or create customer in Polar'
    }, { status: 404 })

  } catch (error) {
    console.error('❌ Sync endpoint error:', error)
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
