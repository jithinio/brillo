"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface TablePreferences {
  [tableName: string]: {
    column_visibility?: Record<string, boolean>
    sorting?: any[]
    pagination?: { pageIndex: number; pageSize: number }
    [key: string]: any
  }
}

export function useTablePreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<TablePreferences>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  
  // Use ref to track current preferences to prevent function recreation
  const preferencesRef = useRef<TablePreferences>({})
  preferencesRef.current = preferences

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

    try {
      // Load from database
      const { data, error } = await supabase
        .from('profiles')
        .select('table_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading table preferences:', error)
        // Fallback to localStorage
        try {
          const localPrefs = localStorage.getItem('table-preferences')
          setPreferences(localPrefs ? JSON.parse(localPrefs) : {})
        } catch (e) {
          setPreferences({})
        }
      } else {
        const dbPreferences = data?.table_preferences || {}
        setPreferences(dbPreferences)
        
        // Also update localStorage as backup
        try {
          localStorage.setItem('table-preferences', JSON.stringify(dbPreferences))
        } catch (e) {
          // localStorage failed, continue with database preferences
        }
      }
    } catch (error) {
      console.error('Unexpected error loading table preferences:', error)
      // Fallback to localStorage
      try {
        const localPrefs = localStorage.getItem('table-preferences')
        setPreferences(localPrefs ? JSON.parse(localPrefs) : {})
      } catch (e) {
        setPreferences({})
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Save preferences to database
  const savePreferences = useCallback(async (newPreferences: TablePreferences) => {
    if (!user) {
      return
    }

    // Always update localStorage as backup
    try {
      localStorage.setItem('table-preferences', JSON.stringify(newPreferences))
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }

    setPreferences(newPreferences)

    // If using mock user or Supabase not configured, skip database save
    if (!isSupabaseConfigured() || user.id === 'mock-user-id') {
      return
    }

    try {
      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ table_preferences: newPreferences })
        .eq('id', user.id)

      if (error) {
        console.error('Error saving table preferences:', error)
        toast({
          title: "Warning",
          description: "Table preferences saved locally but failed to sync to server.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Unexpected error saving table preferences:', error)
      toast({
        title: "Warning",
        description: "Table preferences saved locally but failed to sync to server.",
        variant: "destructive",
      })
    }
  }, [user, toast])

  // Update specific table preferences
  const updateTablePreference = useCallback(async (
    tableName: string, 
    key: string, 
    value: any
  ) => {
    const newPreferences = {
      ...preferencesRef.current,
      [tableName]: {
        ...preferencesRef.current[tableName],
        [key]: value
      }
    }
    
    await savePreferences(newPreferences)
  }, [savePreferences])

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