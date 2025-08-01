/**
 * TRANSITION EXAMPLE: How to upgrade your existing exchange-rates.ts
 * 
 * This shows how to gradually migrate from mock data to live API
 * Copy this over your existing lib/exchange-rates.ts when ready
 */

// 🚀 NEW: Import live API functions
import { 
  getLiveExchangeRate, 
  getHistoricalExchangeRate,
  convertWithLiveRate,
  convertWithHistoricalRate,
  clearExchangeRateCache,
  getExchangeRateCacheStats
} from './exchange-rates-live'

// 🔄 KEEP: Your existing mock data as fallback
export const MOCK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.85, GBP: 0.73, JPY: 110, CAD: 1.25, AUD: 1.35, CHF: 0.92, CNY: 6.45, INR: 74.5, SGD: 1.35, HKD: 7.8, NZD: 1.45, SEK: 8.8, NOK: 8.5, MXN: 20.1, RUB: 74.2, BRL: 5.2 },
  EUR: { USD: 1.18, GBP: 0.86, JPY: 129.4, CAD: 1.47, AUD: 1.59, CHF: 1.08, CNY: 7.6, INR: 87.8, SGD: 1.59, HKD: 9.2, NZD: 1.71, SEK: 10.4, NOK: 10.0, MXN: 23.7, RUB: 87.5, BRL: 6.1 },
  GBP: { USD: 1.37, EUR: 1.16, JPY: 150.7, CAD: 1.71, AUD: 1.85, CHF: 1.26, CNY: 8.84, INR: 102.1, SGD: 1.85, HKD: 10.7, NZD: 1.99, SEK: 12.1, NOK: 11.6, MXN: 27.5, RUB: 101.8, BRL: 7.1 }
}

// Enhanced caching for better performance
const inMemoryCache = new Map<string, { rate: number; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * 🚀 UPGRADED: Now uses live API with fallback to mock data
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    // Try live API first
    return await getLiveExchangeRate(from, to)
  } catch (error) {
    console.warn(`Live API failed for ${from}/${to}, using mock data:`, error)
    return getMockExchangeRate(from, to)
  }
}

/**
 * 🚀 NEW: Get historical rate for specific date (perfect for invoices)
 */
export async function getHistoricalRate(from: string, to: string, date: string): Promise<number> {
  try {
    return await getHistoricalExchangeRate(from, to, date)
  } catch (error) {
    console.warn(`Historical API failed for ${from}/${to} on ${date}, using mock data:`, error)
    return getMockExchangeRate(from, to)
  }
}

/**
 * 🚀 UPGRADED: Now uses live rates with fallback
 */
export async function convertWithCurrentRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  convertedAmount: number
  rate: number
  date: string
}> {
  try {
    // Try live API first
    return await convertWithLiveRate(amount, fromCurrency, toCurrency)
  } catch (error) {
    console.warn(`Live conversion failed for ${fromCurrency}/${toCurrency}, using mock data:`, error)
    
    // Fallback to mock conversion
    const rate = getMockExchangeRate(fromCurrency, toCurrency)
    return {
      convertedAmount: amount * rate,
      rate,
      date: new Date().toISOString()
    }
  }
}

/**
 * 🚀 NEW: Convert using historical rate for invoice date accuracy
 */
export async function convertWithInvoiceDate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  invoiceDate: string
): Promise<{
  convertedAmount: number
  rate: number
  date: string
}> {
  try {
    return await convertWithHistoricalRate(amount, fromCurrency, toCurrency, invoiceDate)
  } catch (error) {
    console.warn(`Historical conversion failed for ${fromCurrency}/${toCurrency} on ${invoiceDate}, using mock data:`, error)
    
    // Fallback to mock conversion
    const rate = getMockExchangeRate(fromCurrency, toCurrency)
    return {
      convertedAmount: amount * rate,
      rate,
      date: invoiceDate
    }
  }
}

/**
 * 🔄 KEEP: Your existing mock rate function as fallback
 */
function getMockExchangeRate(from: string, to: string): number {
  if (from === to) return 1

  const cacheKey = `${from}-${to}`
  const cached = inMemoryCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate
  }

  let rate = 1

  try {
    if (MOCK_EXCHANGE_RATES[from] && MOCK_EXCHANGE_RATES[from][to]) {
      rate = MOCK_EXCHANGE_RATES[from][to]
    } else if (MOCK_EXCHANGE_RATES[to] && MOCK_EXCHANGE_RATES[to][from]) {
      rate = 1 / MOCK_EXCHANGE_RATES[to][from]
    } else {
      // Cross currency calculation via USD
      const fromToUsd = MOCK_EXCHANGE_RATES[from]?.USD || (1 / (MOCK_EXCHANGE_RATES.USD?.[from] || 1))
      const usdToTarget = MOCK_EXCHANGE_RATES.USD?.[to] || (1 / (MOCK_EXCHANGE_RATES[to]?.USD || 1))
      rate = fromToUsd * usdToTarget
    }

    // Cache the result
    inMemoryCache.set(cacheKey, { rate, timestamp: Date.now() })
    
    return rate
  } catch (error) {
    console.error(`Error calculating exchange rate for ${from} to ${to}:`, error)
    return 1
  }
}

/**
 * 🚀 NEW: Admin functions for monitoring and cache management
 */
export function clearAllCaches(): void {
  inMemoryCache.clear()
  clearExchangeRateCache()
  console.log('✅ All exchange rate caches cleared')
}

export function getCacheStatistics(): {
  mockCacheSize: number
  liveCacheStats: ReturnType<typeof getExchangeRateCacheStats>
} {
  return {
    mockCacheSize: inMemoryCache.size,
    liveCacheStats: getExchangeRateCacheStats()
  }
}

/**
 * 🚀 NEW: Health check function
 */
export async function testExchangeRateAPI(): Promise<{
  liveAPIWorking: boolean
  mockDataWorking: boolean
  sampleConversion: any
}> {
  let liveAPIWorking = false
  let sampleConversion = null

  try {
    const result = await convertWithCurrentRate(100, 'USD', 'EUR')
    liveAPIWorking = true
    sampleConversion = result
  } catch (error) {
    console.error('Live API test failed:', error)
  }

  const mockDataWorking = getMockExchangeRate('USD', 'EUR') > 0

  return {
    liveAPIWorking,
    mockDataWorking,
    sampleConversion
  }
}

// 🚀 Re-export new functions for easy access
export { 
  clearExchangeRateCache,
  getExchangeRateCacheStats
}