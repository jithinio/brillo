// Portal route that returns portal URL instead of redirecting
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Polar } from '@polar-sh/sdk'

async function getCustomerIdFromRequest(req: NextRequest) {
  try {
    
    let authHeader = req.headers.get('authorization');
    
    // Check for token in query parameters (for direct URL access)
    if (!authHeader) {
      const url = new URL(req.url);
      const tokenFromQuery = url.searchParams.get('token');
      if (tokenFromQuery) {
        authHeader = `Bearer ${tokenFromQuery}`;

      }
    }
    
    // For POST requests, check if authorization is in the form data
    if (!authHeader && req.method === 'POST') {
      try {
        const formData = await req.formData();
        const authFromForm = formData.get('authorization');

        if (authFromForm && typeof authFromForm === 'string') {
          authHeader = authFromForm;
        }
      } catch (e) {
        console.log('🔍 Form parsing error:', e);
      }
    }
    
    if (!authHeader) {
      console.error('❌ No authorization found in headers, query params, or form data');
      return null;
    }

    const token = authHeader.replace('Bearer ', '');

    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('❌ Failed to get user from token:', error);
      return null;
    }

    console.log('✅ User found:', user.id);

    // Get profile with polar_customer_id and subscription data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('polar_customer_id, id, full_name, subscription_plan_id, polar_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Failed to get profile:', profileError);
      return null;
    }

    if (!profile) {
      console.error('❌ No profile found for user:', user.id);
      return null;
    }

    console.log('🔍 Profile found:', {
      id: profile.id,
      userEmail: user.email,
      polarCustomerId: profile.polar_customer_id,
      hasPolarCustomerId: !!profile.polar_customer_id,
      subscriptionPlanId: profile.subscription_plan_id,
      polarSubscriptionId: profile.polar_subscription_id,
      hasActiveSubscription: profile.subscription_plan_id && profile.subscription_plan_id !== 'free'
    });

    // If we have a customer ID in the database, use it directly
    if (profile.polar_customer_id) {
      console.log('✅ Using existing customer ID from database:', profile.polar_customer_id);
      return profile.polar_customer_id;
    }
    
    // If no customer ID but user has an active subscription, they need subscription sync
    if (profile.subscription_plan_id && profile.subscription_plan_id !== 'free') {
      console.log('⚠️ User has active subscription but no customer ID - needs sync');
      // This indicates webhook sync issue - we'll handle this below
    }

    console.log('🔍 Returning customer ID:', profile.polar_customer_id);
    return profile.polar_customer_id;
  } catch (error) {
    console.error('❌ Error in getCustomerId:', error);
    return null;
  }
}

// Create our custom handler to return portal URL instead of redirecting
async function createPortalSession(customerId: string) {
  try {
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      server: 'production'
    });

    console.log('🔄 Creating customer portal session for:', customerId);
    
    const customerSession = await polar.customerSessions.create({
      customerId: customerId
    });

    console.log('✅ Portal session created successfully');
    console.log('🔗 Portal URL:', customerSession.customerPortalUrl);
    
    return customerSession.customerPortalUrl;
  } catch (error) {
    console.error('❌ Failed to create portal session:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const customerId = await getCustomerIdFromRequest(req);
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID not found. Please sync your subscription data first.' },
        { status: 404 }
      );
    }

    const portalUrl = await createPortalSession(customerId);
    
    return NextResponse.json({ 
      portalUrl,
      success: true 
    });
  } catch (error) {
    console.error('❌ Portal creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req); // Same logic for both methods
}
