"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { projectCalculationEngine } from "@/lib/project-calculation-engine"
import type { 
  EnhancedProject, 
  CompatibleProject, 
  CreateProjectData,
  UpdateProjectData,
  ProjectMetrics,
  EnhancedProjectFilters 
} from "@/lib/types/enhanced-project"
import { 
  toEnhancedProject, 
  toLegacyProject, 
  createCompatibleResponse,
  migrateProjectData 
} from "@/lib/project-compatibility"

// Query keys for React Query
export const projectQueryKeys = {
  all: ['projects'] as const,
  lists: () => [...projectQueryKeys.all, 'list'] as const,
  list: (filters: EnhancedProjectFilters) => [...projectQueryKeys.lists(), filters] as const,
  details: () => [...projectQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectQueryKeys.details(), id] as const,
  metrics: () => [...projectQueryKeys.all, 'metrics'] as const,
}

// Enhanced projects response interface
interface EnhancedProjectsResponse {
  projects: EnhancedProject[]
  total: number
  metrics: ProjectMetrics
  hasMore: boolean
  nextCursor?: string
}

// Fetch projects with enhanced multi-type support
async function fetchEnhancedProjects(
  filters: EnhancedProjectFilters = {},
  pageParam?: string,
  pageSize: number = 50
): Promise<EnhancedProjectsResponse> {
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
          email,
          phone,
          avatar_url
        )
      `, { count: 'exact' })

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.client?.length) {
      query = query.in('client_id', filters.client)
    }
    if (filters.projectType?.length) {
      query = query.in('project_type', filters.projectType)
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    if (filters.budgetRange?.min !== undefined) {
      query = query.gte('total_budget', filters.budgetRange.min)
    }
    if (filters.budgetRange?.max !== undefined) {
      query = query.lte('total_budget', filters.budgetRange.max)
    }
    
    // Only fetch projects with actual status values
    query = query.not('status', 'is', null)
    
    // Time period filtering
    if (filters.timePeriod) {
      const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
      if (dateFrom) query = query.gte('start_date', dateFrom)
      if (dateTo) query = query.lte('start_date', dateTo)
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Pagination
    if (pageParam) {
      query = query.lt('created_at', pageParam)
    }
    query = query.limit(pageSize)

    const { data, error, count } = await query

    if (error) throw error

    // Transform data to enhanced format
    const enhancedProjects = (data || []).map(project => {
      // Handle both old and new project formats
      if (project.project_type) {
        return project as EnhancedProject
      } else {
        return migrateProjectData(project)
      }
    })

    // Calculate metrics
    const metrics = calculateProjectMetrics(enhancedProjects)

    return {
      projects: enhancedProjects,
      total: count || 0,
      metrics,
      hasMore: (data?.length || 0) === pageSize,
      nextCursor: data?.[data.length - 1]?.created_at
    }

  } catch (error) {
    console.error('Error fetching enhanced projects:', error)
    throw error
  }
}

// Calculate project metrics for the new system
function calculateProjectMetrics(projects: EnhancedProject[]): ProjectMetrics {
  const metrics: ProjectMetrics = {
    totalProjects: projects.length,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    pipelineProjects: 0,
    
    totalBudget: 0,
    totalExpenses: 0,
    totalReceived: 0,
    totalPending: 0,
    
    fixedProjectsCount: 0,
    recurringProjectsCount: 0,
    hourlyProjectsCount: 0,
    
    fixedProjectsValue: 0,
    recurringProjectsValue: 0,
    hourlyProjectsValue: 0,
  }

  projects.forEach(project => {
    // Status counts
    switch (project.status) {
      case 'active': metrics.activeProjects++; break
      case 'completed': metrics.completedProjects++; break
      case 'on_hold': metrics.onHoldProjects++; break
      case 'cancelled': metrics.cancelledProjects++; break
      case 'pipeline': metrics.pipelineProjects++; break
    }

    // Project type counts and values
    const budget = project.total_budget || 0
    switch (project.project_type) {
      case 'fixed':
        metrics.fixedProjectsCount++
        metrics.fixedProjectsValue += budget
        break
      case 'recurring':
        metrics.recurringProjectsCount++
        metrics.recurringProjectsValue += budget
        break
      case 'hourly':
        metrics.hourlyProjectsCount++
        metrics.hourlyProjectsValue += budget
        break
    }

    // Financial totals
    metrics.totalBudget += budget
    metrics.totalExpenses += project.expenses || 0
    metrics.totalReceived += project.payment_received || 0
    metrics.totalPending += project.payment_pending || 0
  })

  return metrics
}

// Date range helper function
function getDateRangeFromTimePeriod(timePeriod: string) {
  const now = new Date()
  let dateFrom: string | undefined
  let dateTo: string | undefined

  switch (timePeriod) {
    case 'today':
      dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0]
      break
    case 'week':
      dateFrom = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]
      break
    case 'month':
      dateFrom = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0]
      break
    case 'quarter':
      dateFrom = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0]
      break
    case 'year':
      dateFrom = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0]
      break
  }

  return { dateFrom, dateTo }
}

// Main hook for enhanced projects
export function useEnhancedProjects(filters: EnhancedProjectFilters = {}) {
  return useQuery({
    queryKey: projectQueryKeys.list(filters),
    queryFn: () => fetchEnhancedProjects(filters),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Infinite query for large datasets
export function useInfiniteEnhancedProjects(filters: EnhancedProjectFilters = {}) {
  return useInfiniteQuery({
    queryKey: projectQueryKeys.list(filters),
    queryFn: ({ pageParam }) => fetchEnhancedProjects(filters, pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
  })
}

// Get single project
export function useEnhancedProject(projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            name,
            company,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('id', projectId)
        .single()

      if (error) throw error

      // Convert to enhanced format if needed
      return data.project_type ? data as EnhancedProject : migrateProjectData(data)
    },
    enabled: !!projectId,
  })
}

// Create project mutation
export function useCreateEnhancedProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectData: CreateProjectData): Promise<EnhancedProject> => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select(`
          *,
          clients (
            id,
            name,
            company,
            email,
            phone,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Queue calculation for auto-calculate projects
      if (projectData.auto_calculate_total && projectData.project_type !== 'fixed') {
        projectCalculationEngine.queueCalculation(data.id)
      }

      return data as EnhancedProject
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all })
      toast.success('Project created successfully!')
    },
    onError: (error) => {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    },
  })
}

