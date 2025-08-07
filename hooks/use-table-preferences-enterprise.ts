"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface TablePreferences {
  [tableName: string]: {
    column_visibility?: Record<string, boolean>
    column_widths?: Record<string, number>
    column_order?: string[]
    sorting?: any[]
    pagination?: { pageIndex: number; pageSize: number }
    last_updated?: number
  }
}

interface PendingUpdate {
  tableName: string
  key: string
  value: any
  timestamp: number
}

interface SaveMetrics {
  totalSaves: number
  successfulSaves: number
  failedSaves: number
  averageSaveTime: number
  lastSaveTime?: number
}

const DEBOUNCE_DELAY = 300 // 300ms debounce for UI responsiveness
const BATCH_DELAY = 1000 // 1s batch delay for database efficiency
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000

export function useTablePreferencesEnterprise() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Core state
  const [preferences, setPreferences] = useState<TablePreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const localPrefs = localStorage.getItem('table-preferences')
        return localPrefs ? JSON.parse(localPrefs) : {}
      } catch (e) {
        console.warn('Failed to load preferences from localStorage:', e)
        return {}
      }
    }
    return {}
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMetrics, setSaveMetrics] = useState<SaveMetrics>({
    totalSaves: 0,
    successfulSaves: 0,
    failedSaves: 0,
    averageSaveTime: 0
  })

  // Refs for performance
  const preferencesRef = useRef<TablePreferences>({})
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate>>(new Map())
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const batchTimeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef<number>(0)
  const saveStartTimeRef = useRef<number>(0)

  // Update refs when state changes
  preferencesRef.current = preferences

  const storageKey = useMemo(() => {
    return user ? `table_preferences_${user.id}` : 'table_preferences_guest'
  }, [user])

  // Optimistic update - immediately update UI state
  const applyOptimisticUpdate = useCallback((tableName: string, key: string, value: any) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [tableName]: {
          ...prev[tableName],
          [key]: value,
          last_updated: Date.now()
        }
      }
      
      // Immediately save to localStorage for persistence
      try {
        localStorage.setItem('table-preferences', JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to save to localStorage:', e)
      }
      
      return updated
    })
  }, [])

  // Batch database save with retry logic
  const performBatchSave = useCallback(async (
    updates: Map<string, PendingUpdate>, 
    retryAttempt: number = 0
  ): Promise<boolean> => {
    if (!user || !isSupabaseConfigured() || user.id === 'mock-user-id') {
      return true
    }

    if (updates.size === 0) {
      return true
    }

    const saveStartTime = Date.now()
    saveStartTimeRef.current = saveStartTime
    setIsSaving(true)

    try {
      // Build the complete preferences object with all pending updates
      const currentPrefs = { ...preferencesRef.current }
      
      // Apply all pending updates
      updates.forEach((update) => {
        if (!currentPrefs[update.tableName]) {
          currentPrefs[update.tableName] = {}
        }
        currentPrefs[update.tableName][update.key] = update.value
        currentPrefs[update.tableName].last_updated = Date.now()
      })

      // Single database operation for all updates
      const { error } = await supabase
        .from('profiles')
        .update({ table_preferences: currentPrefs })
        .eq('id', user.id)

      const saveTime = Date.now() - saveStartTime

      if (error) {
        throw error
      }

      // Update metrics on success
      setSaveMetrics(prev => ({
        totalSaves: prev.totalSaves + 1,
        successfulSaves: prev.successfulSaves + 1,
        failedSaves: prev.failedSaves,
        averageSaveTime: prev.totalSaves > 0 
          ? (prev.averageSaveTime * prev.totalSaves + saveTime) / (prev.totalSaves + 1)
          : saveTime,
        lastSaveTime: Date.now()
      }))

      retryCountRef.current = 0
      console.log(`✅ Batched save completed in ${saveTime}ms`, {
        updateCount: updates.size,
        tables: Array.from(new Set(Array.from(updates.values()).map(u => u.tableName)))
      })

      return true

    } catch (error) {
      console.error(`❌ Batch save failed (attempt ${retryAttempt + 1}):`, error)
      
      // Update failure metrics
      setSaveMetrics(prev => ({
        ...prev,
        totalSaves: prev.totalSaves + 1,
        failedSaves: prev.failedSaves + 1
      }))

      // Retry logic with exponential backoff
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, retryAttempt)
        console.log(`🔄 Retrying batch save in ${delay}ms...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return performBatchSave(updates, retryAttempt + 1)
      }

      // Show user-friendly error after all retries exhausted
      toast({
        title: "Sync Warning",
        description: `Table preferences saved locally but failed to sync after ${MAX_RETRY_ATTEMPTS} attempts. Changes will sync when connection improves.`,
        variant: "destructive",
      })

      return false
    } finally {
      setIsSaving(false)
    }
  }, [user, toast])

  // Debounced batch processor
  const processPendingUpdates = useCallback(async () => {
    const pendingUpdates = new Map(pendingUpdatesRef.current)
    pendingUpdatesRef.current.clear()
    
    if (pendingUpdates.size > 0) {
      await performBatchSave(pendingUpdates)
    }
  }, [performBatchSave])

  // Track loaded user to prevent unnecessary reloads
  const loadedUserRef = useRef<string | null>(null)

  // Load preferences from database (only once per user)
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Prevent reloading for the same user (fixes tab refresh issue)
    if (loadedUserRef.current === user.id) {
      return
    }

    try {
      setIsLoading(true)
      loadedUserRef.current = user.id

      // Try to load from localStorage first for immediate UI
      try {
        const localPrefs = localStorage.getItem('table-preferences')
        if (localPrefs) {
          const parsed = JSON.parse(localPrefs)
          setPreferences(parsed)
          preferencesRef.current = parsed
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e)
      }

      // Skip database load for mock users or when Supabase isn't configured
      if (!isSupabaseConfigured() || user.id === 'mock-user-id') {
        return
      }

      // Load from database and merge with localStorage
      const { data, error } = await supabase
        .from('profiles')
        .select('table_preferences')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const dbPreferences = data?.table_preferences || {}
      
      // Merge database and localStorage preferences (database takes precedence for conflicts)
      const localPrefs = localStorage.getItem('table-preferences')
      const localParsed = localPrefs ? JSON.parse(localPrefs) : {}
      
      const mergedPreferences = { ...localParsed, ...dbPreferences }
      
      setPreferences(mergedPreferences)
      preferencesRef.current = mergedPreferences

      // Update localStorage with merged preferences
      try {
        localStorage.setItem('table-preferences', JSON.stringify(mergedPreferences))
      } catch (e) {
        console.warn('Failed to update localStorage:', e)
      }

    } catch (error) {
      console.error('Failed to load table preferences:', error)
      
      // Fallback to localStorage only
      try {
        const localPrefs = localStorage.getItem('table-preferences')
        if (localPrefs) {
          const parsed = JSON.parse(localPrefs)
          setPreferences(parsed)
          preferencesRef.current = parsed
        }
      } catch (e) {
        console.warn('Failed to fallback to localStorage:', e)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id]) // Only depend on user.id, not the entire user object

  // Enterprise-grade update function with batching and debouncing
  const updateTablePreference = useCallback((
    tableName: string,
    key: string,
    value: any
  ) => {
    // Immediate optimistic update for UI responsiveness
    applyOptimisticUpdate(tableName, key, value)

    // Add to pending updates for batched database save
    const updateKey = `${tableName}.${key}`
    pendingUpdatesRef.current.set(updateKey, {
      tableName,
      key,
      value,
      timestamp: Date.now()
    })

    // Debounced batch save - reset timer on each update
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }

    batchTimeoutRef.current = setTimeout(() => {
      processPendingUpdates()
    }, BATCH_DELAY)

  }, [applyOptimisticUpdate, processPendingUpdates])

  // Batch update multiple preferences at once
  const updateMultipleTablePreferences = useCallback((
    tableName: string,
    updates: Record<string, any>
  ) => {
    // Apply all optimistic updates
    const newTablePrefs = { ...preferencesRef.current[tableName] }
    Object.entries(updates).forEach(([key, value]) => {
      newTablePrefs[key] = value
      applyOptimisticUpdate(tableName, key, value)
      
      // Add to pending batch
      const updateKey = `${tableName}.${key}`
      pendingUpdatesRef.current.set(updateKey, {
        tableName,
        key,
        value,
        timestamp: Date.now()
      })
    })

    // Debounced batch save
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }

    batchTimeoutRef.current = setTimeout(() => {
      processPendingUpdates()
    }, BATCH_DELAY)

  }, [applyOptimisticUpdate, processPendingUpdates])

  // Force immediate save (for critical operations)
  const forceImmediateSave = useCallback(async () => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    
    await processPendingUpdates()
  }, [processPendingUpdates])

  // Get preferences for a specific table
  const getTablePreference = useCallback((
    tableName: string,
    key: string,
    defaultValue: any = null
  ) => {
    return preferences[tableName]?.[key] ?? defaultValue
  }, [preferences])

  // Reset preferences for a table
  const resetTablePreferences = useCallback((tableName: string) => {
    updateTablePreference(tableName, 'reset', true)
    
    // Clear the table preferences
    setPreferences(prev => {
      const updated = { ...prev }
      delete updated[tableName]
      
      try {
        localStorage.setItem('table-preferences', JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to save to localStorage:', e)
      }
      
      return updated
    })
  }, [updateTablePreference])

  // Load preferences on mount and when user ID changes (not on every user object change)
  useEffect(() => {
    loadPreferences()
  }, [user?.id]) // Only reload when user ID actually changes, not on user object updates

  // Save pending updates before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingUpdatesRef.current.size > 0) {
        // Force synchronous localStorage save as backup
        try {
          const currentPrefs = { ...preferencesRef.current }
          pendingUpdatesRef.current.forEach((update) => {
            if (!currentPrefs[update.tableName]) {
              currentPrefs[update.tableName] = {}
            }
            currentPrefs[update.tableName][update.key] = update.value
          })
          localStorage.setItem('table-preferences', JSON.stringify(currentPrefs))
        } catch (e) {
          console.warn('Failed to save preferences before unload:', e)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Clear any pending timeouts
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
    }
  }, [])

  return {
    preferences,
    isLoading,
    isSaving,
    saveMetrics,
    loadPreferences,
    updateTablePreference,
    updateMultipleTablePreferences,
    forceImmediateSave,
    getTablePreference,
    resetTablePreferences,
    // Enterprise features
    hasPendingUpdates: pendingUpdatesRef.current.size > 0,
    pendingUpdateCount: pendingUpdatesRef.current.size
  }
}