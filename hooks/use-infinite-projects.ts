"use client"

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { queryKeys, cacheUtils } from "@/components/query-provider"
import { toast } from "sonner"
import { useInstantSearch } from "./use-instant-search"
import { getDateRangeFromTimePeriod } from "@/lib/project-filters-v2"

// Request deduplication manager
const requestManager = new Map<string, Promise<any>>()

function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const existing = requestManager.get(key)
  if (existing) {
    return existing
  }

  const promise = requestFn()
    .finally(() => {
      requestManager.delete(key)
    })

  requestManager.set(key, promise)
  return promise
}

// Exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

export interface Project {
  id: string
  name: string
  status: string
  start_date: string | null
  due_date: string | null
  budget: number | null
  expenses: number | null
  received: number | null
  pending: number | null
  created_at: string
  updated_at: string
  clients?: {
    id: string
    name: string
    company?: string
    avatar_url?: string
  } | null
}

export interface ProjectFilters {
  search?: string
  status?: string[]
  client?: string[]
  timePeriod?: string | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ProjectsPage {
  data: Project[]
  nextCursor?: string
  hasMore: boolean
  totalCount: number
}

// Fetch projects with cursor-based pagination
const fetchProjectsPage = async (
  filters: ProjectFilters = {},
  pageParam?: string,
  pageSize: number = 50
): Promise<ProjectsPage> => {
  const requestKey = `projects-${JSON.stringify(filters)}-${pageParam}-${pageSize}`
  
  return deduplicateRequest(requestKey, async () => {
  let query = supabase
    .from('projects')
    .select(`
      *,
      clients (
        id,
        name,
        company,
        avatar_url
      )
    `, { count: 'exact' })

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters.client && filters.client.length > 0) {
    query = query.in('client_id', filters.client)
  }

  // Only fetch projects with actual status values (excludes lost projects which have status=null)
  query = query.not('status', 'is', null)

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Time period filtering - filter by project start_date, not created_at
  if (filters.timePeriod) {
    const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
    
    if (dateFrom) {
      query = query.gte('start_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('start_date', dateTo)
    }
  }

  // Sorting
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder || 'desc'
  
  // Cursor-based pagination with proper handling
  if (pageParam) {
    const [cursorValue, cursorId] = pageParam.split('::')
    
    // Use compound cursor for stable pagination
    if (sortBy === 'created_at') {
      // Simple cursor for created_at sorting
      if (sortOrder === 'desc') {
        query = query.lt('created_at', cursorValue)
      } else {
        query = query.gt('created_at', cursorValue)
      }
    } else {
      // Compound cursor for other sort fields to ensure uniqueness
      // This prevents duplicates when values are the same
      if (sortOrder === 'desc') {
        query = query.or(`${sortBy}.lt.${cursorValue},and(${sortBy}.eq.${cursorValue},id.lt.${cursorId})`)
      } else {
        query = query.or(`${sortBy}.gt.${cursorValue},and(${sortBy}.eq.${cursorValue},id.gt.${cursorId})`)
      }
    }
  }

  // Apply sorting with ID as secondary sort for stability
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  if (sortBy !== 'id') {
    query = query.order('id', { ascending: sortOrder === 'asc' })
  }

  // Limit results
  query = query.limit(pageSize)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  // Transform data to match original table structure and filter out projects with null status
  const transformedProjects = (data || [])
    .filter(project => project.status !== null) // Only show projects with actual status (excludes lost projects)
    .map(project => ({
    id: project.id,
    name: project.name,
    status: project.status,
    start_date: project.start_date,
    due_date: project.due_date,
    budget: project.budget,
    expenses: project.expenses,
    received: project.payment_received || 0,
    pending: project.payment_pending || 0,
    created_at: project.created_at,
    updated_at: project.updated_at,
    clients: project.clients ? {
      id: project.clients.id,
      name: project.clients.name,
      company: project.clients.company,
      avatar_url: project.clients.avatar_url
    } : null
  }))

  // Determine if there are more pages
  const hasMore = transformedProjects.length === pageSize
  
  // Create compound cursor for next page
  let nextCursor: string | undefined = undefined
  if (hasMore && transformedProjects.length > 0) {
    const lastProject = transformedProjects[transformedProjects.length - 1]
    const cursorField = sortBy === 'created_at' ? lastProject.created_at : lastProject[sortBy as keyof Project]
    nextCursor = `${cursorField}::${lastProject.id}`
  }

  return {
    data: transformedProjects,
    nextCursor,
    hasMore,
    totalCount: count || 0
  }
  })
}

// Update project status with optimistic updates
const updateProjectStatus = async ({ id, status }: { id: string; status: string }) => {
  console.log(`🔄 Updating project ${id} to status: ${status}`)
  
  // Prepare update data based on status
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  }
  
