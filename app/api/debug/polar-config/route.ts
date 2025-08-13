// Debug endpoint to check Polar configuration
import { NextResponse } from 'next/server'
import { POLAR_CONFIG, POLAR_PRODUCT_IDS } from '@/lib/polar-client'

export async function GET() {
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  
  return NextResponse.json({
    config: {
      hasAccessToken: !!POLAR_CONFIG.accessToken,
      accessTokenLength: POLAR_CONFIG.accessToken?.length || 0,
      hasWebhookSecret: !!POLAR_CONFIG.webhookSecret,
      organizationId: POLAR_CONFIG.organizationId,
      sandbox: POLAR_CONFIG.sandbox,
      isConfigured: POLAR_CONFIG.isConfigured,
      productIds: {
        proMonthly: POLAR_CONFIG.productIds.proMonthly || 'NOT SET',
        proYearly: POLAR_CONFIG.productIds.proYearly || 'NOT SET',
      }
    },
    mappedProductIds: {
      PRO_MONTHLY: POLAR_PRODUCT_IDS.PRO_MONTHLY || 'NOT SET',
      PRO_YEARLY: POLAR_PRODUCT_IDS.PRO_YEARLY || 'NOT SET',
    },
    envVars: {
      POLAR_PRO_MONTHLY_PRODUCT_ID: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID || 'NOT SET',
      POLAR_PRO_YEARLY_PRODUCT_ID: process.env.POLAR_PRO_YEARLY_PRODUCT_ID || 'NOT SET',
      NEXT_PUBLIC_POLAR_ORGANIZATION_ID: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || 'NOT SET',
      POLAR_ORGANIZATION_ID: process.env.POLAR_ORGANIZATION_ID || 'NOT SET',
    }
  })
}
