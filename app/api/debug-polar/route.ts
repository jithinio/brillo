import { NextRequest, NextResponse } from "next/server";
import { Polar } from '@polar-sh/sdk'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Polar configuration...')
    
    // Check if token exists
    const token = process.env.POLAR_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({
        error: 'POLAR_ACCESS_TOKEN not found in environment variables',
        configured: false
      }, { status: 400 })
    }

    console.log('✅ Token found, length:', token.length)
    console.log('🔍 Token prefix:', token.substring(0, 15) + '...')
    console.log('🔍 Token format check:', {
      startsWithPolar: token.startsWith('polar_'),
      startsWithPolarAt: token.startsWith('polar_at_'),
      startsWithPolarOat: token.startsWith('polar_oat_'), // Organization Access Token
      hasCorrectLength: token.length > 30,
      containsSpaces: token.includes(' '),
      containsNewlines: token.includes('\n') || token.includes('\r')
    })

    // Test token by creating Polar client
    const serverMode = process.env.NODE_ENV === 'production' ? "production" : "sandbox"
    console.log('🔍 Using Polar server mode:', serverMode)
    
    const polar = new Polar({
      accessToken: token.trim(), // Remove any whitespace
      server: serverMode
    });

    console.log('🔍 Testing token with organization info first...')
    
    // First try to get organization info (simpler endpoint)
    let orgInfo = null;
    try {
      // Try getting the organization first
      const orgId = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
      if (orgId) {
        console.log('🔍 Trying to get organization:', orgId)
        orgInfo = await polar.organizations.get({ id: orgId })
        console.log('✅ Organization found:', orgInfo.name)
      }
    } catch (orgError: any) {
      console.log('❌ Organization fetch failed:', orgError.message)
    }

    console.log('🔍 Testing token with products list...')
    
    // Test token by listing products
    const products = await polar.products.list({
      limit: 5
    })

    console.log('✅ Token is valid! Products found:', products.items?.length || 0)

    // Check for required product IDs
    const monthlyProductId = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID
    const yearlyProductId = process.env.POLAR_PRO_YEARLY_PRODUCT_ID

    return NextResponse.json({
      status: 'success',
      tokenValid: true,
      server: serverMode,
      environment: process.env.NODE_ENV,
      organization: orgInfo ? { id: orgInfo.id, name: orgInfo.name } : 'not_found',
      productsFound: products.items?.length || 0,
      products: products.items?.map(p => ({ id: p.id, name: p.name })) || [],
      tokenInfo: {
        prefix: token.substring(0, 15) + '...',
        length: token.length,
        format: (token.startsWith('polar_at_') || token.startsWith('polar_oat_')) ? 'correct' : 'incorrect',
        type: token.startsWith('polar_oat_') ? 'Organization Access Token' : 
              token.startsWith('polar_at_') ? 'Access Token' : 'Unknown'
      },
      configuration: {
        monthlyProductId: monthlyProductId ? 'configured' : 'missing',
        yearlyProductId: yearlyProductId ? 'configured' : 'missing',
        organizationId: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID ? 'configured' : 'missing'
      }
    })

  } catch (error: any) {
    console.error('❌ Polar token test failed:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    })

    const token = process.env.POLAR_ACCESS_TOKEN || ''
    
    return NextResponse.json({
      error: 'Token validation failed',
      details: error.message,
      statusCode: error.statusCode,
      body: error.body,
      environment: process.env.NODE_ENV,
      server: process.env.NODE_ENV === 'production' ? "production" : "sandbox",
      tokenInfo: {
        configured: !!token,
        prefix: token ? token.substring(0, 15) + '...' : 'not_set',
        length: token.length,
        format: (token.startsWith('polar_at_') || token.startsWith('polar_oat_')) ? 'correct' : 'incorrect',
        type: token.startsWith('polar_oat_') ? 'Organization Access Token' : 
              token.startsWith('polar_at_') ? 'Access Token' : 'Unknown',
        hasSpaces: token.includes(' '),
        hasNewlines: token.includes('\n') || token.includes('\r')
      },
      troubleshooting: {
        step1: 'Check if token starts with "polar_at_" or "polar_oat_"',
        step2: 'Ensure token is from the correct environment (sandbox/production)', 
        step3: 'Verify token has checkout permissions',
        step4: 'Check if token is expired in Polar dashboard',
        step5: 'For production, ensure you have a production token, not sandbox'
      }
    }, { status: 401 })
  }
}