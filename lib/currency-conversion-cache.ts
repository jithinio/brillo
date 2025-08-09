/**
 * Intelligent Currency Conversion Cache System
 * 
 * Performance optimizations:
 * - Only converts new/changed invoices
 * - Persistent localStorage cache
 * - Cache invalidation on currency settings change
 * - Batch processing for efficiency
 * - Tracks conversion status to avoid duplicate work
 */

import { getHistoricalExchangeRate } from './exchange-rates-live'
import { getCompanySettings } from './company-settings'

export interface ConvertedInvoiceAmount {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  conversionDate: string
  wasConverted: boolean
}

export interface CachedConversion extends ConvertedInvoiceAmount {
  invoiceId: string
  cacheKey: string
  timestamp: number
  settingsHash: string // For invalidation when currency settings change
}

interface ConversionCacheStats {
  totalCached: number
  hitRate: number
  lastCleanup: number
  cacheSize: string
}

class CurrencyConversionCache {
  private cache = new Map<string, CachedConversion>()
  private readonly CACHE_VERSION = 'v1'
  private readonly CACHE_KEY = 'invoice_currency_conversions'
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly MAX_CACHE_SIZE = 1000 // Maximum cached conversions
  
  private hits = 0
  private misses = 0
  private currentSettingsHash = ''

  constructor() {
    this.loadFromStorage()
    this.updateSettingsHash()
  }

  /**
   * Generate cache key for an invoice conversion
   */
  private getCacheKey(
    invoiceId: string, 
    amount: number, 
    fromCurrency: string, 
    toCurrency: string, 
    issueDate: string
  ): string {
    return `${invoiceId}:${amount}:${fromCurrency}:${toCurrency}:${issueDate}:${this.currentSettingsHash}`
  }

