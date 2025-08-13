"use client"

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { useSubscription } from '@/components/providers/subscription-provider'
import { supabase } from '@/lib/supabase'

export function UpgradeSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { refetchSubscription, optimisticUpgrade } = useSubscription()
  const hasProcessed = useRef(false)

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

      // Show immediate success message with pro features unlocked
      toast.success('🎉 Welcome to Brillo Pro! All features unlocked!', {
        duration: 4000,
      })
      
      // 🔄 POLAR SYNC - Give webhooks a chance to fire first
      console.log('⏳ Preparing to sync subscription with Polar...')
      
      // Wait 1.5 seconds for Polar webhook to potentially process
      setTimeout(async () => {
        try {
          console.log('🔄 Syncing with Polar API...')
          const syncResponse = await fetch('/api/polar/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user?.id }),
          })
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log('✅ Polar subscription synced successfully:', syncData)
            
            // If sync returned subscription data, update the state with real data
            if (syncData.subscription && syncData.subscription.planId) {
              // Force a full refresh to ensure all components update
              await refetchSubscription(true)
            }
          } else {
            console.warn('❌ Polar sync failed with status:', syncResponse.status)
            // Still try to refresh subscription data
            await refetchSubscription(true)
          }
        } catch (syncError) {
          console.error('❌ Error syncing Polar subscription:', syncError)
          // Still try to refresh subscription data
          await refetchSubscription(true)
        }
      }, 1500)
      
      // Additional background refresh after 3 seconds
      setTimeout(async () => {
        console.log('🔄 Additional subscription refresh...')
        refetchSubscription(true)
      }, 3000)
      
      // Second refresh after 3 seconds with status check
      setTimeout(async () => {
        console.log('🔄 Second subscription data refresh...')
        refetchSubscription(true)
        
        // Check if subscription is properly synced
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan_id, subscription_status')
            .eq('id', user?.id)
            .single()
          
          console.log('📊 Current subscription status:', profile)
          
          if (profile?.subscription_plan_id && profile.subscription_plan_id !== 'free') {
            toast.success('✅ Pro features activated! Welcome to Brillo Pro!', {
              duration: 5000,
            })
          } else {
            // If still not synced, show info message
            toast.info('🔄 Setting up your Pro account - this may take a moment...', {
              duration: 3000,
            })
            
            // One more refresh after another 3 seconds
            setTimeout(() => {
              console.log('🔄 Final subscription data refresh...')
              refetchSubscription(true)
            }, 3000)
          }
        } catch (error) {
          console.error('Error checking subscription status:', error)
        }
      }, 3000)
      
    } catch (error) {
      console.error('💥 Upgrade success handling error:', error)
      toast.error('Error processing upgrade: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return null // This component doesn't render anything
}