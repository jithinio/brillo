// Currency configuration and utilities
export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  position: "before" | "after"
  decimals: number
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", position: "before", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", position: "after", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", position: "before", decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", position: "before", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", position: "before", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", position: "before", decimals: 0 },
  CHF: { code: "CHF", symbol: "Fr", name: "Swiss Franc", position: "after", decimals: 2 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", position: "before", decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", position: "before", decimals: 2 },
}

// Mock exchange rates (in production, these would come from an API)
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35, JPY: 110, CHF: 0.92, CNY: 6.45, INR: 74.5 },
  EUR: { USD: 1.18, EUR: 1, GBP: 0.86, CAD: 1.47, AUD: 1.59, JPY: 130, CHF: 1.08, CNY: 7.6, INR: 87.8 },
  GBP: { USD: 1.37, EUR: 1.16, GBP: 1, CAD: 1.71, AUD: 1.85, JPY: 151, CHF: 1.26, CNY: 8.84, INR: 102.1 },
  CAD: { USD: 0.8, EUR: 0.68, GBP: 0.58, CAD: 1, AUD: 1.08, JPY: 88, CHF: 0.74, CNY: 5.16, INR: 59.6 },
  AUD: { USD: 0.74, EUR: 0.63, GBP: 0.54, CAD: 0.93, AUD: 1, JPY: 81.5, CHF: 0.68, CNY: 4.78, INR: 55.2 },
  JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, CAD: 0.0114, AUD: 0.0123, JPY: 1, CHF: 0.0084, CNY: 0.0587, INR: 0.677 },
  CHF: { USD: 1.09, EUR: 0.93, GBP: 0.79, CAD: 1.36, AUD: 1.47, JPY: 120, CHF: 1, CNY: 7.02, INR: 81.1 },
  CNY: { USD: 0.155, EUR: 0.132, GBP: 0.113, CAD: 0.194, AUD: 0.209, JPY: 17.05, CHF: 0.142, CNY: 1, INR: 11.55 },
  INR: { USD: 0.0134, EUR: 0.0114, GBP: 0.0098, CAD: 0.0168, AUD: 0.0181, JPY: 1.48, CHF: 0.0123, CNY: 0.0866, INR: 1 },
}

export function getDefaultCurrency(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("default_currency") || "USD"
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

  const formattedAmount = amount.toFixed(config.decimals)

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
