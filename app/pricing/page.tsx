"use client"

import { Sparkles, Zap, Shield, HeadphonesIcon } from "lucide-react"
import { PricingCard } from "@/components/pricing/pricing-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getPlansArray, calculateYearlySavings } from "@/lib/subscription-plans"
import { useSubscription } from "@/components/providers/subscription-provider"
import Link from "next/link"

export default function PricingPage() {
  const { subscription } = useSubscription()
  const plans = getPlansArray()
  const yearlySavings = calculateYearlySavings()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <Badge variant="outline" className="text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-2" />
            Simple, Transparent Pricing
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Choose Your
            <span className="text-primary"> Perfect Plan</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include core features with no hidden fees.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                ← Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={subscription.planId === plan.id}
              className="h-full"
            />
          ))}
        </div>

        {/* Savings Callout */}
        {yearlySavings > 0 && (
          <div className="text-center mb-16">
            <Card className="inline-block bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-bold text-lg">Save ${yearlySavings} per year</div>
                    <div className="text-sm text-muted-foreground">with our yearly plan</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Comparison */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Suitebase Pro?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Full Invoicing Suite</h3>
              <p className="text-muted-foreground text-sm">
                Create, customize, and send professional invoices with automated follow-ups and payment tracking.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Deep insights into your business performance with revenue tracking, client analytics, and growth metrics.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Unlimited Everything</h3>
              <p className="text-muted-foreground text-sm">
                No limits on projects, clients, or invoices. Scale your business without worrying about restrictions.
              </p>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens to my data if I cancel?</h3>
              <p className="text-muted-foreground">
                Your data is always safe with us. If you cancel, your account moves to the Free plan and your data is preserved. You can reactivate anytime.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact support for a full refund.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Is my payment information secure?</h3>
              <p className="text-muted-foreground">
                Absolutely. We use Polar for secure payment processing with bank-level encryption. We never store your payment details.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 py-16 border-t">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of businesses already using Suitebase to manage their operations.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Start Free Today
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" asChild>
              <Link href="mailto:support@suitebase.com">
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                Contact Sales
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required • Free forever plan available
          </p>
        </div>
      </div>
    </div>
  )
}