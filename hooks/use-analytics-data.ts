"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, Client } from '@/lib/analytics-calculations'

export interface DateRange {
  start: Date
  end: Date
}

export interface AnalyticsFilters {
  dateRange?: DateRange
  clientIds?: string[]
  projectStatuses?: string[]
}

interface AnalyticsData {
  projects: Project[]
  clients: Client[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache management
const CACHE_KEY = 'analytics-data'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedData {
  data: { projects: Project[], clients: Client[] }
  timestamp: number
}

const getFromCache = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const parsed: CachedData = JSON.parse(cached)
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return parsed
  } catch {
    return null
  }
}

const setToCache = (data: { projects: Project[], clients: Client[] }) => {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch {
    // Cache failed, continue without caching
  }
}

// Main hook
export const useAnalyticsData = (filters?: AnalyticsFilters) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    projects: [],
    clients: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  // Fetch projects with client data
  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        budget,
        revenue,
        expenses,
        payment_received,
        payment_pending,
        start_date,
        due_date,
        created_at,
        status,
        client_id,
        clients (
          id,
          name,
          company,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`)
    }

    // Transform the data to match our interface
    return (data || []).map(project => ({
      ...project,
      clients: project.clients && project.clients.length > 0 ? project.clients[0] : undefined
    }))
  }, [])

  // Fetch clients with project count
  const fetchClients = useCallback(async (): Promise<Client[]> => {
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

  // Main data fetching function
  const fetchAnalyticsData = useCallback(async (useCache: boolean = true) => {
    try {
      // Try cache first
      if (useCache) {
        const cached = getFromCache()
        if (cached) {
          setAnalyticsData(prev => ({
            ...prev,
            ...cached.data,
            isLoading: false,
            error: null,
            lastUpdated: new Date(cached.timestamp)
          }))
          return
        }
      }

      setAnalyticsData(prev => ({ ...prev, isLoading: true, error: null }))

      // Fetch fresh data
      const [projects, clients] = await Promise.all([
        fetchProjects(),
        fetchClients()
      ])

      const newData = { projects, clients }
      
      // Cache the fresh data
      setToCache(newData)

      setAnalyticsData({
        ...newData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      console.error('Analytics data fetch error:', error)
      setAnalyticsData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data'
      }))
    }
  }, [fetchProjects, fetchClients])

  // Filtered data based on filters
  const filteredData = useMemo(() => {
    let filteredProjects = analyticsData.projects
    let filteredClients = analyticsData.clients

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

    return {
      projects: filteredProjects,
      clients: filteredClients
    }
  }, [analyticsData.projects, analyticsData.clients, filters])

  // Force refresh function
  const refreshData = useCallback(() => {
    fetchAnalyticsData(false)
  }, [fetchAnalyticsData])

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // Real-time updates using Supabase subscriptions
  useEffect(() => {
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, () => {
        // Debounce rapid updates
        setTimeout(() => {
          fetchAnalyticsData(false)
        }, 1000)
      })
      .subscribe()

    const clientsSubscription = supabase
      .channel('clients-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients' 
      }, () => {
        // Debounce rapid updates
        setTimeout(() => {
          fetchAnalyticsData(false)
        }, 1000)
      })
      .subscribe()

    return () => {
      projectsSubscription.unsubscribe()
      clientsSubscription.unsubscribe()
    }
  }, [fetchAnalyticsData])

  // Periodic refresh (every 5 minutes as fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchAnalyticsData])

  return {
    // Original data
    projects: analyticsData.projects,
    clients: analyticsData.clients,
    
    // Filtered data
    filteredProjects: filteredData.projects,
    filteredClients: filteredData.clients,
    
    // State
    isLoading: analyticsData.isLoading,
    error: analyticsData.error,
    lastUpdated: analyticsData.lastUpdated,
    
    // Actions
    refreshData
  }
}

// Hook for quick metrics without filters
export const useQuickAnalytics = () => {
  const { projects, clients, isLoading, error } = useAnalyticsData()
  
  const metrics = useMemo(() => {
    if (isLoading || projects.length === 0) {
      return {
        totalProjects: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        activeClients: 0
      }
    }

    const activeProjects = projects.filter(p => p.status !== 'pipeline' && p.status !== 'cancelled')
    
    const totalRevenue = activeProjects.reduce((sum, project) => {
      if (project.status === 'on hold' || project.status === 'cancelled') {
        return sum + (project.payment_received || 0)
      }
      return sum + (project.budget || project.revenue || 0)
    }, 0)

    const totalExpenses = activeProjects.reduce((sum, project) => {
      return sum + (project.expenses || 0)
    }, 0)

    const activeClients = new Set(
      activeProjects
        .map(p => p.client_id)
        .filter(Boolean)
    ).size

    return {
      totalProjects: activeProjects.length,
      totalRevenue,
      totalExpenses,
      activeClients
    }
  }, [projects, isLoading])

  return {
    metrics,
    isLoading,
    error
  }
} 