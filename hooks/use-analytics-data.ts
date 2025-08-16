"use client"

// DEPRECATED: This hook is now redirected to the unified hook  
// This file will be removed after migration is complete
import { 
  useAnalyticsData as useUnifiedAnalyticsData, 
  type AnalyticsFilters, 
  type DateRange,
  type Project,
  type Client 
} from '@/hooks/use-unified-projects'

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
    // Cache failed, continue without caching
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

// DEPRECATED: Redirected to unified hook - remove this file after confirming migration works
export const useAnalyticsData = (filters?: AnalyticsFilters) => {
  return useUnifiedAnalyticsData(filters)
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

    const activeProjects = projects.filter(p => 
      p.status !== 'pipeline' && 
      p.status !== 'cancelled' && 
      (p as any).pipeline_stage !== 'lost'
    )

    const totalRevenue = activeProjects.reduce((sum, p) => 
      sum + ((p.payment_received || 0) + (p.payment_pending || 0)), 0
    )

    const totalExpenses = activeProjects.reduce((sum, p) => 
      sum + (p.expenses || 0), 0
    )

    const activeClientIds = new Set(activeProjects.map(p => p.client_id).filter(Boolean))

    return {
      totalProjects: activeProjects.length,
      totalRevenue,
      totalExpenses,
      activeClients: activeClientIds.size
    }
  }, [projects, clients, isLoading])

  return {
    ...metrics,
    isLoading,
    error
  }
}

// Import required hooks from React
import { useMemo } from 'react'