// Stripe-only subscription provider
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react'
import { useAuth } from '@/components/auth-provider'
import { SubscriptionPlan, UserSubscription, UsageLimits, FeatureAccess } from '@/lib/types/subscription'
import { getPlan, checkLimits, canAccessFeature } from '@/lib/subscription-plans'
import { areSubscriptionsEnabled, isStripeConfigured } from '@/lib/config/environment'
import { useSubscriptionPerformance } from '@/hooks/use-subscription-performance'

interface SubscriptionContextType {
  subscription: UserSubscription
  plan: SubscriptionPlan
  usage: UsageLimits
  isLoading: boolean
  error: string | null
  hasAccess: (feature: keyof FeatureAccess) => boolean
  canCreate: (resource: 'projects' | 'clients' | 'invoices') => boolean
  getOverLimitStatus: () => { isOverLimit: boolean; restrictions: string[] }
  upgrade: (planId: string) => Promise<void>
  refetchSubscription: (forceUsageCheck?: boolean) => void
  provider: 'stripe' | null
  // Optimistic updates
  updateSubscriptionOptimistically: (newSubscription: Partial<UserSubscription>) => void
  optimisticUpgrade: (planId: string) => void
  // Quick access for UI components
  getCachedPlanId: () => string
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
  const { startTiming, endTiming, trackCacheHit, trackCacheMiss, trackApiCall } = useSubscriptionPerformance()
  
  const [subscription, setSubscription] = useState<UserSubscription>({
    planId: 'free',
    status: 'active',
    customerId: null,
    subscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  })

