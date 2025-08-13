// Event-Driven Subscription System
type SubscriptionEvent = 'upgraded' | 'synced' | 'cancelled' | 'failed' | 'recovery-failed'

interface EventData {
  userId: string
  subscription?: any
  error?: Error
  timestamp: number
}

type EventCallback = (data: EventData) => void | Promise<void>

class SubscriptionEventBus {
  private listeners = new Map<SubscriptionEvent, Set<EventCallback>>()
  private oneTimeListeners = new Map<SubscriptionEvent, Set<EventCallback>>()

  /**
   * Subscribe to an event
   */
  on(event: SubscriptionEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    console.log(`📡 Event listener added for: ${event}`)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
      console.log(`📡 Event listener removed for: ${event}`)
    }
  }

  /**
   * Subscribe to an event once
   */
  once(event: SubscriptionEvent, callback: EventCallback): void {
    if (!this.oneTimeListeners.has(event)) {
      this.oneTimeListeners.set(event, new Set())
    }
    
    this.oneTimeListeners.get(event)!.add(callback)
  }

  /**
   * Emit an event
   */
  async emit(event: SubscriptionEvent, data: Omit<EventData, 'timestamp'>): Promise<void> {
    const eventData: EventData = {
      ...data,
      timestamp: Date.now()
    }

    console.log(`📡 Event emitted: ${event}`, { userId: data.userId })

    // Execute regular listeners
    const listeners = this.listeners.get(event)
    if (listeners) {
      for (const callback of listeners) {
        try {
          await callback(eventData)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      }
    }

    // Execute one-time listeners
    const oneTimeListeners = this.oneTimeListeners.get(event)
    if (oneTimeListeners) {
      for (const callback of oneTimeListeners) {
        try {
          await callback(eventData)
        } catch (error) {
          console.error(`Error in one-time listener for ${event}:`, error)
        }
      }
      // Clear one-time listeners after execution
      this.oneTimeListeners.delete(event)
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: SubscriptionEvent): void {
    if (event) {
      this.listeners.delete(event)
      this.oneTimeListeners.delete(event)
      console.log(`📡 All listeners removed for: ${event}`)
    } else {
      this.listeners.clear()
      this.oneTimeListeners.clear()
      console.log('📡 All event listeners cleared')
    }
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event?: SubscriptionEvent): number {
    if (event) {
      const regular = this.listeners.get(event)?.size || 0
      const oneTime = this.oneTimeListeners.get(event)?.size || 0
      return regular + oneTime
    }

    let total = 0
    this.listeners.forEach(set => total += set.size)
    this.oneTimeListeners.forEach(set => total += set.size)
    return total
  }
}

// Global instance
export const subscriptionEvents = new SubscriptionEventBus()

// Convenience functions for common events
export const emitUpgraded = (userId: string, subscription: any) => 
  subscriptionEvents.emit('upgraded', { userId, subscription })

export const emitSynced = (userId: string, subscription: any) => 
  subscriptionEvents.emit('synced', { userId, subscription })

export const emitCancelled = (userId: string) => 
  subscriptionEvents.emit('cancelled', { userId })

export const emitFailed = (userId: string, error: Error) => 
  subscriptionEvents.emit('failed', { userId, error })

export const emitRecoveryFailed = (userId: string) => 
  subscriptionEvents.emit('recovery-failed', { userId })
