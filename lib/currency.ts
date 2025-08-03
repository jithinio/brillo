// Currency configuration and utilities
export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  position: "before" | "after"
  decimals: number
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  // Major currencies
  USD: { code: "USD", symbol: "$", name: "US Dollar", position: "before", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", position: "before", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", position: "before", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", position: "before", decimals: 0 },
  CHF: { code: "CHF", symbol: "Fr", name: "Swiss Franc", position: "after", decimals: 2 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", position: "before", decimals: 2 },
  
  // Commonwealth & Americas
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", position: "before", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", position: "before", decimals: 2 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", position: "before", decimals: 2 },
  
  // Asia-Pacific
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", position: "before", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", position: "before", decimals: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", position: "before", decimals: 2 },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", position: "before", decimals: 2 },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", position: "before", decimals: 0 },
  
  // Middle East & Africa
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham", position: "before", decimals: 2 },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", position: "before", decimals: 2 },
  KWD: { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", position: "before", decimals: 3 },
  
  // Others
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble", position: "after", decimals: 2 },
}

// Mock exchange rates (in production, these would come from an API)
// Only including supported currencies for mock data - others will use fallback rates
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
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

export function getDefaultCurrency(): string {
  if (typeof window !== "undefined") {
    // First try localStorage (immediate availability)
    const saved = localStorage.getItem("default_currency")
    if (saved) return saved
    
    // Fallback to checking if we have any company settings cached
    try {
      const settingsData = localStorage.getItem('company-settings')
      if (settingsData) {
        const settings = JSON.parse(settingsData)
        return settings.defaultCurrency || "USD"
      }
    } catch {
      // Ignore parsing errors
    }
  }
  return "USD"
}

export function setDefaultCurrency(currency: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("default_currency", currency)
  }
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = currencyCode || getDefaultCurrency()
  const config = CURRENCIES[currency] || CURRENCIES.USD

  // Add thousand separators
  const parts = amount.toFixed(config.decimals).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const formattedAmount = parts.join('.')

  if (config.position === "before") {
    return `${config.symbol}${formattedAmount}`
  } else {
    return `${formattedAmount}${config.symbol}`
  }
}

export function getCurrencySymbol(currencyCode?: string): string {
  const currency = currencyCode || getDefaultCurrency()
  return CURRENCIES[currency]?.symbol || "$"
}

export function getCurrencyConfig(currencyCode?: string): CurrencyConfig {
  const currency = currencyCode || getDefaultCurrency()
  return CURRENCIES[currency] || CURRENCIES.USD
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  const rates = EXCHANGE_RATES[fromCurrency]
  if (!rates || !rates[toCurrency]) {
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
    return amount // Return original amount if conversion not available
  }
  
  return amount * rates[toCurrency]
}

export function formatCurrencyWithConversion(
  amount: number, 
  originalCurrency: string, 
  displayCurrency?: string
): string {
  const targetCurrency = displayCurrency || getDefaultCurrency()
  
  if (originalCurrency === targetCurrency) {
    return formatCurrency(amount, originalCurrency)
  }
  
  const convertedAmount = convertCurrency(amount, originalCurrency, targetCurrency)
  const originalFormatted = formatCurrency(amount, originalCurrency)
  const convertedFormatted = formatCurrency(convertedAmount, targetCurrency)
  
  return `${convertedFormatted} (${originalFormatted})`
}

// Phone number formatting utility
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber

  // Handle different input formats
  let cleaned = phoneNumber.trim()
  
  // If it doesn't start with +, try to detect the pattern
  if (!cleaned.startsWith('+')) {
    // If it's just digits, assume it needs a country code
    if (/^\d+$/.test(cleaned)) {
      return phoneNumber
    }
  }

  // Remove all non-numeric characters except +
  cleaned = cleaned.replace(/[^\d+]/g, '')
  
  // Validate that we have a properly formatted international number
  if (!cleaned.startsWith('+') || cleaned.length < 8) {
    return phoneNumber
  }
  
  // Handle different phone number formats with priority on +91
  if (cleaned.startsWith('+91')) {
    // India number format: +91 98765 43210
    const number = cleaned.slice(3) // Remove +91
    if (number.length === 10) {
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`
    } else {
      return phoneNumber
    }
  } else if (cleaned.startsWith('+1')) {
    // US/Canada number format: +1 (234) 567-8901
    const number = cleaned.slice(2) // Remove +1
    if (number.length === 10) {
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`
    }
  } else if (cleaned.startsWith('+44')) {
    // UK number format: +44 20 1234 5678
    const number = cleaned.slice(3) // Remove +44
    if (number.length >= 10) {
      return `+44 ${number.slice(0, 2)} ${number.slice(2, 6)} ${number.slice(6)}`
    }
  } else if (cleaned.startsWith('+49')) {
    // Germany number format: +49 30 12345678
    const number = cleaned.slice(3) // Remove +49
    if (number.length >= 10) {
      return `+49 ${number.slice(0, 2)} ${number.slice(2)}`
    }
  } else if (cleaned.startsWith('+33')) {
    // France number format: +33 1 23 45 67 89
    const number = cleaned.slice(3) // Remove +33
    if (number.length === 9) {
      return `+33 ${number.slice(0, 1)} ${number.slice(1, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7)}`
    }
  } else if (cleaned.startsWith('+61')) {
    // Australia number format: +61 4 1234 5678
    const number = cleaned.slice(3) // Remove +61
    if (number.length === 9) {
      return `+61 ${number.slice(0, 1)} ${number.slice(1, 5)} ${number.slice(5)}`
    }
  }
  
  // For other formats or if formatting fails, return the original
  return phoneNumber
}
