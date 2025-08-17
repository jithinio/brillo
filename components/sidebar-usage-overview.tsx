"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, Group01Icon, FolderOpenIcon, CreditCardIcon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { useSubscription } from "@/components/providers/subscription-provider"
import { isProPlan } from "@/lib/subscription-plans"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useSubscriptionListener } from "@/lib/subscription-manager"
import { SidebarUsageSkeleton } from "@/components/subscription/subscription-skeleton"

export function SidebarUsageOverview() {
  // ALWAYS call all hooks first - never conditionally call hooks
  const { subscription, usage, plan, isLoading, refetchSubscription, getCachedPlanId } = useSubscription()
  const [previousCounts, setPreviousCounts] = useState({ projects: 0, clients: 0 })
  const [cachedUsage, setCachedUsage] = useState<typeof usage | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const subscriptionsRef = useRef<any[]>([])
  const { user } = useAuth()
  const pathname = usePathname()

  // Progressive loading effect - only render for free users after page load
  useEffect(() => {
    if (!isLoading && subscription?.planId) {
      console.log('🔍 SidebarUsageOverview: Checking subscription plan:', subscription.planId)
      // Only render for confirmed free users
      if (subscription.planId === 'free') {
        console.log('✅ SidebarUsageOverview: Rendering for free user')
        setShouldRender(true)
        // Add delay for progressive loading effect
        setTimeout(() => setIsVisible(true), 200)
      } else {
        console.log('❌ SidebarUsageOverview: NOT rendering for pro user:', subscription.planId)
        setShouldRender(false)
        setIsVisible(false)
      }
      // For pro users or any other plan, never render
    }
  }, [isLoading, subscription?.planId])

  // Persistent cache key for localStorage
  const getCacheKey = () => user?.id ? `sidebar-usage-${user.id}` : null
  
  // Get collapsed state cache key
  const getCollapsedCacheKey = () => user?.id ? `sidebar-usage-collapsed-${user.id}` : 'sidebar-usage-collapsed-global'
  
  // Load collapsed state from localStorage
  const loadCollapsedState = () => {
    try {
      const cacheKey = getCollapsedCacheKey()
      const cached = localStorage.getItem(cacheKey)
      return cached === 'true'
    } catch (error) {
      console.error('Error loading collapsed state:', error)
      return false
    }
  }
  
  // Save collapsed state to localStorage
  const saveCollapsedState = (collapsed: boolean) => {
    try {
      const cacheKey = getCollapsedCacheKey()
      localStorage.setItem(cacheKey, collapsed.toString())
    } catch (error) {
      console.error('Error saving collapsed state:', error)
    }
  }

  // Load cached data from localStorage - try multiple approaches
  const loadCachedData = () => {
    const cacheKey = getCacheKey()
    
    // First try with user-specific key
    if (cacheKey) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsedCache = JSON.parse(cached)
          // Check if cache is less than 10 minutes old
          const cacheAge = Date.now() - parsedCache.timestamp
          if (cacheAge < 10 * 60 * 1000) { // 10 minutes
            return parsedCache.data
          } else {
            localStorage.removeItem(cacheKey)
          }
        }
      } catch (error) {
        console.error('Error loading cached data:', error)
        if (cacheKey) localStorage.removeItem(cacheKey)
      }
    }
    
    // Fallback: try to find any recent cache (for immediate display)
    try {
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('sidebar-usage-'))
      for (const key of allKeys) {
        const cached = localStorage.getItem(key)
        if (cached) {
          const parsedCache = JSON.parse(cached)
          const cacheAge = Date.now() - parsedCache.timestamp
          if (cacheAge < 10 * 60 * 1000) { // Still valid
            return parsedCache.data
          }
        }
      }
    } catch (error) {
      console.error('Error loading fallback cache:', error)
    }
    
    return null
  }

  // Save data to localStorage
  const saveCachedData = (data: typeof usage) => {
    const cacheKey = getCacheKey()
    if (!cacheKey || !data?.clients || !data?.projects) return
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error saving cached data:', error)
    }
  }

  // Initialize cache from localStorage immediately - don't wait for user
  useEffect(() => {
    if (!isInitialized) {
      // Try to load cache even before user is confirmed
      const cached = loadCachedData()
      if (cached) {
        setCachedUsage(cached)
      }
      // Load collapsed state
      const collapsed = loadCollapsedState()
      setIsCollapsed(collapsed)
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Secondary initialization when user becomes available
  useEffect(() => {
    if (user?.id && !cachedUsage) {
      const cached = loadCachedData()
      if (cached) {
        setCachedUsage(cached)
      }
    }
  }, [user?.id, cachedUsage])

  // Intelligent page detection - only monitor changes on pages where they can happen
  const isOnRelevantPage = () => {
    if (!pathname) return false
    
    const relevantPaths = [
      '/dashboard/projects',     // Projects list page
      '/dashboard/clients',      // Clients list page
      '/dashboard/pipeline',     // Pipeline page (projects can be created/moved)
      '/dashboard/invoices'      // Invoice page (clients can be created during invoice creation)
    ]
    
    return relevantPaths.some(path => pathname.startsWith(path))
  }

  const shouldUseRealtimeUpdates = isOnRelevantPage() && subscription.planId === 'free' && !isLoading && user
  


  // Enhanced cache management - always try to get fresh data and persist it
  useEffect(() => {
    if (subscription.planId === 'free' && !isLoading && usage?.clients && usage?.projects && isInitialized) {
      // Always update cache when we get valid usage data
      const hasValidData = usage.clients.current !== undefined && usage.projects.current !== undefined
      
      if (hasValidData) {
        // Check if this is actually new/different data
        const isDifferent = !cachedUsage || 
          cachedUsage.clients.current !== usage.clients.current ||
          cachedUsage.projects.current !== usage.projects.current ||
          cachedUsage.clients.limit !== usage.clients.limit ||
          cachedUsage.projects.limit !== usage.projects.limit

        if (isDifferent) {
          setCachedUsage(usage)
          saveCachedData(usage) // Persist to localStorage
        }
      }
    }
  }, [usage, subscription.planId, isLoading, isInitialized, cachedUsage, isOnRelevantPage])

  // Aggressive initial data fetch - ensure we get data on page load
  useEffect(() => {
    if (isInitialized) {
      const needsDataFetch = 
        subscription.planId === 'free' && 
        !isLoading && 
        (!cachedUsage || !usage?.clients?.current) &&
        (!usage?.clients || !usage?.projects || usage.clients.current === undefined)

      if (needsDataFetch) {
        // Normal fetch without forcing cache clear
        refetchSubscription(false)
        
        // Backup fetch after delay - also without forcing cache clear
        const timeoutId = setTimeout(() => {
          refetchSubscription(false)
        }, 2000)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [isInitialized, subscription.planId, isLoading, cachedUsage, usage?.clients?.current, usage?.projects?.current, refetchSubscription])

  // Remove automatic refresh on mount - rely on subscription provider's cache
  // This prevents unnecessary API calls when switching tabs or focusing
  useEffect(() => {
    // Mark as initialized without triggering refresh
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Set up consolidated realtime updates using subscription manager
  useEffect(() => {
    if (!shouldUseRealtimeUpdates || !user?.id) {
      return
    }

    console.log('🔄 Setting up consolidated usage updates for user:', user.id)

    // Single listener for all usage updates with smart debouncing
    const unsubscribe = useSubscriptionListener(
      'usage_updated',
      (data) => {
        console.log('📊 Usage updated:', data.payload.table)
        
        // Smart debouncing - immediate for user activity, delayed for background
        const isUserActive = document.visibilityState === 'visible'
        const delay = isUserActive ? 300 : 1000
        
        setTimeout(() => {
          refetchSubscription(true)
        }, delay)
      },
      user.id
    )

    return unsubscribe
  }, [shouldUseRealtimeUpdates, user?.id, refetchSubscription])

  // Intelligent usage data selection - prioritize valid data, fall back to cache
  const getDisplayUsage = () => {
    // Always prefer live data if it's complete and valid
    const hasValidLiveData = usage?.clients?.current !== undefined && 
                            usage?.projects?.current !== undefined &&
                            usage?.clients?.limit !== undefined &&
                            usage?.projects?.limit !== undefined

    if (hasValidLiveData) {
      return usage
    }
    
    // Fall back to cached data if live data is incomplete
    if (cachedUsage?.clients?.current !== undefined && cachedUsage?.projects?.current !== undefined) {
      return cachedUsage
    }

    // Last resort: return live data even if incomplete

    return usage
  }

  const displayUsage = getDisplayUsage()


  // Track previous counts to detect actual changes (with safety checks)
  useEffect(() => {
    if (!displayUsage?.projects || !displayUsage?.clients) {
      return
    }

    const currentCounts = {
      projects: displayUsage.projects.current || 0,
      clients: displayUsage.clients.current || 0
    }

    // Only log if there's an actual change in numbers
    if (currentCounts.projects !== previousCounts.projects || 
        currentCounts.clients !== previousCounts.clients) {
      setPreviousCounts(currentCounts)
    }
  }, [displayUsage?.projects?.current, displayUsage?.clients?.current, previousCounts, isOnRelevantPage, cachedUsage])
  
  // Now do all the conditional logic AFTER all hooks are called
  
  // 🚀 ENHANCED EARLY RETURN: Check both live subscription and cached data
  // This prevents showing usage card for pro users during loading states
  const cachedPlanId = getCachedPlanId()
  const effectivePlanId = subscription?.planId || cachedPlanId
  
  if (effectivePlanId && effectivePlanId !== 'free') {
    console.log('❌ SidebarUsageOverview: Early return for non-free user:', effectivePlanId)
    return null
  }
  
  // Additional cache check in localStorage for pro users
  if (typeof window !== 'undefined') {
    try {
      const allKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('brillo-subscription-') || key.includes('subscription')
      )
      
      for (const key of allKeys) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed = JSON.parse(cached)
            const planId = parsed.planId || parsed.data?.planId
            if (planId === 'pro_monthly' || planId === 'pro_yearly') {
              console.log('❌ SidebarUsageOverview: Early return for cached pro user:', planId)
              return null
            }
          }
        } catch (e) {
          // Continue checking other keys
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  // Don't render anything during loading or for non-free users
  if (!shouldRender) {
    console.log('🚫 SidebarUsageOverview: NOT rendering - shouldRender:', shouldRender, 'isLoading:', isLoading, 'planId:', subscription?.planId)
    return null
  }
  
  console.log('🎯 SidebarUsageOverview: RENDERING for user with plan:', subscription?.planId)

  // Extract data with robust fallbacks
  const clientsUsed = displayUsage?.clients?.current ?? 0
  const clientsLimit = (displayUsage?.clients?.limit as number) ?? 10
  const projectsUsed = displayUsage?.projects?.current ?? 0
  const projectsLimit = (displayUsage?.projects?.limit as number) ?? 20

  // Show loading skeleton if no data available during initialization
  const hasAnyData = displayUsage?.clients || displayUsage?.projects || 
                     clientsUsed !== undefined || projectsUsed !== undefined || cachedUsage

  if (!hasAnyData && isLoading) {
    return <SidebarUsageSkeleton />
  }



  const clientsPercentage = clientsLimit > 0 ? (clientsUsed / clientsLimit) * 100 : 0
  const projectsPercentage = projectsLimit > 0 ? (projectsUsed / projectsLimit) * 100 : 0

  // Check if we're using cached data
  const usingCachedData = displayUsage === cachedUsage && cachedUsage !== null
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : 8 
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="mb-2">
        <CardHeader 
          className="p-3 cursor-pointer hover:bg-accent/50 active:bg-accent transition-colors duration-200"
          onClick={() => {
            const newCollapsed = !isCollapsed
            setIsCollapsed(newCollapsed)
            saveCollapsedState(newCollapsed)
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Free Plan</span>
            <div className="flex items-center gap-1">
              {isLoading && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              )}
              {usingCachedData && (
                <span className="text-xs text-secondary-foreground opacity-60" title="Using cached data">📦</span>
              )}
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                <HugeiconsIcon 
                  icon={ArrowDown01Icon} 
                  className="w-4 h-4 text-secondary-foreground"
                />
              </motion.div>
            </div>
          </div>
        </CardHeader>
        
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.2, 
                ease: "easeInOut",
                opacity: { duration: 0.15 }
              }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className="p-3 pt-2 space-y-4">
            {/* Clients Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Group01Icon} className="w-3 h-3 text-secondary-foreground"  />
                  <span className="text-secondary-foreground">Clients</span>
                </div>
                <span className="font-medium">{clientsUsed}/{clientsLimit}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    clientsPercentage >= 90 
                      ? 'bg-destructive' 
                      : clientsPercentage >= 75 
                        ? 'bg-orange-500' 
                        : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(clientsPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Projects Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={FolderOpenIcon} className="w-3 h-3 text-secondary-foreground"  />
                  <span className="text-secondary-foreground">Projects</span>
                </div>
                <span className="font-medium">{projectsUsed}/{projectsLimit}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    projectsPercentage >= 90 
                      ? 'bg-destructive' 
                      : projectsPercentage >= 75 
                        ? 'bg-orange-500' 
                        : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(projectsPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Upgrade/Manage Button */}
            {!isLoading && (
              (() => {
                const isPro = isProPlan(subscription.planId)
                console.log('🔍 Button logic: planId=', subscription.planId, 'isPro=', isPro)
                return isPro
              })() ? (
                <Button 
                  asChild 
                  size="sm" 
                  className="w-full h-7 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
                >
                  <Link href="/dashboard/settings?tab=subscription">
                    <HugeiconsIcon icon={CreditCardIcon} className="w-3 h-3 mr-1"  />
                    Manage Billing
                  </Link>
                </Button>
              ) : (
                <Button 
                  asChild 
                  size="sm" 
                  className="w-full h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                >
                  <Link href="/pricing">
                    <HugeiconsIcon icon={Crown02Icon} className="w-3 h-3 mr-1"  />
                    Upgrade to Pro
                  </Link>
                </Button>
              )
              )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}