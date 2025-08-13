"use client"

import { useState } from "react"
import { Calendar, CreditCard, ExternalLink, Package, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useSubscription } from "@/components/providers/subscription-provider"
import { toast } from "sonner"
import { SubscriptionSkeleton } from "@/components/subscription/subscription-skeleton"

export function SubscriptionManagement() {
  const { subscription, plan, usage, isLoading, refetchSubscription, getCachedPlanId, provider } = useSubscription()
  const [isManaging, setIsManaging] = useState(false)
  const [isRefreshingUsage, setIsRefreshingUsage] = useState(false)
  
  // Check if user is on Pro plan (defensive check)
  const isPro = subscription.planId === 'pro_monthly' || subscription.planId === 'pro_yearly'
  const [isSyncing, setIsSyncing] = useState(false)

  const handleManageSubscription = async (action: 'cancel' | 'portal' | 'resume') => {
    try {
      setIsManaging(true)
      
      // Get authentication token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      

      
      if (!session) {
        throw new Error('Authentication required')
      }
      
      // Get user ID from session
      const userId = session.user?.id
      if (!userId) {
        toast.error('User information not found. Please log in again.')
        return
      }

      // Handle portal action separately - return early
      if (action === 'portal') {
        const portalEndpoint = provider === 'polar' ? '/api/polar/manage' : '/api/stripe/manage'
        const response = await fetch(portalEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'portal', userId })
        })

        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || 'Failed to create billing portal session')
          return
        }

        if (data.portalUrl) {
          toast.success('Opening billing portal...')
          // For Polar, we need to pass the auth token as a query parameter
          if (provider === 'polar') {
            const portalUrlWithToken = data.portalUrl + '?token=' + encodeURIComponent(session.access_token)
            window.open(portalUrlWithToken, '_blank')
          } else {
            window.open(data.portalUrl, '_blank')
          }
        }
        return
      }

      const endpoint = provider === 'polar' ? '/api/polar/manage' : '/api/stripe/manage'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action, userId })
      })
      
      console.log('🔍 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes with more detailed messages
        if (response.status === 503) {
          toast.error('Stripe services temporarily unavailable. Please try again later.')
          return
        }
        
        if (response.status === 401) {
          toast.error('Authentication expired. Please log in again.')
          return
        }
        
        if (response.status === 404) {
          toast.error('No subscription found. You may need to subscribe first.')
          return
        }
        
        // Show detailed error message if available
        const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to manage subscription')
        throw new Error(errorMessage)
      }



      toast.success(data.message || 'Subscription updated successfully')
      
      // Force refresh subscription data after successful action
      setTimeout(() => {
        // Force refresh for subscription state changes (cancel/resume) to clear cache
        const needsForceRefresh = ['cancel', 'resume'].includes(action)
        refetchSubscription(needsForceRefresh) // Force refresh for state changes
      }, 500)

    } catch (error) {
      console.error('Subscription management error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to manage subscription')
    } finally {
      setIsManaging(false)
    }
  }

  const handleRefreshUsage = async () => {
    try {
      setIsRefreshingUsage(true)
      refetchSubscription(false) // Normal refresh when user explicitly requests it
      toast.success('Usage data refreshed')
    } catch (error) {
      console.error('Error refreshing usage:', error)
      toast.error('Failed to refresh usage data')
    } finally {
      setIsRefreshingUsage(false)
    }
  }

  const handleSyncSubscription = async () => {
    try {
      setIsSyncing(true)
      console.log('🔄 Manual subscription sync requested')
      
      // Get auth session using the shared supabase client
      const { supabase } = await import('@/lib/supabase')
      
      // Get current session and refresh if needed
      let { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (!session?.access_token || sessionError) {
        console.log('🔄 Session invalid or missing, attempting refresh...')
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError)
          toast.error('Authentication expired. Please log in again.')
          return
        }
        
        session = refreshData.session
        console.log('✅ Session refreshed successfully')
      }
      
      // Get user ID from session
      const userId = session.user?.id
      if (!userId) {
        console.error('❌ No user ID found in session')
        toast.error('User information not found. Please log in again.')
        return
      }
      
      // Call sync endpoint (Polar or Stripe based on provider)
      const syncUrl = provider === 'polar' ? '/api/polar/sync' : '/api/stripe/sync'
      console.log('🔄 Making sync request to:', syncUrl)
      console.log('🔄 Auth token (first 50 chars):', session.access_token.substring(0, 50))
      console.log('🔄 Current URL:', window.location.href)
      console.log('🔄 Provider:', provider)
      console.log('🔄 User ID:', userId)
      
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })
      
      console.log('🔍 Sync response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      let result: any = {}
      let responseText = ''
      
      try {
        // First get the raw response text for debugging
        responseText = await response.text()
        console.log('🔍 Raw response text (length:', responseText.length, '):', responseText.substring(0, 500))
        
        // Try to parse as JSON
        if (responseText.trim()) {
          result = JSON.parse(responseText)
          console.log('📋 Parsed result:', result)
        } else {
          console.error('❌ Empty response body')
          result = { 
            error: 'Empty response', 
            message: 'Server returned empty response body',
            synced: false 
          }
        }
      } catch (parseError) {
        console.error('❌ Failed to parse sync response:', parseError)
        console.error('❌ Response text was:', responseText.substring(0, 200))
        result = { 
          error: 'Invalid response', 
          message: `Server returned invalid JSON response. Status: ${response.status}`,
          synced: false,
          rawResponse: responseText.substring(0, 200)
        }
      }
      
      if (response.ok) {
        console.log('✅ Sync result:', result)
        
        if (result.synced) {
          // Show appropriate success message based on plan
          if (result.planId && result.planId !== 'free') {
            toast.success(result.message || `Successfully synced your ${result.planId.replace('_', ' ')} subscription!`)
          } else {
            toast.success(result.message || 'Subscription data synchronized successfully')
          }
          
          console.log('✅ Sync successful, refreshing subscription data...')
          // Force refresh subscription data after successful sync
          try {
            refetchSubscription(true)
          } catch (refetchError) {
            console.warn('⚠️ Error during subscription refetch (non-critical):', refetchError)
            // Don't fail the entire sync operation if refetch fails
          }
        } else {
          // Show info message for when no subscription is found
          console.log('ℹ️ No subscription found during sync')
          toast.info(result.message || 'No subscription found')
        }
      } else {
        console.error('❌ Sync failed with status:', response.status, response.statusText)
        console.error('❌ Response details:', { 
          status: response.status, 
          statusText: response.statusText,
          responseTextLength: responseText.length,
          responseText: responseText.substring(0, 500), // First 500 chars for debugging
          parsedResult: result,
          resultKeys: Object.keys(result || {}),
          url: '/api/stripe/sync',
          method: 'POST'
        })
        
        // Handle specific error cases
        let errorMessage = 'Failed to sync subscription data'
        
        if (response.status === 503) {
          errorMessage = 'Stripe services are temporarily unavailable. Please try again later.'
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.'
        } else if (response.status === 404) {
          errorMessage = result.message || 'No subscription found. You haven\'t subscribed yet.'
        } else if (response.status === 500) {
          errorMessage = result.details ? `${result.error}: ${result.details}` : 'Stripe sync failed. Please try again.'
        } else if (result.error) {
          errorMessage = result.message || result.error
        } else if (Object.keys(result).length === 0) {
          errorMessage = `Server returned empty response (${response.status}). Please try again.`
        } else {
          errorMessage = result.message || `Sync failed with status ${response.status}`
        }
        
        toast.error(errorMessage)
      }
      
    } catch (error) {
      console.error('Error syncing subscription:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to sync subscription data'
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else {
          errorMessage = `Sync error: ${error.message}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDate = (date?: Date | string | null) => {
    if (!date) return 'N/A'
    
    try {
      // Handle both Date objects and date strings
      const dateObj = date instanceof Date ? date : new Date(date)
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatDate:', date)
        return 'N/A'
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj)
    } catch (error) {
      console.warn('Error formatting date:', error, 'Date value:', date)
      return 'N/A'
    }
  }

  const getStatusBadge = () => {
    switch (subscription.planId) {
      case 'pro_monthly':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Pro Monthly</Badge>
      case 'pro_yearly':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Pro Yearly</Badge>
      default:
        return <Badge variant="secondary">Free Plan</Badge>
    }
  }

  const isFreePlan = subscription.planId === 'free'
  const isProPlan = subscription.planId === 'pro_monthly' || subscription.planId === 'pro_yearly'



  // Show loading state if subscription data is not available
  if (isLoading) {
    // Use cached plan ID to determine if user is likely Pro (don't show usage overview for Pro users)
    const cachedPlanId = getCachedPlanId()
    const isLikelyPro = cachedPlanId === 'pro_monthly' || cachedPlanId === 'pro_yearly'
    return <SubscriptionSkeleton showUsageOverview={!isLikelyPro} />
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Plan</div>
              <div className="text-lg font-semibold">{plan.name}</div>
            </div>
            {!isFreePlan && (
              <>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Price</div>
                  <div className="text-lg font-semibold">
                    ${plan.price}/{plan.interval}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Next Billing</div>
                  <div className="text-lg font-semibold">
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              {isProPlan && (
                <Button
                  onClick={() => handleManageSubscription('portal')}
                  disabled={isManaging || isLoading}
                  variant="outline"
                  size="sm"
                >
                  {isManaging ? (
                    <Loader size="sm" variant="default" className="mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}

              {isProPlan && (subscription.subscriptionId || isProPlan) && (
                subscription.cancelAtPeriodEnd ? (
                  // Show Resume button if subscription is canceled
                  <Button
                    onClick={() => handleManageSubscription('resume')}
                    disabled={isManaging || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    {isManaging ? (
                      <Loader size="sm" variant="default" className="mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Resume Subscription
                  </Button>
                ) : (
                  // Show Cancel button if subscription is active
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isManaging || isLoading}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your subscription? 
                        <br /><br />
                        • Your subscription will remain active until {formatDate(subscription.currentPeriodEnd)}
                        <br />
                        • You'll lose access to Pro features after the current period ends
                        <br />
                        • Your data will be preserved and you can resubscribe anytime
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleManageSubscription('cancel')}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            )}
            </div>
            
            {/* Sync button positioned at the right end */}
            <Button
              onClick={handleSyncSubscription}
              disabled={isSyncing || isLoading}
              variant="outline"
              size="sm"
            >
              {isSyncing ? (
                <Loader size="sm" variant="default" className="mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Data
            </Button>
          </div>

          {isFreePlan && (
            <div className="pt-4 border-t">
              <Button asChild>
                <a href="/pricing">
                  <Package className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics - Only show for free users */}
      {!isPro && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Usage Overview
                </CardTitle>
                <CardDescription>Current usage against your plan limits</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshUsage}
                disabled={isRefreshingUsage || isLoading}
              >
                {isRefreshingUsage ? (
                  <Loader size="sm" variant="default" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Projects</span>
                <span className="font-medium">
                  {usage.projects.current}/{usage.projects.limit === 'unlimited' ? '∞' : usage.projects.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.projects.limit === 'unlimited' ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{
                    width: usage.projects.limit === 'unlimited' 
                      ? '100%' 
                      : `${Math.min((usage.projects.current / (usage.projects.limit as number)) * 100, 100)}%`
                  }}
                />
              </div>
              {usage.projects.limit === 'unlimited' && (
                <p className="text-xs text-green-600 dark:text-green-400">Unlimited projects</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clients</span>
                <span className="font-medium">
                  {usage.clients.current}/{usage.clients.limit === 'unlimited' ? '∞' : usage.clients.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.clients.limit === 'unlimited' ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{
                    width: usage.clients.limit === 'unlimited' 
                      ? '100%' 
                      : `${Math.min((usage.clients.current / (usage.clients.limit as number)) * 100, 100)}%`
                  }}
                />
              </div>
              {usage.clients.limit === 'unlimited' && (
                <p className="text-xs text-green-600 dark:text-green-400">Unlimited clients</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Invoices</span>
                <span className="font-medium">
                  {usage.invoices.current}/{usage.invoices.limit === 'unlimited' ? '∞' : usage.invoices.limit === 'none' ? '0' : usage.invoices.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.invoices.limit === 'none' 
                      ? 'bg-muted-foreground' 
                      : usage.invoices.limit === 'unlimited'
                      ? 'bg-green-500'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: usage.invoices.limit === 'unlimited' 
                      ? '100%' 
                      : usage.invoices.limit === 'none'
                      ? '100%'
                      : `${Math.min((usage.invoices.current / (usage.invoices.limit as number)) * 100, 100)}%`
                  }}
                />
              </div>
              {usage.invoices.limit === 'none' && (
                <p className="text-xs text-muted-foreground">Upgrade to Pro to unlock invoicing</p>
              )}
              {usage.invoices.limit === 'unlimited' && (
                <p className="text-xs text-green-600 dark:text-green-400">Unlimited invoices</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}