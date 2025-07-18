"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  className?: string
}

export function AnimatedNumber({ 
  value, 
  format = (val) => val.toString(),
  className = ""
}: AnimatedNumberProps) {
  const formattedValue = format(value)

  return (
    <span className={className}>
      {formattedValue}
    </span>
  )
}

interface AnimatedMetricCardProps {
  title: string
  current: number
  previous: number
  trend: 'up' | 'down'
  percentage: number
  period: string
  onPeriodChange: (value: string) => void
  formatCurrency: (amount: number) => string
  index?: number
}

export function AnimatedMetricCard({
  title,
  current,
  previous,
  trend,
  percentage,
  period,
  onPeriodChange,
  formatCurrency,
  index = 0
}: AnimatedMetricCardProps) {
  return (
    <div className="relative overflow-hidden border-0 shadow-none bg-card rounded-lg border">
      <div className="p-8 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="h-8 text-xs min-w-0 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {title === 'MRR' ? (
                <>
                  <SelectItem value="current-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="3-months">Last 3 Months</SelectItem>
                </>
              ) : title === 'QRR' ? (
                <>
                  <SelectItem value="current-quarter">This Quarter</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="3-quarters">Last 3 Quarters</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="current-year">This Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="2-years">Last 2 Years</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="px-8 pt-0 pb-8">
        <div className="space-y-1">
          <div className="text-3xl font-normal text-foreground">
            <AnimatedNumber
              value={current}
              format={(value) => formatLargeNumber(value, getCurrencySymbol())}
            />
          </div>
          
          <div className="flex items-center gap-3" style={{ marginTop: '12px' }}>
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              <span className={`text-xs font-normal ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {percentage.toFixed(2)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              vs previous period
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 