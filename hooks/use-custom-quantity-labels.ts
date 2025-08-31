"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'

export interface CustomQuantityLabel {
  id: string
  user_id: string
  label: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useCustomQuantityLabels() {
  const [customLabels, setCustomLabels] = useState<CustomQuantityLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch custom labels
  const fetchCustomLabels = async () => {
    if (!user) {
      setCustomLabels([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      // Get the current session with access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.log('No session or access token found, skipping custom labels fetch')
        setCustomLabels([])
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/quantity-labels', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized access to custom labels, user may not be authenticated')
          setCustomLabels([])
          setError(null)
          return
        }
        throw new Error('Failed to fetch custom labels')
      }

      const data = await response.json()
      setCustomLabels(data.customLabels || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching custom labels:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch custom labels')
    } finally {
      setIsLoading(false)
    }
  }

  // Add new custom label
  const addCustomLabel = async (label: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Get the current session with access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No session found')
      }

      const response = await fetch('/api/quantity-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ label }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add custom label')
      }

      const data = await response.json()
      setCustomLabels(prev => [...prev, data.customLabel])
      return data.customLabel
    } catch (err) {
      console.error('Error adding custom label:', err)
      throw err
    }
  }

  // Delete custom label
  const deleteCustomLabel = async (labelId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Get the current session with access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No session found')
      }

      const response = await fetch(`/api/quantity-labels?id=${labelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete custom label')
      }

      setCustomLabels(prev => prev.filter(label => label.id !== labelId))
    } catch (err) {
      console.error('Error deleting custom label:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchCustomLabels()
  }, [user])

  return {
    customLabels,
    isLoading,
    error,
    addCustomLabel,
    deleteCustomLabel,
    refetch: fetchCustomLabels,
  }
}