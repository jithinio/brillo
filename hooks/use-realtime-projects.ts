"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseFiltersFromSearchParams, type ProjectFilters } from '@/lib/project-filters-v2'
import { toast } from 'sonner'
import type { Project } from '@/components/projects/columns'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface RealtimeProjectsState {
  projects: Project[]
  totalCount: number
  loading: boolean
  error: string | null
  connected: boolean
  lastUpdate: Date | null
}

interface OptimisticUpdate {
  id: string
  type: 'update' | 'insert' | 'delete'
  data: Partial<Project>
  timestamp: number
  rollback?: () => void
}

const OPTIMISTIC_UPDATE_TIMEOUT = 5000 // 5 seconds
const RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_ATTEMPTS = 5

export function useRealtimeProjects() {
  const searchParams = useSearchParams()
  const filters = parseFiltersFromSearchParams(searchParams)
  
  const [state, setState] = useState<RealtimeProjectsState>({
    projects: [],
    totalCount: 0,
    loading: true,
    error: null,
    connected: false,
    lastUpdate: null,
  })
  
  // Track optimistic updates
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map())
  
  // Refs for managing subscriptions and cleanup
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Apply optimistic update to project list
  const applyOptimisticUpdate = useCallback((projects: Project[], update: OptimisticUpdate): Project[] => {
    switch (update.type) {
      case 'update':
        return projects.map(p => 
          p.id === update.id ? { ...p, ...update.data } : p
        )
      case 'insert':
        return [...projects, update.data as Project]
      case 'delete':
        return projects.filter(p => p.id !== update.id)
      default:
        return projects
    }
  }, [])
  
  // Apply all optimistic updates to the project list
  const applyAllOptimisticUpdates = useCallback((baseProjects: Project[]): Project[] => {
    let result = [...baseProjects]
    
    // Apply optimistic updates in chronological order
    const sortedUpdates = Array.from(optimisticUpdates.values())
      .sort((a, b) => a.timestamp - b.timestamp)
    
    for (const update of sortedUpdates) {
      result = applyOptimisticUpdate(result, update)
    }
    
    return result
  }, [optimisticUpdates, applyOptimisticUpdate])
  
  // Create optimistic update
  const createOptimisticUpdate = useCallback((
    id: string,
    type: OptimisticUpdate['type'],
    data: Partial<Project>,
    rollback?: () => void
  ) => {
    const update: OptimisticUpdate = {
      id,
      type,
      data,
      timestamp: Date.now(),
      rollback,
    }
    
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.set(`${id}-${type}`, update)
      return newMap
    })
    
    // Auto-remove optimistic update after timeout
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(`${id}-${type}`)
        return newMap
      })
    }, OPTIMISTIC_UPDATE_TIMEOUT)
    
    return update
  }, [])
  
  // Remove optimistic update
  const removeOptimisticUpdate = useCallback((key: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(key)
      return newMap
    })
  }, [])
  
  // Fetch initial data
  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }))
      return
    }
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
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
          updated_at,
          client_id,
          clients!inner (
            id,
            name,
            company,
            avatar_url
          )
        `, { count: 'exact' })
      
      // Apply filters
      if (filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      if (filters.client.length > 0) {
        query = query.in('client_id', filters.client)
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      
      // Order by updated_at for real-time relevance
      query = query.order('updated_at', { ascending: false })
      
      const { data, error, count } = await query
      
      if (error) {
        throw error
      }
      
      // Transform data
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
                 clients: project.clients && Array.isArray(project.clients) && project.clients.length > 0 ? {
           name: project.clients[0].name,
           company: project.clients[0].company,
           avatar_url: project.clients[0].avatar_url
         } : undefined
      }))
      
      setState(prev => ({
        ...prev,
        projects: transformedProjects,
        totalCount: count || 0,
        loading: false,
        lastUpdate: new Date(),
      }))
      
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch projects',
      }))
    }
  }, [filters])
  
  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!isSupabaseConfigured()) return
    
    console.log('🔄 Setting up real-time subscription...')
    
    try {
      // Create channel for projects table
      const channel = supabase
        .channel('projects-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects'
          },
                     (payload: RealtimePostgresChangesPayload<any>) => {
             console.log('📡 Real-time update received:', payload.eventType, (payload.new as any)?.id || (payload.old as any)?.id)
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }))
            
            // Handle different event types
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  // Remove any pending optimistic insert
                  const insertKey = `${payload.new.id}-insert`
                  removeOptimisticUpdate(insertKey)
                  
                  // Add to projects list if it matches filters
                  setState(prev => {
                    const exists = prev.projects.some(p => p.id === payload.new.id)
                    if (!exists) {
                      const newProject = {
                        id: payload.new.id,
                        name: payload.new.name,
                        status: payload.new.status,
                        start_date: payload.new.start_date,
                        due_date: payload.new.due_date,
                        budget: payload.new.budget,
                        expenses: payload.new.expenses,
                        received: payload.new.payment_received,
                        pending: payload.new.payment_pending,
                                                 created_at: payload.new.created_at,
                         clients: undefined // Will be populated by refetch if needed
                      }
                      return {
                        ...prev,
                        projects: [newProject, ...prev.projects],
                        totalCount: prev.totalCount + 1,
                      }
                    }
                    return prev
                  })
                  
                  toast.success('New project added', { position: 'bottom-right' })
                }
                break
                
              case 'UPDATE':
                if (payload.new) {
                  // Remove any pending optimistic update
                  const updateKey = `${payload.new.id}-update`
                  removeOptimisticUpdate(updateKey)
                  
                  // Update existing project
                  setState(prev => ({
                    ...prev,
                    projects: prev.projects.map(p =>
                      p.id === payload.new.id
                        ? {
                            ...p,
                            name: payload.new.name,
                            status: payload.new.status,
                            start_date: payload.new.start_date,
                            due_date: payload.new.due_date,
                            budget: payload.new.budget,
                            expenses: payload.new.expenses,
                            received: payload.new.payment_received,
                            pending: payload.new.payment_pending,
                          }
                        : p
                    ),
                  }))
                  
                  toast.success('Project updated', { position: 'bottom-right' })
                }
                break
                
              case 'DELETE':
                if (payload.old) {
                  // Remove any pending optimistic delete
                  const deleteKey = `${payload.old.id}-delete`
                  removeOptimisticUpdate(deleteKey)
                  
                  // Remove from projects list
                  setState(prev => ({
                    ...prev,
                    projects: prev.projects.filter(p => p.id !== payload.old.id),
                    totalCount: Math.max(0, prev.totalCount - 1),
                  }))
                  
                  toast.success('Project deleted', { position: 'bottom-right' })
                }
                break
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status)
          
          setState(prev => ({ 
            ...prev, 
            connected: status === 'SUBSCRIBED',
            error: status === 'CHANNEL_ERROR' ? 'Real-time connection failed' : null,
          }))
          
          if (status === 'SUBSCRIBED') {
            reconnectAttempts.current = 0
            toast.success('Real-time sync active', { position: 'bottom-right' })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Attempt to reconnect
            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current++
              console.log(`🔄 Attempting to reconnect... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`)
              
              reconnectTimeoutRef.current = setTimeout(() => {
                setupRealtimeSubscription()
              }, RECONNECT_DELAY * reconnectAttempts.current)
              
              toast.error(`Connection lost. Reconnecting... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`, {
                position: 'bottom-right'
              })
            } else {
              toast.error('Real-time sync disabled. Refresh to retry.', { position: 'bottom-right' })
            }
          }
        })
      
      channelRef.current = channel
      
    } catch (error) {
      console.error('Error setting up real-time subscription:', error)
      setState(prev => ({ ...prev, connected: false, error: 'Failed to setup real-time connection' }))
    }
  }, [removeOptimisticUpdate])
  
  // Cleanup subscription
  const cleanupSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up real-time subscription')
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    setState(prev => ({ ...prev, connected: false }))
  }, [])
  
  // Optimistic update function for external use
  const updateProjectOptimistic = useCallback(async (
    projectId: string,
    updates: Partial<Project>,
    serverUpdate?: () => Promise<void>
  ) => {
    // Create optimistic update
    const optimisticUpdate = createOptimisticUpdate(
      projectId,
      'update',
      updates,
      () => {
        // Rollback function
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p =>
            p.id === projectId
              ? { ...p, ...updates } // Revert to original
              : p
          ),
        }))
      }
    )
    
    try {
      // Apply server update if provided
      if (serverUpdate) {
        await serverUpdate()
      }
      
      // Remove optimistic update on success
      setTimeout(() => {
        removeOptimisticUpdate(`${projectId}-update`)
      }, 100)
      
    } catch (error) {
      console.error('Server update failed:', error)
      
      // Execute rollback
      if (optimisticUpdate.rollback) {
        optimisticUpdate.rollback()
      }
      
      // Remove failed optimistic update
      removeOptimisticUpdate(`${projectId}-update`)
      
      toast.error('Update failed. Changes reverted.')
    }
  }, [createOptimisticUpdate, removeOptimisticUpdate])
  
  // Initialize on mount
  useEffect(() => {
    fetchProjects()
    setupRealtimeSubscription()
    
    return () => {
      cleanupSubscription()
    }
  }, [fetchProjects, setupRealtimeSubscription, cleanupSubscription])
  
  // Re-fetch when filters change
  useEffect(() => {
    fetchProjects()
  }, [filters, fetchProjects])
  
  // Apply optimistic updates to displayed projects
  const displayedProjects = applyAllOptimisticUpdates(state.projects)
  
  return {
    // State
    projects: displayedProjects,
    totalCount: state.totalCount,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    lastUpdate: state.lastUpdate,
    
    // Actions
    updateProjectOptimistic,
    refetch: fetchProjects,
    reconnect: setupRealtimeSubscription,
    
    // Metadata
    hasOptimisticUpdates: optimisticUpdates.size > 0,
    optimisticUpdateCount: optimisticUpdates.size,
  }
} 