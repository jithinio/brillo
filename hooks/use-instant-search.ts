"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

export interface InstantSearchOptions {
  debounceMs?: number
  minChars?: number
  enableClientSide?: boolean
}

export function useInstantSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  onServerSearch: (query: string) => void,
  options: InstantSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minChars = 1,
    enableClientSide = true
  } = options

  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  
  // Debounced search for server-side requests
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs)

  // Immediate client-side filtering for instant feedback
  const clientFilteredData = useMemo(() => {
    if (!enableClientSide || !searchQuery.trim()) {
      return data
    }

    const query = searchQuery.toLowerCase().trim()
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query)
        }
        if (typeof value === 'object' && value !== null) {
          // Handle nested objects
          return Object.values(value).some(nestedValue =>
            typeof nestedValue === 'string' && 
            nestedValue.toLowerCase().includes(query)
          )
        }
        return false
      })
    })
  }, [data, searchQuery, searchFields, enableClientSide])

  // Server-side search effect
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setIsSearching(true)
    }
    
    if (debouncedSearchQuery.length >= minChars || debouncedSearchQuery === "") {
      onServerSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, onServerSearch, minChars, searchQuery])

  // Reset searching state when server catches up
  useEffect(() => {
    if (debouncedSearchQuery === searchQuery) {
      setIsSearching(false)
    }
  }, [debouncedSearchQuery, searchQuery])

  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query !== debouncedSearchQuery) {
      setIsSearching(true)
    }
  }, [debouncedSearchQuery])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setIsSearching(false)
  }, [])

  return {
    searchQuery,
    updateSearch,
    clearSearch,
    isSearching,
    clientFilteredData,
    hasClientResults: enableClientSide && searchQuery.length > 0,
    serverSearchQuery: debouncedSearchQuery,
  }
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
} 