"use client"

import { Crown, Users, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSubscription } from "@/components/providers/subscription-provider"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function SidebarUsageOverview() {
  const { subscription, usage, plan, isLoading, refetchSubscription } = useSubscription()
  const [previousCounts, setPreviousCounts] = useState({ projects: 0, clients: 0 })
  const [cachedUsage, setCachedUsage] = useState<typeof usage | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const subscriptionsRef = useRef<any[]>([])
  const { user } = useAuth()
  const pathname = usePathname()

  // Persistent cache key for localStorage
  const getCacheKey = () => user?.id ? `sidebar-usage-${user.id}` : null

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
            if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Loaded valid cached usage from localStorage:', parsedCache.data)
        }
      }
            return parsedCache.data
          } else {
            if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ Cache expired, removing...')
        }
      }
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
            if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Using fallback cache from:', key, parsedCache.data)
        }
      }
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
      if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Saved usage data to localStorage:', data)
      }
    }
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
        if (process.env.NODE_ENV === 'development') {
              if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Loaded cache immediately on mount:', cached)
        }
    }
      }
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Secondary initialization when user becomes available
  useEffect(() => {
    if (user?.id && !cachedUsage) {
      const cached = loadCachedData()
      if (cached) {
        setCachedUsage(cached)
        if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Loaded cache after user available:', cached)
        }
      }
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
  
  // Debug logging to track updates (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 SidebarUsageOverview render:', { 
      isLoading, 
      planId: subscription.planId, 
      pathname,
      isOnRelevantPage: isOnRelevantPage(),
      shouldUseRealtimeUpdates,
      usage: usage,
      cachedUsage,
      usageStructure: {
        hasUsage: !!usage,
        hasClients: !!usage?.clients,
        hasProjects: !!usage?.projects,
        clientsData: usage?.clients,
        projectsData: usage?.projects
      }
    })
  }

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
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Updating cache with fresh usage data:', {
              previous: cachedUsage,
              new: usage,
              onRelevantPage: isOnRelevantPage()
            })
          }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Forcing data fetch - no valid data available:', {
            hasCache: !!cachedUsage,
            hasUsage: !!usage,
            usageComplete: usage?.clients?.current !== undefined
          })
        }
        // Immediate fetch
        refetchSubscription(true)
        
        // Backup fetch after delay
        const timeoutId = setTimeout(() => {
          refetchSubscription(true)
        }, 2000)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [isInitialized, subscription.planId, isLoading, cachedUsage, usage?.clients?.current, usage?.projects?.current, refetchSubscription])

  // Ensure fresh data on component mount
  useEffect(() => {
    // Only run once on mount - always ensure fresh data
    if (isInitialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Component mounted, ensuring data is fresh...')
      }
      // Small delay to allow subscription provider to initialize
      const timeoutId = setTimeout(() => {
        refetchSubscription(true)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isInitialized, refetchSubscription])

  // Set up intelligent realtime updates - only on pages where changes can happen
  useEffect(() => {
    // Only set up realtime subscriptions when on relevant pages
    if (!shouldUseRealtimeUpdates) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Skipping realtime setup - not on relevant page or wrong conditions:', {
          shouldUseRealtimeUpdates,
          pathname,
          isOnRelevantPage: isOnRelevantPage()
        })
      }
      return
    }

    const setupRealtimeSubscriptions = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Setting up realtime subscriptions for usage updates on relevant page:', pathname)
        }
        
        // Subscribe to projects table changes
        const projectsSubscription = supabase
          .channel('projects-usage-updates')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'projects',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (process.env.NODE_ENV === 'development') {
          console.log('📊 Projects table changed:', payload.eventType, 'on page:', pathname)
        }
              handleDataChange('projects')
            }
          )
          .subscribe()

        // Subscribe to clients table changes  
        const clientsSubscription = supabase
          .channel('clients-usage-updates')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public', 
              table: 'clients',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (process.env.NODE_ENV === 'development') {
          console.log('👥 Clients table changed:', payload.eventType, 'on page:', pathname)
        }
              handleDataChange('clients')
            }
          )
          .subscribe()

        // Store subscriptions and supabase instance for cleanup
        subscriptionsRef.current = [
          { subscription: projectsSubscription, supabase },
          { subscription: clientsSubscription, supabase }
        ]
        
      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    }

    const handleDataChange = (type: 'projects' | 'clients') => {
      // Add a small delay to allow database consistency
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 ${type} data changed, updating usage and cache`)
      }
        refetchSubscription(true)
      }, 500)
    }

    setupRealtimeSubscriptions()

    // Cleanup function
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Cleaning up realtime subscriptions for page:', pathname)
      }
      subscriptionsRef.current.forEach(({ subscription, supabase }) => {
        if (subscription && supabase) {
          try {
            supabase.removeChannel(subscription)
          } catch (error) {
            console.error('Error cleaning up subscription:', error)
          }
        }
      })
      subscriptionsRef.current = []
    }
  }, [shouldUseRealtimeUpdates, user?.id, refetchSubscription, pathname])

  // Intelligent usage data selection - prioritize valid data, fall back to cache
  const getDisplayUsage = () => {
    // Always prefer live data if it's complete and valid
    const hasValidLiveData = usage?.clients?.current !== undefined && 
                            usage?.projects?.current !== undefined &&
                            usage?.clients?.limit !== undefined &&
                            usage?.projects?.limit !== undefined

    if (hasValidLiveData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Using live usage data (valid and complete):', usage)
      }
      return usage
    }
    
    // Fall back to cached data if live data is incomplete
    if (cachedUsage?.clients?.current !== undefined && cachedUsage?.projects?.current !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📦 Using cached data (live data incomplete):', { 
          liveData: usage, 
          cachedData: cachedUsage,
          pathname 
        })
      }
      return cachedUsage
    }

    // Last resort: return live data even if incomplete
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Using incomplete live data (no valid cache):', usage)
    }
    return usage
  }

  const displayUsage = getDisplayUsage()
  
  // Additional safety logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Final displayUsage:', {
      displayUsage,
      hasClients: !!displayUsage?.clients,
      hasProjects: !!displayUsage?.projects,
      clientsCurrent: displayUsage?.clients?.current,
      projectsCurrent: displayUsage?.projects?.current
    })
  }

  // Track previous counts to detect actual changes (with safety checks)
  useEffect(() => {
    if (!displayUsage?.projects || !displayUsage?.clients) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ displayUsage missing expected structure:', displayUsage)
      }
      return
    }

    const currentCounts = {
      projects: displayUsage.projects.current || 0,
      clients: displayUsage.clients.current || 0
    }

    // Only log if there's an actual change in numbers
    if (currentCounts.projects !== previousCounts.projects || 
        currentCounts.clients !== previousCounts.clients) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📈 Display usage counts changed:', {
          previous: previousCounts,
          current: currentCounts,
          usingCache: !isOnRelevantPage() && cachedUsage !== null
        })
      }
      setPreviousCounts(currentCounts)
    }
  }, [displayUsage?.projects?.current, displayUsage?.clients?.current, previousCounts, isOnRelevantPage, cachedUsage])
  
  // COMPLETELY HIDE FOR PRO USERS - only show when we're 100% certain it's a free user
  // Don't show anything during loading to prevent any flashing
  if (isLoading) {
    return null
  }
  
  // Only show for explicitly free users after loading is complete
  if (subscription.planId !== 'free') {
    return null
  }

  // Extract data with robust fallbacks
  const clientsUsed = displayUsage?.clients?.current ?? 0
  const clientsLimit = (displayUsage?.clients?.limit as number) ?? 10
  const projectsUsed = displayUsage?.projects?.current ?? 0
  const projectsLimit = (displayUsage?.projects?.limit as number) ?? 20

  // Show loading skeleton if no data available during initialization
  const hasAnyData = displayUsage?.clients || displayUsage?.projects || 
                     clientsUsed !== undefined || projectsUsed !== undefined || cachedUsage

  if (!hasAnyData && isLoading) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ Showing loading skeleton...')
    }
    return (
      <Card className="mb-2">
        <CardContent className="p-3 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Free Plan</span>
          </div>
          
          {/* Loading skeleton for clients */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Clients</span>
              </div>
              <div className="w-8 h-3 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="h-2 rounded-full bg-muted animate-pulse w-1/3"></div>
            </div>
          </div>

          {/* Loading skeleton for projects */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Projects</span>
              </div>
              <div className="w-8 h-3 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="h-2 rounded-full bg-muted animate-pulse w-1/2"></div>
            </div>
          </div>

          {/* Loading upgrade button */}
          <div className="w-full h-7 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Final extracted values:', {
      clientsUsed,
      clientsLimit, 
      projectsUsed,
      projectsLimit
    })
  }

  const clientsPercentage = clientsLimit > 0 ? (clientsUsed / clientsLimit) * 100 : 0
  const projectsPercentage = projectsLimit > 0 ? (projectsUsed / projectsLimit) * 100 : 0

  // Check if we're using cached data
  const usingCachedData = displayUsage === cachedUsage && cachedUsage !== null
  
  return (
    <Card className="mb-2">
      <CardContent className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Free Plan</span>
          <div className="flex items-center gap-1">
            {isLoading && (
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            )}
            {usingCachedData && (
              <span className="text-xs text-muted-foreground opacity-60" title="Using cached data">📦</span>
            )}
          </div>
        </div>
        
        {/* Clients Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Clients</span>
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
              <FolderOpen className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Projects</span>
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

        {/* Upgrade Button */}
        <Button 
          asChild 
          size="sm" 
          className="w-full h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
        >
          <Link href="/pricing">
            <Crown className="w-3 h-3 mr-1" />
            Upgrade to Pro
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}