"use client"

import { useCallback, useMemo, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFiltersFromSearchParams, filtersToSearchParams, type ProjectFilters } from '@/lib/project-filters-v2'
import { debounce } from '@/lib/utils'

export function useProjectFiltersV2() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Parse current filters from URL
  const filters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])

  // Update URL with new filters
  const updateFilters = useCallback((newFilters: Partial<ProjectFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    const newSearchParams = filtersToSearchParams(updatedFilters)
    
    startTransition(() => {
      router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false })
    })
  }, [filters, pathname, router])

  // Debounced update for search input
  const debouncedUpdateFilters = useMemo(
    () => debounce(updateFilters, 300),
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
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    updateFilter('status', newStatuses)
  }, [filters.status, updateFilter])

  // Toggle client
  const toggleClient = useCallback((clientId: string) => {
    const newClients = filters.client.includes(clientId)
      ? filters.client.filter(c => c !== clientId)
      : [...filters.client, clientId]
    updateFilter('client', newClients)
  }, [filters.client, updateFilter])

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

  return {
    filters,
    loading: isPending,
    updateFilters,
    debouncedUpdateFilters,
    updateFilter,
    toggleStatus,
    toggleClient,
    clearFilters,
    clearFilterType,
  }
} 