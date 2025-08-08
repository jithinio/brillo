"use client"

import { ReactNode, memo } from "react"
import Link from "next/link"
import { Crown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSubscription } from "@/components/providers/subscription-provider"
import { cn } from "@/lib/utils"

interface ProFeatureGateProps {
  children: ReactNode
  feature: 'invoicing' | 'advanced_analytics' | 'invoice_customization' | 'api_access'
  fallback?: ReactNode
  className?: string
  showUpgrade?: boolean
}

const ProFeatureGateComponent = ({ 
  children, 
  feature, 
  fallback, 
  className,
  showUpgrade = true 
}: ProFeatureGateProps) => {
  const { hasAccess, plan, isLoading } = useSubscription()

  const checkFeatureAccess = () => {
    // During loading, deny access by default for security
    // Only allow access if we have confirmed subscription status
    if (isLoading) return false
    return hasAccess(feature)
  }

  const getFeatureName = () => {
    switch (feature) {
      case 'invoicing':
        return 'Invoicing'
      case 'advanced_analytics':
        return 'Advanced Analytics'
      case 'invoice_customization':
        return 'Invoice Customization'
      case 'api_access':
        return 'API Access'
      default:
        return 'Pro Feature'
    }
  }

  const getFeatureDescription = () => {
    switch (feature) {
      case 'invoicing':
        return 'Create and manage professional invoices.'
      case 'advanced_analytics':
        return 'Get insights into your business performance.'
      case 'invoice_customization':
        return 'Customize invoice templates with your branding.'
      case 'api_access':
        return 'Integrate with your existing tools using our API.'
      default:
        return 'This feature is available on Pro plans.'
    }
  }

  // Show secure loading state - don't show content until we confirm access
  if (isLoading) {
    return (
      <div className={cn("w-full flex items-center justify-center min-h-[calc(100vh-4rem)] p-8", className)}>
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10 w-full max-w-[400px]">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center">
              Checking Access...
            </CardTitle>
            <CardDescription className="text-center max-w-md mx-auto">
              Verifying your subscription status for {getFeatureName().toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (checkFeatureAccess()) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showUpgrade) {
    return null
  }

  return (
    <div className={cn("w-full flex items-center justify-center min-h-[calc(100vh-4rem)] p-4", className)}>
      <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10 w-full max-w-[400px]">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center">
            {getFeatureName()}
          </CardTitle>
          <CardDescription className="text-center max-w-md mx-auto">
            {getFeatureDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            Current Plan: <span className="font-medium">{plan.name}</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <Link href="/pricing">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pricing">
                View Plans
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Start your Pro trial today • No credit card required
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoized version to prevent unnecessary re-renders
export const ProFeatureGate = memo(ProFeatureGateComponent)

// Convenience components for specific features
export function InvoicingGate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ProFeatureGate feature="invoicing" className={className}>
      {children}
    </ProFeatureGate>
  )
}

export function AdvancedAnalyticsGate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ProFeatureGate feature="advanced_analytics" className={className}>
      {children}
    </ProFeatureGate>
  )
}

export function InvoiceCustomizationGate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ProFeatureGate feature="invoice_customization" className={className}>
      {children}
    </ProFeatureGate>
  )
}