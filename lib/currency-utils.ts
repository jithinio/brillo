import { formatCurrency } from './currency'

export function formatCurrencyAbbreviated(value: number, locale?: string): string {
  if (value === 0) return formatCurrency(0, locale)
  
  const absValue = Math.abs(value)
  
  if (absValue >= 1_000_000_000) {
    return formatCurrency(value / 1_000_000_000, locale).replace(/\.00$/, '') + 'B'
  } else if (absValue >= 1_000_000) {
    return formatCurrency(value / 1_000_000, locale).replace(/\.00$/, '') + 'M'
  } else if (absValue >= 10_000) {
    return formatCurrency(value / 1_000, locale).replace(/\.00$/, '') + 'k'
  }
  
  return formatCurrency(value, locale)
} 