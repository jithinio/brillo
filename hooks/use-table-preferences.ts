"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface TablePreferences {
  [tableName: string]: {
    column_visibility?: Record<string, boolean>
    [key: string]: any
  }
}

export function useTablePreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<TablePreferences>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // If using mock user or Supabase not configured, use localStorage
    if (!isSupabaseConfigured() || user.id === 'mock-user-id') {
      try {
        const localPrefs = localStorage.getItem('table-preferences')
        setPreferences(localPrefs ? JSON.parse(localPrefs) : {})
      } catch (e) {
        setPreferences({})
      }
      setIsLoading(false)
      return
    }

    // For real users, always use localStorage fallback to avoid 400 errors
    // until the database migration is properly completed
    try {
      const localPrefs = localStorage.getItem('table-preferences')
      setPreferences(localPrefs ? JSON.parse(localPrefs) : {})
    } catch (e) {
      setPreferences({})
    }
    setIsLoading(false)
  }, [user])

  // Save preferences to database
  const savePreferences = useCallback(async (newPreferences: TablePreferences) => {
    if (!user) {
      return
    }

    // Always use localStorage to avoid database errors until migration is complete
    try {
      localStorage.setItem('table-preferences', JSON.stringify(newPreferences))
      setPreferences(newPreferences)
    } catch (e) {
      // Even localStorage failed, just continue
      setPreferences(newPreferences)
    }
  }, [user])

  // Update specific table preferences
  const updateTablePreference = useCallback(async (
    tableName: string, 
    key: string, 
    value: any
  ) => {
    const newPreferences = {
      ...preferences,
      [tableName]: {
        ...preferences[tableName],
        [key]: value
      }
    }
    
    await savePreferences(newPreferences)
  }, [preferences, savePreferences])

  // Get preferences for a specific table
  const getTablePreference = useCallback((
    tableName: string, 
    key: string, 
    defaultValue: any = null
  ) => {
    return preferences[tableName]?.[key] ?? defaultValue
  }, [preferences])

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    preferences,
    isLoading,
    loadPreferences,
    savePreferences,
    updateTablePreference,
    getTablePreference
  }
} 