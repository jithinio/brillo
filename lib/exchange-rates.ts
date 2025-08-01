import { CURRENCIES } from './currency'

// Exchange rate cache interface
interface CachedRate {
  rate: number
  timestamp: number
  from: string
  to: string
}

// Cache configuration
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds
const CACHE_KEY_PREFIX = 'exchange_rate_'

// In-memory cache for better performance (session-based)
const inMemoryCache = new Map<string, { rate: number; timestamp: number }>()



// Mock exchange rates (will be replaced with real API)
// Only supported currencies included - others will use fallback calculation
const MOCK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110, CAD: 1.25, AUD: 1.35, CHF: 0.92, CNY: 6.45, INR: 74.5, SGD: 1.35, HKD: 7.8, AED: 3.67, NZD: 1.52, MYR: 4.2, IDR: 15000, SAR: 3.75, KWD: 0.31, RUB: 74 },
  EUR: { USD: 1.18, EUR: 1, GBP: 0.86, JPY: 130, CAD: 1.47, AUD: 1.59, CHF: 1.08, CNY: 7.6, INR: 87.8, SGD: 1.59, HKD: 9.2, AED: 4.33, NZD: 1.79, MYR: 4.95, IDR: 17700, SAR: 4.42, KWD: 0.36, RUB: 87 },
  GBP: { USD: 1.37, EUR: 1.16, GBP: 1, JPY: 151, CAD: 1.71, AUD: 1.85, CHF: 1.26, CNY: 8.84, INR: 102.1, SGD: 1.85, HKD: 10.7, AED: 5.03, NZD: 2.08, MYR: 5.75, IDR: 20550, SAR: 5.14, KWD: 0.42, RUB: 101 },
  JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, JPY: 1, CAD: 0.0114, AUD: 0.0123, CHF: 0.0084, CNY: 0.0587, INR: 0.677, SGD: 0.0123, HKD: 0.071, AED: 0.0334, NZD: 0.0138, MYR: 0.038, IDR: 136.4, SAR: 0.034, KWD: 0.0028, RUB: 0.67 },
  CAD: { USD: 0.8, EUR: 0.68, GBP: 0.58, JPY: 88, CAD: 1, AUD: 1.08, CHF: 0.74, CNY: 5.16, INR: 59.6, SGD: 1.08, HKD: 6.24, AED: 2.94, NZD: 1.22, MYR: 3.36, IDR: 12000, SAR: 3.0, KWD: 0.25, RUB: 59.2 },
  AUD: { USD: 0.74, EUR: 0.63, GBP: 0.54, JPY: 81.5, CAD: 0.93, AUD: 1, CHF: 0.68, CNY: 4.78, INR: 55.2, SGD: 1.0, HKD: 5.77, AED: 2.72, NZD: 1.13, MYR: 3.11, IDR: 11100, SAR: 2.78, KWD: 0.23, RUB: 54.8 },
  CHF: { USD: 1.09, EUR: 0.93, GBP: 0.79, JPY: 120, CAD: 1.36, AUD: 1.47, CHF: 1, CNY: 7.02, INR: 81.1, SGD: 1.47, HKD: 8.5, AED: 4.0, NZD: 1.66, MYR: 4.58, IDR: 16350, SAR: 4.09, KWD: 0.34, RUB: 80.7 },
  CNY: { USD: 0.155, EUR: 0.132, GBP: 0.113, JPY: 17.05, CAD: 0.194, AUD: 0.209, CHF: 0.142, CNY: 1, INR: 11.55, SGD: 0.209, HKD: 1.21, AED: 0.57, NZD: 0.236, MYR: 0.65, IDR: 2326, SAR: 0.58, KWD: 0.048, RUB: 11.5 },
  INR: { USD: 0.0134, EUR: 0.0114, GBP: 0.0098, JPY: 1.48, CAD: 0.0168, AUD: 0.0181, CHF: 0.0123, CNY: 0.0866, INR: 1, SGD: 0.0181, HKD: 0.105, AED: 0.049, NZD: 0.0204, MYR: 0.056, IDR: 201.3, SAR: 0.05, KWD: 0.0042, RUB: 0.995 },
}

// Cache management functions
function getCacheKey(from: string, to: string): string {
  return `${CACHE_KEY_PREFIX}${from}_${to}`
}

