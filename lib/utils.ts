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

// Fast debounce for immediate UI feedback (shorter delays)
export function fastDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  let lastCallTime = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    
    // If it's been more than the delay since last call, execute immediately
    if (now - lastCallTime > delay) {
      lastCallTime = now
      func(...args)
      return
    }
    
    // Otherwise debounce normally
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      lastCallTime = Date.now()
      func(...args)
    }, delay)
  }
}

// Throttle function for high-frequency events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCallTime >= delay) {
      lastCallTime = now
      func(...args)
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now()
        func(...args)
      }, delay - (now - lastCallTime))
    }
  }
}
