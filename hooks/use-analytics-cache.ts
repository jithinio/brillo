/**
 * Advanced analytics cache management hook
 * Provides intelligent cache invalidation for analytics when project data changes
 */

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys, cacheUtils } from '@/components/query-provider'
import { supabase } from '@/lib/supabase'

interface AnalyticsCacheOptions {
  enableRealTimeUpdates?: boolean
  debounceMs?: number
  onCacheInvalidated?: () => void
}

export function useAnalyticsCache(options: AnalyticsCacheOptions = {}) {
  const {
    enableRealTimeUpdates = true,
    debounceMs = 1000,
    onCacheInvalidated
  } = options
  
  const queryClient = useQueryClient()

  // Intelligent cache invalidation
  const invalidateAnalyticsCache = useCallback((reason: string) => {
    console.log(`♻️ Analytics Cache: Invalidating due to ${reason}`)
    
    // Clear all analytics related queries
    cacheUtils.invalidateAnalytics(queryClient)
    
    // Also clear the localStorage cache used by useAnalyticsData
    try {
      localStorage.removeItem('analytics-data')
    } catch (error) {
      console.warn('Failed to clear analytics localStorage cache:', error)
    }
    
    // Notify callback
    onCacheInvalidated?.()
  }, [queryClient, onCacheInvalidated])

  // Listen for project mutations
  useEffect(() => {
    if (!enableRealTimeUpdates) return

    let debounceTimer: NodeJS.Timeout | null = null

    const handleDataChange = (reason: string) => {
      if (debounceTimer) clearTimeout(debounceTimer)
      
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          invalidateAnalyticsCache(reason)
        }
      }, debounceMs)
    }

    // Listen to React Query cache events for project mutations
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' || event.type === 'removed') {
        const query = event.query
        const queryKey = query.queryKey
        
        // Check if this is a project-related query update
        if (queryKey.some(key => 
          key === 'projects' || 
          key === 'analytics' || 
          key === 'dashboard' ||
          key === 'database-metrics' ||
          (typeof key === 'string' && (
            key.includes('project') || 
            key.includes('analytics') || 
            key.includes('dashboard')
          ))
        )) {
          console.log('🔄 Analytics Cache: Detected React Query cache change', {
            type: event.type,
            queryKey,
            status: query.state.status
          })
          
          // Trigger invalidation for any project-related cache changes
          if (event.type === 'removed' || 
              (query.state.status === 'success' && query.state.dataUpdatedAt > 0) ||
              query.state.status === 'error') {
            handleDataChange(`react query ${event.type}`)
          }
        }
      }
    })

    // Listen for manual cache invalidation events
    const handleCustomInvalidation = (event: CustomEvent) => {
      console.log('🔄 Analytics Cache: Received custom invalidation event', event.detail)
      handleDataChange('custom invalidation event')
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('project-cache-invalidated', handleCustomInvalidation as EventListener)
    }

    // Also listen for Supabase real-time changes as backup
    const projectsSubscription = supabase
      .channel('analytics-cache-projects')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, () => handleDataChange('supabase real-time'))
      .subscribe()

    const clientsSubscription = supabase
      .channel('analytics-cache-clients')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients' 
      }, () => handleDataChange('supabase real-time'))
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      unsubscribe()
      projectsSubscription.unsubscribe()
      clientsSubscription.unsubscribe()
      
      // Clean up custom event listener
      if (typeof window !== 'undefined') {
        window.removeEventListener('project-cache-invalidated', handleCustomInvalidation as EventListener)
      }
    }
  }, [enableRealTimeUpdates, debounceMs, invalidateAnalyticsCache, queryClient])

  return {
    invalidateAnalyticsCache,
    // Helper to manually trigger cache refresh
    refreshAnalytics: () => invalidateAnalyticsCache('manual refresh')
  }
}
