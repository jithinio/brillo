/**
 * Unified project data hook - replaces both useDashboardData and useAnalyticsData
 * More efficient, less code duplication, single source of truth
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useAnalyticsCache } from '@/hooks/use-analytics-cache'
import { useAnalyticsOptimistic } from '@/hooks/use-analytics-optimistic'
import { useAnalyticsPerformance } from '@/hooks/use-analytics-performance'

// Unified Project interface - combines all fields needed
export interface UnifiedProject {
  id: string
  name: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
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
  pipeline_stage?: string
  client_id?: string
  clients?: {
    id: string
    name: string
    company?: string
    created_at?: string
  }
}

// Unified Client interface
export interface UnifiedClient {
  id: string
  name: string
  company?: string
  created_at?: string
}

// Filters interface
export interface ProjectFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  clientIds?: string[]
  projectStatuses?: string[]
  projectTypes?: string[]
}

interface UnifiedProjectData {
  projects: UnifiedProject[]
  clients: UnifiedClient[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache management - optimized for both use cases
const CACHE_KEY = 'unified-projects-data'
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes (balanced)
const STALE_DURATION = 4 * 60 * 1000 // 4 minutes

interface CachedData {
  data: { projects: UnifiedProject[], clients: UnifiedClient[] }
  timestamp: number
}

const getFromCache = (): { data: CachedData | null; isStale: boolean } => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return { data: null, isStale: false }
    
    const parsed: CachedData = JSON.parse(cached)
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

const setToCache = (data: { projects: UnifiedProject[], clients: UnifiedClient[] }) => {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch {
    console.warn('Failed to cache unified projects data')
  }
}

// Main unified hook
export const useUnifiedProjects = (filters?: ProjectFilters) => {
  const queryClient = useQueryClient()
  const [data, setData] = useState<UnifiedProjectData>({
    projects: [],
    clients: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const refreshTriggerRef = useRef<(() => void) | null>(null)
  
  // Performance monitoring
  const { trackRefresh, metrics: performanceMetrics } = useAnalyticsPerformance()

  // Listen for logout events to clear cache
  useEffect(() => {
    const handleLogout = () => {
      console.log('🔄 Unified Projects: Clearing cache due to logout')
      
      // Clear localStorage cache
      try {
        localStorage.removeItem(CACHE_KEY)
      } catch (error) {
        console.warn('Failed to clear unified projects localStorage cache:', error)
      }
      
      // Reset state
      setData({
        projects: [],
        clients: [],
        isLoading: false,
        error: null,
        lastUpdated: null
      })
    }

    window.addEventListener('auth-logout', handleLogout)
    
    return () => {
      window.removeEventListener('auth-logout', handleLogout)
    }
  }, [])

  // Fetch projects with all fields
  const fetchProjects = useCallback(async (): Promise<UnifiedProject[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        project_type,
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
        client_id,
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
      throw new Error(`Failed to fetch projects: ${error.message}`)
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

  // Fetch clients
  const fetchClients = useCallback(async (): Promise<UnifiedClient[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        company,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`)
    }

    return data || []
  }, [])

  // Main data fetching function with stale-while-revalidate
  const fetchData = useCallback(async (useCache: boolean = true, isBackground: boolean = false) => {
    const startTime = performance.now()
    
    try {
      // Check cache first
      if (useCache) {
        const { data: cached, isStale } = getFromCache()
        if (cached) {
          const endTime = performance.now()
          trackRefresh(startTime, endTime, true) // Cache hit
          
          setData(prev => ({
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
          // If stale, continue to fetch fresh data in background
        }
      }

      // Only show loading if no cached data or not background refresh
      if (!useCache || !getFromCache().data || !isBackground) {
        setData(prev => ({ ...prev, isLoading: true, error: null }))
      }

      // Fetch fresh data
      const [projects, clients] = await Promise.all([
        fetchProjects(),
        fetchClients()
      ])

      const newData = { projects, clients }
      
      // Cache the fresh data
      setToCache(newData)

      const endTime = performance.now()
      trackRefresh(startTime, endTime, false) // Cache miss

      setData({
        ...newData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      const endTime = performance.now()
      trackRefresh(startTime, endTime, false) // Error case
      
      console.error('Unified projects data fetch error:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects data'
      }))
    }
  }, [fetchProjects, fetchClients]) // Removed trackRefresh dependency

  // Force refresh function
  const refreshData = useCallback(() => {
    fetchData(false, false)
  }, [fetchData])

  // Background refresh function
  const backgroundRefresh = useCallback(() => {
    fetchData(true, true)
  }, [fetchData])

  // Stable refs for callback functions
  const refreshDataRef = useRef<() => void>()
  refreshDataRef.current = refreshData

  // Use the advanced analytics cache system with stable callback
  const { refreshAnalytics } = useAnalyticsCache({
    enableRealTimeUpdates: true,
    debounceMs: 1000, // Balanced debounce
    onCacheInvalidated: () => {
      refreshDataRef.current?.()
    }
  })

  // Use optimistic updates with stable callback
  const { optimisticCreateProject, optimisticUpdateProject, optimisticDeleteProject } = useAnalyticsOptimistic({
    onOptimisticUpdate: (change) => {
      // Apply optimistic changes to local state
      if (change.operation === 'create' && change.changes) {
        setData(prev => ({
          ...prev,
          projects: [...prev.projects, change.changes as UnifiedProject]
        }))
      } else if (change.operation === 'update') {
        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => 
            p.id === change.id ? { ...p, ...change.changes } : p
          )
        }))
      } else if (change.operation === 'delete') {
        setData(prev => ({
          ...prev,
          projects: prev.projects.filter(p => p.id !== change.id)
        }))
      }
    }
  })

  // Filtered data based on filters
  const filteredData = useMemo(() => {
    let filteredProjects = data.projects
    let filteredClients = data.clients

    if (filters?.dateRange) {
      filteredProjects = filteredProjects.filter(project => {
        const projectDate = new Date(project.start_date || project.created_at)
        return projectDate >= filters.dateRange!.start && projectDate <= filters.dateRange!.end
      })
    }

    if (filters?.clientIds && filters.clientIds.length > 0) {
      filteredProjects = filteredProjects.filter(project => 
        project.client_id && filters.clientIds!.includes(project.client_id)
      )
      filteredClients = filteredClients.filter(client =>
        filters.clientIds!.includes(client.id)
      )
    }

    if (filters?.projectStatuses && filters.projectStatuses.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        filters.projectStatuses!.includes(project.status)
      )
    }

    if (filters?.projectTypes && filters.projectTypes.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        project.project_type && filters.projectTypes!.includes(project.project_type)
      )
    }

    return {
      projects: filteredProjects,
      clients: filteredClients
    }
  }, [data.projects, data.clients, filters])

  // Stable refs for data fetching
  const fetchDataRef = useRef<(useCache?: boolean, isBackground?: boolean) => Promise<void>>()
  fetchDataRef.current = fetchData

  // Initial data fetch - only run once
  useEffect(() => {
    fetchDataRef.current?.(true, false)
  }, []) // Empty dependency array - only run on mount

  // Stable refs for real-time handlers
  const backgroundRefreshRef = useRef<() => void>()
  backgroundRefreshRef.current = backgroundRefresh

  // Real-time updates with stable dependencies
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleDataChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      
      console.log('🔄 Unified Projects: Data change detected, scheduling refresh...')
      
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          queryClient.invalidateQueries({ queryKey: queryKeys.projects })
          backgroundRefreshRef.current?.()
        }
      }, 1000) // Balanced debounce
    }

    const projectsSubscription = supabase
      .channel('unified-projects-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, handleDataChange)
      .subscribe()

    const clientsSubscription = supabase
      .channel('unified-clients-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients' 
      }, handleDataChange)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      projectsSubscription.unsubscribe()
      clientsSubscription.unsubscribe()
    }
  }, [queryClient]) // Only queryClient as dependency

  // Periodic background refresh with stable dependencies
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        backgroundRefreshRef.current?.()
      }
    }, 3 * 60 * 1000) // Every 3 minutes

    return () => clearInterval(interval)
  }, []) // No dependencies needed

  return {
    // All projects data
    projects: data.projects,
    clients: data.clients,
    
    // Filtered data (for analytics)
    filteredProjects: filteredData.projects,
    filteredClients: filteredData.clients,
    
    // State
    isLoading: data.isLoading,
    error: data.error,
    lastUpdated: data.lastUpdated,
    
    // Actions
    refreshData,
    refreshAnalytics,
    backgroundRefresh,
    
    // Optimistic updates
    optimisticCreateProject,
    optimisticUpdateProject,
    optimisticDeleteProject,
    
    // Performance metrics
    performanceMetrics
  }
}

// Dashboard-specific hook (simplified wrapper) - maintains exact same interface
export const useDashboardData = () => {
  const { projects, isLoading, error, lastUpdated, refreshData, backgroundRefresh } = useUnifiedProjects()
  
  // Memoize the transformation to prevent unnecessary re-renders
  const dashboardProjects = useMemo(() => projects.map(project => ({
    id: project.id,
    name: project.name,
    budget: project.budget,
    total_budget: project.total_budget,
    revenue: project.revenue,
    expenses: project.expenses,
    payment_received: project.payment_received,
    payment_pending: project.payment_pending,
    start_date: project.start_date,
    due_date: project.due_date,
    created_at: project.created_at,
    status: project.status,
    clients: project.clients
  })), [projects])
  
  return {
    projects: dashboardProjects,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    backgroundRefresh
  }
}

// Re-export types for compatibility
export type DashboardProject = {
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

// Analytics-specific hook (wrapper with filters) - maintains exact same interface
export const useAnalyticsData = (filters?: AnalyticsFilters) => {
  const unifiedData = useUnifiedProjects(filters)
  
  // Memoize transformations to prevent unnecessary re-renders
  const analyticsProjects = useMemo(() => unifiedData.projects.map(project => ({
    id: project.id,
    name: project.name,
    project_type: project.project_type,
    budget: project.budget,
    total_budget: project.total_budget,
    revenue: project.revenue,
    expenses: project.expenses,
    payment_received: project.payment_received,
    payment_pending: project.payment_pending,
    start_date: project.start_date,
    due_date: project.due_date,
    created_at: project.created_at,
    status: project.status,
    pipeline_stage: project.pipeline_stage,
    client_id: project.client_id,
    clients: project.clients
  })), [unifiedData.projects])

  const analyticsFilteredProjects = useMemo(() => unifiedData.filteredProjects.map(project => ({
    id: project.id,
    name: project.name,
    project_type: project.project_type,
    budget: project.budget,
    total_budget: project.total_budget,
    revenue: project.revenue,
    expenses: project.expenses,
    payment_received: project.payment_received,
    payment_pending: project.payment_pending,
    start_date: project.start_date,
    due_date: project.due_date,
    created_at: project.created_at,
    status: project.status,
    pipeline_stage: project.pipeline_stage,
    client_id: project.client_id,
    clients: project.clients
  })), [unifiedData.filteredProjects])
  
  // Debug: Log data updates only when data actually changes
  console.log('🔍 useAnalyticsData:', {
    projects: analyticsProjects.length,
    filtered: analyticsFilteredProjects.length,
    isLoading: unifiedData.isLoading,
    lastUpdated: unifiedData.lastUpdated?.toLocaleTimeString()
  })

  return {
    // Original data
    projects: analyticsProjects,
    clients: unifiedData.clients,
    
    // Filtered data
    filteredProjects: analyticsFilteredProjects,
    filteredClients: unifiedData.filteredClients,
    
    // State
    isLoading: unifiedData.isLoading,
    error: unifiedData.error,
    lastUpdated: unifiedData.lastUpdated,
    
    // Actions
    refreshData: unifiedData.refreshData,
    refreshAnalytics: unifiedData.refreshAnalytics,
    
    // Optimistic updates
    optimisticCreateProject: unifiedData.optimisticCreateProject,
    optimisticUpdateProject: unifiedData.optimisticUpdateProject,
    optimisticDeleteProject: unifiedData.optimisticDeleteProject,
    
    // Performance metrics
    performanceMetrics: unifiedData.performanceMetrics
  }
}

// Re-export analytics types for compatibility
export interface DateRange {
  start: Date
  end: Date
}

export interface AnalyticsFilters {
  dateRange?: DateRange
  clientIds?: string[]
  projectStatuses?: string[]
  projectTypes?: string[]
}

export type Project = {
  id: string
  name: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
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
  pipeline_stage?: string
  client_id?: string
  clients?: {
    id: string
    name: string
    company?: string
    created_at?: string
  }
}

export type Client = {
  id: string
  name: string
  company?: string
  created_at?: string
}
