/**
 * Live Exchange Rate API Integration with UniRateAPI
 * 
 * Features:
 * - Real-time exchange rates
 * - Historical rates for specific dates
 * - 26 years of historical data (1999-2025)
 * - 593 currencies supported
 * - Free forever with 30 requests/minute limit
 * - European Central Bank data sources
 */

// Types
interface LiveExchangeRateResponse {
  base: string
  rates: Record<string, number>
  success?: boolean
  date?: string
}

interface ConversionResponse {
  amount: number
  from: string
  to: string
  result: number
  rate: number
  date: string
}

interface CachedRate {
  rate: number
  timestamp: number
  date?: string
}

// Configuration
const UNIRATEAPI_BASE_URL = 'https://api.unirateapi.com'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for live rates
const HISTORICAL_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for historical rates
const RATE_LIMIT_DELAY = 2000 // 2 seconds between requests to respect 30/minute limit

// In-memory cache
const liveRateCache = new Map<string, CachedRate>()
const historicalRateCache = new Map<string, CachedRate>()

// Rate limiting
let lastRequestTime = 0

/**
 * Get API key from environment variables
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_UNIRATEAPI_KEY || process.env.UNIRATEAPI_KEY
  if (!apiKey) {
    console.warn('UniRateAPI key not found. Using fallback mock rates.')
    return ''
  }
  return apiKey
}

/**
 * Rate limiting helper - ensures we don't exceed 30 requests/minute
 */
async function respectRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
    console.log(`Rate limiting: waiting ${waitTime}ms`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
}

/**
 * Fetch live exchange rates from UniRateAPI
 */
async function fetchLiveRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  const apiKey = getApiKey()
  console.log(`🔧 Fetching live rates for ${baseCurrency}, API key present: ${!!apiKey}`)
  
  if (!apiKey) {
    console.log('❌ No API key, using fallback rates')
    return getFallbackRates(baseCurrency)
  }

  // Check cache first
  const cacheKey = `live_${baseCurrency}`
  const cached = liveRateCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Cache hit for live rates: ${baseCurrency}`)
    const cachedRates = JSON.parse(localStorage.getItem(`rates_${cacheKey}`) || '{}')
    return { [baseCurrency]: 1, ...cachedRates }
  }

  try {
    await respectRateLimit()
    
    const url = `${UNIRATEAPI_BASE_URL}/api/rates?api_key=${apiKey}&base=${baseCurrency}`
    console.log(`📞 Calling UniRateAPI: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Brillo-Invoice-App/1.0'
      }
    })

    console.log(`📡 API Response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`UniRateAPI responded with status: ${response.status}`)
    }

    const data: LiveExchangeRateResponse = await response.json()
    console.log(`📊 API Response data:`, { 
      base: data.base, 
      ratesCount: Object.keys(data.rates || {}).length,
      success: data.success,
      sampleRates: Object.entries(data.rates || {}).slice(0, 3)
    })
    
    if (!data.rates) {
      throw new Error('Invalid response format from UniRateAPI')
    }

    // Cache the results
    liveRateCache.set(cacheKey, {
      rate: 1,
      timestamp: Date.now()
    })

    // Store rates in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rates_${cacheKey}`, JSON.stringify(data.rates))
      localStorage.setItem(`rates_${cacheKey}_timestamp`, Date.now().toString())
    }

    console.log(`✅ Live rates fetched and cached successfully for ${baseCurrency}`)
    // Always include the base currency rate as 1
    return { [baseCurrency]: 1, ...data.rates }

  } catch (error) {
    console.error('Error fetching live rates from UniRateAPI:', error)
    return getFallbackRates(baseCurrency)
  }
}

/**
 * Fetch historical exchange rates for a specific date
 * IMPORTANT: UniRateAPI free tier may not support historical data.
 * This function will fallback to live rates if historical data is unavailable.
 */
