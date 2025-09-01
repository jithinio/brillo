// Subscription system types - Safe foundation layer
// This file only contains types and doesn't affect existing functionality

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  limits: {
    projects: number | 'unlimited'
    clients: number | 'unlimited'
    invoices: number | 'unlimited'
  }
  proFeatures?: string[]
  popular?: boolean
  badge?: string
}

export interface UserSubscription {
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  customerId?: string | null
  subscriptionId?: string | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
}

export interface UsageLimits {
  projects: {
    current: number
    limit: number | 'unlimited'
    canCreate: boolean
  }
  clients: {
    current: number
    limit: number | 'unlimited'
    canCreate: boolean
  }
  invoices: {
    current: number
    limit: number | 'unlimited'
    canCreate: boolean
  }
}

export interface SubscriptionContext {
  subscription: UserSubscription
  plan: SubscriptionPlan
  usage: UsageLimits
  isLoading: boolean
  error: string | null
  // Feature checks
  canCreateProject: boolean
  canCreateClient: boolean
  canAccessInvoicing: boolean
  canAccessAdvancedAnalytics: boolean
  isProPlan: boolean
  // Actions
  checkUsage: () => Promise<void>
  upgrade: (planId: string) => Promise<void>
}

// Safe feature flags that won't break existing functionality
export const FEATURE_FLAGS = {
  SUBSCRIPTION_SYSTEM: false, // Start disabled
  POLAR_INTEGRATION: false,   // Start disabled
  USAGE_TRACKING: false,      // Start disabled
  PRO_FEATURES: false         // Start disabled
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

// Feature access mapping for subscription features
export interface FeatureAccess {
  invoicing: boolean
  advanced_analytics: boolean
  invoice_customization: boolean
  api_access: boolean
}