  // If moving to pipeline, set default pipeline fields
  if (status === 'pipeline') {
    updateData.pipeline_stage = 'lead'
    updateData.deal_probability = 10
    console.log('✅ Setting pipeline_stage to "lead" and deal_probability to 10')
  } else {
    // If moving away from pipeline, clear pipeline fields
    updateData.pipeline_stage = null
    updateData.deal_probability = null
    console.log('🗑️ Clearing pipeline fields')
  }

  console.log('📝 Update data:', updateData)

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Update failed:', error)
    throw new Error(`Failed to update project: ${error.message}`)
  }

  console.log('✅ Update successful:', data)
  return data
}

// Fetch database-wide metrics (not affected by pagination or filters)
async function fetchDatabaseMetrics(): Promise<{
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
}> {
  if (!isSupabaseConfigured()) {
    return {
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
    }
  }

  try {
    // Get all projects with minimal data for metrics calculation
    const { data: projects, error } = await supabase
      .from('projects')
      .select('status, pipeline_stage, budget, expenses, payment_received')
      .not('status', 'is', null) // Exclude lost projects (which have status=null)

    if (error) throw error

    // Filter out lost projects from all metrics (lost projects have status=null or pipeline_stage='lost')
    const validProjects = projects?.filter(p => 
      p.status !== null && (p as any).pipeline_stage !== 'lost'
    ) || []

    const totalProjects = validProjects.length
    const activeProjects = validProjects.filter(p => p.status === 'active').length
    const pipelineProjects = validProjects.filter(p => p.status === 'pipeline').length
    const completedProjects = validProjects.filter(p => p.status === 'completed').length
    const onHoldProjects = validProjects.filter(p => p.status === 'on_hold').length
    const cancelledProjects = validProjects.filter(p => p.status === 'cancelled').length
    
    const totalBudget = validProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalExpenses = validProjects.reduce((sum, p) => sum + (p.expenses || 0), 0)
    const totalReceived = validProjects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
    const totalPending = validProjects.reduce((sum, p) => {
      const budget = p.budget || 0
      const received = p.payment_received || 0
      return sum + Math.max(0, budget - received)
    }, 0)

    return {
      totalProjects,
      activeProjects,
      pipelineProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects,
      totalBudget,
      totalExpenses,
      totalReceived,
      totalPending
    }
  } catch (error) {
    console.error('Error fetching database metrics:', error)
    return {
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
    }
  }
}

