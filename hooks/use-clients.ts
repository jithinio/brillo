"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { toast } from "sonner"
import { DataHookReturn } from "@/components/table/types"

export interface Client {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  notes?: string | null
  avatar_url?: string | null
  status?: string
  relationship?: string
  source?: string | null
  created_at: string
  updated_at?: string
  client_since?: string | null
  projects?: Array<{
    id: string
    name: string
    status: string
  }>
}

interface ClientFilters {
  status?: string[]
  search?: string
  source?: string[]
}

async function fetchClients(filters: ClientFilters = {}): Promise<{
  data: Client[]
  count: number
  metrics: {
    totalClients: number
    activeClients: number
    totalProjects: number
    totalRevenue: number
  }
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      count: 0,
      metrics: {
        totalClients: 0,
        activeClients: 0,
        totalProjects: 0,
        totalRevenue: 0
      }
    }
  }

  try {
    let query = supabase
      .from('clients')
      .select(`
        *,
        projects (
          id,
          name,
          status,
          budget
        )
      `, { count: 'exact' })

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.source?.length) {
      query = query.in('source', filters.source)
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
    }

    // Order by name
    query = query.order('name', { ascending: true })

    const { data, error, count } = await query

    if (error) throw error

    // Calculate metrics
    const metrics = {
      totalClients: count || 0,
      activeClients: data?.filter(client => client.status === 'active').length || 0,
      totalProjects: data?.reduce((sum, client) => sum + (client.projects?.length || 0), 0) || 0,
      totalRevenue: data?.reduce((sum, client) => {
        const clientRevenue = client.projects?.reduce((projSum: number, proj: any) => projSum + (proj.budget || 0), 0) || 0
        return sum + clientRevenue
      }, 0) || 0
    }

    return {
      data: data || [],
      count: count || 0,
      metrics
    }
  } catch (error) {
    console.error('Error fetching clients:', error)
    throw error
  }
}

export function useClients(filters: ClientFilters = {}): DataHookReturn<Client> {
  const queryClient = useQueryClient()

  // Main query
  const clientsQuery = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => fetchClients(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Explicitly disable window focus refetch
  })

  // Update client status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      // Handle client_since date updates
      if (status.startsWith('client_since:')) {
        const dateStr = status.replace('client_since:', '')
        const { error } = await supabase
          .from('clients')
          .update({ client_since: dateStr })
          .eq('id', id)
        
        if (error) throw error
        return { id, client_since: dateStr }
      }
      
      // Handle source updates
      if (status.startsWith('source:')) {
        const sourceValue = status.replace('source:', '')
        const { error } = await supabase
          .from('clients')
          .update({ source: sourceValue })
          .eq('id', id)
        
        if (error) throw error
        return { id, source: sourceValue }
      }
      
      // Handle relationship updates
      if (['recurring', 'one-time', 'regular'].includes(status)) {
        const { error } = await supabase
          .from('clients')
          .update({ relationship: status })
          .eq('id', id)
        
        if (error) throw error
        return { id, relationship: status }
      }
      
      // Regular status update
      const { error } = await supabase
        .from('clients')
        .update({ status })
        .eq('id', id)
      
      if (error) throw error
      return { id, status }
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['clients', filters] })
      
      const previousData = queryClient.getQueryData(['clients', filters])
      
      queryClient.setQueryData(['clients', filters], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((client: Client) => {
            if (client.id === id) {
              // Handle client_since date updates
              if (status.startsWith('client_since:')) {
                const dateStr = status.replace('client_since:', '')
                return { ...client, client_since: dateStr }
              }
              // Handle source updates
              if (status.startsWith('source:')) {
                const sourceValue = status.replace('source:', '')
                return { ...client, source: sourceValue }
              }
              // Handle relationship updates
              if (['recurring', 'one-time', 'regular'].includes(status)) {
                return { ...client, relationship: status }
              }
              // Handle regular status updates
              return { ...client, status }
            }
            return client
          })
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['clients', filters], context.previousData)
      }
      toast.error('Failed to update client')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', filters] })
    }
  })

  const updateStatus = useCallback((id: string, status: string) => {
    updateStatusMutation.mutate({ id, status })
  }, [updateStatusMutation])

  const refetch = useCallback(() => {
    return clientsQuery.refetch()
  }, [clientsQuery])

  return {
    data: clientsQuery.data?.data || [],
    totalCount: clientsQuery.data?.count || 0,
    isLoading: clientsQuery.isLoading,
    isFetching: clientsQuery.isFetching,
    isError: clientsQuery.isError,
    error: clientsQuery.error,
    refetch,
    updateStatus: updateStatus,
    isUpdating: updateStatusMutation.isPending,
    metrics: clientsQuery.data?.metrics
  }
} 