// Environment configuration for Polar billing

// Feature flags
export const FEATURE_FLAGS = {
  SUBSCRIPTIONS: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS !== 'false', // Default enabled
  USAGE_TRACKING: process.env.NEXT_PUBLIC_ENABLE_USAGE_TRACKING !== 'false', // Default enabled
  PRO_FEATURES: process.env.NEXT_PUBLIC_ENABLE_PRO_FEATURES !== 'false', // Default enabled
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

// Configuration checkers
export function isPolarConfigured(): boolean {
  return POLAR_CONFIG.isConfigured
}

export function areSubscriptionsEnabled(): boolean {
  return FEATURE_FLAGS.SUBSCRIPTIONS && isPolarConfigured()
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
    polar: POLAR_CONFIG.isConfigured,
    usageTracking: FEATURE_FLAGS.USAGE_TRACKING,
    proFeatures: FEATURE_FLAGS.PRO_FEATURES,
    environment: process.env.NODE_ENV,
    allConfigured: areSubscriptionsEnabled()
  }
}

