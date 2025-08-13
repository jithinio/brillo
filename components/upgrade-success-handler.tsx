"use client"

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { useSubscription } from '@/components/providers/subscription-provider'
import { supabase } from '@/lib/supabase'
import { UpgradeLoader } from '@/components/subscription/upgrade-loader'

export function UpgradeSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { refetchSubscription, optimisticUpgrade, subscription } = useSubscription()
  const hasProcessed = useRef(false)
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) return

    const upgradeStatus = searchParams.get('upgrade')

    if (upgradeStatus === 'success' && user) {
      hasProcessed.current = true
      handleUpgradeSuccess()
    } else if (upgradeStatus === 'cancelled') {
      toast.info('Subscription upgrade was cancelled')
      router.replace('/dashboard')
    } else if (upgradeStatus === 'failed') {
      toast.error('Subscription upgrade failed. Please try again.')
      router.replace('/dashboard')
    }
  }, [searchParams, user, router])

  const handleUpgradeSuccess = async () => {
    try {
      console.log('🚀 UPGRADE SUCCESS - Processing for user:', user?.id)

      // First, clean up the URL immediately to prevent infinite loops
      console.log('🧹 Cleaning up URL parameters...')
      router.replace('/dashboard')

      // Show the full-screen loader
      setShowLoader(true)

      // ✨ OPTIMISTIC UPDATE: Immediately show pro features
      const planFromUrl = searchParams.get('plan') || 'pro_monthly'
      console.log('🚀 Applying optimistic upgrade to:', planFromUrl)
      optimisticUpgrade(planFromUrl)

      // 🚀 INSTANT CSS HIDING: Force HTML attribute update
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-user-plan', 'pro')
        console.log('🚀 Instant pro user CSS hiding activated')
        
        // Also update localStorage cache immediately with pro status
        try {
          const subscriptionCache = {
            data: {
              planId: planFromUrl,
              status: 'active',
              customerId: null,
              subscriptionId: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false
            },
            timestamp: Date.now(),
            userId: user?.id || ''
          }
          localStorage.setItem('brillo-subscription-cache', JSON.stringify(subscriptionCache))
          console.log('🚀 Updated localStorage cache with pro status')
        } catch (error) {
          console.warn('Failed to update localStorage cache:', error)
        }
      }
      
      // 🔄 SYNC IN BACKGROUND - Use a single, consolidated sync process
      console.log('⏳ Syncing subscription data...')
      
      // Perform sync operations while loader is showing
      const performSync = async () => {
        try {
          // First attempt - immediate sync
          console.log('🔄 Syncing subscription data...')
          const syncResponse = await fetch('/api/subscription/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user?.id }),
          })
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log('✅ Polar subscription synced successfully:', syncData)
            
            // Force refresh subscription data
            await refetchSubscription(true, true)
          } else {
            console.warn('❌ Polar sync failed with status:', syncResponse.status)
            // Still try to refresh subscription data
            await refetchSubscription(true)
          }
          
          // Verify subscription is properly synced
          const { supabase } = await import('@/lib/supabase')
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan_id, subscription_status')
            .eq('id', user?.id)
            .single()
          
          console.log('📊 Final subscription status:', profile)
          
          // Return success status
          return profile?.subscription_plan_id && profile.subscription_plan_id !== 'free'
          
        } catch (error) {
          console.error('❌ Error during sync:', error)
          return false
        }
      }
      
      // Wait a moment for webhooks, then sync
      setTimeout(async () => {
        const syncSuccess = await performSync()
        
        // If still not synced after first attempt, try once more
        if (!syncSuccess) {
          console.log('🔄 Retrying sync...')
          setTimeout(async () => {
            await performSync()
          }, 2000)
        }
      }, 1500)
      
    } catch (error) {
      console.error('💥 Upgrade success handling error:', error)
      toast.error('Error processing upgrade: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setShowLoader(false) // Hide loader on error
    }
  }

  // Handle loader completion
  const handleLoaderComplete = () => {
    setShowLoader(false)
    toast.success('🎉 Welcome to Brillo Pro! All features are now active.', {
      duration: 5000,
    })
  }

  return <UpgradeLoader isVisible={showLoader} onComplete={handleLoaderComplete} />
}