async function fetchHistoricalRates(
  date: string, 
  baseCurrency: string = 'USD'
): Promise<Record<string, number>> {
  const apiKey = getApiKey()
  console.log(`🔧 Fetching historical rates for ${baseCurrency} on ${date}, API key present: ${!!apiKey}`)
  
  if (!apiKey) {
    console.log('❌ No API key, using fallback rates for historical data')
    return getFallbackRates(baseCurrency)
  }

  // Format date to YYYY-MM-DD
  const formattedDate = (() => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()
  
  // Check if the date is in the future - if so, use live rates
  const targetDate = new Date(formattedDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for comparison
  
  if (targetDate > today) {
    console.log(`⚠️ Future date detected in fetchHistoricalRates (${formattedDate}), using live rates`)
    return await fetchLiveRates(baseCurrency)
  }
  
  const cacheKey = `historical_${baseCurrency}_${formattedDate}`
  
  // Check cache first (historical rates don't change)
  const cached = historicalRateCache.get(cacheKey)
  if (cached) {
    console.log(`✅ Cache hit for historical rates: ${baseCurrency} on ${formattedDate}`)
    const cachedRates = JSON.parse(localStorage.getItem(`rates_${cacheKey}`) || '{}')
    return Object.keys(cachedRates).length > 0 ? cachedRates : getFallbackRates(baseCurrency)
  }

  try {
    await respectRateLimit()
    
    const url = `${UNIRATEAPI_BASE_URL}/api/historical/rates?api_key=${apiKey}&date=${formattedDate}&base=${baseCurrency}`
    console.log(`📞 Calling historical rates API: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Brillo-Invoice-App/1.0'
      }
    })

    console.log(`📡 Historical API Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`⚠️ Historical rates not available for ${formattedDate}: ${errorText}`)
      
      // Check if it's a "no data available" error (common for free tiers)
      if (response.status === 404 || errorText.includes('No exchange rates available')) {
        console.log(`🔄 Historical data not available, falling back to live rates for ${formattedDate}`)
        const liveRates = await fetchLiveRates(baseCurrency)
        
        // Cache the live rates as "historical" for this date to avoid repeated attempts
        historicalRateCache.set(cacheKey, {
          rate: 1,
          timestamp: Date.now(),
          date: formattedDate
        })
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`rates_${cacheKey}`, JSON.stringify(liveRates))
          localStorage.setItem(`rates_${cacheKey}_fallback`, 'live_rates')
        }
        
        return liveRates
      }
      
      throw new Error(`UniRateAPI historical rates error: ${response.status} - ${errorText}`)
    }

    const data: LiveExchangeRateResponse = await response.json()
    
    if (!data.rates) {
      throw new Error('Invalid response format from UniRateAPI historical endpoint')
    }

    // Cache the results (historical rates never change)
    historicalRateCache.set(cacheKey, {
      rate: 1,
      timestamp: Date.now(),
      date: formattedDate
    })

    // Store rates in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rates_${cacheKey}`, JSON.stringify(data.rates))
      localStorage.setItem(`rates_${cacheKey}_date`, formattedDate)
    }

    console.log(`✅ Historical rates fetched successfully for ${baseCurrency} on ${formattedDate}`)
    return { [baseCurrency]: 1, ...data.rates }

  } catch (error) {
    console.error(`💥 Error fetching historical rates from UniRateAPI for ${formattedDate}:`, error)
    
    // Fallback strategy: try live rates first, then mock rates
    try {
      console.log(`🔄 Attempting fallback to live rates for ${formattedDate}`)
      const liveRates = await fetchLiveRates(baseCurrency)
      
      // Cache the fallback rates
      if (typeof window !== 'undefined') {
        localStorage.setItem(`rates_${cacheKey}`, JSON.stringify(liveRates))
        localStorage.setItem(`rates_${cacheKey}_fallback`, 'live_rates_error')
      }
      
      return liveRates
    } catch (liveError) {
      console.error(`💥 Live rates fallback also failed:`, liveError)
      console.log(`🔄 Using mock rates as final fallback for ${formattedDate}`)
      return getFallbackRates(baseCurrency)
    }
  }
}

/**
 * Get exchange rate between two currencies (live rate)
 */
