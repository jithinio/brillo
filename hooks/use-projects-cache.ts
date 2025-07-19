"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Project } from '@/components/projects/columns'

interface CacheEntry {
  data: Project[]
  timestamp: number
  count: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, CacheEntry>()

export function useProjectsCache() {
  const [isInvalidating, setIsInvalidating] = useState(false)

  // Generate cache key from filters
  const getCacheKey = useCallback((filters: any, page: number, pageSize: number) => {
    return JSON.stringify({ filters, page, pageSize })
  }, [])

  // Get cached data
  const getCachedData = useCallback((key: string): CacheEntry | null => {
    const entry = cache.get(key)
    if (!entry) return null

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      cache.delete(key)
      return null
    }

    return entry
  }, [])

  // Set cache data
  const setCachedData = useCallback((key: string, data: Project[], count: number) => {
    cache.set(key, {
      data,
      count,
      timestamp: Date.now()
    })
  }, [])

  // Invalidate all cache
  const invalidateCache = useCallback(async () => {
    setIsInvalidating(true)
    cache.clear()
    
    // Optionally trigger a refetch event
    window.dispatchEvent(new CustomEvent('projects-cache-invalidated'))
    
    setIsInvalidating(false)
  }, [])

  // Invalidate specific cache entries
  const invalidateByFilter = useCallback((filterPredicate: (key: string) => boolean) => {
    const keysToDelete: string[] = []
    
    cache.forEach((_, key) => {
      if (filterPredicate(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => cache.delete(key))
  }, [])

  // Subscribe to real-time updates if Supabase is configured
  // Note: Disabled due to CSP restrictions in development
  // useEffect(() => {
  //   if (!isSupabaseConfigured()) return

  //   const subscription = supabase
  //     .channel('projects-changes')
  //     .on('postgres_changes', {
  //       event: '*',
  //       schema: 'public',
  //       table: 'projects'
  //     }, (payload) => {
  //       console.log('Project change detected:', payload)
  //       // Invalidate cache on any project change
  //       invalidateCache()
  //     })
  //     .subscribe()

  //   return () => {
  //     subscription.unsubscribe()
  //   }
  // }, [invalidateCache])

  return {
    getCacheKey,
    getCachedData,
    setCachedData,
    invalidateCache,
    invalidateByFilter,
    isInvalidating,
  }
} 