function getCachedRate(from: string, to: string): CachedRate | null {
  const cacheKey = getCacheKey(from, to)
  
  // Check in-memory cache first (fastest)
  const inMemoryCached = inMemoryCache.get(cacheKey)
  if (inMemoryCached && Date.now() - inMemoryCached.timestamp < CACHE_DURATION) {
    return {
      rate: inMemoryCached.rate,
      timestamp: inMemoryCached.timestamp,
      from,
      to
    }
  }
  
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    
    const parsed: CachedRate = JSON.parse(cached)
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION
    
    if (isExpired) {
      localStorage.removeItem(cacheKey)
      inMemoryCache.delete(cacheKey)
      return null
    }
    
    // Update in-memory cache for next time
    inMemoryCache.set(cacheKey, {
      rate: parsed.rate,
      timestamp: parsed.timestamp
    })
    
    return parsed
  } catch {
    return null
  }
}

function setCachedRate(from: string, to: string, rate: number): void {
  const cacheKey = getCacheKey(from, to)
  const timestamp = Date.now()
  
  // Set in-memory cache first (immediate availability)
  inMemoryCache.set(cacheKey, { rate, timestamp })
  
  if (typeof window === 'undefined') return
  
  try {
    const cacheData: CachedRate = {
      rate,
      timestamp,
      from,
      to
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch {
    // Cache failed, continue without caching
  }
}

// Mock API function (replace with real API later)
async function fetchExchangeRateFromAPI(from: string, to: string): Promise<number> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const rates = MOCK_EXCHANGE_RATES[from]
  if (!rates || !rates[to]) {
    throw new Error(`Exchange rate not available for ${from} to ${to}`)
  }
  
  // Add small random variation to simulate real rates
  const baseRate = rates[to]
  const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
  return baseRate * (1 + variation)
}

// Main exchange rate function
export async function getExchangeRate(from: string, to: string): Promise<number> {
  // Same currency - no conversion needed
  if (from === to) {
    return 1
  }
  
  // Validate currencies
  if (!CURRENCIES[from] || !CURRENCIES[to]) {
    throw new Error(`Invalid currency code: ${from} or ${to}`)
  }
  
  // Check cache first
  const cached = getCachedRate(from, to)
  if (cached) {
    return cached.rate
  }
  
  try {
    // Fetch from API
    const rate = await fetchExchangeRateFromAPI(from, to)
    
    // Cache the result
    setCachedRate(from, to, rate)
    
    return rate
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${from} to ${to}:`, error)
    
    // Fallback to cached mock rates
    const fallbackRate = MOCK_EXCHANGE_RATES[from]?.[to]
    if (fallbackRate) {
      return fallbackRate
    }
    
    // If no direct rate available, try conversion through USD
    if (from !== 'USD' && to !== 'USD') {
      try {
        const fromToUSD = MOCK_EXCHANGE_RATES[from]?.['USD']
        const usdToTarget = MOCK_EXCHANGE_RATES['USD']?.[to]
        
        if (fromToUSD && usdToTarget) {
          return fromToUSD * usdToTarget
        }
      } catch {
        // Fallback calculation failed
      }
    }
    
    // Last resort: return 1 (no conversion)
    console.warn(`No exchange rate available for ${from} to ${to}, using 1:1 ratio`)
    return 1
  }
}

// Conversion function with current rates
export async function convertWithCurrentRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  convertedAmount: number
  rate: number
  date: string
}> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  const convertedAmount = amount * rate
  
  return {
    convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
    rate,
    date: new Date().toISOString()
  }
}

// Batch conversion for multiple amounts
export async function batchConvert(
  conversions: Array<{
    amount: number
    from: string
    to: string
  }>
): Promise<Array<{
  convertedAmount: number
  rate: number
  originalAmount: number
  from: string
  to: string
}>> {
  const results = await Promise.all(
    conversions.map(async ({ amount, from, to }) => {
      const { convertedAmount, rate } = await convertWithCurrentRate(amount, from, to)
      return {
        convertedAmount,
        rate,
        originalAmount: amount,
        from,
        to
      }
    })
  )
  
  return results
}

// Clear cache function
export function clearExchangeRateCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch {
    // Failed to clear cache, continue
  }
}

// Get cache status for debugging
export function getExchangeRateCacheStatus(): {
  totalCached: number
  cacheKeys: string[]
} {
  if (typeof window === 'undefined') {
    return { totalCached: 0, cacheKeys: [] }
  }
  
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX))
    
    return {
      totalCached: cacheKeys.length,
      cacheKeys
    }
  } catch {
    return { totalCached: 0, cacheKeys: [] }
  }
}