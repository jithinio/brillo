"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"

// Default source options
const DEFAULT_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social Media" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "networking", label: "Networking" },
  { value: "advertisement", label: "Advertisement" },
  { value: "search_engine", label: "Search Engine" },
  { value: "existing_client", label: "Existing Client" },
  { value: "other", label: "Other" }
]

export interface SourceOption {
  value: string
  label: string
  isCustom?: boolean
}

const STORAGE_KEY_PREFIX = "client_custom_sources"

export function useCustomSources() {
  const { user, loading: authLoading } = useAuth()
  const [customSources, setCustomSources] = useState<SourceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create user-specific storage key
  const getStorageKey = useCallback(() => {
    if (!user?.id) return `${STORAGE_KEY_PREFIX}_anonymous`
    return `${STORAGE_KEY_PREFIX}_${user.id}`
  }, [user?.id])

  // Load custom sources from localStorage on mount
  useEffect(() => {
    // Don't load if auth is still loading
    if (authLoading) {
      return
    }

    setIsLoading(true)
    
    try {
      const storageKey = getStorageKey()
      let stored = localStorage.getItem(storageKey)
      
      // Migration: Check for old global storage key and migrate to user-specific key
      if (!stored && user?.id) {
        const oldKey = "client_custom_sources"
        const oldStored = localStorage.getItem(oldKey)
        if (oldStored) {
          // Migrate old data to new user-specific key
          localStorage.setItem(storageKey, oldStored)
          localStorage.removeItem(oldKey) // Clean up old key
          stored = oldStored
          console.log("Migrated custom sources to user-specific storage")
        }
      }
      
      if (stored) {
        const parsed = JSON.parse(stored) as SourceOption[]
        setCustomSources(parsed)
      } else {
        setCustomSources([])
      }
    } catch (error) {
      console.error("Failed to load custom sources:", error)
      toast.error("Failed to load custom sources")
      setCustomSources([])
    } finally {
      setIsLoading(false)
    }
  }, [getStorageKey, user?.id, authLoading])

  // Save custom sources to localStorage
  const saveCustomSources = useCallback((sources: SourceOption[]) => {
    try {
      const storageKey = getStorageKey()
      localStorage.setItem(storageKey, JSON.stringify(sources))
      setCustomSources(sources)
    } catch (error) {
      console.error("Failed to save custom sources:", error)
      toast.error("Failed to save custom source")
    }
  }, [getStorageKey])

  // Add a new custom source
  const addCustomSource = useCallback((label: string) => {
    if (!label.trim()) {
      toast.error("Source name cannot be empty")
      return false
    }

    // Convert label to value (lowercase, replace spaces with underscores)
    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    
    // Check if source already exists (both default and custom)
    const allSources = [...DEFAULT_SOURCES, ...customSources]
    const exists = allSources.some(source => 
      source.value === value || 
      source.label.toLowerCase() === label.toLowerCase()
    )

    if (exists) {
      toast.error("This source already exists")
      return false
    }

    const newSource: SourceOption = {
      value,
      label: label.trim(),
      isCustom: true
    }

    const updatedSources = [...customSources, newSource]
    saveCustomSources(updatedSources)
    toast.success(`"${label}" added as a new source option`)
    return true
  }, [customSources, saveCustomSources])

  // Remove a custom source
  const removeCustomSource = useCallback((value: string) => {
    const updatedSources = customSources.filter(source => source.value !== value)
    saveCustomSources(updatedSources)
    toast.success("Custom source removed")
  }, [customSources, saveCustomSources])

  // Get all sources (default + custom)
  const allSources = [...DEFAULT_SOURCES, ...customSources]

  // Get source label by value
  const getSourceLabel = useCallback((value: string) => {
    const source = allSources.find(s => s.value === value)
    return source?.label || value
  }, [allSources])

  return {
    allSources,
    customSources,
    defaultSources: DEFAULT_SOURCES,
    addCustomSource,
    removeCustomSource,
    getSourceLabel,
    isLoading
  }
}
