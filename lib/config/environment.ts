// Environment configuration with safe fallbacks
// This ensures the app works even if environment variables are missing

// Feature flags enabled for test environment
export const FEATURE_FLAGS = {
  SUBSCRIPTIONS: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS !== 'false', // Default enabled
  POLAR_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_POLAR !== 'false', // Default enabled
  USAGE_TRACKING: process.env.NEXT_PUBLIC_ENABLE_USAGE_TRACKING !== 'false', // Default enabled
  PRO_FEATURES: process.env.NEXT_PUBLIC_ENABLE_PRO_FEATURES !== 'false' // Default enabled
} as const

// Polar configuration with safe fallbacks
export const POLAR_CONFIG = {
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || '',
  organizationId: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || '',
  isConfigured: Boolean(
    process.env.POLAR_ACCESS_TOKEN &&
    process.env.POLAR_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID
  )
} as const

// Environment helpers
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Safe configuration checker
export function isPolarConfigured(): boolean {
  return POLAR_CONFIG.isConfigured && FEATURE_FLAGS.POLAR_INTEGRATION
}

export function areSubscriptionsEnabled(): boolean {
  return FEATURE_FLAGS.SUBSCRIPTIONS
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
    allConfigured: isPolarConfigured() && areSubscriptionsEnabled()
  }
}

// Security: Validate webhook signatures
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return false
  
  try {
    // Implement proper webhook signature validation here
    // This is a placeholder for the actual implementation
    return true
  } catch (error) {
    console.error('Webhook signature validation failed:', error)
    return false
  }
}