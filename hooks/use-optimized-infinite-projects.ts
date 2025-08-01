"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { queryKeys } from "@/components/query-provider"
import { toast } from "sonner"
import { useInstantSearch } from "./use-instant-search"
import { getDateRangeFromTimePeriod } from "@/lib/project-filters-v2"

interface ConsolidatedData {
  projects: any[]
  metrics: {
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
  nextCursor?: string
  hasMore: boolean
  totalCount: number
}

// Fetch projects and metrics in a single query
async function fetchProjectsWithMetrics(
  filters: any = {},
  pageParam?: string,
  pageSize: number = 50
): Promise<ConsolidatedData> {
  if (!isSupabaseConfigured()) {
    return {
      projects: [],
      metrics: {
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
      },
      hasMore: false,
      totalCount: 0
    }
  }

  try {
    // Build the main query
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
    if (filters.status?.length > 0) {
      query = query.in('status', filters.status)
    }
    if (filters.client?.length > 0) {
      query = query.in('client_id', filters.client)
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    
    // Only fetch projects with actual status values (excludes lost projects which have status=null)
    query = query.not('status', 'is', null)
    if (filters.timePeriod) {
      const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
      if (dateFrom) query = query.gte('start_date', dateFrom)
      if (dateTo) query = query.lte('start_date', dateTo)
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    
    // Cursor-based pagination
    if (pageParam) {
      const [cursorValue, cursorId] = pageParam.split('::')
      
      if (sortBy === 'created_at') {
        if (sortOrder === 'desc') {
          query = query.lt('created_at', cursorValue)
        } else {
          query = query.gt('created_at', cursorValue)
        }
      } else {
        if (sortOrder === 'desc') {
          query = query.or(`${sortBy}.lt.${cursorValue},and(${sortBy}.eq.${cursorValue},id.lt.${cursorId})`)
        } else {
          query = query.or(`${sortBy}.gt.${cursorValue},and(${sortBy}.eq.${cursorValue},id.gt.${cursorId})`)
        }
      }
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    if (sortBy !== 'id') {
      query = query.order('id', { ascending: sortOrder === 'asc' })
    }
    query = query.limit(pageSize)

    const { data: projects, error, count } = await query

    if (error) throw error

    // Transform projects and filter out projects with null status
    const transformedProjects = (projects || [])
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

    // Calculate metrics from the current page (for filtered metrics)
    const pageMetrics = {
      totalProjects: transformedProjects.length,
      activeProjects: transformedProjects.filter(p => p.status === 'active').length,
      pipelineProjects: transformedProjects.filter(p => p.status === 'pipeline').length,
      completedProjects: transformedProjects.filter(p => p.status === 'completed').length,
      onHoldProjects: transformedProjects.filter(p => p.status === 'on_hold').length,
      cancelledProjects: transformedProjects.filter(p => p.status === 'cancelled').length,
      totalBudget: transformedProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalExpenses: transformedProjects.reduce((sum, p) => sum + (p.expenses || 0), 0),
      totalReceived: transformedProjects.reduce((sum, p) => sum + (p.received || 0), 0),
      totalPending: transformedProjects.reduce((sum, p) => sum + (p.pending || 0), 0)
    }

    // Determine next cursor
    const hasMore = transformedProjects.length === pageSize
    let nextCursor: string | undefined = undefined
    if (hasMore && transformedProjects.length > 0) {
      const lastProject = transformedProjects[transformedProjects.length - 1]
      const cursorField = sortBy === 'created_at' ? lastProject.created_at : lastProject[sortBy as keyof typeof lastProject]
      nextCursor = `${cursorField}::${lastProject.id}`
    }

    // If this is the first page and no filters, fetch full metrics
    let metrics = pageMetrics
    if (!pageParam && !filters.status?.length && !filters.client?.length && !filters.search && !filters.timePeriod) {
      // Fetch full metrics for unfiltered view
      const { data: allProjects } = await supabase
        .from('projects')
        .select('status, budget, expenses, payment_received')

      if (allProjects) {
        metrics = {
          totalProjects: allProjects.length,
          activeProjects: allProjects.filter(p => p.status === 'active').length,
          pipelineProjects: allProjects.filter(p => p.status === 'pipeline').length,
          completedProjects: allProjects.filter(p => p.status === 'completed').length,
          onHoldProjects: allProjects.filter(p => p.status === 'on_hold').length,
          cancelledProjects: allProjects.filter(p => p.status === 'cancelled').length,
          totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
          totalExpenses: allProjects.reduce((sum, p) => sum + (p.expenses || 0), 0),
          totalReceived: allProjects.reduce((sum, p) => sum + (p.payment_received || 0), 0),
          totalPending: allProjects.reduce((sum, p) => {
            const budget = p.budget || 0
            const received = p.payment_received || 0
            return sum + Math.max(0, budget - received)
          }, 0)
        }
      }
    }

    return {
      projects: transformedProjects,
      metrics,
      nextCursor,
      hasMore,
      totalCount: count || 0
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}

export function useOptimizedInfiniteProjects(filters: any = {}, pageSize: number = 50) {
  const queryClient = useQueryClient()
  const metricsRef = useRef<any>(null)

  // Single consolidated query
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['optimized-projects', filters],
    queryFn: ({ pageParam }) => fetchProjectsWithMetrics(filters, pageParam, pageSize),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Store metrics from first page
  if (infiniteQuery.data?.pages[0]?.metrics && !metricsRef.current) {
    metricsRef.current = infiniteQuery.data.pages[0].metrics
  }

  // Flatten all projects
  const allProjects = useMemo(() => {
    const projects = infiniteQuery.data?.pages.flatMap(page => page.projects) || []
    const uniqueProjectsMap = new Map()
    projects.forEach(project => {
      if (!uniqueProjectsMap.has(project.id)) {
        uniqueProjectsMap.set(project.id, project)
      }
    })
    return Array.from(uniqueProjectsMap.values())
  }, [infiniteQuery.data])

  // Update status mutation with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['optimized-projects', filters] })
      
      const previousData = queryClient.getQueryData(['optimized-projects', filters])
      
      queryClient.setQueryData(['optimized-projects', filters], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            projects: page.projects.map((project: any) =>
              project.id === id ? { ...project, status } : project
            )
          }))
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['optimized-projects', filters], context.previousData)
      }
      toast.error('Failed to update status')
    },
    onSuccess: () => {
      toast.success('Status updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['optimized-projects', filters] })
    }
  })

  // Instant search
  const {
    searchQuery,
    updateSearch,
    clearSearch,
    isSearching,
    clientFilteredData,
    hasClientResults
  } = useInstantSearch(
    allProjects,
    ['name', 'clients'] as any,
    () => {},
    {
      debounceMs: 150,
      minChars: 1,
      enableClientSide: true
    }
  )

  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage()
    }
  }, [infiniteQuery])

  const metrics = infiniteQuery.data?.pages[0]?.metrics || metricsRef.current || {
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

  return {
    // Data
    projects: hasClientResults ? clientFilteredData : allProjects,
    allProjects,
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
    refetch: infiniteQuery.refetch,
    forceRefresh: () => {
      queryClient.invalidateQueries({ queryKey: ['optimized-projects', filters] })
      return infiniteQuery.refetch()
    }
  }
} 