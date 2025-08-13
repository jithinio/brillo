// Environment configuration for Stripe integration

// Feature flags - all enabled for Stripe/Polar
export const FEATURE_FLAGS = {
  SUBSCRIPTIONS: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS !== 'false', // Default enabled
  STRIPE_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_STRIPE !== 'false', // Default enabled
  USAGE_TRACKING: process.env.NEXT_PUBLIC_ENABLE_USAGE_TRACKING !== 'false', // Default enabled
  PRO_FEATURES: process.env.NEXT_PUBLIC_ENABLE_PRO_FEATURES !== 'false', // Default enabled
  USE_POLAR: true // Enable Polar integration
} as const

// Stripe configuration (deprecated - keeping for backward compatibility)
export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  priceIds: {
    proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || ''
  },
  isConfigured: false // Force disabled - we're using Polar now
} as const

// Polar configuration
export const POLAR_CONFIG = {
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || '',
  organizationId: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || process.env.POLAR_ORGANIZATION_ID || '',
  productIds: {
    proMonthly: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID || '',
    proYearly: process.env.POLAR_PRO_YEARLY_PRODUCT_ID || ''
  },
  sandbox: process.env.POLAR_SANDBOX === 'true',
  isConfigured: Boolean(
    process.env.POLAR_ACCESS_TOKEN &&
    process.env.POLAR_WEBHOOK_SECRET &&
    (process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || process.env.POLAR_ORGANIZATION_ID) &&
    process.env.POLAR_PRO_MONTHLY_PRODUCT_ID &&
    process.env.POLAR_PRO_YEARLY_PRODUCT_ID
  )
} as const

// Environment helpers
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Safe configuration checker
export function isStripeConfigured(): boolean {
  return STRIPE_CONFIG.isConfigured && FEATURE_FLAGS.STRIPE_INTEGRATION && !FEATURE_FLAGS.USE_POLAR
}

export function isPolarConfigured(): boolean {
  return POLAR_CONFIG.isConfigured && FEATURE_FLAGS.USE_POLAR
}

export function areSubscriptionsEnabled(): boolean {
  return FEATURE_FLAGS.SUBSCRIPTIONS && (isPolarConfigured() || isStripeConfigured())
}

export function isUsageTrackingEnabled(): boolean {
  return FEATURE_FLAGS.USAGE_TRACKING
}

export function areProFeaturesEnabled(): boolean {
  return FEATURE_FLAGS.PRO_FEATURES
}

// Development helper to check configuration
export function getConfigurationStatus() {
  return {
    subscriptions: FEATURE_FLAGS.SUBSCRIPTIONS,
    stripe: STRIPE_CONFIG.isConfigured,
    polar: POLAR_CONFIG.isConfigured,
    usePolar: FEATURE_FLAGS.USE_POLAR,
    usageTracking: FEATURE_FLAGS.USAGE_TRACKING,
    proFeatures: FEATURE_FLAGS.PRO_FEATURES,
    environment: process.env.NODE_ENV,
    allConfigured: areSubscriptionsEnabled()
  }
}

