/**
 * Performance monitoring for analytics
 * Tracks refresh frequency and helps identify performance issues
 */

import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  refreshCount: number
  averageRefreshTime: number
  lastRefreshTime: number
  cacheHitRate: number
  totalRefreshes: number
}

export function useAnalyticsPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    refreshCount: 0,
    averageRefreshTime: 0,
    lastRefreshTime: 0,
    cacheHitRate: 0,
    totalRefreshes: 0
  })

  const refreshTimes = useRef<number[]>([])
  const cacheHits = useRef<number>(0)
  const cacheMisses = useRef<number>(0)

  // Track refresh performance
  const trackRefresh = (startTime: number, endTime: number, fromCache: boolean = false) => {
    const refreshTime = endTime - startTime
    refreshTimes.current.push(refreshTime)
    
    // Keep only last 20 refresh times for average calculation
    if (refreshTimes.current.length > 20) {
      refreshTimes.current.shift()
    }

    if (fromCache) {
      cacheHits.current++
    } else {
      cacheMisses.current++
    }

    const averageRefreshTime = refreshTimes.current.reduce((a, b) => a + b, 0) / refreshTimes.current.length
    const totalRequests = cacheHits.current + cacheMisses.current
    const cacheHitRate = totalRequests > 0 ? (cacheHits.current / totalRequests) * 100 : 0

    setMetrics({
      refreshCount: refreshTimes.current.length,
      averageRefreshTime,
      lastRefreshTime: refreshTime,
      cacheHitRate,
      totalRefreshes: totalRequests
    })

    // Log performance warnings
    if (refreshTime > 3000) {
      console.warn(`⚠️ Analytics: Slow refresh detected (${refreshTime}ms)`)
    }
    
    if (cacheHitRate < 50 && totalRequests > 5) {
      console.warn(`⚠️ Analytics: Low cache hit rate (${cacheHitRate.toFixed(1)}%)`)
    }
  }

  // Reset metrics
  const resetMetrics = () => {
    refreshTimes.current = []
    cacheHits.current = 0
    cacheMisses.current = 0
    setMetrics({
      refreshCount: 0,
      averageRefreshTime: 0,
      lastRefreshTime: 0,
      cacheHitRate: 0,
      totalRefreshes: 0
    })
  }

  // Log performance summary periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (metrics.totalRefreshes > 0) {
        console.log('📊 Analytics Performance Summary:', {
          totalRefreshes: metrics.totalRefreshes,
          averageTime: `${metrics.averageRefreshTime.toFixed(0)}ms`,
          cacheHitRate: `${metrics.cacheHitRate.toFixed(1)}%`,
          lastRefresh: `${metrics.lastRefreshTime}ms`
        })
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [metrics])

  return {
    metrics,
    trackRefresh,
    resetMetrics
  }
}
