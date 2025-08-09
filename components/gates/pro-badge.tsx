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
  const { hasAccess, isLoading, subscription, getCachedPlanId } = useSubscription()
  const [hasMounted, setHasMounted] = useState(false)

  // Track mounting to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // 🚀 INSTANT PRO USER DETECTION - Never show for pro users, no flashing
  const cachedPlanId = getCachedPlanId()
  const isKnownProUser = hasMounted && isProPlan(cachedPlanId)

  const checkFeatureAccess = () => {
    if (!feature) return true // No specific feature, assume access
    
    // For known pro users, instantly grant access
    if (isKnownProUser) {
      return true
    }
    
    return hasAccess(feature)
  }

  // During SSR or before mount, hide to prevent hydration mismatch
  if (!hasMounted) {
    return null
  }

  // INSTANTLY hide for known pro users - no loading needed
  if (isKnownProUser) {
    return null
  }

  // Don't show anything during loading to prevent incorrect badges
  if (isLoading) {
    return null
  }

  // Only hide if user actually has access
  if (checkFeatureAccess()) {
    return null
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
        return 'border-amber-500 text-amber-600 bg-transparent hover:bg-amber-50'
      case 'minimal':
        return 'bg-amber-100 text-amber-700 border-0 hover:bg-amber-200'
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
        'inline-flex items-center gap-1 font-medium transition-colors cursor-default pro-element-badge',
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