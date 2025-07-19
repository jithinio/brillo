import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLargeNumber(num: number, currencySymbol: string = '$'): string {
  if (num >= 1000000000) {
    return currencySymbol + (num / 1000000000).toFixed(1) + 'B'
  } else if (num >= 1000000) {
    return currencySymbol + (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return currencySymbol + (num / 1000).toFixed(1) + 'K'
  } else {
    return currencySymbol + num.toString()
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}
