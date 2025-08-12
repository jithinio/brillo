"use client"

import { useState } from "react"
import { Check, Crown, FileText, BarChart3, Palette, Zap, Users, CreditCard, ArrowLeft, ChevronDown, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useSubscription } from "@/components/providers/subscription-provider"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function PricingPage() {
  const { subscription, upgrade, isLoading } = useSubscription()
  const [isYearly, setIsYearly] = useState(true) // Default to yearly
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: { monthly: 0, yearly: 0 },
      features: [
        { icon: Users, text: 'Up to 10 clients' },
        { icon: FileText, text: 'Up to 20 projects' },
        { icon: BarChart3, text: 'Basic reporting' },
      ],
      limitations: [
        'No invoicing',
        'Basic support'
      ],
      buttonText: 'Start Free',
      popular: false
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      description: 'Everything you need to grow',
      price: { monthly: 10, yearly: 96 }, // $8/month when billed yearly
      features: [
        { icon: Users, text: 'Unlimited clients' },
        { icon: FileText, text: 'Unlimited projects' },
        { icon: CreditCard, text: 'Full invoicing suite', pro: true },
        { icon: Palette, text: 'Custom invoice templates', pro: true },
        { icon: BarChart3, text: 'Advanced analytics', pro: true },
        { icon: Zap, text: 'API access', pro: true },
      ],
      buttonText: 'Upgrade to Pro',
      popular: true
    }
  ]

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return
    
    try {
      const finalPlanId = isYearly ? 'pro_yearly' : 'pro_monthly'
      await upgrade(finalPlanId)
    } catch (error) {
      console.error('Upgrade failed:', error)
    }
  }

  const yearlyDiscount = Math.round(((10 * 12 - 96) / (10 * 12)) * 100)

  const AnimatedNumber = ({ value, duration = 0.3 }: { value: number; duration?: number }) => {
    const valueString = value.toString()
    
    return (
      <span className="inline-block relative">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 40,
              duration: 0.15
            }}
            className="inline-block"
          >
            {valueString}
          </motion.span>
        </AnimatePresence>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[1200px] flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
                            <span className="font-semibold text-lg">Brillo</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="mailto:support@brillo.so" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-6 mb-12 sm:mb-16">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
              Choose the plan that's right for your business
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="relative flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <span className="text-sm font-medium">Monthly</span>
            <motion.div
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Switch 
                checked={isYearly} 
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-500 data-[state=checked]:to-orange-500"
              />
            </motion.div>
            <span className="text-sm font-medium">Yearly</span>
            
            {/* Responsive positioned badge */}
            <AnimatePresence mode="wait">
              {isYearly && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute left-1/2 ml-24 sm:ml-28"
                >
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs whitespace-nowrap shadow-lg">
                    Save {yearlyDiscount}%
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-20 sm:mb-32">
          {plans.map((plan) => {
            const price = isYearly ? plan.price.yearly : plan.price.monthly
            const isCurrentPlan = subscription.planId === plan.id || 
              (subscription.planId === 'pro_yearly' && plan.id === 'pro_monthly')
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative flex flex-col transition-all duration-200 hover:shadow-lg dark:hover:shadow-2xl",
                  plan.popular && "border-2 border-amber-500 shadow-md dark:shadow-lg",
                  // Mobile order: Pro card first, Free card second
                  plan.id === 'pro_monthly' && "order-1 md:order-2",
                  plan.id === 'free' && "order-2 md:order-1"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 shadow-lg">
                      <Crown className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-left pb-4 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="mt-4"
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold">
                          $<AnimatePresence mode="wait">
                            <AnimatedNumber key={`${price}-${isYearly}`} value={price} />
                          </AnimatePresence>
                        </span>
                        <motion.span 
                          key={isYearly ? 'year' : 'month'}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm sm:text-base text-muted-foreground"
                        >
                          {price > 0 ? `/${isYearly ? 'year' : 'month'}` : ''}
                        </motion.span>
                      </div>
                      
                      {/* Right side billing info */}
                      <AnimatePresence>
                        {isYearly && price > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="text-right min-w-fit"
                          >
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              $<AnimatedNumber key={`monthly-${Math.round(price / 12)}`} value={Math.round(price / 12)} duration={0.3} />/m billed annually
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          feature.pro 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                            : "bg-green-100 dark:bg-green-900"
                        )}>
                          <Check className={cn(
                            "w-3 h-3",
                            feature.pro ? "text-white" : "text-green-600 dark:text-green-400"
                          )} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{feature.text}</span>
                          {feature.pro && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-400"
                            >
                              Pro
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Limitations */}
                  {plan.limitations && (
                    <div className="pt-4 border-t space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs">×</span>
                          </div>
                          {limitation}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1"></div>

                  {/* Button */}
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan || isLoading}
                    size="lg"
                    className={cn(
                      "w-full mt-auto min-h-[44px] transition-all duration-200",
                      plan.popular && !isCurrentPlan && 
                      "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg hover:shadow-xl"
                    )}
                    variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                  >
                    {isCurrentPlan ? "Current Plan" : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto max-w-[800px] border border-border rounded-lg p-4 sm:p-8 bg-card/50 backdrop-blur-sm">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold">Frequently asked questions</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 px-4 sm:px-0">Everything you need to know about our pricing</p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                id: 'plans',
                question: 'Can I change plans anytime?',
                answer: 'Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.'
              },
              {
                id: 'data',
                question: 'What happens to my data if I cancel?',
                answer: 'Your data is preserved when you cancel. Your account moves to the Free plan and you can reactivate anytime.'
              },
              {
                id: 'refunds',
                question: 'Do you offer refunds?',
                answer: 'We offer a 30-day money-back guarantee for all paid plans. Contact support for a full refund if not satisfied.'
              },
              {
                id: 'security',
                question: 'Is my payment information secure?',
                answer: 'Yes. We use Polar for secure payment processing with bank-level encryption. We never store your payment details.'
              },
              {
                id: 'limits',
                question: 'What are the limits on the Free plan?',
                answer: 'The Free plan includes up to 10 clients, 20 projects, and basic reporting. Invoicing features require a Pro subscription.'
              },
              {
                id: 'support',
                question: 'What kind of support do you provide?',
                answer: 'Free users get community support, while Pro users receive priority email support with faster response times and dedicated assistance.'
              }
            ].map((faq) => (
              <Card key={faq.id} className="border border-border rounded-xl overflow-hidden bg-card/80 hover:bg-card transition-colors">
                <button
                  onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                  className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors min-h-[60px]"
                >
                  <h3 className="font-semibold text-sm sm:text-base pr-4">{faq.question}</h3>
                  <motion.div
                    animate={{ rotate: openFAQ === faq.id ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFAQ === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border/50">
                        <p className="text-sm text-muted-foreground pt-4 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}