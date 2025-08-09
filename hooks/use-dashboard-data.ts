"use client"

// DEPRECATED: This hook is now redirected to the unified hook
// This file will be removed after migration is complete
import { useDashboardData as useUnifiedDashboardData, type DashboardProject } from '@/hooks/use-unified-projects'

// Project interface for dashboard (simplified)
export interface DashboardProject {
  id: string
  name: string
  budget?: number
  total_budget?: number
  revenue?: number
  expenses?: number
  payment_received?: number
  payment_pending?: number
  start_date?: string
  due_date?: string
  created_at: string
  status: string
  clients?: {
    id: string
    name: string
    company?: string
    created_at?: string
  }
}

interface DashboardData {
  projects: DashboardProject[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache management with stale-while-revalidate pattern
const CACHE_KEY = 'dashboard-data'
const CACHE_DURATION = 3 * 60 * 1000 // 3 minutes (shorter than analytics for more real-time feel)
const STALE_DURATION = 5 * 60 * 1000 // 5 minutes - serve stale data while revalidating

interface CachedDashboardData {
  data: { projects: DashboardProject[] }
  timestamp: number
}

const getFromCache = (): { data: CachedDashboardData | null; isStale: boolean } => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return { data: null, isStale: false }
    
    const parsed: CachedDashboardData = JSON.parse(cached)
    const age = Date.now() - parsed.timestamp
    const isExpired = age > STALE_DURATION
    const isStale = age > CACHE_DURATION
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY)
      return { data: null, isStale: false }
    }
    
    return { data: parsed, isStale }
  } catch {
    return { data: null, isStale: false }
  }
}

const setToCache = (data: { projects: DashboardProject[] }) => {
  try {
    const cacheData: CachedDashboardData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch {
    // Cache failed, continue without caching
    console.warn('Failed to cache dashboard data')
  }
}

// DEPRECATED: Redirected to unified hook - remove this file after confirming migration works
export const useDashboardData = () => {
  return useUnifiedDashboardData()
}

  // Fetch projects with optimized query for dashboard
  const fetchProjects = useCallback(async (): Promise<DashboardProject[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        budget,
        total_budget,
        revenue,
        expenses,
        payment_received,
        payment_pending,
        start_date,
        due_date,
        created_at,
        status,
        pipeline_stage,
        clients (
          id,
          name,
          company,
          created_at
        )
      `)
      .not('status', 'is', null) // Exclude lost projects
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch dashboard projects: ${error.message}`)
    }

    // Transform and filter data
    const transformedData = (data || [])
      .filter(project => 
        project.status !== null && 
        (project as any).pipeline_stage !== 'lost'
      )
      .map(project => ({
        ...project,
        clients: project.clients && project.clients.length > 0 ? project.clients[0] : undefined
      }))

    return transformedData
  }, [])

  // Main data fetching function with stale-while-revalidate
  const fetchDashboardData = useCallback(async (useCache: boolean = true, isBackground: boolean = false) => {
    try {
      // Check cache first
      if (useCache) {
        const { data: cached, isStale } = getFromCache()
        if (cached) {
          // Always update state with cached data first
          setDashboardData(prev => ({
            ...prev,
            ...cached.data,
            isLoading: false,
            error: null,
            lastUpdated: new Date(cached.timestamp)
          }))

          // If data is fresh, return early
          if (!isStale) {
            return
          }
          
          // If data is stale, continue to fetch fresh data in background
          // but don't show loading state (stale-while-revalidate)
        }
      }

      // Only show loading if we don't have cached data or it's not a background refresh
      if (!useCache || !getFromCache().data || !isBackground) {
        setDashboardData(prev => ({ ...prev, isLoading: true, error: null }))
      }

      // Fetch fresh data
      const projects = await fetchProjects()
      const newData = { projects }
      
      // Cache the fresh data
      setToCache(newData)

      setDashboardData({
        ...newData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      setDashboardData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      }))
    }
  }, [fetchProjects])

  // Force refresh function (bypasses cache)
  const refreshData = useCallback(() => {
    fetchDashboardData(false, false)
  }, [fetchDashboardData])

  // Background refresh function (uses cache, updates silently)
  const backgroundRefresh = useCallback(() => {
    fetchDashboardData(true, true)
  }, [fetchDashboardData])

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Real-time updates using Supabase subscriptions
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleDataChange = () => {
      // Clear existing timer
      if (debounceTimer) clearTimeout(debounceTimer)
      
      console.log('📊 Dashboard: Data change detected, scheduling refresh...')
      
      // Only update if page is visible
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          // Invalidate React Query cache for projects (this will also trigger analytics updates)
          queryClient.invalidateQueries({ queryKey: queryKeys.projects })
          
          backgroundRefresh() // Use background refresh for real-time updates
        }
      }, 1200) // Even faster debounce for dashboard
    }

    const projectsSubscription = supabase
      .channel('dashboard-projects-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, handleDataChange)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      projectsSubscription.unsubscribe()
    }
  }, [backgroundRefresh, queryClient])

  // Periodic background refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if the page is visible
      if (document.visibilityState === 'visible') {
        backgroundRefresh()
      }
    }, 5 * 60 * 1000) // Every 5 minutes background refresh

    return () => clearInterval(interval)
  }, [backgroundRefresh])

  // Page visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When page becomes visible, do a background refresh to get latest data
        const { isStale } = getFromCache()
        if (isStale) {
          backgroundRefresh()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [backgroundRefresh])

  return {
    projects: dashboardData.projects,
    isLoading: dashboardData.isLoading,
    error: dashboardData.error,
    lastUpdated: dashboardData.lastUpdated,
    refreshData,
    backgroundRefresh
  }
}

// Hook for quick dashboard metrics
export const useDashboardMetrics = () => {
  const { projects, isLoading, error } = useDashboardData()
  
  const metrics = useMemo(() => {
    if (isLoading || projects.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        completedProjects: 0
      }
    }

    const activeProjects = projects.filter(p => 
      p.status === 'active'
    )
    
    const completedProjects = projects.filter(p => 
      p.status === 'completed'
    )

    const allActiveAndCompleted = projects.filter(p => 
      p.status !== 'pipeline' && 
      p.status !== 'cancelled' && 
      (p as any).pipeline_stage !== 'lost'
    )
    
    const totalRevenue = allActiveAndCompleted.reduce((sum, project) => {
      if (project.status === 'on hold' || project.status === 'cancelled') {
        return sum + (project.payment_received || 0)
      }
      return sum + (project.budget || project.total_budget || project.revenue || 0)
    }, 0)

    const totalExpenses = allActiveAndCompleted.reduce((sum, project) => {
      return sum + (project.expenses || 0)
    }, 0)

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalRevenue,
      totalExpenses,
      completedProjects: completedProjects.length
    }
  }, [projects, isLoading])

  return {
    metrics,
    isLoading,
    error
  }
}
