"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Alert01Icon } from '@hugeicons/core-free-icons'
import Link from "next/link"
import { useSubscription } from "@/components/providers/subscription-provider"

export function OverLimitAlert() {
  const { getOverLimitStatus } = useSubscription()
  const { isOverLimit, restrictions } = getOverLimitStatus()

  if (!isOverLimit || restrictions.length === 0) {
    return null
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <HugeiconsIcon icon={Alert01Icon} className="h-4 w-4 text-amber-600"  />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Account Limit Exceeded
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <div className="space-y-2">
          {restrictions.map((restriction, index) => (
            <p key={index} className="text-sm">
              {restriction}
            </p>
          ))}
          <div className="pt-2">
                          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                <Link href="/pricing">
         
                  Upgrade to Pro
                </Link>
              </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Hook to check if user can perform an action
export function useCanPerformAction() {
  const { canCreate, getOverLimitStatus } = useSubscription()
  
  const canCreateResource = (resource: 'projects' | 'clients' | 'invoices') => {
    return canCreate(resource)
  }
  
  const getActionBlockedReason = (resource: 'projects' | 'clients' | 'invoices') => {
    if (canCreate(resource)) return null
    
    const { restrictions } = getOverLimitStatus()
    return restrictions.find(r => r.toLowerCase().includes(resource)) || 
           `You've reached your ${resource} limit for your current plan.`
  }
  
  return {
    canCreateResource,
    getActionBlockedReason
  }
}