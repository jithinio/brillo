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
