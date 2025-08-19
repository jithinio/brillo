"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

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

const STORAGE_KEY = "client_custom_sources"

export function useCustomSources() {
  const [customSources, setCustomSources] = useState<SourceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load custom sources from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SourceOption[]
        setCustomSources(parsed)
      }
    } catch (error) {
      console.error("Failed to load custom sources:", error)
      toast.error("Failed to load custom sources")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save custom sources to localStorage
  const saveCustomSources = useCallback((sources: SourceOption[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources))
      setCustomSources(sources)
    } catch (error) {
      console.error("Failed to save custom sources:", error)
      toast.error("Failed to save custom source")
    }
  }, [])

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
