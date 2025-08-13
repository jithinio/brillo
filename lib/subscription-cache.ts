// Unified Subscription Cache System
import { UserSubscription } from '@/lib/types/subscription'

interface CacheEntry<T> {
  data: T
  timestamp: number
  userId: string
}

class SubscriptionCache {
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes for all users
  private static memoryCache = new Map<string, CacheEntry<UserSubscription>>()
  private static STORAGE_KEY_PREFIX = 'brillo-sub-cache-'

  /**
   * Get cached subscription data
   */
  static get(userId: string): UserSubscription | null {
    if (!userId) return null

    // Check memory cache first
    const memEntry = this.memoryCache.get(userId)
    if (memEntry && this.isValid(memEntry)) {
      console.log('📦 Cache hit (memory)', { userId })
      return memEntry.data
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + userId)
        if (stored) {
          const entry: CacheEntry<UserSubscription> = JSON.parse(stored)
          if (this.isValid(entry)) {
            console.log('📦 Cache hit (localStorage)', { userId })
            // Promote to memory cache
            this.memoryCache.set(userId, entry)
            return entry.data
          } else {
            // Clean up expired cache
            localStorage.removeItem(this.STORAGE_KEY_PREFIX + userId)
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error)
      }
    }

    console.log('📦 Cache miss', { userId })
    return null
  }

  /**
   * Set subscription data in cache
   */
  static set(userId: string, data: UserSubscription): void {
    if (!userId || !data) return

    const entry: CacheEntry<UserSubscription> = {
      data,
      timestamp: Date.now(),
      userId
    }

    // Update memory cache
    this.memoryCache.set(userId, entry)

    // Update localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          this.STORAGE_KEY_PREFIX + userId,
          JSON.stringify(entry)
        )
        console.log('📦 Cache updated', { userId, planId: data.planId })
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }
    }
  }

  /**
   * Clear cache for a specific user
   */
  static clear(userId: string): void {
    this.memoryCache.delete(userId)
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.STORAGE_KEY_PREFIX + userId)
        console.log('📦 Cache cleared', { userId })
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
    }
  }

  /**
   * Clear all subscription caches
   */
  static clearAll(): void {
    this.memoryCache.clear()

    if (typeof window !== 'undefined') {
      try {
        // Find and remove all subscription cache entries
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
        console.log('📦 All caches cleared')
      } catch (error) {
        console.warn('Failed to clear all localStorage caches:', error)
      }
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private static isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL
  }

  /**
   * Get cache statistics (for debugging)
   */
  static getStats() {
    const memoryCacheSize = this.memoryCache.size
    let localStorageCount = 0

    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      localStorageCount = keys.filter(key => 
        key.startsWith(this.STORAGE_KEY_PREFIX)
      ).length
    }

    return {
      memoryCacheSize,
      localStorageCount,
      ttl: this.CACHE_TTL
    }
  }
}

export default SubscriptionCache
