// Subscription plans configuration - Safe, doesn't affect existing functionality
// This file only exports plan data and helper functions

import { SubscriptionPlan } from './types/subscription'

// Plan definitions based on updated requirements
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    interval: 'month',
    features: [
      'Up to 10 clients',
      'Up to 20 projects',
      'Up to 5 invoices',
      'Basic reporting',
      'Community support'
    ],
    limits: { 
      projects: 20, 
      clients: 10, 
      invoices: 5 // Limited invoices on free plan
    },
    badge: 'Forever Free'
  },
  
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 10,
    interval: 'month',
    features: [
      'Everything in Free Plan',
      'Unlimited clients',
      'Unlimited projects',
      'Unlimited invoices',
      'Custom invoice templates',
      'Advanced analytics dashboard',
      'Export capabilities',
      'Priority support',
      'API access'
    ],
    proFeatures: [
      'Unlimited invoices',
      'Custom invoice templates', 
      'Advanced analytics',
      'Revenue tracking',
      'Financial reports'
    ],
    limits: { 
      projects: 'unlimited', 
      clients: 'unlimited', 
      invoices: 'unlimited' 
    },
    popular: true,
    badge: 'Most Popular'
  },
  
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    price: 8, // per month, billed annually ($96/year)
    interval: 'year',
    features: [
      'Everything in Pro Monthly',
      '2 months free (17% savings)',
      'Priority support',
      'Early access to new features',
      'Custom integrations',
      'Dedicated account manager'
    ],
    proFeatures: [
      'Unlimited invoices',
      'Advanced invoice customization', 
      'Premium analytics',
      'Advanced reporting',
      'API & integrations'
    ],
    limits: { 
      projects: 'unlimited', 
      clients: 'unlimited', 
      invoices: 'unlimited' 
    },
    badge: 'Best Value'
  }
} as const

// Helper functions for plan operations
export function getPlan(planId: string): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free
}

export function isProPlan(planId: string): boolean {
  return planId === 'pro_monthly' || planId === 'pro_yearly'
}

export function getPlansArray(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS)
}

export function canAccessFeature(planId: string, feature: string): boolean {
  // Secure feature checking - defaults to free plan if no plan specified
  
  // If no planId provided, default to free plan (secure default)
  if (!planId) planId = 'free'
  
  const plan = getPlan(planId)
  const isPro = isProPlan(planId)
  
  switch (feature) {
    case 'invoicing':
      return plan.limits.invoices !== 'none' && plan.limits.invoices !== 0
    case 'advanced_analytics':
      return isPro
    case 'invoice_customization':
      return isPro
    case 'api_access':
      return isPro
    default:
      return false // Secure default: deny access for unknown features
  }
}

export function calculateYearlySavings(): number {
  const monthly = SUBSCRIPTION_PLANS.pro_monthly.price * 12
  const yearly = SUBSCRIPTION_PLANS.pro_yearly.price * 12
  return monthly - yearly
}

// Safe limits checking
export function checkLimits(planId: string, usage: { projects: number; clients: number; invoices: number }): {
  canCreateProject: boolean
  canCreateClient: boolean
  canCreateInvoice: boolean
  projectsRemaining: number | 'unlimited'
  clientsRemaining: number | 'unlimited'
  invoicesRemaining: number | 'unlimited'
} {
  const plan = getPlan(planId)
  
  const canCreateProject = plan.limits.projects === 'unlimited' || usage.projects < plan.limits.projects
  const canCreateClient = plan.limits.clients === 'unlimited' || usage.clients < plan.limits.clients
  const canCreateInvoice = plan.limits.invoices === 'unlimited' || usage.invoices < plan.limits.invoices
  
  const projectsRemaining = plan.limits.projects === 'unlimited' 
    ? 'unlimited' 
    : Math.max(0, plan.limits.projects - usage.projects)
    
  const clientsRemaining = plan.limits.clients === 'unlimited' 
    ? 'unlimited' 
    : Math.max(0, plan.limits.clients - usage.clients)

  const invoicesRemaining = plan.limits.invoices === 'unlimited' 
    ? 'unlimited' 
    : Math.max(0, plan.limits.invoices - usage.invoices)
  
  return {
    canCreateProject,
    canCreateClient,
    canCreateInvoice,
    projectsRemaining,
    clientsRemaining,
    invoicesRemaining
  }
}