  /**
   * Generate hash of current currency settings for cache invalidation
   */
  private async updateSettingsHash(): Promise<void> {
    try {
      const settings = await getCompanySettings()
      const settingsStr = JSON.stringify({
        currency: settings?.default_currency || 'USD',
        // Add other currency-related settings here if needed
      })
      this.currentSettingsHash = btoa(settingsStr).slice(0, 8) // Short hash
    } catch {
      this.currentSettingsHash = 'USD' // Fallback
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(`${this.CACHE_KEY}_${this.CACHE_VERSION}`)
      if (!stored) return

      const data = JSON.parse(stored)
      const now = Date.now()

      // Load valid entries and clean up expired ones
      let validCount = 0
      for (const [key, cached] of Object.entries(data)) {
        const cachedItem = cached as CachedConversion
        
        // Remove expired entries
        if (now - cachedItem.timestamp > this.MAX_CACHE_AGE) {
          continue
        }
        
        this.cache.set(key, cachedItem)
        validCount++
      }


    } catch (error) {
      console.error('Error loading currency conversion cache:', error)
      // Clear corrupted cache
      localStorage.removeItem(`${this.CACHE_KEY}_${this.CACHE_VERSION}`)
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = Object.fromEntries(this.cache.entries())
      localStorage.setItem(`${this.CACHE_KEY}_${this.CACHE_VERSION}`, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving currency conversion cache:', error)
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.MAX_CACHE_AGE) {
        this.cache.delete(key)
        removedCount++
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE)
      toRemove.forEach(([key]) => {
        this.cache.delete(key)
        removedCount++
      })
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old currency conversion cache entries`)
      this.saveToStorage()
    }
  }

  /**
   * Get cached conversion for an invoice
   */
  getCachedConversion(
    invoiceId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    issueDate: string
  ): CachedConversion | null {
    const cacheKey = this.getCacheKey(invoiceId, amount, fromCurrency, toCurrency, issueDate)
    const cached = this.cache.get(cacheKey)

    if (cached) {
      this.hits++
      return cached
    }

    this.misses++
    return null
  }

  /**
   * Cache a conversion result
   */
  setCachedConversion(
    invoiceId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    issueDate: string,
    conversion: ConvertedInvoiceAmount
  ): void {
    const cacheKey = this.getCacheKey(invoiceId, amount, fromCurrency, toCurrency, issueDate)
    
    const cached: CachedConversion = {
      ...conversion,
      invoiceId,
      cacheKey,
      timestamp: Date.now(),
      settingsHash: this.currentSettingsHash
    }

    this.cache.set(cacheKey, cached)
    
    // Periodically clean up and save
    if (this.cache.size % 50 === 0) {
      this.cleanup()
    }
    
    this.saveToStorage()
  }

  /**
   * Convert multiple invoices with intelligent caching
   */
  async convertInvoicesWithCache(
    invoices: Array<{
      id: string
      total_amount: number
      currency?: string
      issue_date: string
    }>,
    targetCurrency?: string
  ): Promise<ConvertedInvoiceAmount[]> {
    if (!invoices.length) return []

    // Update settings hash first
    await this.updateSettingsHash()

    // Get target currency
    let defaultCurrency = targetCurrency
    if (!defaultCurrency) {
      try {
        const settings = await getCompanySettings()
        defaultCurrency = settings?.default_currency || 'USD'
      } catch {
        defaultCurrency = 'USD'
      }
    }

    const results: ConvertedInvoiceAmount[] = new Array(invoices.length)
    const toConvert: Array<{ invoice: typeof invoices[0], index: number }> = []

    // Step 1: Check cache for existing conversions
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i]
      const currency = invoice.currency || 'USD'
      
      // Skip conversion for same currency
      if (currency === defaultCurrency) {
        results[i] = {
          originalAmount: invoice.total_amount,
          originalCurrency: currency,
          convertedAmount: invoice.total_amount,
          targetCurrency: defaultCurrency,
          exchangeRate: 1,
          conversionDate: invoice.issue_date,
          wasConverted: false
        }
        continue
      }

      // Check cache
      const cached = this.getCachedConversion(
        invoice.id,
        invoice.total_amount,
        currency,
        defaultCurrency,
        invoice.issue_date
      )

      if (cached) {
        results[i] = {
          originalAmount: cached.originalAmount,
          originalCurrency: cached.originalCurrency,
          convertedAmount: cached.convertedAmount,
          targetCurrency: cached.targetCurrency,
          exchangeRate: cached.exchangeRate,
          conversionDate: cached.conversionDate,
          wasConverted: cached.wasConverted
        }
      } else {
        toConvert.push({ invoice, index: i })
      }
    }

    console.log(`💰 Currency conversion cache stats: ${this.cache.size - toConvert.length}/${invoices.length} cached (${Math.round((1 - toConvert.length / invoices.length) * 100)}% hit rate)`)

    // Step 2: Convert only uncached invoices
    if (toConvert.length > 0) {
      console.log(`🔄 Converting ${toConvert.length} new invoices...`)
      
      const conversionPromises = toConvert.map(async ({ invoice, index }) => {
        const currency = invoice.currency || 'USD'
        
        try {
          const exchangeRate = await getHistoricalExchangeRate(currency, defaultCurrency, invoice.issue_date)
          const convertedAmount = invoice.total_amount * exchangeRate
          
          const conversion: ConvertedInvoiceAmount = {
            originalAmount: invoice.total_amount,
            originalCurrency: currency,
            convertedAmount,
            targetCurrency: defaultCurrency,
            exchangeRate,
            conversionDate: invoice.issue_date,
            wasConverted: true
          }

          // Cache the result
          this.setCachedConversion(
            invoice.id,
            invoice.total_amount,
            currency,
            defaultCurrency,
            invoice.issue_date,
            conversion
          )

          results[index] = conversion
        } catch (error) {
          console.error(`Currency conversion failed for invoice ${invoice.id}:`, error)
          
          // Fallback: no conversion
          const fallback: ConvertedInvoiceAmount = {
            originalAmount: invoice.total_amount,
            originalCurrency: currency,
            convertedAmount: invoice.total_amount,
            targetCurrency: currency,
            exchangeRate: 1,
            conversionDate: invoice.issue_date,
            wasConverted: false
          }

          results[index] = fallback
        }
      })

      await Promise.all(conversionPromises)
    }

    return results
  }

  /**
   * Clear all cached conversions (useful when currency settings change)
   */
  clearCache(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${this.CACHE_KEY}_${this.CACHE_VERSION}`)
    }
    
    console.log('🗑️ Currency conversion cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): ConversionCacheStats {
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0
    
    return {
      totalCached: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      lastCleanup: Date.now(),
      cacheSize: `${Math.round(JSON.stringify(Object.fromEntries(this.cache.entries())).length / 1024)} KB`
    }
  }

  /**
   * Force cache refresh (when currency settings change)
   */
  async invalidateCache(): Promise<void> {
    await this.updateSettingsHash()
    this.clearCache()
  }
}

// Global cache instance
export const currencyConversionCache = new CurrencyConversionCache()

// Listen for logout events to clear currency cache
if (typeof window !== 'undefined') {
  window.addEventListener('auth-logout', () => {
    console.log('🔄 Currency Cache: Clearing cache due to logout')
    currencyConversionCache.clearCache()
  })
}

/**
 * Optimized batch currency conversion with intelligent caching
 */
export async function convertInvoiceAmountsOptimized(
  invoices: Array<{
    id: string
    total_amount: number
    currency?: string
    issue_date: string
  }>,
  targetCurrency?: string
): Promise<ConvertedInvoiceAmount[]> {
  return currencyConversionCache.convertInvoicesWithCache(invoices, targetCurrency)
}

/**
 * Clear conversion cache (call when currency settings change)
 */
export function clearCurrencyConversionCache(): void {
  currencyConversionCache.clearCache()
}

/**
 * Get conversion cache statistics
 */
export function getCurrencyConversionStats(): ConversionCacheStats {
  return currencyConversionCache.getStats()
}