"use client"

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseFiltersFromSearchParams, getDateRangeFromTimePeriod, type ProjectFilters } from '@/lib/project-filters-v2'
import { toast } from 'sonner'
import type { Project } from '@/components/projects/columns'

interface ProjectsState {
  allProjects: Project[]
  filteredProjects: Project[]
  totalCount: number
  currentPage: number
  totalPages: number
  loading: boolean
  error: string | null
}

interface SummaryMetrics {
  totalProjects: number
  activeProjects: number
  pipelineProjects: number
  completedProjects: number
  onHoldProjects: number
  cancelledProjects: number
  totalBudget: number
  totalExpenses: number
  totalReceived: number
  totalPending: number
}

const PAGE_SIZE = 10
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const DEBOUNCE_DELAY = 150 // Faster response for better UX

// Advanced caching with TTL and query fingerprinting
class AdvancedCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttl: number = CACHE_DURATION) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    )
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

const cache = new AdvancedCache()

export function useOptimizedProjects() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // State management
  const [state, setState] = useState<ProjectsState>({
    allProjects: [],
    filteredProjects: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    loading: true,
    error: null
  })
  
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    totalProjects: 0,
    activeProjects: 0,
    pipelineProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    totalBudget: 0,
    totalExpenses: 0,
    totalReceived: 0,
    totalPending: 0
  })
  
  // Refs for debouncing and preventing race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchRef = useRef<string>('')
  
  // Parse filters from URL
  const filters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])
  
  // Generate cache keys
  const getCacheKey = useCallback((type: 'projects' | 'metrics', filters: ProjectFilters, page?: number) => {
    const baseKey = JSON.stringify({ type, filters, ...(page && { page }) })
    return baseKey
  }, [])
  
  // Client-side filtering for instant feedback
  const applyClientSideFilters = useCallback((projects: Project[], filters: ProjectFilters): Project[] => {
    let filtered = [...projects]
    
    // Apply search filter instantly
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchLower) ||
        (project.clients?.name.toLowerCase().includes(searchLower)) ||
        (project.clients?.company?.toLowerCase().includes(searchLower))
      )
    }
    
    return filtered
  }, [])
  
  // Calculate summary metrics from filtered data
  const calculateMetrics = useCallback((projects: Project[]): SummaryMetrics => {
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      pipelineProjects: projects.filter(p => p.status === 'pipeline').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      onHoldProjects: projects.filter(p => p.status === 'on_hold').length,
      cancelledProjects: projects.filter(p => p.status === 'cancelled').length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalExpenses: projects.reduce((sum, p) => sum + (p.expenses || 0), 0),
      totalReceived: projects.reduce((sum, p) => sum + (p.received || 0), 0),
      totalPending: projects.reduce((sum, p) => {
        const budget = p.budget || 0
        const received = p.received || 0
        return sum + Math.max(0, budget - received)
      }, 0)
    }
  }, [])
  
  // Optimized data fetcher with abort support
  const fetchProjectsOptimized = useCallback(async (
    currentFilters: ProjectFilters, 
    page: number = 1,
    useCache: boolean = true
  ): Promise<{ projects: Project[]; totalCount: number } | null> => {
    if (!isSupabaseConfigured()) {
      return { projects: [], totalCount: 0 }
    }
    
    // Generate unique fetch ID to prevent race conditions
    const fetchId = `${Date.now()}-${Math.random()}`
    lastFetchRef.current = fetchId
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    // Check cache first
    const cacheKey = getCacheKey('projects', currentFilters, page)
    if (useCache) {
      const cachedData = cache.get(cacheKey)
      if (cachedData) {
        console.log('✅ Using cached projects data')
        return cachedData
      }
    }
    
    try {
      // Build optimized query
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          start_date,
          due_date,
          budget,
          expenses,
          payment_received,
          payment_pending,
          created_at,
          clients!inner (
            name,
            company,
            avatar_url
          )
        `, { count: 'exact' })
      
      // Apply server-side filters (excluding search for instant client-side filtering)
      if (currentFilters.status.length > 0) {
        query = query.in('status', currentFilters.status)
      }
      if (currentFilters.client.length > 0) {
        query = query.in('client_id', currentFilters.client)
      }
      // Time period filtering - filter by project start_date, not created_at
      if (currentFilters.timePeriod) {
        const { dateFrom, dateTo } = getDateRangeFromTimePeriod(currentFilters.timePeriod)
        if (dateFrom) query = query.gte('start_date', dateFrom)
        if (dateTo) query = query.lte('start_date', dateTo)
      }
      
      // Add pagination
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to).order('created_at', { ascending: false })
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal)
      
      // Check if this is still the latest request
      if (lastFetchRef.current !== fetchId) {
        console.log('🚫 Discarding stale request')
        return null
      }
      
      if (error) throw error
      
             const transformedProjects = (data || []).map(project => ({
         id: project.id,
         name: project.name,
         status: project.status,
         start_date: project.start_date,
         due_date: project.due_date,
         budget: project.budget,
         expenses: project.expenses,
         received: project.payment_received,
         pending: project.payment_pending,
         created_at: project.created_at,
         clients: project.clients && project.clients.length > 0 ? {
           name: project.clients[0].name,
           company: project.clients[0].company,
           avatar_url: project.clients[0].avatar_url
         } : undefined
       }))
      
      const result = { projects: transformedProjects, totalCount: count || 0 }
      
      // Cache the result
      cache.set(cacheKey, result)
      
      console.log(`✅ Fetched ${transformedProjects.length} projects (${count} total)`)
      return result
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Request aborted')
        return null
      }
      
      console.error('❌ Error fetching projects:', error)
      throw error
    }
  }, [getCacheKey])
  
  // Debounced filter effect with smooth transitions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const fetchData = async () => {
      try {
        // For search filters, apply client-side filtering first for instant feedback
        if (filters.search && state.allProjects.length > 0) {
          const instantFiltered = applyClientSideFilters(state.allProjects, filters)
          const instantMetrics = calculateMetrics(instantFiltered)
          
          // Update state immediately for search
          startTransition(() => {
            setState(prev => ({
              ...prev,
              filteredProjects: instantFiltered,
              totalCount: instantFiltered.length,
              totalPages: Math.ceil(instantFiltered.length / PAGE_SIZE),
              currentPage: 1
            }))
            setSummaryMetrics(instantMetrics)
          })
        }
        
        // Then fetch fresh data from server
        setState(prev => ({ ...prev, loading: true, error: null }))
        
        const result = await fetchProjectsOptimized(filters, state.currentPage)
        
        if (result) {
          const clientFiltered = applyClientSideFilters(result.projects, filters)
          const metrics = calculateMetrics(clientFiltered)
          
          startTransition(() => {
            setState(prev => ({
              ...prev,
              allProjects: result.projects,
              filteredProjects: clientFiltered,
              totalCount: result.totalCount,
              totalPages: Math.ceil(result.totalCount / PAGE_SIZE),
              loading: false
            }))
            setSummaryMetrics(metrics)
          })
        }
      } catch (error) {
        console.error('Error in fetchData:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch projects'
        }))
        toast.error('Failed to fetch projects')
      }
    }
    
    // Reset to page 1 when filters change (except for page-only changes)
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(parseFiltersFromSearchParams(searchParams))
    if (filtersChanged) {
      setState(prev => ({ ...prev, currentPage: 1 }))
    }
    
    timeoutId = setTimeout(fetchData, DEBOUNCE_DELAY)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [filters, state.currentPage, fetchProjectsOptimized, applyClientSideFilters, calculateMetrics])
  
  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])
  
  // Cache invalidation
  const invalidateCache = useCallback((pattern?: string) => {
    cache.invalidate(pattern)
  }, [])
  
  // Optimistic updates for better UX
  const updateProjectOptimistic = useCallback((projectId: string, updates: Partial<Project>) => {
    setState(prev => ({
      ...prev,
      allProjects: prev.allProjects.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      ),
      filteredProjects: prev.filteredProjects.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      )
    }))
  }, [])
  
  return {
    // State
    projects: state.filteredProjects,
    totalCount: state.totalCount,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    loading: state.loading || isPending,
    error: state.error,
    summaryMetrics,
    
    // Actions
    handlePageChange,
    invalidateCache,
    updateProjectOptimistic,
    
    // Metadata
    pageSize: PAGE_SIZE,
    hasActiveFilters: filters.status.length > 0 || filters.client.length > 0 || filters.timePeriod || filters.search
  }
} 