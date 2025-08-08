// Consolidated subscription management to reduce multiple Supabase listeners
'use client'

import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export type SubscriptionEvent = 
  | 'subscription_updated'
  | 'usage_updated'
  | 'profile_updated'

export interface SubscriptionEventData {
  type: SubscriptionEvent
  userId: string
  payload: any
}

class SubscriptionManager {
  private static instance: SubscriptionManager
  private listeners = new Map<string, Set<(data: SubscriptionEventData) => void>>()
  private channels: RealtimeChannel[] = []
  private isSetup = false

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager()
    }
    return SubscriptionManager.instance
  }

  private constructor() {}

  // Subscribe to specific events
  subscribe(
    eventType: SubscriptionEvent, 
    callback: (data: SubscriptionEventData) => void
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(callback)
    
    // Setup global listeners if not already done
    if (!this.isSetup) {
      this.setupGlobalListeners()
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback)
      
      // Clean up if no more listeners
      if (this.listeners.get(eventType)?.size === 0) {
        this.listeners.delete(eventType)
      }
      
      // Clean up global listeners if no more listeners
      if (this.listeners.size === 0) {
        this.cleanup()
      }
    }
  }

  private setupGlobalListeners() {
    if (this.isSetup) return
    
    console.log('🔧 Setting up consolidated subscription listeners')
    
    try {
      // Single listener for profile changes (subscription data)
      const profileChannel = supabase
        .channel('subscription-profile-changes')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: 'subscription_plan_id=neq.null' // Only listen to subscription-related changes
        }, (payload) => {
          this.notifyListeners('subscription_updated', {
            type: 'subscription_updated',
            userId: payload.new.id as string,
            payload: payload.new
          })
        })
        .subscribe()

      // Single listener for usage changes (projects, clients, invoices)
      const projectsChannel = supabase
        .channel('subscription-projects-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'projects' 
        }, (payload) => {
          const userId = (payload.new?.user_id || payload.old?.user_id) as string
          if (userId) {
            this.notifyListeners('usage_updated', {
              type: 'usage_updated',
              userId,
              payload: { table: 'projects', ...payload }
            })
          }
        })
        .subscribe()

      const clientsChannel = supabase
        .channel('subscription-clients-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'clients' 
        }, (payload) => {
          const userId = (payload.new?.user_id || payload.old?.user_id) as string
          if (userId) {
            this.notifyListeners('usage_updated', {
              type: 'usage_updated',
              userId,
              payload: { table: 'clients', ...payload }
            })
          }
        })
        .subscribe()

      const invoicesChannel = supabase
        .channel('subscription-invoices-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'invoices' 
        }, (payload) => {
          const userId = (payload.new?.user_id || payload.old?.user_id) as string
          if (userId) {
            this.notifyListeners('usage_updated', {
              type: 'usage_updated',
              userId,
              payload: { table: 'invoices', ...payload }
            })
          }
        })
        .subscribe()

      this.channels = [profileChannel, projectsChannel, clientsChannel, invoicesChannel]
      this.isSetup = true
      
    } catch (error) {
      console.error('Error setting up subscription listeners:', error)
    }
  }

  private notifyListeners(eventType: SubscriptionEvent, data: SubscriptionEventData) {
    const eventListeners = this.listeners.get(eventType)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in subscription listener callback:', error)
        }
      })
    }
  }

  // Clean up all listeners
  cleanup() {
    console.log('🧹 Cleaning up subscription manager')
    
    this.channels.forEach(channel => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.error('Error removing channel:', error)
      }
    })
    
    this.channels = []
    this.listeners.clear()
    this.isSetup = false
  }

  // Get current listener count for debugging
  getListenerCount(): number {
    let total = 0
    this.listeners.forEach(set => {
      total += set.size
    })
    return total
  }

  // Force refresh all subscription data
  forceRefreshAll() {
    console.log('🔄 Force refreshing all subscription data')
    this.notifyListeners('subscription_updated', {
      type: 'subscription_updated',
      userId: '', // Will be filtered by components
      payload: { force_refresh: true }
    })
  }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManager.getInstance()

// React hook for easy usage
export function useSubscriptionListener(
  eventType: SubscriptionEvent,
  callback: (data: SubscriptionEventData) => void,
  userId?: string
) {
  const filteredCallback = (data: SubscriptionEventData) => {
    // Filter by userId if provided
    if (userId && data.userId !== userId) return
    callback(data)
  }

  return subscriptionManager.subscribe(eventType, filteredCallback)
}