// Update project mutation
export function useUpdateEnhancedProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateData: UpdateProjectData): Promise<EnhancedProject> => {
      const { id, ...updates } = updateData

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          clients (
            id,
            name,
            company,
            email,
            phone,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Queue calculation if auto-calculate is enabled
      const project = data as EnhancedProject
      if (project.auto_calculate_total && project.project_type !== 'fixed') {
        projectCalculationEngine.queueCalculation(project.id)
      }

      return project
    },
    onSuccess: (data) => {
      // Update the specific project in cache
      queryClient.setQueryData(projectQueryKeys.detail(data.id), data)
      // Invalidate list queries to refresh
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() })
      toast.success('Project updated successfully!')
    },
    onError: (error) => {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    },
  })
}

// Delete project mutation
export function useDeleteEnhancedProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all })
      toast.success('Project deleted successfully!')
    },
    onError: (error) => {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    },
  })
}

// Backwards compatibility hook - returns data in legacy format
export function useCompatibleProjects(filters: any = {}) {
  const enhancedQuery = useEnhancedProjects(filters)

  return useMemo(() => ({
    ...enhancedQuery,
    data: enhancedQuery.data ? {
      ...enhancedQuery.data,
      projects: enhancedQuery.data.projects.map(toLegacyProject)
    } : undefined
  }), [enhancedQuery])
}

// Batch update projects (for recurring calculations)
export function useBatchUpdateProjects() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectIds: string[]) => {
      const result = await projectCalculationEngine.updateProjectTotalsBatch(projectIds)
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all })
      if (result.success.length > 0) {
        toast.success(`Updated ${result.success.length} projects successfully`)
      }
      if (result.failed.length > 0) {
        toast.error(`Failed to update ${result.failed.length} projects`)
      }
    },
    onError: (error) => {
      console.error('Error in batch update:', error)
      toast.error('Failed to update projects')
    },
  })
}

// Hook for project metrics only
export function useProjectMetrics(filters: EnhancedProjectFilters = {}) {
  return useQuery({
    queryKey: [...projectQueryKeys.metrics(), filters],
    queryFn: async () => {
      const result = await fetchEnhancedProjects(filters, undefined, 1000) // Get more for accurate metrics
      return result.metrics
    },
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}