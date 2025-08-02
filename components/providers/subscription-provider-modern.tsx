// Modern Polar integration using official Next.js adapter
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { SubscriptionPlan, UserSubscription, UsageLimits, FeatureAccess } from '@/lib/types/subscription'
import { getPlan, checkLimits } from '@/lib/subscription-plans'
import { areSubscriptionsEnabled } from '@/lib/config/environment'

interface SubscriptionContextType {
  subscription: UserSubscription
  usage: UsageLimits
  isLoading: boolean
  error: string | null
  hasAccess: (feature: keyof FeatureAccess) => boolean
  canCreate: (resource: 'projects' | 'clients' | 'invoices') => boolean
  upgrade: (planId: string) => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription>({
    planId: 'free',
    status: 'active',
    customerId: null,
    subscriptionId: null,
    currentPeriodEnd: null
  })

  const [usage, setUsage] = useState<UsageLimits>({
    projects: { current: 0, limit: 20, canCreate: true },
    clients: { current: 0, limit: 10, canCreate: true },
    invoices: { current: 0, limit: Infinity, canCreate: true }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAccess = (feature: keyof FeatureAccess): boolean => {
    if (!areSubscriptionsEnabled()) return true
    const plan = getPlan(subscription.planId)
    return plan.features[feature]
  }

  const canCreate = (resource: 'projects' | 'clients' | 'invoices'): boolean => {
    if (!areSubscriptionsEnabled()) return true
    const limits = usage[resource]
    return limits.current < limits.limit
  }

  const loadSubscriptionData = async () => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan_id, subscription_status, polar_customer_id, polar_subscription_id, subscription_current_period_end')
        .eq('id', user.id)
        .single()

      if (profile) {
        setSubscription({
          planId: profile.subscription_plan_id || 'free',
          status: profile.subscription_status || 'active',
          customerId: profile.polar_customer_id,
          subscriptionId: profile.polar_subscription_id,
          currentPeriodEnd: profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null
        })
      }
    } catch (err) {
      console.error('Error loading subscription data:', err)
    }
  }

  const checkUsage = async () => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('No session found for usage check')
        return
      }

      const response = await fetch('/api/usage', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const usageData = await response.json()
        const plan = getPlan(subscription.planId)
        
        setUsage({
          projects: { current: usageData.projects || 0, limit: plan.limits.projects, canCreate: (usageData.projects || 0) < plan.limits.projects },
          clients: { current: usageData.clients || 0, limit: plan.limits.clients, canCreate: (usageData.clients || 0) < plan.limits.clients },
          invoices: { current: usageData.invoices || 0, limit: plan.limits.invoices, canCreate: (usageData.invoices || 0) < plan.limits.invoices }
        })
      }
    } catch (err) {
      console.error('Error checking usage:', err)
    }
  }

  const upgrade = async (planId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Modern approach: use the Polar Next.js adapter route with plan parameter
      const baseUrl = window.location.origin
      const checkoutUrl = `${baseUrl}/api/polar-checkout?plan=${planId}`
      
      // Redirect to modern Polar checkout
      window.location.href = checkoutUrl
      
    } catch (err) {
      console.error('Error starting upgrade:', err)
      setError(err instanceof Error ? err.message : 'Failed to start upgrade process')
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize subscription data
  useEffect(() => {
    if (user) {
      loadSubscriptionData()
      checkUsage()
    }
  }, [user])

  // Check usage when subscription plan changes
  useEffect(() => {
    if (user && subscription.planId) {
      checkUsage()
    }
  }, [subscription.planId, user])

  const value: SubscriptionContextType = {
    subscription,
    usage,
    isLoading,
    error,
    hasAccess,
    canCreate,
    upgrade
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}