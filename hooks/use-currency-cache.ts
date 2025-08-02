/**
 * Hook for managing currency conversion cache lifecycle
 * Handles cache invalidation when currency settings change
 */

import { useEffect, useRef } from 'react'
import { useSettings } from '@/components/settings-provider'
import { clearCurrencyConversionCache, getCurrencyConversionStats } from '@/lib/currency-conversion-cache'
import { useQueryClient } from '@tanstack/react-query'

export function useCurrencyCache() {
  const { settings } = useSettings()
  const queryClient = useQueryClient()
  const previousCurrency = useRef<string>()

  useEffect(() => {
    const currentCurrency = settings?.currency || 'USD'
    
    // Check if currency setting changed
    if (previousCurrency.current && previousCurrency.current !== currentCurrency) {
      console.log(`💱 Currency changed from ${previousCurrency.current} to ${currentCurrency}`)
      
      // Clear conversion cache
      clearCurrencyConversionCache()
      
      // Invalidate invoice queries to trigger re-fetch with new currency
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      
      console.log('🗑️ Currency conversion cache cleared due to currency change')
    }
    
    previousCurrency.current = currentCurrency
  }, [settings?.currency, queryClient])

  return {
    clearCache: () => {
      clearCurrencyConversionCache()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    getCacheStats: getCurrencyConversionStats
  }
}