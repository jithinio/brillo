"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'

export interface ProjectFilters {
  status: string[]
  client: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
  budget: {
    min: number | null
    max: number | null
  }
}

const DEFAULT_FILTERS: ProjectFilters = {
  status: [],
  client: [],
  dateRange: {
    start: null,
    end: null
  },
  budget: {
    min: null,
    max: null
  }
}

const STORAGE_KEY_PREFIX = 'project_filters_v2_'

export function useProjectFilters() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate storage key for current user
  const storageKey = useMemo(() => {
    return user ? `${STORAGE_KEY_PREFIX}${user.id}` : null
  }, [user])

  // Load filters from localStorage
  const loadFromLocalStorage = useCallback(() => {
    if (!storageKey) return DEFAULT_FILTERS
    
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_FILTERS, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error)
    }
    
    return DEFAULT_FILTERS
  }, [storageKey])

  // Save filters to localStorage
  const saveToLocalStorage = useCallback((newFilters: ProjectFilters) => {
    if (!storageKey) return
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error)
    }
  }, [storageKey])

  // Load filters from database
  const loadFromDatabase = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      return null
    }

    try {
      const { data, error } = await supabase
        .from('project_filter_preferences')
        .select('filter_value')
        .eq('user_id', user.id)
        .eq('filter_name', 'project_filters_v2')
        .single()

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is OK
          console.warn('Database load error:', error)
        }
        return null
      }

      return data?.filter_value || null
    } catch (error) {
      console.warn('Failed to load filters from database:', error)
      return null
    }
  }, [user])

  // Save filters to database
  const saveToDatabase = useCallback(async (newFilters: ProjectFilters) => {
    if (!isSupabaseConfigured() || !user) {
      return
    }

    try {
      const { error } = await supabase
        .from('project_filter_preferences')
        .upsert({
          user_id: user.id,
          filter_name: 'project_filters_v2',
          filter_value: newFilters,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,filter_name',
          ignoreDuplicates: false
        })

      if (error) {
        // Only log actual errors, not expected database structure issues
        if (error.code !== '42P01' && error.code !== '23505') {
          console.warn('Database save error:', error)
          setError('Failed to save filters to database')
        } else {
          // Table doesn't exist or constraint issue - localStorage fallback is working
          console.info('Using localStorage fallback for filter persistence')
          setError(null)
        }
      } else {
        setError(null)
      }
    } catch (error) {
      console.info('Database save skipped, using localStorage fallback')
      setError(null)
    }
  }, [user])

  // Initialize filters
  useEffect(() => {
    const initializeFilters = async () => {
      setLoading(true)
      
      // Try database first, then localStorage, then defaults
      const dbFilters = await loadFromDatabase()
      const localFilters = loadFromLocalStorage()
      
      const initialFilters = dbFilters || localFilters
      setFilters(initialFilters)
      
      // Sync localStorage if we loaded from database
      if (dbFilters) {
        saveToLocalStorage(dbFilters)
      }
      
      setLoading(false)
    }

    initializeFilters()
  }, [loadFromDatabase, loadFromLocalStorage, saveToLocalStorage])

  // Update filters function
  const updateFilters = useCallback((newFilters: ProjectFilters) => {
    setFilters(newFilters)
    saveToLocalStorage(newFilters)
    saveToDatabase(newFilters)
  }, [saveToLocalStorage, saveToDatabase])

  // Update specific filter
  const updateFilter = useCallback(<K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K]
  ) => {
    setFilters(current => {
      const newFilters = { ...current, [key]: value }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = { ...DEFAULT_FILTERS }
    setFilters(clearedFilters)
    saveToLocalStorage(clearedFilters)
    saveToDatabase(clearedFilters)
  }, [saveToLocalStorage, saveToDatabase])

  // Remove specific status
  const removeStatus = useCallback((status: string) => {
    setFilters(current => {
      const newStatuses = current.status.filter(s => s !== status)
      const newFilters = { ...current, status: newStatuses }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Add status
  const addStatus = useCallback((status: string) => {
    setFilters(current => {
      if (current.status.includes(status)) return current
      const newStatuses = [...current.status, status]
      const newFilters = { ...current, status: newStatuses }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Toggle status
  const toggleStatus = useCallback((status: string) => {
    setFilters(current => {
      const newStatuses = current.status.includes(status)
        ? current.status.filter(s => s !== status)
        : [...current.status, status]
      const newFilters = { ...current, status: newStatuses }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Remove specific client
  const removeClient = useCallback((clientId: string) => {
    setFilters(current => {
      const newClients = current.client.filter(c => c !== clientId)
      const newFilters = { ...current, client: newClients }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Toggle client
  const toggleClient = useCallback((clientId: string) => {
    setFilters(current => {
      const newClients = current.client.includes(clientId)
        ? current.client.filter(c => c !== clientId)
        : [...current.client, clientId]
      const newFilters = { ...current, client: newClients }
      saveToLocalStorage(newFilters)
      saveToDatabase(newFilters)
      return newFilters
    })
  }, [saveToLocalStorage, saveToDatabase])

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status.length > 0 ||
      filters.client.length > 0 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      filters.budget.min !== null ||
      filters.budget.max !== null
    )
  }, [filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    count += filters.status.length
    count += filters.client.length
    if (filters.dateRange.start) count++
    if (filters.dateRange.end) count++
    if (filters.budget.min !== null) count++
    if (filters.budget.max !== null) count++
    return count
  }, [filters])

  return {
    filters,
    loading,
    error,
    hasActiveFilters,
    activeFilterCount,
    updateFilters,
    updateFilter,
    clearFilters,
    removeStatus,
    addStatus,
    toggleStatus,
    removeClient,
    toggleClient,
  }
} 