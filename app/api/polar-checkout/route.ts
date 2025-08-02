// Modern Polar checkout using official Next.js adapter (simplified)
import { NextRequest, NextResponse } from "next/server";
import { Polar } from '@polar-sh/sdk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan');
    
    // Map plan IDs to product IDs
    const productMap = {
      'pro_monthly': process.env.POLAR_PRO_MONTHLY_PRODUCT_ID!,
      'pro_yearly': process.env.POLAR_PRO_YEARLY_PRODUCT_ID!,
    } as const;
    
    const productId = productMap[planId as keyof typeof productMap];
    
    if (!productId) {
      return NextResponse.json(
        { error: `Invalid plan: ${planId}` },
        { status: 400 }
      );
    }

    // Create Polar client with correct server mode
    const serverMode = process.env.NODE_ENV === 'production' ? "production" : "sandbox";
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      server: serverMode
    });

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const checkout = await polar.checkouts.create({
      products: [productId],  // Back to products array format
      successUrl: `${baseUrl}/dashboard?upgrade=success`,
      cancelUrl: `${baseUrl}/dashboard?upgrade=cancelled`,
    });

    // Redirect to checkout
    return NextResponse.redirect(checkout.url);

  } catch (error) {
    console.error('Checkout error details:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message,
        statusCode: error.statusCode 
      },
      { status: 500 }
    );
  }
}