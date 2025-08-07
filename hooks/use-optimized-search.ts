"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from './use-toast'

interface SearchOptions {
  debounceMs?: number
  minChars?: number
  caseSensitive?: boolean
  fuzzyMatch?: boolean
  highlightMatches?: boolean
}

interface SearchResult<T> {
  item: T
  score: number
  highlights?: string[]
}

export function useOptimizedSearch<T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[],
  serverSearchFn?: (query: string) => void,
  options: SearchOptions = {}
) {
  const {
    debounceMs = 50,
    minChars = 1,
    caseSensitive = false,
    fuzzyMatch = false,
    highlightMatches = false
  } = options

  const [searchQuery, setSearchQuery] = useState('')
  const [isClientSearching, setIsClientSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced search query for server-side search
  const debouncedQuery = useDebounce(searchQuery, debounceMs)

  // Optimized client-side search with memoization
  const clientSearchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < minChars) {
      return data
    }

    setIsClientSearching(true)
    
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase()
    const results: SearchResult<T>[] = []

    for (const item of data) {
      let totalScore = 0
      let matchFound = false
      const highlights: string[] = []

      for (const field of searchFields) {
        const fieldValue = item[field]
        if (!fieldValue) continue

        let searchValue: string
        
        // Handle nested objects (like clients.name)
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          if ('name' in fieldValue) {
            searchValue = String(fieldValue.name)
          } else if ('company' in fieldValue) {
            searchValue = String(fieldValue.company)
          } else {
            searchValue = JSON.stringify(fieldValue)
          }
        } else {
          searchValue = String(fieldValue)
        }

        if (!caseSensitive) {
          searchValue = searchValue.toLowerCase()
        }

        if (fuzzyMatch) {
          // Simple fuzzy matching algorithm
          const score = calculateFuzzyScore(query, searchValue)
          if (score > 0.3) { // Threshold for fuzzy match
            totalScore += score
            matchFound = true
            if (highlightMatches) {
              highlights.push(`${field as string}: ${fieldValue}`)
            }
          }
        } else {
          // Exact substring matching with scoring
          if (searchValue.includes(query)) {
            const exactMatch = searchValue === query
            const startsWithMatch = searchValue.startsWith(query)
            
            if (exactMatch) {
              totalScore += 10
            } else if (startsWithMatch) {
              totalScore += 5
            } else {
              totalScore += 1
            }
            
            matchFound = true
            if (highlightMatches) {
              highlights.push(`${field as string}: ${fieldValue}`)
            }
          }
        }
      }

      if (matchFound) {
        results.push({
          item,
          score: totalScore,
          highlights: highlightMatches ? highlights : undefined
        })
      }
    }

    // Sort by relevance score (higher is better)
    results.sort((a, b) => b.score - a.score)
    
    // Clear searching state after a brief delay
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setIsClientSearching(false)
    }, 50)

    return results.map(result => result.item)
  }, [data, searchQuery, searchFields, caseSensitive, fuzzyMatch, highlightMatches, minChars])

  // Trigger server-side search when debounced query changes
  useEffect(() => {
    if (serverSearchFn && debouncedQuery !== searchQuery) {
      serverSearchFn(debouncedQuery)
    }
  }, [debouncedQuery, serverSearchFn])

  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setIsClientSearching(true)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setIsClientSearching(false)
    if (serverSearchFn) {
      serverSearchFn('')
    }
  }, [serverSearchFn])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    searchQuery,
    updateSearch,
    clearSearch,
    isClientSearching,
    filteredData: clientSearchResults,
    hasResults: clientSearchResults.length > 0,
    resultCount: clientSearchResults.length,
    isSearching: isClientSearching || (searchQuery !== debouncedQuery),
  }
}

// Simple fuzzy string matching algorithm
function calculateFuzzyScore(query: string, text: string): number {
  if (query.length === 0) return 1
  if (text.length === 0) return 0

  let queryIndex = 0
  let score = 0
  let previousMatch = -1

  for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex++) {
    if (text[textIndex] === query[queryIndex]) {
      // Consecutive matches get bonus points
      if (textIndex === previousMatch + 1) {
        score += 2
      } else {
        score += 1
      }
      previousMatch = textIndex
      queryIndex++
    }
  }

  // Normalize score by query length
  const completionRatio = queryIndex / query.length
  const lengthRatio = query.length / text.length

  return completionRatio * (0.8 + 0.2 * lengthRatio) * (score / query.length)
}