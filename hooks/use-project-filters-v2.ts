"use client"

import { useCallback, useMemo, useTransition, useState, useRef, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFiltersFromSearchParams, filtersToSearchParams, type ProjectFilters } from '@/lib/project-filters-v2'
import { debounce, fastDebounce } from '@/lib/utils'

export function useProjectFiltersV2() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Parse current filters from URL
  const urlFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])
  
  // Local state for immediate UI updates (especially search)
  const [localSearch, setLocalSearch] = useState(urlFilters.search)
  const [isSearching, setIsSearching] = useState(false)
  const searchingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Update local search when URL changes
  useEffect(() => {
    setLocalSearch(urlFilters.search)
    setIsSearching(false) // Reset searching state when URL updates
    // Clear any pending timeout
    if (searchingTimeoutRef.current) {
      clearTimeout(searchingTimeoutRef.current)
    }
  }, [urlFilters.search])

  // Combine URL filters with local search for immediate feedback
  const filters = useMemo(() => ({
    ...urlFilters,
    search: localSearch,
  }), [urlFilters, localSearch])

  // Update URL with new filters
  const updateFilters = useCallback((newFilters: Partial<ProjectFilters>) => {
    const updatedFilters = { ...urlFilters, ...newFilters }
    const newSearchParams = filtersToSearchParams(updatedFilters)
    
    startTransition(() => {
      router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false })
    })
  }, [urlFilters, pathname, router])

  // Fast debounced update for search with improved loading state
  const debouncedSearchUpdate = useMemo(() => {
    return fastDebounce((searchValue: string) => {
      updateFilters({ search: searchValue })
      
      // Ensure minimum loading duration for better UX
      if (searchingTimeoutRef.current) {
        clearTimeout(searchingTimeoutRef.current)
      }
      
      searchingTimeoutRef.current = setTimeout(() => {
        setIsSearching(false)
      }, 300) // Minimum 300ms loading duration
    }, 150) // Slightly longer debounce for better visual feedback
  }, [updateFilters])

  // Immediate search update function for instant UI feedback
  const updateSearch = useCallback((searchValue: string) => {
    setLocalSearch(searchValue) // Immediate UI update
    
    // Clear any existing timeout
    if (searchingTimeoutRef.current) {
      clearTimeout(searchingTimeoutRef.current)
    }
    
    // Only set searching state if there's actual content to search
    if (searchValue.trim()) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
    }
    
    debouncedSearchUpdate(searchValue) // Debounced URL/API update
  }, [debouncedSearchUpdate])

  // General debounced update for other filters (can be slower)
  const debouncedUpdateFilters = useMemo(
    () => debounce(updateFilters, 200), // Slightly faster than before
    [updateFilters]
  )

  // Update specific filter
  const updateFilter = useCallback(<K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K]
  ) => {
    updateFilters({ [key]: value })
  }, [updateFilters])

  // Toggle status
  const toggleStatus = useCallback((status: 'active' | 'pipeline' | 'on_hold' | 'completed' | 'cancelled') => {
    const newStatuses = urlFilters.status.includes(status)
      ? urlFilters.status.filter(s => s !== status)
      : [...urlFilters.status, status]
    updateFilter('status', newStatuses)
  }, [urlFilters.status, updateFilter])

  // Toggle client
  const toggleClient = useCallback((clientId: string) => {
    const newClients = urlFilters.client.includes(clientId)
      ? urlFilters.client.filter(c => c !== clientId)
      : [...urlFilters.client, clientId]
    updateFilter('client', newClients)
  }, [urlFilters.client, updateFilter])

  // Clear all filters
  const clearFilters = useCallback(() => {
    console.log('🧹 Clearing all filters, navigating to:', pathname)
    router.push(pathname, { scroll: false })
    // Force a refresh event after navigation
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('filters-cleared'))
    }, 100)
  }, [pathname, router])

  // Clear specific filter type
  const clearFilterType = useCallback((filterType: keyof ProjectFilters) => {
    if (filterType === 'status' || filterType === 'client') {
      updateFilter(filterType, [])
    } else if (filterType === 'search') {
      updateFilter(filterType, '')
    } else if (filterType === 'timePeriod') {
      updateFilter(filterType, null)
    }
  }, [updateFilter])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchingTimeoutRef.current) {
        clearTimeout(searchingTimeoutRef.current)
      }
    }
  }, [])

  return {
    filters,
    loading: isPending,
    isSearching, // New search state indicator
    updateFilters,
    debouncedUpdateFilters,
    updateFilter,
    updateSearch, // New optimized search function
    toggleStatus,
    toggleClient,
    clearFilters,
    clearFilterType,
  }
} 