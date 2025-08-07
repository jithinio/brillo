// Modern Polar integration using official Next.js adapter
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { SubscriptionPlan, UserSubscription, UsageLimits, FeatureAccess } from '@/lib/types/subscription'
import { getPlan, checkLimits, canAccessFeature } from '@/lib/subscription-plans'
import { areSubscriptionsEnabled } from '@/lib/config/environment'

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

// Helper function to clear stale subscription data
async function clearStaleSubscriptionData(userId: string) {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    console.log('🧹 Clearing stale subscription data for user:', userId)
    
    // Reset user to free plan and clear Polar references
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_plan_id: 'free',
        polar_customer_id: null,
        polar_subscription_id: null,
        subscription_current_period_start: null,
        subscription_current_period_end: null
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error clearing stale subscription data:', error)
    } else {
      console.log('✅ Successfully cleared stale subscription data')
      return true // Indicate successful cleanup
    }
  } catch (error) {
    console.error('Error in clearStaleSubscriptionData:', error)
  }
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth()
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
    invoices: { current: 0, limit: 'none', canCreate: false } // Start with free plan limits
  })

  const [isLoading, setIsLoading] = useState(true) // Start with loading true
  const [error, setError] = useState<string | null>(null)
  const [lastUsageCheck, setLastUsageCheck] = useState<number>(0)
  const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState<number>(0)
  const [cachedSubscriptionData, setCachedSubscriptionData] = useState<any>(null)

  const hasAccess = (feature: keyof FeatureAccess): boolean => {
    if (!areSubscriptionsEnabled()) return true
    // During loading, return true to prevent flash of upgrade prompts
    if (isLoading) return true
    return canAccessFeature(subscription.planId, feature)
  }

  const canCreate = (resource: 'projects' | 'clients' | 'invoices'): boolean => {
    if (!areSubscriptionsEnabled()) return true
    const limits = usage[resource]
    return limits.canCreate
  }

  // Handle over-limit scenarios for downgraded users
  const getOverLimitStatus = () => {
    if (!areSubscriptionsEnabled()) return { isOverLimit: false, restrictions: [] }
    
    const plan = getPlan(subscription.planId)
    const restrictions = []
    let isOverLimit = false
    
    // Check if user is over limits for current plan
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

  // Helper function to update usage limits based on plan and current usage
  const updateUsageLimits = useCallback(async (planId: string, currentUsage?: any) => {
    
    const plan = getPlan(planId)
    
    // If no current usage provided, fetch it
    let usageData = currentUsage
    if (!usageData) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const response = await fetch('/api/usage?force=true', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const result = await response.json()
          usageData = result.usage || result
        } else {
          return // Don't update if we can't fetch usage
        }
      } catch (err) {
        console.error('Error fetching usage for limit update:', err)
        return
      }
    }
    

    
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
    

    
    // Only update usage if it actually changed to prevent unnecessary re-renders
    setUsage(prevUsage => {
      const hasUsageChanged = 
        prevUsage.projects.current !== newUsage.projects.current ||
        prevUsage.clients.current !== newUsage.clients.current ||
        prevUsage.invoices.current !== newUsage.invoices.current ||
        prevUsage.projects.limit !== newUsage.projects.limit ||
        prevUsage.clients.limit !== newUsage.clients.limit ||
        prevUsage.invoices.limit !== newUsage.invoices.limit
      

      
      return hasUsageChanged ? newUsage : prevUsage
    })
  }, []) // Empty dependency array since this function doesn't depend on any props or state

  const loadSubscriptionData = async (force: boolean = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Smart caching - only check subscription every 2 minutes unless forced
    const now = Date.now()
    const timeSinceLastCheck = now - lastSubscriptionCheck
    const subscriptionCacheThreshold = 2 * 60 * 1000 // 2 minutes

    if (!force && timeSinceLastCheck < subscriptionCacheThreshold && cachedSubscriptionData) {
      // Use cached data if it's recent
      const cachedData = cachedSubscriptionData
      setSubscription(cachedData)
      setIsLoading(false)
      return
    }

    try {
      // Only set loading if this is the very first load (no cached data exists)
      if (!cachedSubscriptionData) {
        setIsLoading(true)
      }
      
      setLastSubscriptionCheck(now)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_plan_id, subscription_status, polar_customer_id, polar_subscription_id, subscription_current_period_end')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching subscription data:', error)
        setError('Failed to load subscription data')
        setIsLoading(false)
        return
      }

      if (profile) {
        let subscriptionId = profile.polar_subscription_id

        // Get auth session for API calls
        const { data: { session } } = await supabase.auth.getSession()

        // If we have a customer ID but no subscription ID, try to fetch it from Polar
        if (profile.polar_customer_id && !subscriptionId && profile.subscription_plan_id !== 'free') {
          try {
            console.log('🔍 Fetching subscription from Polar for customer:', profile.polar_customer_id)
            
            const headers: HeadersInit = {
              'Content-Type': 'application/json'
            }
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const response = await fetch(`/api/polar/subscriptions?customerId=${profile.polar_customer_id}`, {
              headers
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.subscriptionId) {
                subscriptionId = data.subscriptionId
                console.log('✅ Found subscription ID from Polar:', subscriptionId)
              }
            } else if (response.status === 401) {
              console.warn('🧹 401 Unauthorized from Polar API - clearing stale subscription data')
              const cleared = await clearStaleSubscriptionData(user.id)
              if (cleared) {
                // Refetch profile data after clearing stale data
                return loadSubscriptionData(true)
              }
            }
          } catch (error) {
            console.warn('Could not fetch subscription from Polar:', error)
            // If we get a 401 error, clear stale subscription data
            if (error instanceof Error && error.message.includes('401')) {
              console.warn('🧹 Clearing stale subscription data due to 401 error')
              const cleared = await clearStaleSubscriptionData(user.id)
              if (cleared) {
                // Refetch profile data after clearing stale data
                return loadSubscriptionData(true)
              }
            }
          }
        }

        let subscriptionDetails = null

        // If we have a subscription ID, fetch detailed subscription info from Polar
        if (subscriptionId) {
          try {
            console.log('🔍 Fetching detailed subscription info from Polar')
            const headers: HeadersInit = {
              'Content-Type': 'application/json'
            }
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const response = await fetch(`/api/polar/subscription-details?subscriptionId=${subscriptionId}`, {
              headers
            })
            
            if (response.ok) {
              const data = await response.json()
              subscriptionDetails = data.subscription
              console.log('✅ Got subscription details:', {
                id: subscriptionDetails?.id,
                status: subscriptionDetails?.status,
                cancelAtPeriodEnd: subscriptionDetails?.cancelAtPeriodEnd
              })
            } else if (response.status === 401) {
              console.warn('🧹 401 Unauthorized from Polar subscription details - clearing stale data')
              const cleared = await clearStaleSubscriptionData(user.id)
              if (cleared) {
                // Refetch profile data after clearing stale data
                return loadSubscriptionData(true)
              }
              subscriptionId = null // Reset subscription ID to prevent further attempts
            }
          } catch (error) {
            console.warn('Could not fetch subscription details from Polar:', error)
            // If we get a 401 error, clear stale subscription data
            if (error instanceof Error && error.message.includes('401')) {
              console.warn('🧹 Clearing stale subscription data due to 401 error')
              const cleared = await clearStaleSubscriptionData(user.id)
              if (cleared) {
                // Refetch profile data after clearing stale data
                return loadSubscriptionData(true)
              }
              subscriptionId = null // Reset subscription ID to prevent further attempts
            }
          }
        }

        const subscriptionData = {
          planId: profile.subscription_plan_id || 'free',
          status: profile.subscription_status || 'active',
          customerId: profile.polar_customer_id,
          subscriptionId: subscriptionId,
          currentPeriodEnd: profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null,
          cancelAtPeriodEnd: subscriptionDetails?.cancelAtPeriodEnd || false
        }
        
        // Only update state if there are actual changes
        const hasChanges = !cachedSubscriptionData || 
          cachedSubscriptionData.planId !== subscriptionData.planId ||
          cachedSubscriptionData.status !== subscriptionData.status ||
          cachedSubscriptionData.customerId !== subscriptionData.customerId ||
          cachedSubscriptionData.subscriptionId !== subscriptionData.subscriptionId ||
          cachedSubscriptionData.cancelAtPeriodEnd !== subscriptionData.cancelAtPeriodEnd
        
        if (hasChanges) {
          setSubscription(subscriptionData)
          setCachedSubscriptionData(subscriptionData)
          
          // Update usage limits conditionally to prevent loops
          // Only update if the plan actually changed, not on every subscription update
          if (subscription.planId !== subscriptionData.planId) {
            updateUsageLimits(subscriptionData.planId)
          }
        }
        
        setError(null)
      }
    } catch (err) {
      console.error('Error loading subscription data:', err)
      setError('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const checkUsage = async (force: boolean = false) => {
    if (!user) return

    // Smart debouncing: shorter interval for forced checks (like from sidebar), longer for automatic checks
    const now = Date.now()
    const timeSinceLastCheck = now - lastUsageCheck
    const debounceThreshold = force ? 15 * 1000 : 5 * 60 * 1000 // 15 seconds for forced, 5 minutes for automatic

    if (!force && timeSinceLastCheck < debounceThreshold) {
      return
    }

    // For forced checks, use a shorter debounce to allow more frequent updates while preventing spam
    if (force && timeSinceLastCheck < 15 * 1000) {
      return
    }

    try {
      setLastUsageCheck(now)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('No session found for usage check')
        return
      }

      const response = await fetch(`/api/usage${force ? '?force=true' : ''}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        const usageData = result.usage || result // Handle both formats
        

        
        // Use the updateUsageLimits function which correctly calculates limits based on current plan
        await updateUsageLimits(subscription.planId, usageData)
      } else {
        console.error('Failed to fetch usage data:', response.status, response.statusText)
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

  // Initialize subscription data (only on user change)
  useEffect(() => {
    if (user && user.id) {
      // Load subscription data first, then usage will be updated automatically
      loadSubscriptionData(true) // Force initial load
    }
  }, [user?.id]) // Only depend on user ID to prevent re-runs when user object reference changes

  // Check usage when subscription plan changes (but not too frequently)
  useEffect(() => {
    if (user?.id && subscription.planId && subscription.planId !== 'free') {
      // Only check usage if we haven't checked recently - increased threshold to 5 minutes
      const timeSinceLastCheck = Date.now() - lastUsageCheck
      if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minute minimum to reduce API calls
        // Don't auto-check usage on profile or settings pages, or during loading
        const isProfilePage = window.location.pathname.includes('/profile')
        const isSettingsPage = window.location.pathname.includes('/settings')
        const isDashboardHome = window.location.pathname === '/dashboard'
        
        // Only check usage on dashboard home page to minimize API calls
        if (isDashboardHome && !isProfilePage && !isSettingsPage) {
          checkUsage()
        }
      }
    }
  }, [subscription.planId, user?.id]) // Only depend on user ID

  const refetchSubscription = (forceUsageCheck: boolean = false) => {
    if (user && document.visibilityState === 'visible') {
      // Check if we're on pages that shouldn't auto-refresh
      const isProfilePage = window.location.pathname.includes('/profile')
      const isSettingsPage = window.location.pathname.includes('/settings')
      
      // Add a small delay to prevent immediate refetch on tab return
      setTimeout(() => {
        // Skip auto-refresh on profile and settings pages unless explicitly forced
        if ((isProfilePage || isSettingsPage) && !forceUsageCheck) {
          return
        }
        
        // Only force subscription data reload if usage needs to be forced
        loadSubscriptionData(forceUsageCheck)
        
        // Only check usage if explicitly requested to reduce API calls
        if (forceUsageCheck) {
          checkUsage(true) // Force usage check only when explicitly requested
        }
      }, 500) // Increased delay to prevent rapid successive calls
    }
  }



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
    refetchSubscription
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}