export async function getLiveExchangeRate(from: string, to: string): Promise<number> {
  console.log(`🔄 Getting exchange rate: ${from} → ${to}`)
  
  if (from === to) {
    console.log(`✅ Same currency, rate = 1`)
    return 1
  }

  try {
    // Always use USD as base currency since that's what the API provides
    console.log(`📡 Fetching USD-based rates for conversion`)
    const usdRates = await fetchLiveRates('USD')
    console.log(`📊 Available USD rates:`, Object.keys(usdRates).slice(0, 5), `(${Object.keys(usdRates).length} total)`)
    
    // If converting from USD to another currency, use rate directly
    if (from === 'USD') {
      const rate = usdRates[to]
      if (rate) {
        console.log(`✅ USD to ${to}: 1 USD = ${rate} ${to}`)
        return rate
      }
    }
    
    // If converting to USD from another currency, use inverse of the rate
    if (to === 'USD') {
      const fromRate = usdRates[from]
      if (fromRate) {
        const rate = 1 / fromRate
        console.log(`✅ ${from} to USD: 1 ${from} = ${rate} USD (inverse of ${fromRate})`)
        return rate
      }
    }
    
    // For cross-currency conversion (neither is USD), calculate via USD
    const fromRate = usdRates[from] // 1 USD = X fromCurrency
    const toRate = usdRates[to]     // 1 USD = Y toCurrency
    
    if (fromRate && toRate) {
      // To convert from fromCurrency to toCurrency:
      // 1 fromCurrency = (1/fromRate) USD = (1/fromRate) * toRate toCurrency
      const rate = toRate / fromRate
      console.log(`✅ Cross-rate ${from} to ${to}: 1 ${from} = ${rate} ${to} (via USD: ${fromRate}, ${toRate})`)
      return rate
    }
    
    console.error(`❌ No rates found for ${from} and/or ${to}`)
    return 1
  } catch (error) {
    console.error(`❌ Error getting live exchange rate ${from} to ${to}:`, error)
    return 1
  }
}

/**
 * Get historical exchange rate for a specific date
 * Automatically falls back to live rates if historical data is unavailable
 */
export async function getHistoricalExchangeRate(
  from: string, 
  to: string, 
  date: string
): Promise<number> {
  console.log(`🔄 Getting historical exchange rate: ${from} → ${to} on ${date}`)
  
  if (from === to) {
    console.log(`✅ Same currency, rate = 1`)
    return 1
  }

  // Check if the date is in the future - if so, use live rates instead
  const targetDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for comparison
  
  if (targetDate > today) {
    console.log(`⚠️ Future date detected (${date}), using live rates instead of historical`)
    return await getLiveExchangeRate(from, to)
  }

  try {
    // Always use USD as base currency for historical rates (same as live rates)
    console.log(`📡 Fetching historical USD-based rates for ${date}`)
    const usdRates = await fetchHistoricalRates(date, 'USD')
    console.log(`📊 Available historical USD rates for ${date}:`, Object.keys(usdRates).slice(0, 5), `(${Object.keys(usdRates).length} total)`)
    
    // If we got empty rates, fall back to live rates
    if (!usdRates || Object.keys(usdRates).length === 0) {
      console.log(`⚠️ No historical rates returned, falling back to live rates`)
      return await getLiveExchangeRate(from, to)
    }
    
    // If converting from USD to another currency, use rate directly
    if (from === 'USD') {
      const rate = usdRates[to]
      if (rate && rate > 0) {
        console.log(`✅ Historical USD to ${to} on ${date}: 1 USD = ${rate} ${to}`)
        return rate
      } else {
        console.log(`⚠️ No rate found for USD → ${to} on ${date}, using live rate`)
        return await getLiveExchangeRate(from, to)
      }
    }
    
    // If converting to USD from another currency, use inverse of the rate
    if (to === 'USD') {
      const fromRate = usdRates[from]
      if (fromRate && fromRate > 0) {
        const rate = 1 / fromRate
        console.log(`✅ Historical ${from} to USD on ${date}: 1 ${from} = ${rate} USD (inverse of ${fromRate})`)
        return rate
      } else {
        console.log(`⚠️ No rate found for ${from} → USD on ${date}, using live rate`)
        return await getLiveExchangeRate(from, to)
      }
    }
    
    // For cross-currency conversion (neither is USD), calculate via USD
    const fromRate = usdRates[from] // 1 USD = X fromCurrency
    const toRate = usdRates[to]     // 1 USD = Y toCurrency
    
    if (fromRate && toRate && fromRate > 0 && toRate > 0) {
      // To convert from fromCurrency to toCurrency:
      // 1 fromCurrency = (1/fromRate) USD = (1/fromRate) * toRate toCurrency
      const rate = toRate / fromRate
      console.log(`✅ Historical cross-rate ${from} to ${to} on ${date}: 1 ${from} = ${rate} ${to} (via USD: ${fromRate}, ${toRate})`)
      return rate
    }
    
    console.log(`⚠️ Insufficient historical rates for ${from} and/or ${to} on ${date}, falling back to live rates`)
    return await getLiveExchangeRate(from, to)
    
  } catch (error) {
    console.error(`💥 Error getting historical exchange rate ${from} to ${to} on ${date}:`, error)
    console.log(`🔄 Falling back to live rate for ${from} → ${to}`)
    return await getLiveExchangeRate(from, to)
  }
}

