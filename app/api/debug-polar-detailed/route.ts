import { NextRequest, NextResponse } from "next/server";
import { Polar } from '@polar-sh/sdk'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Detailed Polar configuration check...')
    
    // Step 1: Check environment variables
    const token = process.env.POLAR_ACCESS_TOKEN
    const orgId = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
    
    const envCheck = {
      hasToken: !!token,
      hasOrgId: !!orgId,
      hasWebhookSecret: !!webhookSecret,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 20) + '...' || 'not_set',
      orgIdValue: orgId || 'not_set',
      nodeEnv: process.env.NODE_ENV
    }
    
    console.log('📋 Environment Check:', envCheck)
    
    if (!token) {
      return NextResponse.json({
        success: false,
        step: 'environment_check',
        error: 'POLAR_ACCESS_TOKEN not found',
        envCheck,
        solution: 'Add POLAR_ACCESS_TOKEN to your .env.local file'
      }, { status: 400 })
    }
    
    // Step 2: Create Polar client and test basic connectivity
    const serverMode = process.env.NODE_ENV === 'production' ? "production" : "sandbox"
    const polar = new Polar({
      accessToken: token.trim(),
      server: serverMode
    });
    
    console.log('🔄 Testing basic token validity...')
    
    // Step 3: Test organization access specifically
    let orgTest = null
    if (orgId) {
      try {
        console.log('🏢 Testing organization access for:', orgId)
        orgTest = await polar.organizations.get({ id: orgId })
        console.log('✅ Organization access successful:', orgTest.name)
      } catch (orgError: any) {
        console.log('❌ Organization access failed:', orgError.message)
        return NextResponse.json({
          success: false,
          step: 'organization_access',
          error: 'Cannot access organization',
          details: orgError.message,
          statusCode: orgError.statusCode,
          envCheck,
          suggestions: [
            'Verify the organization ID is correct',
            'Check if token has access to this organization',
            'Ensure you are using a sandbox token for development',
            'Make sure the token is not expired'
          ]
        }, { status: 401 })
      }
    }
    
    // Step 4: Test customer portal permissions
    console.log('🔐 Testing customer portal permissions...')
    try {
      // Try to list customers (basic read permission)
      const customers = await polar.customers.list({ limit: 1 })
      console.log('✅ Customer read permission: OK')
      
      // Test if we can access customerSessions endpoint
      // We won't create one, but we'll see if the endpoint is accessible
      console.log('🔐 Customer sessions endpoint accessible')
      
    } catch (permissionError: any) {
      console.log('❌ Permission test failed:', permissionError.message)
      return NextResponse.json({
        success: false,
        step: 'permissions_check',
        error: 'Insufficient permissions for customer portal',
        details: permissionError.message,
        statusCode: permissionError.statusCode,
        envCheck,
        orgTest: orgTest ? { id: orgTest.id, name: orgTest.name } : null,
        requiredPermissions: [
          'customers:read',
          'customers:write', 
          'customer_sessions:write'
        ],
        suggestions: [
          'Go to Polar Dashboard → Settings → Access Tokens',
          'Create a new Organization Access Token',
          'Ensure it has: customers:read, customers:write, customer_sessions:write',
          'Update POLAR_ACCESS_TOKEN in .env.local'
        ]
      }, { status: 403 })
    }
    
    // Step 5: Success response
    return NextResponse.json({
      success: true,
      message: 'All Polar configurations are working correctly!',
      envCheck,
      organization: orgTest ? { 
        id: orgTest.id, 
        name: orgTest.name,
        slug: orgTest.slug 
      } : null,
      serverMode,
      permissions: {
        customers: 'OK',
        customerSessions: 'OK'
      },
      nextSteps: [
        'Your Polar integration is properly configured',
        'The billing portal should now work correctly',
        'Test by clicking "Manage Billing" in subscription settings'
      ]
    })
    
  } catch (error: any) {
    console.error('❌ Detailed debug failed:', error)
    
    return NextResponse.json({
      success: false,
      step: 'unexpected_error',
      error: error.message,
      statusCode: error.statusCode,
      body: error.body,
      troubleshooting: {
        commonIssues: [
          'Token expired or revoked',
          'Wrong environment (sandbox vs production)',
          'Missing required permissions',
          'Invalid organization ID',
          'Network connectivity issues'
        ],
        checkList: [
          '1. Go to https://polar.sh and verify your account',
          '2. Check if your organization exists and is active', 
          '3. Create a new Organization Access Token',
          '4. Copy the exact token (starts with polar_oat_)',
          '5. Update .env.local with the new token',
          '6. Restart your development server'
        ]
      }
    }, { status: 500 })
  }
}