  const [usage, setUsage] = useState<UsageLimits>({
    projects: { current: 0, limit: 20, canCreate: true },
    clients: { current: 0, limit: 10, canCreate: true },
    invoices: { current: 0, limit: 'none', canCreate: false }
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Add subscription caching
  const [subscriptionCache, setSubscriptionCache] = useState<{
    data: UserSubscription | null
    timestamp: number
    userId: string
  }>({ data: null, timestamp: 0, userId: '' })
  
  // Add separate usage caching to prevent redundant API calls
  const [usageCache, setUsageCache] = useState<{
    data: UsageLimits | null
    timestamp: number
    userId: string
    planId: string
  }>({ data: null, timestamp: 0, userId: '', planId: '' })
  
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
  const USAGE_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes cache for usage (shorter since it changes more)

  // Memoized feature access to prevent redundant calculations
  const featureAccess = useMemo(() => ({
    invoicing: canAccessFeature(subscription.planId, 'invoicing'),
    advanced_analytics: canAccessFeature(subscription.planId, 'advanced_analytics'),
    invoice_customization: canAccessFeature(subscription.planId, 'invoice_customization'),
    api_access: canAccessFeature(subscription.planId, 'api_access')
  }), [subscription.planId])

  const hasAccess = useCallback((feature: keyof FeatureAccess): boolean => {
    // Always enforce feature access regardless of configuration
    // This ensures Pro features are protected even in dev/misconfigured environments
    if (isLoading) return false  // Deny access during loading for security
    return featureAccess[feature]
  }, [isLoading, featureAccess])

  const canCreate = (resource: 'projects' | 'clients' | 'invoices'): boolean => {
    // Always enforce limits regardless of configuration for consistency
    const limits = usage[resource]
    return limits.canCreate
  }

  const getOverLimitStatus = () => {
    if (!areSubscriptionsEnabled()) return { isOverLimit: false, restrictions: [] }
    
    const plan = getPlan(subscription.planId)
    const restrictions = []
    let isOverLimit = false
    
    if (plan.limits.projects !== 'unlimited' && usage.projects.current > plan.limits.projects) {
      isOverLimit = true
      restrictions.push(`You have ${usage.projects.current} projects but your current plan only allows ${plan.limits.projects}. Some features may be limited.`)
    }
    
    if (plan.limits.clients !== 'unlimited' && usage.clients.current > plan.limits.clients) {
      isOverLimit = true
      restrictions.push(`You have ${usage.clients.current} clients but your current plan only allows ${plan.limits.clients}. Some features may be limited.`)
    }
    
    if (plan.limits.invoices === 'none' && usage.invoices.current > 0) {
      isOverLimit = true
      restrictions.push(`You have ${usage.invoices.current} invoices but your current plan doesn't include invoicing. Consider upgrading to Pro.`)
    }
    
    return { isOverLimit, restrictions }
  }

  const loadSubscriptionData = async (force: boolean = false) => {
    if (!user) {
      setSubscription({
        planId: 'free',
        status: 'active',
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      })
      setIsLoading(false)
      return
    }

    // Check cache first (unless force refresh)
    const now = Date.now()
    const isCacheValid = !force && 
      subscriptionCache.data && 
      subscriptionCache.userId === user.id &&
      (now - subscriptionCache.timestamp) < CACHE_DURATION

    if (isCacheValid && subscriptionCache.data) {
      console.log('🎯 Using cached subscription data')
      trackCacheHit()
      setSubscription(subscriptionCache.data)
      await updateUsageLimits(subscriptionCache.data.planId)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      startTiming('subscription_load')
      trackCacheMiss()
      
      const { supabase } = await import('@/lib/supabase')
      
      console.log('🔍 Fetching subscription data for user ID:', user.id)
      
      const apiTracker = trackApiCall('subscription_query')
      
      // Optimized query - only fetch subscription-related fields
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          subscription_plan_id,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_current_period_end,
          cancel_at_period_end
        `)
        .eq('id', user.id)
        .single()

      console.log('🔍 Database query result:', { profile, error })

      if (error) {
        console.error('Error fetching subscription data:', error)
        apiTracker.error()
        endTiming('subscription_load', false)
        setError('Failed to load subscription data')
        setIsLoading(false)
        return
      }
      
      apiTracker.success()

      if (!profile) {
        console.error('❌ No profile found for user:', user.id)
        setError('User profile not found')
        setIsLoading(false)
        return
      }

      // Check if user has a subscription in the database
      // Note: Client-side Stripe config check may fail due to server-only env vars, 
      // but server-side Stripe functionality works correctly
      if (profile && (profile.subscription_plan_id === 'pro_monthly' || profile.subscription_plan_id === 'pro_yearly')) {
        const subscriptionData = {
          planId: profile.subscription_plan_id,
          status: profile.subscription_status || 'active',
          customerId: profile.stripe_customer_id,
          subscriptionId: profile.stripe_subscription_id,
          currentPeriodEnd: profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null,
          cancelAtPeriodEnd: profile.cancel_at_period_end || false
        }
        

        
        setSubscription(subscriptionData)
        
        // Cache the successful result
        setSubscriptionCache({
          data: subscriptionData,
          timestamp: Date.now(),
          userId: user.id
        })
        
        await updateUsageLimits(subscriptionData.planId)
        setError(null)
        endTiming('subscription_load', true)
        setIsLoading(false)
        return
      }
      
      // Default to free plan if no pro subscription found
      const freeSubscription = {
        planId: 'free' as const,
        status: 'active' as const,
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      }
      
      setSubscription(freeSubscription)
      
      // Cache the free plan result too
      setSubscriptionCache({
        data: freeSubscription,
        timestamp: Date.now(),
        userId: user.id
      })
      
      await updateUsageLimits('free')
      setError(null)
      endTiming('subscription_load', true)
      setIsLoading(false)

    } catch (err) {
      console.error('Error loading subscription data:', err)
      setError('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const updateUsageLimits = async (planId: string, force: boolean = false) => {
    if (!user) return
    
    // Check usage cache first (unless force refresh)
    const now = Date.now()
    const isUsageCacheValid = !force && 
      usageCache.data && 
      usageCache.userId === user.id &&
      usageCache.planId === planId &&
      (now - usageCache.timestamp) < USAGE_CACHE_DURATION

    if (isUsageCacheValid && usageCache.data) {
      console.log('🎯 Using cached usage data')
      trackCacheHit()
      setUsage(usageCache.data)
      return
    }

    const plan = getPlan(planId)
    
    try {
      trackCacheMiss()
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const response = await fetch('/api/usage', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        const usageData = result.usage || result
        
        const newUsage = {
          projects: { 
            current: usageData.projects || 0, 
            limit: plan.limits.projects, 
            canCreate: plan.limits.projects === 'unlimited' || (usageData.projects || 0) < plan.limits.projects 
          },
          clients: { 
            current: usageData.clients || 0, 
            limit: plan.limits.clients, 
            canCreate: plan.limits.clients === 'unlimited' || (usageData.clients || 0) < plan.limits.clients 
          },
          invoices: { 
            current: usageData.invoices || 0, 
            limit: plan.limits.invoices, 
            canCreate: plan.limits.invoices === 'unlimited' || (plan.limits.invoices !== 'none' && (usageData.invoices || 0) < plan.limits.invoices)
          }
        }
        
        // Update state
        setUsage(newUsage)
        
        // Cache the usage data
        setUsageCache({
          data: newUsage,
          timestamp: now,
          userId: user.id,
          planId: planId
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
      
      if (!user?.id) {
        throw new Error('Please log in to upgrade your subscription')
      }
      
      const baseUrl = window.location.origin
      const checkoutUrl = `${baseUrl}/api/stripe-checkout?plan=${planId}&uid=${user.id}`
      
      window.location.href = checkoutUrl
      
    } catch (err) {
      console.error('Error starting upgrade:', err)
      setError(err instanceof Error ? err.message : 'Failed to start upgrade process')
    } finally {
      setIsLoading(false)
    }
  }

  // Add optimistic update function
  const updateSubscriptionOptimistically = useCallback((newSubscription: Partial<UserSubscription>) => {
    console.log('🚀 Optimistic update:', newSubscription)
    
    const updatedSubscription = { ...subscription, ...newSubscription }
    setSubscription(updatedSubscription)
    
    // Update cache optimistically too
    setSubscriptionCache({
      data: updatedSubscription,
      timestamp: Date.now(),
      userId: user?.id || ''
    })
    
    // Update usage limits if plan changed
    if (newSubscription.planId) {
      updateUsageLimits(newSubscription.planId)
    }
  }, [subscription, user?.id])

  // Add to context
  const optimisticUpgrade = useCallback((planId: string) => {
    updateSubscriptionOptimistically({
      planId: planId as any,
      status: 'active'
    })
  }, [updateSubscriptionOptimistically])

  // Quick cached plan ID access for UI components
  const getCachedPlanId = useCallback((): string => {
    // Return current subscription if not loading
    if (!isLoading) return subscription.planId
    
    // Return cached subscription if available
    if (subscriptionCache.data && subscriptionCache.userId === user?.id) {
      const cacheAge = Date.now() - subscriptionCache.timestamp
      if (cacheAge < CACHE_DURATION) {
        return subscriptionCache.data.planId
      }
    }
    
    // Default to free
    return 'free'
  }, [isLoading, subscription.planId, subscriptionCache, user?.id])

  const refetchSubscription = useCallback((forceUsageCheck: boolean = false) => {
    if (user) {
      loadSubscriptionData(true)
      if (forceUsageCheck) {
        updateUsageLimits(subscription.planId)
      }
    }
  }, [user, subscription.planId])

  useEffect(() => {
    if (user && user.id) {
      loadSubscriptionData(true)
    }
  }, [user?.id])

  const value: SubscriptionContextType = {
    subscription,
    plan: getPlan(subscription.planId),
    usage,
    isLoading,
    error,
    hasAccess,
    canCreate,
    getOverLimitStatus,
    upgrade,
    refetchSubscription,
    provider: 'stripe',
    // Optimistic updates
    updateSubscriptionOptimistically,
    optimisticUpgrade,
    // Quick access
    getCachedPlanId
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
