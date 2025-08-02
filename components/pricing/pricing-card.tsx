"use client"

import { useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubscriptionPlan } from "@/lib/types/subscription"
import { useSubscription } from "@/components/providers/subscription-provider"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  plan: SubscriptionPlan
  isCurrentPlan?: boolean
  className?: string
}

export function PricingCard({ plan, isCurrentPlan = false, className }: PricingCardProps) {
  const { subscription, upgrade, isLoading } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    if (isCurrentPlan || isLoading) return

    try {
      setIsUpgrading(true)
      await upgrade(plan.id)
    } catch (error) {
      console.error('Upgrade failed:', error)
    } finally {
      setIsUpgrading(false)
    }
  }

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan'
    if (plan.id === 'free') return 'Current Plan'
    if (subscription.status !== 'free') return 'Switch Plan'
    return 'Upgrade to Pro'
  }

  const getButtonVariant = () => {
    if (isCurrentPlan || plan.id === 'free') return 'outline'
    return 'default'
  }

  const isButtonDisabled = isCurrentPlan || isLoading || isUpgrading || plan.id === 'free'

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200",
      plan.popular && "border-primary shadow-lg scale-105",
      className
    )}>
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium py-1 px-3 rounded-bl-lg">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Most Popular
        </div>
      )}
      
      {plan.badge && (
        <div className="absolute top-4 left-4">
          <Badge variant={plan.popular ? "default" : "secondary"}>
            {plan.badge}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 pt-8">
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            ${plan.price}
          </span>
          <span className="text-muted-foreground">
            /{plan.interval}
            {plan.interval === 'year' && (
              <span className="text-sm block">($8/month)</span>
            )}
          </span>
        </div>
        <CardDescription className="text-sm">
          {plan.id === 'free' 
            ? 'Perfect for getting started' 
            : plan.interval === 'year'
            ? 'Best value - Save 2 months!'
            : 'Full access to all Pro features'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            What's Included
          </h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {plan.proFeatures && plan.proFeatures.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm text-primary uppercase tracking-wide">
              Pro Features
            </h4>
            <ul className="space-y-2">
              {plan.proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Limits
          </h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <div className="font-semibold">
                {plan.limits.projects === 'unlimited' ? '∞' : plan.limits.projects}
              </div>
              <div className="text-muted-foreground text-xs">Projects</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <div className="font-semibold">
                {plan.limits.clients === 'unlimited' ? '∞' : plan.limits.clients}
              </div>
              <div className="text-muted-foreground text-xs">Clients</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <div className="font-semibold">
                {plan.limits.invoices === 'unlimited' ? '∞' : plan.limits.invoices === 'none' ? '0' : plan.limits.invoices}
              </div>
              <div className="text-muted-foreground text-xs">Invoices</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          onClick={handleUpgrade}
          disabled={isButtonDisabled}
          variant={getButtonVariant()}
          className="w-full"
          size="lg"
        >
          {isUpgrading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            getButtonText()
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}