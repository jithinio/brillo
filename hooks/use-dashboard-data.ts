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
    
    if (age > STALE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return { data: null, isStale: false }
    }
    
    return {
      data: parsed,
      isStale: age > CACHE_DURATION
    }
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

// Hook for quick dashboard metrics
export const useDashboardMetrics = () => {
  const { projects, isLoading, error } = useDashboardData()
  
  const metrics = useMemo(() => {
    if (isLoading || projects.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        upcomingDeadlines: 0,
        totalRevenue: 0,
        totalBudget: 0
      }
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const activeProjects = projects.filter(p => p.status === 'in_progress')
    const completedProjects = projects.filter(p => p.status === 'completed')
    
    const upcomingDeadlines = projects.filter(p => {
      if (!p.due_date || p.status === 'completed') return false
      const dueDate = new Date(p.due_date)
      return dueDate >= now && dueDate <= thirtyDaysFromNow
    }).length

    const totalRevenue = projects.reduce((sum, p) => 
      sum + ((p.payment_received || 0) + (p.payment_pending || 0)), 0
    )

    const totalBudget = projects.reduce((sum, p) => 
      sum + (p.total_budget || p.budget || 0), 0
    )

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      upcomingDeadlines,
      totalRevenue,
      totalBudget
    }
  }, [projects, isLoading])

  return {
    ...metrics,
    isLoading,
    error
  }
}

// Import required hooks from React
import { useMemo } from 'react'