"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarCircleIcon, Calendar01Icon, TradeUpIcon, TradeDownIcon, ArrowUpRight01Icon, ClockIcon, Group01Icon, BarChartIcon } from '@hugeicons/core-free-icons'
import { useChatWidgets } from "../hooks/useChatWidgets"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

export function ChatWidgets() {
  const { revenue, payments, pipeline, isLoading } = useChatWidgets()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* Revenue Widget */}
      <motion.div variants={itemVariants}>
        <Card className="chat-widget relative overflow-hidden group cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HugeiconsIcon icon={DollarCircleIcon} className="h-4 w-4"  />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(revenue.current, revenue.currency)}
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary"
                  className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground"
                >
                  {revenue.trend === 'up' ? (
                    <HugeiconsIcon icon={TradeUpIcon} className="h-3 w-3 mr-1"  />
                  ) : (
                    <HugeiconsIcon icon={TradeDownIcon} className="h-3 w-3 mr-1"  />
                  )}
                  {revenue.percentage}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            </div>
            
            {/* Hover Action */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-4 w-4 text-muted-foreground"  />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Payments Widget */}
      <motion.div variants={itemVariants}>
        <Card className="chat-widget relative overflow-hidden group cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(payments.amount, payments.currency)}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={ClockIcon} className="h-3 w-3 mr-1"  />
                  {payments.dueCount} due
                </Badge>
                {payments.overdueCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
                    {payments.overdueCount} overdue
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Next payment in {payments.nextDueIn} days
              </div>
            </div>
            
            {/* Hover Action */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-4 w-4 text-muted-foreground"  />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pipeline Value Widget */}
      <motion.div variants={itemVariants}>
        <Card className="chat-widget relative overflow-hidden group cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HugeiconsIcon icon={BarChartIcon} className="h-4 w-4"  />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(pipeline.totalValue, pipeline.currency)}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={Group01Icon} className="h-3 w-3 mr-1"  />
                  {pipeline.activeDeals} deals
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {pipeline.conversionRate}% close rate
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {pipeline.hotLeads} hot leads this week
              </div>
            </div>
            
            {/* Hover Action */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-4 w-4 text-muted-foreground"  />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
