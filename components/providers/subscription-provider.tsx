// Polar subscription provider with unified cache and events
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo, useRef } from 'react'
import { useAuth } from '@/components/auth-provider'
import { SubscriptionPlan, UserSubscription, UsageLimits, FeatureAccess } from '@/lib/types/subscription'
import { getPlan, checkLimits, canAccessFeature, isProPlan } from '@/lib/subscription-plans'
import { areSubscriptionsEnabled, isPolarConfigured, FEATURE_FLAGS } from '@/lib/config/environment'
import { useSubscriptionPerformance } from '@/hooks/use-subscription-performance'
import { trackSubscriptionOperation } from '@/lib/subscription-performance-tracker'
import SubscriptionCache from '@/lib/subscription-cache'
import { subscriptionEvents, emitUpgraded, emitSynced } from '@/lib/subscription-events'

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
  refetchSubscription: (forceUsageCheck?: boolean, immediate?: boolean) => void
  provider: 'polar'
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
    invoices: { current: 0, limit: 5, canCreate: true }
  })

  // Start with loading state true to prevent hydration mismatch
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Track if component has mounted (for SSR safety)
  const [hasMounted, setHasMounted] = useState(false)
  
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Listen for logout events to clear subscription cache
  useEffect(() => {
    const handleLogout = () => {
      console.log('🔄 Subscription Provider: Clearing cache due to logout')
      
      // Clear unified cache
      if (user?.id) {
        SubscriptionCache.clear(user.id)
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

    const handleSubscriptionCacheClear = (event: CustomEvent) => {
      console.log('🔄 Subscription Provider: Manual cache clear requested', event.detail)
      
      if (user?.id) {
        SubscriptionCache.clear(user.id)
        // Force reload subscription data
        loadSubscriptionData(true)
      }
    }

    window.addEventListener('auth-logout', handleLogout)
    window.addEventListener('subscription-cache-clear', handleSubscriptionCacheClear as EventListener)
    
    return () => {
      window.removeEventListener('auth-logout', handleLogout)
      window.removeEventListener('subscription-cache-clear', handleSubscriptionCacheClear as EventListener)
    }
  }, [user?.id])

  // Track if we need to reload subscription data for Google OAuth users
  const [shouldReloadForOAuth, setShouldReloadForOAuth] = useState(false)
  
  // Listen for user sign-in events (especially for Google OAuth)
  useEffect(() => {
    const handleUserSignedIn = (event: CustomEvent) => {
      console.log('🔄 Subscription Provider: User signed in, marking for reload', event.detail)
      
      // Mark that we need to reload subscription data for new sign-ins
      // This ensures Google OAuth users get proper subscription data
      if (event.detail?.userId && user?.id === event.detail.userId) {
        // Clear any stale cache first
        SubscriptionCache.clear(user.id)
        setShouldReloadForOAuth(true)
      }
    }

    window.addEventListener('user-signed-in', handleUserSignedIn as EventListener)
    
    return () => {
      window.removeEventListener('user-signed-in', handleUserSignedIn as EventListener)
    }
  }, [user?.id])

  // Add immediate cache lookup to reduce loading time
  const [hasCheckedInitialCache, setHasCheckedInitialCache] = useState(false)

  // Enhanced cached plan ID access for UI components (SSR-safe)
  const getCachedPlanId = useCallback((): string => {
    // During SSR or before mount, always return 'free' to prevent mismatch
    if (typeof window === 'undefined' || !hasMounted) {
      return 'free'
    }
    
    // Return current subscription if not loading
    if (!isLoading) return subscription.planId
    
    // Check unified cache first
    if (user?.id) {
      const cached = SubscriptionCache.get(user.id)
      if (cached) {
        return cached.planId
      }
    }
    
    // Only check user-specific cache to prevent data leakage between users
    // No fallback to generic localStorage keys
    
    // Default to free
    return 'free'
  }, [isLoading, subscription.planId, user?.id, hasMounted])

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
    
    if (plan.limits.invoices !== 'unlimited' && usage.invoices.current > plan.limits.invoices) {
      isOverLimit = true
      restrictions.push(`You have ${usage.invoices.current} invoices but your current plan only allows ${plan.limits.invoices}. Some features may be limited.`)
    }
    
    return { isOverLimit, restrictions }
  }

  // Enhanced function to check initial cache without loading state
  const checkInitialCache = useCallback(() => {
    if (!user || hasCheckedInitialCache) return false
    
    // Check unified cache first
    const cached = SubscriptionCache.get(user.id)
    
    if (cached) {
      console.log(`🚀 Using initial cached subscription data (instant load) - ${isProPlan(cached.planId) ? 'Pro user' : 'Free user'} cache`)
      trackCacheHit()
      setSubscription(cached)
      setIsLoading(false) // Set loading false immediately for cached data
      setHasCheckedInitialCache(true)
      
      // Update usage in background - always update to ensure correct limits
      setTimeout(() => updateUsageLimits(cached.planId), 100)
      return true
    }
    
    // No fallback to generic localStorage keys - only use user-specific cache
    // This prevents new users from inheriting stale pro subscription data
    console.log('🔍 No cached subscription found for user:', user.id)
    
    setHasCheckedInitialCache(true)
    return false
  }, [user?.id, hasCheckedInitialCache, trackCacheHit])

  const loadSubscriptionData = async (force: boolean = false) => {
    const perfTracker = trackSubscriptionOperation(`load-${Date.now()}`, 'loadSubscriptionData')
    
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
      perfTracker.end(true, { userId: 'anonymous' })
      return
    }

    // Check cache first (unless force refresh)
    if (!force) {
      const cached = SubscriptionCache.get(user.id)
      
      if (cached) {
        console.log(`🎯 Using cached subscription data - ${isProPlan(cached.planId) ? 'Pro user' : 'Free user'} cache`)
        trackCacheHit()
        setSubscription(cached)
        await updateUsageLimits(cached.planId)
        setIsLoading(false)
        perfTracker.end(true, { cacheHit: true, userId: user.id })
        return
      }
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

      console.log('🔍 Database query result:', { 
        profile, 
        error,
        subscription_plan_id: profile?.subscription_plan_id || 'NOT SET',
        isGoogleUser: user.app_metadata?.provider === 'google'
      })

      if (error) {
        console.error('Error fetching subscription data:', error)
        apiTracker.error()
        endTiming('subscription_load', false)
        setError('Failed to load subscription data')
        setIsLoading(false)
        perfTracker.end(false, { userId: user.id })
        return
      }
      
      apiTracker.success()

      if (!profile) {
        console.log('👤 No profile found for user, creating profile and default subscription for new user:', user.id)
        
        // Try to create a profile for the user (particularly useful for Google OAuth users)
        try {
          const newProfile = {
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            email: user.email || '',
            subscription_plan_id: 'free',
            subscription_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
          
          if (insertError) {
            console.warn('Failed to create profile for user (may already exist):', insertError.message)
          } else {
            console.log('✅ Created profile for new user:', user.id)
          }
        } catch (profileError) {
          console.warn('Error creating profile for user:', profileError)
        }
        
        // Default to free plan for users without profiles (like Google OAuth users)
        const freeSubscription = {
          planId: 'free' as const,
          status: 'active' as const,
          customerId: null,
          subscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        }
        
        setSubscription(freeSubscription)
        
        // Cache the free plan result
        SubscriptionCache.set(user.id, freeSubscription)
        
        console.log('✅ Subscription loaded: Free user (no profile, default setup)')
        
        await updateUsageLimits('free') // Free users always need usage tracking
        setError(null)
        endTiming('subscription_load', true)
        setIsLoading(false)
        perfTracker.end(true, { userId: user.id, cacheHit: false })
        return
      }

      // Check if user has a PRO subscription in the database
      // IMPORTANT: Default to FREE plan unless explicitly pro_monthly or pro_yearly
      // This prevents Google OAuth users from accidentally getting pro features
      const hasProSubscription = profile && 
        profile.subscription_plan_id && 
        (profile.subscription_plan_id === 'pro_monthly' || profile.subscription_plan_id === 'pro_yearly')
      
      if (hasProSubscription) {
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
        SubscriptionCache.set(user.id, subscriptionData)
        
        console.log(`✅ Subscription loaded: ${isProPlan(subscriptionData.planId) ? 'Pro' : 'Free'} user (conditional rendering)`)

        // Always update usage limits - Pro users need unlimited limits set
        await updateUsageLimits(subscriptionData.planId)
        setError(null)
        endTiming('subscription_load', true)
        setIsLoading(false)
        perfTracker.end(true, { userId: user.id, cacheHit: false })
        return
      }
      
      // Default to free plan if no pro subscription found
      console.log('🆓 No pro subscription found, defaulting to FREE plan', {
        subscription_plan_id: profile?.subscription_plan_id || 'NOT SET',
        hasProSubscription,
        userId: user.id
      })
      
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
      SubscriptionCache.set(user.id, freeSubscription)
      
      console.log('✅ Subscription loaded: Free user (conditional rendering)')
      
      await updateUsageLimits('free') // Free users always need usage tracking
      setError(null)
      endTiming('subscription_load', true)
      setIsLoading(false)
      perfTracker.end(true, { userId: user.id, cacheHit: false })

    } catch (err) {
      console.error('Error loading subscription data:', err)
      setError('Failed to load subscription data')
      perfTracker.end(false, { userId: user?.id })
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
          limit: 'unlimited' as const, // Always unlimited for Pro users
          canCreate: true // Always true for unlimited
        },
        clients: { 
          current: 0, // We don't track actual usage for unlimited plans
          limit: 'unlimited' as const, // Always unlimited for Pro users
          canCreate: true // Always true for unlimited
        },
        invoices: { 
          current: 0, // We don't track actual usage for unlimited plans
          limit: 'unlimited' as const, // Always unlimited for Pro users
          canCreate: true // Always true for unlimited
        }
      }
      
      setUsage(unlimitedUsage)
      return
    }

    // For free users, we need actual usage tracking
    // Note: We're not caching usage data separately anymore - it's fetched fresh for accuracy
    const now = Date.now()

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
            canCreate: plan.limits.invoices === 'unlimited' || (usageData.invoices || 0) < plan.limits.invoices
          }
        }
        
        // Update state
        setUsage(newUsage)
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
      const checkoutUrl = `${baseUrl}/api/polar-checkout?plan=${planId}&uid=${user.id}`
      
      // Redirect in the same tab for better UX
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
    if (user?.id) {
      SubscriptionCache.set(user.id, updatedSubscription)
    }
    
    console.log(`🚀 Optimistic update: ${isProPlan(newSubscription.planId || 'free') ? 'Pro' : 'Free'} user (conditional rendering)`)
    
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

  // Debounce timer ref for refetchSubscription
  const refetchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const refetchSubscription = useCallback((forceUsageCheck: boolean = false, immediate: boolean = false) => {
    if (!user) return
    
    // For immediate refresh (e.g., after subscription changes), skip debouncing
    if (immediate) {
      console.log('🔄 Executing immediate subscription refresh')
      loadSubscriptionData(true)
      if (forceUsageCheck) {
        updateUsageLimits(subscription.planId)
      }
      return
    }
    
    // Clear existing debounce timer
    if (refetchDebounceRef.current) {
      clearTimeout(refetchDebounceRef.current)
    }
    
    // Debounce non-critical refresh calls (3 seconds)
    refetchDebounceRef.current = setTimeout(() => {
      console.log('🔄 Executing debounced subscription refresh')
      loadSubscriptionData(true)
      if (forceUsageCheck && !isProPlan(subscription.planId)) {
        // Skip usage update for pro users (they have unlimited)
        updateUsageLimits(subscription.planId)
      }
    }, 3000)
  }, [user, subscription.planId])
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (refetchDebounceRef.current) {
        clearTimeout(refetchDebounceRef.current)
      }
    }
  }, [])

  // Log subscription status for debugging (conditional rendering approach)
  useEffect(() => {
    if (hasMounted && !isLoading && subscription.planId) {
      console.log(`🚀 Zero-flash: Subscription confirmed for ${isProPlan(subscription.planId) ? 'Pro' : 'Free'} user`)
    }
  }, [hasMounted, isLoading, subscription.planId])

  // Reset cache check flag when user changes
  useEffect(() => {
    setHasCheckedInitialCache(false)
  }, [user?.id])

  // Add immediate effect to check cache on mount/user change
  useEffect(() => {
    const initializeSubscription = async () => {
      // Wait for component mount before proceeding
      if (!hasMounted) return
      
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
  }, [user?.id, hasMounted])

  // Handle OAuth reload flag
  useEffect(() => {
    if (shouldReloadForOAuth && hasMounted && user?.id) {
      console.log('🔄 Executing OAuth reload for user:', user.id)
      setShouldReloadForOAuth(false)
      
      // Add a small delay to ensure profile is created in database
      setTimeout(() => {
        loadSubscriptionData(true)
      }, 1500)
    }
  }, [shouldReloadForOAuth, hasMounted, user?.id])

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
    provider: 'polar',
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
