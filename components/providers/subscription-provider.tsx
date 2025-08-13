// Stripe/Polar subscription provider
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react'
import { useAuth } from '@/components/auth-provider'
import { SubscriptionPlan, UserSubscription, UsageLimits, FeatureAccess } from '@/lib/types/subscription'
import { getPlan, checkLimits, canAccessFeature, isProPlan } from '@/lib/subscription-plans'
import { areSubscriptionsEnabled, isStripeConfigured, isPolarConfigured, FEATURE_FLAGS } from '@/lib/config/environment'
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
  provider: 'stripe' | 'polar' | null
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

  // Start with loading state true to prevent hydration mismatch
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize subscription cache (will be hydrated on client)
  const [subscriptionCache, setSubscriptionCache] = useState<{
    data: UserSubscription | null
    timestamp: number
    userId: string
  }>({ data: null, timestamp: 0, userId: '' })
  
  // Track if we've hydrated from localStorage yet
  const [hasHydratedCache, setHasHydratedCache] = useState(false)
  
  // Add separate usage caching to prevent redundant API calls
  const [usageCache, setUsageCache] = useState<{
    data: UsageLimits | null
    timestamp: number
    userId: string
    planId: string
  }>({ data: null, timestamp: 0, userId: '', planId: '' })
  
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache for free users
  const PRO_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours cache for pro users (more stable)
  const USAGE_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes cache for usage (shorter since it changes more)

  // Listen for logout events to clear subscription cache
  useEffect(() => {
    const handleLogout = () => {
      console.log('🔄 Subscription Provider: Clearing cache due to logout')
      
      // Clear subscription cache
      setSubscriptionCache({ data: null, timestamp: 0, userId: '' })
      setUsageCache({ data: null, timestamp: 0, userId: '', planId: '' })
      
      // Clear localStorage caches
      try {
        localStorage.removeItem('subscription-cache')
        localStorage.removeItem('usage-cache')
      } catch (error) {
        console.warn('Failed to clear subscription localStorage cache:', error)
      }
      
      // Reset to default state
      setSubscription({
        planId: 'free',
        status: 'active',
        customerId: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      })
      
      setUsage({
        projects: { current: 0, limit: 20, canCreate: true },
        clients: { current: 0, limit: 10, canCreate: true },
        invoices: { current: 0, limit: 'none', canCreate: false }
      })
      
      setIsLoading(false)
      setError(null)
    }

    window.addEventListener('auth-logout', handleLogout)
    
    return () => {
      window.removeEventListener('auth-logout', handleLogout)
    }
  }, [])

  // Add immediate cache lookup to reduce loading time
  const [hasCheckedInitialCache, setHasCheckedInitialCache] = useState(false)

  // Quick cached plan ID access for UI components (SSR-safe)
  const getCachedPlanId = useCallback((): string => {
    // During SSR or before hydration, always return 'free' to prevent mismatch
    if (typeof window === 'undefined' || !hasHydratedCache) {
      return 'free'
    }
    
    // Return current subscription if not loading
    if (!isLoading) return subscription.planId
    
    // Return cached subscription if available
    if (subscriptionCache.data && subscriptionCache.userId === user?.id) {
      const cacheAge = Date.now() - subscriptionCache.timestamp
      const cachedPlanId = subscriptionCache.data.planId
      
      // Use different cache durations: pro users get longer cache
      const effectiveCacheDuration = isProPlan(cachedPlanId) ? PRO_CACHE_DURATION : CACHE_DURATION
      
      if (cacheAge < effectiveCacheDuration) {
        return cachedPlanId
      }
    }
    
    // Default to free
    return 'free'
  }, [isLoading, subscription.planId, subscriptionCache, user?.id, hasHydratedCache])

  // Smart feature access that prioritizes cached pro detection
  const featureAccess = useMemo(() => ({
    invoicing: canAccessFeature(subscription.planId, 'invoicing'),
    advanced_analytics: canAccessFeature(subscription.planId, 'advanced_analytics'),
    invoice_customization: canAccessFeature(subscription.planId, 'invoice_customization'),
    api_access: canAccessFeature(subscription.planId, 'api_access')
  }), [subscription.planId])

  const hasAccess = useCallback((feature: keyof FeatureAccess): boolean => {
    // For known pro users (from cache), grant immediate access even during loading
    const cachedPlanId = getCachedPlanId()
    if (isLoading && isProPlan(cachedPlanId)) {
      return canAccessFeature(cachedPlanId, feature)
    }
    
    // For loading non-pro users, deny access for security
    if (isLoading) return false
    
    return featureAccess[feature]
  }, [isLoading, featureAccess, getCachedPlanId])

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

  // New function to check initial cache without loading state
  const checkInitialCache = useCallback(() => {
    if (!user || hasCheckedInitialCache) return false
    
    const now = Date.now()
    const cachedPlanId = subscriptionCache.data?.planId
    
    // Use different cache durations: pro users get longer cache
    const effectiveCacheDuration = isProPlan(cachedPlanId) ? PRO_CACHE_DURATION : CACHE_DURATION
    
    const isCacheValid = subscriptionCache.data && 
      subscriptionCache.userId === user.id &&
      (now - subscriptionCache.timestamp) < effectiveCacheDuration

    if (isCacheValid && subscriptionCache.data) {
      console.log(`🚀 Using initial cached subscription data (instant load) - ${isProPlan(cachedPlanId) ? 'Pro user' : 'Free user'} cache`)
      trackCacheHit()
      setSubscription(subscriptionCache.data)
      setIsLoading(false) // Set loading false immediately for cached data
      setHasCheckedInitialCache(true)
      
      // Update usage in background - skip entirely for pro users
      if (!isProPlan(subscriptionCache.data.planId)) {
        setTimeout(() => updateUsageLimits(subscriptionCache.data.planId), 100)
      } else {
        console.log('⚡ Skipping background usage update for cached pro user')
      }
      return true
    }
    
    setHasCheckedInitialCache(true)
    return false
  }, [user?.id, subscriptionCache.data, subscriptionCache.userId, subscriptionCache.timestamp, hasCheckedInitialCache, trackCacheHit])

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
    const cachedPlanId = subscriptionCache.data?.planId
    
    // Use different cache durations: pro users get longer cache
    const effectiveCacheDuration = isProPlan(cachedPlanId) ? PRO_CACHE_DURATION : CACHE_DURATION
    
    const isCacheValid = !force && 
      subscriptionCache.data && 
      subscriptionCache.userId === user.id &&
      (now - subscriptionCache.timestamp) < effectiveCacheDuration

    if (isCacheValid && subscriptionCache.data) {
      console.log(`🎯 Using cached subscription data - ${isProPlan(cachedPlanId) ? 'Pro user' : 'Free user'} cache`)
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
          polar_customer_id,
          polar_subscription_id,
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
      // Note: Client-side Stripe/Polar config check may fail due to server-only env vars, 
      // but server-side payment functionality works correctly
      if (profile && (profile.subscription_plan_id === 'pro_monthly' || profile.subscription_plan_id === 'pro_yearly')) {
        const subscriptionData = {
          planId: profile.subscription_plan_id,
          status: profile.subscription_status || 'active',
          customerId: FEATURE_FLAGS.USE_POLAR ? profile.polar_customer_id : profile.stripe_customer_id,
          subscriptionId: FEATURE_FLAGS.USE_POLAR ? profile.polar_subscription_id : profile.stripe_subscription_id,
          currentPeriodEnd: profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null,
          cancelAtPeriodEnd: profile.cancel_at_period_end || false
        }
        

        
        setSubscription(subscriptionData)
        
        // Cache the successful result
        const cacheData = {
          data: subscriptionData,
          timestamp: Date.now(),
          userId: user.id
        }
        setSubscriptionCache(cacheData)
        
        // Also save to localStorage for persistence across sessions
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('brillo-subscription-cache', JSON.stringify(cacheData))
          } catch (error) {
            console.warn('Failed to save subscription cache to localStorage:', error)
          }
        }
        
        // Update html attribute for CSS-based hiding
        if (typeof window !== 'undefined') {
          document.documentElement.setAttribute('data-user-plan', isProPlan(subscriptionData.planId) ? 'pro' : 'free')
        }

        // Only update usage for non-pro plans to save API calls
        if (!isProPlan(subscriptionData.planId)) {
          await updateUsageLimits(subscriptionData.planId)
        } else {
          console.log('⚡ Skipping usage calculation for pro user during initial load')
        }
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
      const freeCacheData = {
        data: freeSubscription,
        timestamp: Date.now(),
        userId: user.id
      }
      setSubscriptionCache(freeCacheData)
      
      // Also save to localStorage for persistence across sessions
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('brillo-subscription-cache', JSON.stringify(freeCacheData))
        } catch (error) {
          console.warn('Failed to save subscription cache to localStorage:', error)
        }
      }
      
      // Update html attribute for free users
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-user-plan', 'free')
      }
      
      await updateUsageLimits('free') // Free users always need usage tracking
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
    
    const plan = getPlan(planId)
    
    // 🚀 PERFORMANCE OPTIMIZATION: Skip API calls for pro users entirely
    // Pro users have unlimited access, so we don't need to calculate actual usage
    if (isProPlan(planId)) {
      console.log('⚡ Skipping usage calculation for pro user - unlimited access')
      const unlimitedUsage = {
        projects: { 
          current: 0, // We don't track actual usage for unlimited plans
          limit: plan.limits.projects, 
          canCreate: true // Always true for unlimited
        },
        clients: { 
          current: 0, // We don't track actual usage for unlimited plans
          limit: plan.limits.clients, 
          canCreate: true // Always true for unlimited
        },
        invoices: { 
          current: 0, // We don't track actual usage for unlimited plans
          limit: plan.limits.invoices, 
          canCreate: true // Always true for unlimited
        }
      }
      
      setUsage(unlimitedUsage)
      
      // Cache the unlimited usage (no API call needed)
      setUsageCache({
        data: unlimitedUsage,
        timestamp: Date.now(),
        userId: user.id,
        planId: planId
      })
      return
    }

    // For free users, we need actual usage tracking
    const now = Date.now()
    const isUsageCacheValid = !force && 
      usageCache.data && 
      usageCache.userId === user.id &&
      usageCache.planId === planId &&
      (now - usageCache.timestamp) < USAGE_CACHE_DURATION

    if (isUsageCacheValid && usageCache.data) {
      console.log('🎯 Using cached usage data for free user')
      trackCacheHit()
      setUsage(usageCache.data)
      return
    }

    // Throttle API calls for free users only
    const throttleKey = `usage-${user.id}-${planId}`
    const lastCallTime = (window as any).__usageApiThrottle?.[throttleKey] || 0
    const throttleDelay = 2000 // 2 seconds between calls
    
    if (now - lastCallTime < throttleDelay && !force) {
      console.log('🔄 Throttling usage API call for free user')
      return
    }

    try {
      trackCacheMiss()
      console.log('📊 Fetching usage data for free user')
      
      // Set throttle timestamp
      if (!(window as any).__usageApiThrottle) {
        (window as any).__usageApiThrottle = {}
      }
      (window as any).__usageApiThrottle[throttleKey] = now

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
      console.error('Error checking usage for free user:', err)
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
      const checkoutEndpoint = FEATURE_FLAGS.USE_POLAR ? '/api/polar-checkout' : '/api/stripe-checkout'
      const checkoutUrl = `${baseUrl}${checkoutEndpoint}?plan=${planId}&uid=${user.id}`
      
      // Open checkout in new tab for better UX
      window.open(checkoutUrl, '_blank')
      
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
    const optimisticCacheData = {
      data: updatedSubscription,
      timestamp: Date.now(),
      userId: user?.id || ''
    }
    setSubscriptionCache(optimisticCacheData)
    
    // Also save to localStorage for persistence across sessions
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('brillo-subscription-cache', JSON.stringify(optimisticCacheData))
      } catch (error) {
        console.warn('Failed to save subscription cache to localStorage:', error)
      }
      
      // CRITICAL: Update CSS attribute for instant UI updates
      if (newSubscription.planId) {
        if (isProPlan(newSubscription.planId)) {
          document.documentElement.setAttribute('data-user-plan', 'pro')
          console.log('🚀 CSS attribute updated to pro for instant hiding')
        } else {
          document.documentElement.setAttribute('data-user-plan', 'free')
        }
      }
    }
    
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

  const refetchSubscription = useCallback((forceUsageCheck: boolean = false) => {
    if (user) {
      loadSubscriptionData(true)
      if (forceUsageCheck) {
        updateUsageLimits(subscription.planId)
      }
    }
  }, [user, subscription.planId])

  // Immediately set body attribute for CSS-based hiding on client mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasHydratedCache) {
      try {
        const saved = localStorage.getItem('brillo-subscription-cache')
        if (saved) {
          const parsed = JSON.parse(saved)
          const age = Date.now() - parsed.timestamp
          const cachedPlanId = parsed.data?.planId
          
          // Use different cache durations: pro users get longer cache
          const effectiveCacheDuration = isProPlan(cachedPlanId) ? PRO_CACHE_DURATION : CACHE_DURATION
          
          // Only use cache if still valid
          if (age < effectiveCacheDuration) {
            setSubscriptionCache(parsed)
            
            // INSTANT CSS-based hiding: Set html attribute immediately
            if (isProPlan(cachedPlanId)) {
              document.documentElement.setAttribute('data-user-plan', 'pro')
              console.log('🚀 Instant pro user detection - CSS hiding activated (24h cache)')
            } else {
              document.documentElement.setAttribute('data-user-plan', 'free')
            }
          }
        } else {
          // No cache means likely free user
          document.documentElement.setAttribute('data-user-plan', 'free')
        }
      } catch (error) {
        console.warn('Failed to load subscription cache from localStorage:', error)
        document.documentElement.setAttribute('data-user-plan', 'free')
      }
      setHasHydratedCache(true)
    }
  }, [hasHydratedCache])

  // Reset cache check flag when user changes
  useEffect(() => {
    setHasCheckedInitialCache(false)
  }, [user?.id])

  // Add immediate effect to check cache on mount/user change
  useEffect(() => {
    const initializeSubscription = async () => {
      // Wait for cache hydration before proceeding
      if (!hasHydratedCache) return
      
      if (user && user.id) {
        // Clear any existing timeout
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
        }

        // Set a fallback timeout to prevent infinite loading (10 seconds max)
        const timeout = setTimeout(() => {
          console.warn('⚠️ Subscription loading timeout - defaulting to free plan')
          setIsLoading(false)
          setSubscription({
            planId: 'free',
            status: 'active',
            customerId: null,
            subscriptionId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false
          })
        }, 10000)
        setLoadingTimeout(timeout)

        // First, try to use cached data immediately
        const hasCachedData = checkInitialCache()
        
        // If no cached data, load fresh data
        if (!hasCachedData) {
          await loadSubscriptionData(true)
        }
        
        // Clear timeout if we finish loading
        clearTimeout(timeout)
        setLoadingTimeout(null)
      } else if (!user) {
        // Clear timeout when user logs out
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          setLoadingTimeout(null)
        }
        
        // Reset state when user logs out
        setIsLoading(false)
        setSubscription({
          planId: 'free',
          status: 'active',
          customerId: null,
          subscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        })
      }
    }

    initializeSubscription()

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [user?.id, hasHydratedCache])

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
    provider: FEATURE_FLAGS.USE_POLAR ? 'polar' : 'stripe',
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
