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
    
    // Check if currency setting changed (but only if we have loaded settings)
    if (previousCurrency.current && previousCurrency.current !== currentCurrency) {
      console.log(`💱 Currency changed from ${previousCurrency.current} to ${currentCurrency}`)
      
      // Clear conversion cache
      clearCurrencyConversionCache()
      
      // Only invalidate if we're on a page that actually uses currency data
      // and the page is currently visible (avoid invalidating when returning to tab)
      if (document.visibilityState === 'visible' && typeof window !== 'undefined') {
        // Add a small delay to prevent immediate invalidation on tab return
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }, 500)
      }
      
      console.log('🗑️ Currency conversion cache cleared due to currency change')
    }
    
    // Only set previous currency if settings are actually loaded (not just default)
    if (settings?.currency) {
      previousCurrency.current = currentCurrency
    }
  }, [settings?.currency, queryClient, settings])

  return {
    clearCache: () => {
      clearCurrencyConversionCache()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    getCacheStats: getCurrencyConversionStats
  }
}