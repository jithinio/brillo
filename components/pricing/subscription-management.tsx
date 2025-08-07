"use client"

import { useState } from "react"
import { Calendar, CreditCard, ExternalLink, Loader2, Package, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useSubscription } from "@/components/providers/subscription-provider"
import { toast } from "sonner"

export function SubscriptionManagement() {
  const { subscription, plan, usage, isLoading, refetchSubscription } = useSubscription()
  const [isManaging, setIsManaging] = useState(false)
  const [isRefreshingUsage, setIsRefreshingUsage] = useState(false)
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

      // Handle portal action differently - fetch portal URL first, then redirect
      if (action === 'portal') {
        
        try {
          const portalResponse = await fetch(`/api/polar/portal?token=${encodeURIComponent(session.access_token)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });



          const portalData = await portalResponse.json();

          if (!portalResponse.ok) {
            console.error('❌ Portal error:', portalData);
            toast.error(portalData.error || 'Failed to create billing portal session');
            return;
          }

          if (portalData.portalUrl) {
            toast.success('Opening billing portal...');
            window.open(portalData.portalUrl, '_blank');
          } else {
            console.error('❌ No portal URL in response:', portalData);
            toast.error('Invalid portal response');
          }
          
          return;
        } catch (error) {
          console.error('❌ Portal error:', error);
          toast.error('Failed to open billing portal');
          return;
        }
      }



      const response = await fetch('/api/polar/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action })
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
          switch (data.code) {
            case 'POLAR_UNAVAILABLE':
            case 'POLAR_UNAUTHORIZED':
              toast.error('Billing services temporarily unavailable. Please try again later.')
              return
            case 'POLAR_NOT_CONFIGURED':
            case 'POLAR_ORG_NOT_FOUND':
            case 'POLAR_CLIENT_ERROR':
              toast.error('Billing system not properly configured. Please contact support.')
              return
            default:
              toast.error(data.details || 'Billing services temporarily unavailable. Please try again later.')
              return
          }
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
      
      // Get auth session
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Authentication required')
        return
      }
      
      // Call sync endpoint
      const response = await fetch('/api/polar/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Sync result:', result)
        
        if (result.synced) {
          toast.success(result.message || 'Subscription data synchronized')
          // Force refresh subscription data after successful sync
          refetchSubscription(true)
        } else {
          toast.info(result.message || 'Subscription data already up to date')
        }
      } else {
        console.error('❌ Sync failed:', result)
        toast.error(result.error || 'Failed to sync subscription data')
      }
      
    } catch (error) {
      console.error('Error syncing subscription:', error)
      toast.error('Failed to sync subscription data')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDate = (date?: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
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
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>Loading subscription information...</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

          {isProPlan && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleManageSubscription('portal')}
                disabled={isManaging || isLoading}
                variant="outline"
                size="sm"
              >
                {isManaging ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Manage Billing
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
              
              <Button
                onClick={handleSyncSubscription}
                disabled={isSyncing || isLoading}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Data
              </Button>

              {(subscription.subscriptionId || isProPlan) ? (
                subscription.cancelAtPeriodEnd ? (
                  // Show Resume button if subscription is canceled
                  <Button
                    onClick={() => handleManageSubscription('resume')}
                    disabled={isManaging || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    {isManaging ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
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
              ) : (
                <div className="text-sm text-muted-foreground">
                  No active subscription to cancel
                </div>
              )}
            </div>
          )}

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

      {/* Usage Statistics */}
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
                <Loader2 className="w-4 h-4 animate-spin" />
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
    </div>
  )
}