// Performance monitoring for subscription operations
'use client'

import { useCallback, useRef } from 'react'

interface PerformanceMetrics {
  loadTime: number
  cacheHitRate: number
  apiCallCount: number
  errorRate: number
  lastUpdated: number
}

export function useSubscriptionPerformance() {
  const metricsRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    cacheHitRate: 0,
    apiCallCount: 0,
    errorRate: 0,
    lastUpdated: Date.now()
  })

  const operationTimers = useRef<Map<string, number>>(new Map())

  // Start timing an operation
  const startTiming = useCallback((operationName: string) => {
    operationTimers.current.set(operationName, performance.now())
  }, [])

  // End timing and record metrics
  const endTiming = useCallback((operationName: string, success: boolean = true) => {
    const startTime = operationTimers.current.get(operationName)
    if (!startTime) return

    const duration = performance.now() - startTime
    operationTimers.current.delete(operationName)

    // Update metrics
    const metrics = metricsRef.current
    
    switch (operationName) {
      case 'subscription_load':
        metrics.loadTime = duration
        break
      case 'cache_hit':
        metrics.cacheHitRate = (metrics.cacheHitRate + 1) / 2 // Simple moving average
        break
      case 'cache_miss':
        metrics.cacheHitRate = metrics.cacheHitRate / 2
        break
      case 'api_call':
        metrics.apiCallCount++
        break
    }

    if (!success) {
      metrics.errorRate = (metrics.errorRate + 1) / 2
    } else {
      metrics.errorRate = metrics.errorRate * 0.9 // Decay error rate on success
    }

    metrics.lastUpdated = Date.now()

    // Log performance data in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Subscription Performance - ${operationName}:`, {
        duration: `${duration.toFixed(2)}ms`,
        success,
        metrics: { ...metrics }
      })
    }

    // Send to analytics in production (if configured)
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', 'subscription_performance', {
        event_category: 'performance',
        event_label: operationName,
        value: Math.round(duration),
        custom_parameters: {
          success,
          load_time: metrics.loadTime,
          cache_hit_rate: metrics.cacheHitRate,
          api_call_count: metrics.apiCallCount,
          error_rate: metrics.errorRate
        }
      })
    }
  }, [])

  // Track cache operations
  const trackCacheHit = useCallback(() => {
    endTiming('cache_hit', true)
  }, [endTiming])

  const trackCacheMiss = useCallback(() => {
    endTiming('cache_miss', true)
  }, [endTiming])

  // Track API calls
  const trackApiCall = useCallback((operationName: string) => {
    startTiming('api_call')
    return {
      success: () => endTiming('api_call', true),
      error: () => endTiming('api_call', false)
    }
  }, [startTiming, endTiming])

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current }
  }, [])

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      loadTime: 0,
      cacheHitRate: 0,
      apiCallCount: 0,
      errorRate: 0,
      lastUpdated: Date.now()
    }
  }, [])

  return {
    startTiming,
    endTiming,
    trackCacheHit,
    trackCacheMiss,
    trackApiCall,
    getMetrics,
    resetMetrics
  }
}

// Performance-aware subscription hook wrapper
export function useOptimizedSubscription() {
  const performance = useSubscriptionPerformance()
  
  // This can be used to wrap subscription operations with performance tracking
  const wrapOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    performance.startTiming(operationName)
    try {
      const result = await operation()
      performance.endTiming(operationName, true)
      return result
    } catch (error) {
      performance.endTiming(operationName, false)
      throw error
    }
  }, [performance])

  return {
    performance,
    wrapOperation
  }
}
