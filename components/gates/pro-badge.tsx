"use client"

import { Crown, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSubscription } from "@/components/providers/subscription-provider"
import { isProPlan } from "@/lib/subscription-plans"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface ProBadgeProps {
  feature?: 'invoicing' | 'advanced_analytics' | 'invoice_customization' | 'api_access'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'minimal'
  className?: string
  showTooltip?: boolean
  tooltipContent?: string
}

export function ProBadge({ 
  feature,
  size = 'sm',
  variant = 'default',
  className,
  showTooltip = true,
  tooltipContent
}: ProBadgeProps) {
  // ALWAYS call all hooks first - never conditionally call hooks
  const { subscription, isLoading, hasAccess, getCachedPlanId } = useSubscription()
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Progressive loading effect - only render for confirmed free users
  useEffect(() => {
    if (!isLoading && subscription?.planId) {
      // Only render for confirmed free users
      if (subscription.planId === 'free') {
        setShouldRender(true)
        // Add slight delay for progressive loading effect
        setTimeout(() => setIsVisible(true), 100)
      }
      // For pro users or any other plan, never render
    }
  }, [isLoading, subscription?.planId])

  // Now do all the conditional logic AFTER all hooks are called
  
  // Enhanced check - use cached data to determine if user is pro
  const cachedPlanId = getCachedPlanId()
  const effectivePlanId = subscription?.planId || cachedPlanId
  
  // Early return for pro users (including cached detection)
  if (effectivePlanId && effectivePlanId !== 'free') {
    return null
  }
  
  // Additional cache check in localStorage for pro users
  if (typeof window !== 'undefined') {
    try {
      const allKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('brillo-subscription-') || key.includes('subscription')
      )
      
      for (const key of allKeys) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed = JSON.parse(cached)
            const planId = parsed.planId || parsed.data?.planId
            if (planId === 'pro_monthly' || planId === 'pro_yearly') {
              return null // Don't show pro badge for cached pro users
            }
          }
        } catch (e) {
          // Continue checking other keys
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Don't render anything during loading or for non-free users
  if (!shouldRender) {
    return null
  }

  // Check feature access for free users
  const hasFeatureAccess = feature ? hasAccess(feature) : false
  if (hasFeatureAccess) {
    return null // Don't show badge if user has access to the feature
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 h-5'
      case 'md':
        return 'text-xs px-2 py-1 h-6'
      case 'lg':
        return 'text-sm px-2.5 py-1.5 h-7'
      default:
        return 'text-xs px-1.5 py-0.5 h-5'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600'
      case 'outline':
        return 'border-amber-500 text-amber-600 bg-transparent hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950/20'
      case 'minimal':
        return 'bg-amber-100 text-amber-700 border-0 hover:bg-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50'
      default:
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3'
      case 'md':
        return 'w-3.5 h-3.5'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-3 h-3'
    }
  }

  const getTooltipContent = () => {
    if (tooltipContent) return tooltipContent
    
    if (feature) {
      switch (feature) {
        case 'invoicing':
          return 'Invoicing features require a Pro subscription'
        case 'advanced_analytics':
          return 'Advanced analytics are available on Pro plans'
        case 'invoice_customization':
          return 'Invoice customization requires a Pro subscription'
        case 'api_access':
          return 'API access is available on Pro plans'
        default:
          return 'This feature requires a Pro subscription'
      }
    }
    
    return 'This feature requires a Pro subscription'
  }

  const badge = (
    <Badge 
      className={cn(
        getSizeClasses(),
        getVariantClasses(),
        'inline-flex items-center gap-1 font-medium transition-all cursor-default',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
        'duration-300 ease-out',
        className
      )}
    >
      {variant !== 'minimal' && <Crown className={getIconSize()} />}
      {variant === 'minimal' && <Sparkles className={getIconSize()} />}
      Pro
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Convenience components for specific features
export function InvoicingBadge({ className, ...props }: Omit<ProBadgeProps, 'feature'>) {
  return <ProBadge feature="invoicing" className={className} {...props} />
}

export function AdvancedAnalyticsBadge({ className, ...props }: Omit<ProBadgeProps, 'feature'>) {
  return <ProBadge feature="advanced_analytics" className={className} {...props} />
}

export function InvoiceCustomizationBadge({ className, ...props }: Omit<ProBadgeProps, 'feature'>) {
  return <ProBadge feature="invoice_customization" className={className} {...props} />
}