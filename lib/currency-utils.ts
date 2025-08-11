import { formatCurrency } from './currency'

export function formatCurrencyAbbreviated(value: number, locale?: string): string {
  return formatCurrency(value, locale)
} 