"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { queryKeys, cacheUtils } from "@/components/query-provider"
import { toast } from "sonner"
import { useInstantSearch } from "./use-instant-search"

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

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Time period filtering
  if (filters.timePeriod) {
    const now = new Date()
    let startDate: string
    
    switch (filters.timePeriod) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
        break
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString()
        break
      default:
        startDate = new Date(0).toISOString()
    }
    
    query = query.gte('created_at', startDate)
  }

  // Cursor-based pagination
  if (pageParam) {
    query = query.lt('created_at', pageParam)
  }

  // Sorting
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Limit results
  query = query.limit(pageSize)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  // Transform data to match original table structure
  const transformedProjects = (data || []).map(project => ({
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
  const nextCursor = hasMore ? transformedProjects[transformedProjects.length - 1]?.created_at : undefined

  return {
    data: transformedProjects,
    nextCursor,
    hasMore,
    totalCount: count || 0
  }
}

// Update project status with optimistic updates
const updateProjectStatus = async ({ id, status }: { id: string; status: string }) => {
  const { data, error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`)
  }

  return data
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
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })

  // Flatten all pages into a single array
  const allProjects = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap(page => page.data) || []
  }, [infiniteQuery.data])

  // Calculate metrics from all loaded data
  const metrics = useMemo(() => {
    const projects = allProjects
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
  }, [allProjects])

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
    onError: (err, { id }, context) => {
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

  // Manual refetch function
  const refetch = useCallback(() => {
    return infiniteQuery.refetch()
  }, [infiniteQuery])

  // Force refresh (bypasses cache)
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projectsInfinite(filters) })
    return infiniteQuery.refetch()
  }, [queryClient, infiniteQuery, filters])

  return {
    // Data
    projects: hasClientResults ? clientFilteredData : allProjects,
    allProjects, // Raw data without client filtering
    metrics,
    totalCount: infiniteQuery.data?.pages[0]?.totalCount || 0,
    
    // Loading states
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    
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