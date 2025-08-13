// Subscription Performance Tracker
// Tracks and logs performance metrics for subscription operations

type PerformanceMetric = {
  operation: string
  duration: number
  timestamp: number
  success: boolean
  cacheHit?: boolean
  userId?: string
}

class SubscriptionPerformanceTracker {
  private metrics: PerformanceMetric[] = []
  private activeOperations = new Map<string, number>()
  private enabled = process.env.NODE_ENV === 'development'

  startOperation(operationId: string, operation: string): void {
    if (!this.enabled) return
    
    this.activeOperations.set(operationId, Date.now())
    console.log(`⏱️ Started: ${operation}`)
  }

  endOperation(operationId: string, operation: string, success: boolean = true, metadata?: { cacheHit?: boolean; userId?: string }): void {
    if (!this.enabled) return
    
    const startTime = this.activeOperations.get(operationId)
    if (!startTime) {
      console.warn(`⚠️ No start time found for operation: ${operation}`)
      return
    }

    const duration = Date.now() - startTime
    this.activeOperations.delete(operationId)

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      ...metadata
    }

    this.metrics.push(metric)
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    const emoji = success ? '✅' : '❌'
    const cacheInfo = metadata?.cacheHit ? ' (cache hit)' : ''
    console.log(`${emoji} Completed: ${operation} - ${duration}ms${cacheInfo}`)

    // Warn about slow operations
    if (duration > 1000 && !metadata?.cacheHit) {
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`)
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  getAverageOperationTime(operation: string): number {
    const relevantMetrics = this.metrics.filter(m => m.operation === operation && m.success)
    if (relevantMetrics.length === 0) return 0
    
    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
    return Math.round(total / relevantMetrics.length)
  }

  getCacheHitRate(operation: string): number {
    const relevantMetrics = this.metrics.filter(m => m.operation === operation)
    if (relevantMetrics.length === 0) return 0
    
    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    return Math.round((cacheHits / relevantMetrics.length) * 100)
  }

  generateReport(): string {
    const operations = [...new Set(this.metrics.map(m => m.operation))]
    
    let report = '📊 Subscription Performance Report\n'
    report += '================================\n\n'
    
    for (const op of operations) {
      const avgTime = this.getAverageOperationTime(op)
      const cacheHitRate = this.getCacheHitRate(op)
      const count = this.metrics.filter(m => m.operation === op).length
      
      report += `Operation: ${op}\n`
      report += `  - Calls: ${count}\n`
      report += `  - Avg Time: ${avgTime}ms\n`
      report += `  - Cache Hit Rate: ${cacheHitRate}%\n\n`
    }
    
    // Find slowest operations
    const slowOps = this.metrics
      .filter(m => m.duration > 500 && !m.cacheHit)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
    
    if (slowOps.length > 0) {
      report += 'Slowest Operations:\n'
      slowOps.forEach(op => {
        report += `  - ${op.operation}: ${op.duration}ms\n`
      })
    }
    
    return report
  }

  reset(): void {
    this.metrics = []
    this.activeOperations.clear()
  }
}

// Global instance
export const subscriptionPerformanceTracker = new SubscriptionPerformanceTracker()

// Convenience functions
export function trackSubscriptionOperation(operationId: string, operation: string) {
  subscriptionPerformanceTracker.startOperation(operationId, operation)
  
  return {
    end: (success: boolean = true, metadata?: { cacheHit?: boolean; userId?: string }) => {
      subscriptionPerformanceTracker.endOperation(operationId, operation, success, metadata)
    }
  }
}

// Auto-log report in development
if (process.env.NODE_ENV === 'development') {
  // Log report every 5 minutes
  setInterval(() => {
    const report = subscriptionPerformanceTracker.generateReport()
    if (report.includes('Calls:')) {
      console.log(report)
    }
  }, 5 * 60 * 1000)
}
