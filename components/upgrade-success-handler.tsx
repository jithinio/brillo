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
  const { refetchSubscription } = useSubscription()
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) return

    const upgradeStatus = searchParams.get('upgrade')
    const customerSessionToken = searchParams.get('customer_session_token')

    if (upgradeStatus === 'success' && customerSessionToken && user) {
      hasProcessed.current = true
      handleUpgradeSuccess(customerSessionToken)
    } else if (upgradeStatus === 'cancelled') {
      toast.info('Subscription upgrade was cancelled')
      router.replace('/dashboard')
    } else if (upgradeStatus === 'failed') {
      toast.error('Subscription upgrade failed. Please try again.')
      router.replace('/dashboard')
    }
  }, [searchParams, user, router, refetchSubscription])

  const handleUpgradeSuccess = async (customerSessionToken: string) => {
    try {
      console.log('🚀 UPGRADE SUCCESS - Processing for user:', user?.id)
      console.log('🎫 Customer session token:', customerSessionToken)

      // First, clean up the URL immediately to prevent infinite loops
      console.log('🧹 Cleaning up URL parameters...')
      router.replace('/dashboard')

      // Update subscription status to pro_monthly as default
      console.log('📝 Updating database with Pro subscription...')
      
      const updateData = {
        subscription_plan_id: 'pro_monthly',
        subscription_status: 'active',
        subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      console.log('📊 Update data:', updateData)
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user!.id)
        .select()

      if (error) {
        console.error('❌ Error updating subscription:', error)
        toast.error('Error updating subscription status: ' + error.message)
      } else {
        console.log('✅ Database updated successfully:', data)
        
        // Force refresh subscription context to update UI after successful upgrade
        console.log('🔄 Force refreshing subscription context after upgrade...')
        refetchSubscription(true) // Force refresh after upgrade
        
        // Show success message
        toast.success('🎉 Successfully upgraded to Pro! Welcome to Pro features!', {
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('💥 Upgrade success handling error:', error)
      toast.error('Error processing upgrade: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return null // This component doesn't render anything
}