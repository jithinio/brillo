"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { queryKeys, cacheUtils } from "@/components/query-provider"
import { toast } from "sonner"

export interface Project {
  id: string
  name: string
  status: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
  start_date: string | null
  due_date: string | null
  budget: number | null
  total_budget: number | null
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

export interface ProjectsResponse {
  data: Project[]
  count: number
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
}

// Fetch projects with advanced filtering and pagination
const fetchProjects = async (filters: ProjectFilters = {}): Promise<ProjectsResponse> => {
  let query = supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      start_date,
      due_date,
      total_budget,
      budget,
      expenses,
      payment_received,
      payment_pending,
      created_at,
      updated_at,
      clients!inner (
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

  if (filters.projectType && filters.projectType.length > 0) {
    query = query.in('project_type', filters.projectType)
  }

  // Only fetch projects with actual status values (excludes lost projects which have status=null)
  query = query.not('status', 'is', null)

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
    
    // Filter by project start_date, not created_at
    query = query.gte('start_date', startDate)
  }

  // Sorting
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  // Transform data
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
    received: project.payment_received,
    pending: project.payment_pending,
    created_at: project.created_at,
    updated_at: project.updated_at,
    clients: project.clients && Array.isArray(project.clients) && project.clients.length > 0 ? {
      id: project.clients[0].id,
      name: project.clients[0].name,
      company: project.clients[0].company,
      avatar_url: project.clients[0].avatar_url
    } : null
  }))

  // Calculate metrics
  const metrics = {
    totalProjects: transformedProjects.length,
    activeProjects: transformedProjects.filter(p => p.status === 'active').length,
    pipelineProjects: transformedProjects.filter(p => p.status === 'pipeline').length,
    completedProjects: transformedProjects.filter(p => p.status === 'completed').length,
    onHoldProjects: transformedProjects.filter(p => p.status === 'on_hold').length,
    cancelledProjects: transformedProjects.filter(p => p.status === 'cancelled').length,
    totalBudget: transformedProjects.reduce((sum, p) => sum + (p.budget || p.total_budget || 0), 0),
    totalExpenses: transformedProjects.reduce((sum, p) => sum + (p.expenses || 0), 0),
    totalReceived: transformedProjects.reduce((sum, p) => sum + (p.received || 0), 0),
    totalPending: transformedProjects.reduce((sum, p) => {
      const budget = p.budget || p.total_budget || 0
      const received = p.received || 0
      return sum + Math.max(0, budget - received)
    }, 0)
  }

  return {
    data: transformedProjects,
    count: count || 0,
    metrics
  }
}

// Update project status with optimistic updates
const updateProjectStatus = async ({ id, status }: { id: string; status: string }) => {
  // First, fetch the current project to check if it's recurring and has a due date
  const { data: currentProject, error: fetchError } = await supabase
    .from('projects')
    .select('due_date, recurring_frequency, total_budget, project_type')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('❌ Failed to fetch current project:', fetchError)
    throw new Error(`Failed to fetch project: ${fetchError.message}`)
  }

  // Prepare update data based on status
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  }
  
  // If moving to pipeline, set default pipeline fields
  if (status === 'pipeline') {
    updateData.pipeline_stage = 'lead'
    updateData.deal_probability = 10
  } else {
    // If moving away from pipeline, clear pipeline fields
    updateData.pipeline_stage = null
    updateData.deal_probability = null
  }

  // Handle recurring projects without due date
  if (currentProject.recurring_frequency && !currentProject.due_date) {
    updateData.due_date = new Date().toISOString().split('T')[0] // Set to current date in YYYY-MM-DD format
    console.log('📅 Setting due_date to current date for recurring project without due date')
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`)
  }

  return data
}

// Advanced projects hook with React Query
export function useAdvancedProjects(filters: ProjectFilters = {}) {
  const queryClient = useQueryClient()

  // Main projects query with optimized refetching
  const projectsQuery = useQuery({
    queryKey: queryKeys.projectsList(filters),
    queryFn: () => fetchProjects(filters),
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: false, // Disable automatic background refetching
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchOnReconnect: true,
    retry: 3,
    select: (data) => ({
      projects: data.data,
      metrics: data.metrics,
      totalCount: data.count
    })
  })

  // Infinite query for large datasets (virtualization support)
  const infiniteProjectsQuery = useInfiniteQuery({
    queryKey: queryKeys.projectsInfinite(filters),
    queryFn: ({ pageParam = 0 }) => {
      const pageSize = 50
      return fetchProjects({
        ...filters,
        // Add pagination params here if your API supports it
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Return next page number or undefined if no more pages
      return lastPage.data.length === 50 ? allPages.length : undefined
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Optimistic update mutation
  const updateStatusMutation = useMutation({
    mutationFn: updateProjectStatus,
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projects })

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(queryKeys.projectsList(filters))

      // Optimistically update the cache
      cacheUtils.updateProjectInCache(queryClient, id, (old: Project) => ({
        ...old,
        status,
        updated_at: new Date().toISOString()
      }))

      // Return a context object with the snapshotted value
      return { previousProjects }
    },
    onError: (err, { id, status }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projectsList(filters), context.previousProjects)
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })

  // Prefetch related data on hover
  const prefetchProject = useCallback((id: string) => {
    cacheUtils.prefetchProject(queryClient, id)
  }, [queryClient])

  // Manual refetch function
  const refetch = useCallback(() => {
    return projectsQuery.refetch()
  }, [projectsQuery])

  // Force refresh (bypasses cache)
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    return projectsQuery.refetch()
  }, [queryClient, projectsQuery])

  // Memoized derived state
  const derivedState = useMemo(() => {
    const projects = projectsQuery.data?.projects || []
    const metrics = projectsQuery.data?.metrics
    
    return {
      // Performance metrics
      cacheHitRate: projectsQuery.dataUpdatedAt > 0 ? 
        (projectsQuery.dataUpdatedAt === projectsQuery.dataUpdatedAt ? 100 : 0) : 0,
      lastUpdated: new Date(projectsQuery.dataUpdatedAt || Date.now()),
      
      // Data freshness
      isFresh: projectsQuery.isStale === false,
      staleDuration: projectsQuery.dataUpdatedAt ? 
        Date.now() - projectsQuery.dataUpdatedAt : 0,
      
      // Background state
      isBackgroundRefetching: projectsQuery.isFetching && !projectsQuery.isLoading,
      
      // Quick filters (client-side for instant response)
      quickFilter: (searchTerm: string) => 
        projects.filter(project => 
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.clients?.company?.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    }
  }, [projectsQuery])

  return {
    // Data
    projects: projectsQuery.data?.projects || [],
    metrics: projectsQuery.data?.metrics,
    totalCount: projectsQuery.data?.totalCount || 0,
    
    // Loading states
    isLoading: projectsQuery.isLoading,
    isFetching: projectsQuery.isFetching,
    isError: projectsQuery.isError,
    error: projectsQuery.error,
    
    // Advanced states
    isStale: projectsQuery.isStale,
    isFetchingNextPage: infiniteProjectsQuery.isFetchingNextPage,
    hasNextPage: infiniteProjectsQuery.hasNextPage,
    
    // Mutations
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    
    // Actions
    refetch,
    forceRefresh,
    prefetchProject,
    
    // Infinite query for virtualization
    infiniteProjects: infiniteProjectsQuery.data,
    fetchNextPage: infiniteProjectsQuery.fetchNextPage,
    
    // Derived state
    ...derivedState,
  }
} 