/**
 * Convert amount with current live rate
 */
export async function convertWithLiveRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  convertedAmount: number
  rate: number
  date: string
}> {
  const rate = await getLiveExchangeRate(fromCurrency, toCurrency)
  const convertedAmount = amount * rate
  
  return {
    convertedAmount,
    rate,
    date: new Date().toISOString()
  }
}

/**
 * Convert amount with historical rate for specific date
 */
export async function convertWithHistoricalRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<{
  convertedAmount: number
  rate: number
  date: string
}> {
  const rate = await getHistoricalExchangeRate(fromCurrency, toCurrency, date)
  const convertedAmount = amount * rate
  
  return {
    convertedAmount,
    rate,
    date: new Date(date).toISOString()
  }
}

/**
 * Fallback rates (your existing mock data) when API is unavailable
 */
function getFallbackRates(baseCurrency: string): Record<string, number> {
  console.log(`Using fallback rates for ${baseCurrency}`)
  
  // Your existing mock rates from lib/currency.ts
  const mockRates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.85, GBP: 0.73, JPY: 110, CAD: 1.25, AUD: 1.35, CHF: 0.92, CNY: 6.45, INR: 74.5, SGD: 1.35, HKD: 7.8, NZD: 1.45, SEK: 8.8, NOK: 8.5, MXN: 20.1, RUB: 74.2, BRL: 5.2 },
    EUR: { USD: 1.18, GBP: 0.86, JPY: 129.4, CAD: 1.47, AUD: 1.59, CHF: 1.08, CNY: 7.6, INR: 87.8, SGD: 1.59, HKD: 9.2, NZD: 1.71, SEK: 10.4, NOK: 10.0, MXN: 23.7, RUB: 87.5, BRL: 6.1 },
    GBP: { USD: 1.37, EUR: 1.16, JPY: 150.7, CAD: 1.71, AUD: 1.85, CHF: 1.26, CNY: 8.84, INR: 102.1, SGD: 1.85, HKD: 10.7, NZD: 1.99, SEK: 12.1, NOK: 11.6, MXN: 27.5, RUB: 101.8, BRL: 7.1 }
  }
  
  return mockRates[baseCurrency] || mockRates.USD
}

/**
 * Clear all cached rates (useful for testing or manual refresh)
 */
export function clearExchangeRateCache(): void {
  liveRateCache.clear()
  historicalRateCache.clear()
  
  if (typeof window !== 'undefined') {
    // Clear localStorage cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('rates_')) {
        localStorage.removeItem(key)
      }
    })
  }
  
  console.log('✅ Exchange rate cache cleared')
}

/**
 * Get cache statistics for monitoring
 */
export function getExchangeRateCacheStats(): {
  liveRatesCount: number
  historicalRatesCount: number
  totalMemoryUsage: string
} {
  return {
    liveRatesCount: liveRateCache.size,
    historicalRatesCount: historicalRateCache.size,
    totalMemoryUsage: `${Math.round((liveRateCache.size + historicalRateCache.size) * 0.1)} KB (estimated)`
  }
}

// Legacy compatibility exports (to maintain existing code)
export const getExchangeRate = getLiveExchangeRate
export const convertWithCurrentRate = convertWithLiveRate