// Fetch filtered metrics (affected by filters but not pagination)
async function fetchFilteredMetrics(filters: ProjectFilters = {}): Promise<{
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
}> {
  if (!isSupabaseConfigured()) {
    return {
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
    }
  }

  try {
    // Build query with filters applied
    let query = supabase
      .from('projects')
      .select('status, budget, expenses, payment_received')

    // Apply filters (matching the same logic as fetchProjectsPage)
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.client && filters.client.length > 0) {
      query = query.in('client_id', filters.client)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Time period filtering
    if (filters.timePeriod) {
      const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
      
      if (dateFrom) {
        query = query.gte('start_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('start_date', dateTo)
      }
    }

    const { data: projects, error } = await query

    if (error) throw error

    const totalProjects = projects?.length || 0
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0
    const pipelineProjects = projects?.filter(p => p.status === 'pipeline').length || 0
    const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
    const onHoldProjects = projects?.filter(p => p.status === 'on_hold').length || 0
    const cancelledProjects = projects?.filter(p => p.status === 'cancelled').length || 0
    
    const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
    const totalExpenses = projects?.reduce((sum, p) => sum + (p.expenses || 0), 0) || 0
    const totalReceived = projects?.reduce((sum, p) => sum + (p.payment_received || 0), 0) || 0
    const totalPending = projects?.reduce((sum, p) => {
      const budget = p.budget || 0
      const received = p.payment_received || 0
      return sum + Math.max(0, budget - received)
    }, 0) || 0

    return {
      totalProjects,
      activeProjects,
      pipelineProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects,
      totalBudget,
      totalExpenses,
      totalReceived,
      totalPending
    }
  } catch (error) {
    console.error('Error fetching filtered metrics:', error)
    return {
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
    }
  }
}

// Infinite projects hook with real-time updates
export function useInfiniteProjects(filters: ProjectFilters = {}, pageSize: number = 50) {
  const queryClient = useQueryClient()

  // Infinite query for progressive loading
  const infiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.projectsInfinite(filters),
    queryFn: ({ pageParam }) => fetchProjectsPage(filters, pageParam, pageSize),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchOnReconnect: true,
    retry: 3,
  })

  // Separate query for database-wide metrics
  const metricsQuery = useQuery({
    queryKey: ['database-metrics'],
    queryFn: fetchDatabaseMetrics,
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for metrics
    retry: 2,
  })

  // Separate query for filtered metrics
  const filteredMetricsQuery = useQuery({
    queryKey: ['filtered-metrics', filters],
    queryFn: () => fetchFilteredMetrics(filters),
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Disable window focus refetch
    retry: 2,
    // Only fetch if we have active filters
    enabled: !!(filters.status?.length || filters.client?.length || filters.search || filters.timePeriod)
  })

  // Flatten all pages into a single array
  const allProjects = useMemo(() => {
    const projects = infiniteQuery.data?.pages.flatMap(page => page.data) || []
    
    // Remove duplicates based on project ID
    const uniqueProjectsMap = new Map<string, Project>()
    projects.forEach(project => {
      if (!uniqueProjectsMap.has(project.id)) {
        uniqueProjectsMap.set(project.id, project)
      }
    })
    
    return Array.from(uniqueProjectsMap.values())
  }, [infiniteQuery.data])

  // Use filtered metrics when filters are active, otherwise use database-wide metrics
  const metrics = useMemo(() => {
    const hasActiveFilters = !!(filters.status?.length || filters.client?.length || filters.search || filters.timePeriod)
    const metricsData = hasActiveFilters ? filteredMetricsQuery.data : metricsQuery.data
    
    return metricsData || {
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
    }
  }, [metricsQuery.data, filteredMetricsQuery.data, filters])

  // Instant search with client-side filtering
  const {
    searchQuery,
    updateSearch,
    clearSearch,
    isSearching,
    clientFilteredData,
    hasClientResults
  } = useInstantSearch(
    allProjects,
    ['name', 'clients'] as (keyof Project)[],
    (query) => {
      // This would trigger server-side search if needed
      // For now, we rely on the filters prop being updated
    },
    {
      debounceMs: 150, // Faster debounce for better responsiveness
      minChars: 1,
      enableClientSide: true
    }
  )

  // Optimistic update mutation
  const updateStatusMutation = useMutation({
    mutationFn: updateProjectStatus,
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projectsInfinite(filters) })

      // Snapshot the previous value
      const previousPages = queryClient.getQueryData(queryKeys.projectsInfinite(filters))

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.projectsInfinite(filters), (old: any) => {
        if (!old?.pages) return old

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((project: Project) =>
              project.id === id
                ? { ...project, status, updated_at: new Date().toISOString() }
                : project
            )
          }))
        }
      })

      // Return a context object with the snapshotted value
      return { previousPages }
    },
    onError: (err, { id, status }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPages) {
        queryClient.setQueryData(queryKeys.projectsInfinite(filters), context.previousPages)
      }
      
      toast.error('Failed to update project status', {
        description: err.message
      })
    },
    onSuccess: (data, { id, status }) => {
      // Invalidate and refetch related queries
      cacheUtils.invalidateProjects(queryClient)
      cacheUtils.invalidateAnalytics(queryClient)
      
      toast.success(`Project status updated to ${status}`, {
        description: `${data.name} has been updated successfully`
      })
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsInfinite(filters) })
    },
  })

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage()
    }
  }, [infiniteQuery])

  const hasActiveFilters = !!(filters.status?.length || filters.client?.length || filters.search || filters.timePeriod)

  // Manual refetch function
  const refetch = useCallback(() => {
    metricsQuery.refetch() // Also refetch metrics
    if (hasActiveFilters) {
      filteredMetricsQuery.refetch()
    }
    return infiniteQuery.refetch()
  }, [infiniteQuery, metricsQuery, filteredMetricsQuery, hasActiveFilters])

  // Force refresh (bypasses cache)
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projectsInfinite(filters) })
    queryClient.invalidateQueries({ queryKey: ['database-metrics'] }) // Also invalidate metrics
    queryClient.invalidateQueries({ queryKey: ['filtered-metrics', filters] }) // Also invalidate filtered metrics
    metricsQuery.refetch()
    if (hasActiveFilters) {
      filteredMetricsQuery.refetch()
    }
    return infiniteQuery.refetch()
  }, [queryClient, infiniteQuery, metricsQuery, filteredMetricsQuery, filters, hasActiveFilters])

  return {
    // Data
    projects: hasClientResults ? clientFilteredData : allProjects,
    allProjects, // Raw data without client filtering
    metrics,
    totalCount: hasActiveFilters && filteredMetricsQuery.data 
      ? filteredMetricsQuery.data.totalProjects 
      : (infiniteQuery.data?.pages[0]?.totalCount || 0),
    
    // Loading states
    isLoading: infiniteQuery.isLoading || metricsQuery.isLoading || (hasActiveFilters && filteredMetricsQuery.isLoading),
    isFetching: infiniteQuery.isFetching || metricsQuery.isFetching || (hasActiveFilters && filteredMetricsQuery.isFetching),
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isError: infiniteQuery.isError || metricsQuery.isError || (hasActiveFilters && filteredMetricsQuery.isError),
    error: infiniteQuery.error || metricsQuery.error || (hasActiveFilters && filteredMetricsQuery.error),
    
    // Infinite loading
    hasNextPage: infiniteQuery.hasNextPage,
    loadMore,
    
    // Mutations
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    
    // Search
    searchQuery,
    updateSearch,
    clearSearch,
    isSearching,
    hasClientResults,
    
    // Actions
    refetch,
    forceRefresh,
    
    // Advanced states
    isStale: infiniteQuery.isStale,
    dataUpdatedAt: infiniteQuery.dataUpdatedAt,
    
    // Performance metrics
    cacheHitRate: infiniteQuery.dataUpdatedAt > 0 ? 95 : 0, // Estimate
    lastUpdated: new Date(infiniteQuery.dataUpdatedAt || Date.now()),
    isFresh: infiniteQuery.isStale === false,
    staleDuration: infiniteQuery.dataUpdatedAt ? Date.now() - infiniteQuery.dataUpdatedAt : 0,
    isBackgroundRefetching: infiniteQuery.isFetching && !infiniteQuery.isLoading,
  }
} 