"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatLargeNumber } from "@/lib/utils"
import { formatCurrency, getCurrencySymbol } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"
import type { AnalyticsResult } from "@/lib/analytics-calculations"

interface MetricCardProps {
  title: string
  value: number
  trend?: {
    direction: 'up' | 'down'
    percentage: number
    label?: string
  }
  icon?: React.ComponentType<{ className?: string }>
  isLoading?: boolean
  error?: string | null
  formatValue?: (value: number) => string
  period?: string
  onPeriodChange?: (period: string) => void
  periodOptions?: Array<{ value: string; label: string }>
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'currency' | 'percentage' | 'number'
  sparklineData?: Array<{ value: number; label: string }>
}

const MetricCard = ({
  title,
  value,
  trend,
  icon: Icon,
  isLoading = false,
  error = null,
  formatValue,
  period,
  onPeriodChange,
  periodOptions,
  subtitle,
  size = 'md',
  variant = 'default',
  sparklineData
}: MetricCardProps) => {
  const { formatCurrency: settingsFormatCurrency } = useSettings()

  // Format value based on variant
  const getFormattedValue = (val: number) => {
    if (formatValue) return formatValue(val)
    
    switch (variant) {
      case 'currency':
        return formatLargeNumber(val, getCurrencySymbol())
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
        return val.toLocaleString()
      default:
        return val.toString()
    }
  }

  // Size-based styling
  const sizeStyles = {
    sm: {
      card: "min-h-[120px]",
      header: "p-4 pb-2",
      content: "px-4 pt-0 pb-4",
      title: "text-xs",
      value: "text-lg",
      icon: "h-3 w-3"
    },
    md: {
      card: "min-h-[140px]",
      header: "p-6 pb-3",
      content: "px-6 pt-0 pb-6",
      title: "text-sm",
      value: "text-2xl",
      icon: "h-4 w-4"
    },
    lg: {
      card: "min-h-[180px]",
      header: "p-8 pb-4",
      content: "px-8 pt-0 pb-8",
      title: "text-base",
      value: "text-4xl",
      icon: "h-5 w-5"
    }
  }

  const styles = sizeStyles[size]

  if (error) {
    return (
      <Card className={`relative overflow-hidden border bg-transparent ${styles.card}`}>
        <CardHeader className={styles.header}>
          <CardTitle className={`${styles.title} font-medium text-muted-foreground`}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={styles.content}>
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-destructive">Error loading data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`relative overflow-hidden border bg-transparent transition-all hover:shadow-sm h-full flex flex-col ${styles.card}`}>
      <CardHeader className={styles.header}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`${styles.icon} text-muted-foreground`} />}
            <CardTitle className={`${styles.title} font-medium text-muted-foreground`}>
              {title}
            </CardTitle>
          </div>
          {period && onPeriodChange && periodOptions && (
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-7 text-xs min-w-0 w-auto rounded-lg shadow-xs border-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardHeader>
      
      <CardContent className={`${styles.content} flex-1`}>
        <div className="flex flex-col h-full">
          {/* Main Value and Trend Section */}
          <div className="space-y-2">
            {isLoading ? (
              <Skeleton className={`h-8 w-32 ${size === 'lg' ? 'h-12 w-40' : size === 'sm' ? 'h-6 w-24' : ''}`} />
            ) : (
              <div className={`${styles.value} font-normal text-foreground transition-all`}>
                {getFormattedValue(value)}
              </div>
            )}
            
            {/* Trend Information */}
            {trend && !isLoading && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs font-normal ${
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.percentage.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {trend.label || 'vs previous period'}
                </span>
              </div>
            )}
            
            {isLoading && (
              <Skeleton className="h-4 w-28" />
            )}
          </div>

          {/* Mini Sparkline Chart - Fills remaining space */}
          {sparklineData && sparklineData.length > 0 && !isLoading && (
            <div className="relative flex-1 overflow-hidden mt-3 min-h-[40px] max-h-[80px] -mx-6 -mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 32" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--chart-1))', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--chart-1))', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                
                {/* Create path for sparkline */}
                <path
                  d={sparklineData.reduce((path, point, index) => {
                    const x = (index / (sparklineData.length - 1)) * 100
                    const maxValue = Math.max(...sparklineData.map(p => p.value))
                    const minValue = Math.min(...sparklineData.map(p => p.value))
                    const range = maxValue - minValue || 1
                    const y = 28 - ((point.value - minValue) / range) * 24
                    
                    return path + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
                  }, '')}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth="2"
                  fill="none"
                />
                
                {/* Fill area under the line */}
                <path
                  d={sparklineData.reduce((path, point, index) => {
                    const x = (index / (sparklineData.length - 1)) * 100
                    const maxValue = Math.max(...sparklineData.map(p => p.value))
                    const minValue = Math.min(...sparklineData.map(p => p.value))
                    const range = maxValue - minValue || 1
                    const y = 28 - ((point.value - minValue) / range) * 24
                    
                    if (index === 0) return `M ${x} 32 L ${x} ${y}`
                    if (index === sparklineData.length - 1) return path + ` L ${x} ${y} L ${x} 32 Z`
                    return path + ` L ${x} ${y}`
                  }, '')}
                  fill={`url(#gradient-${title})`}
                />
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton for metric card
export const MetricCardSkeleton = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeStyles = {
    sm: { card: "min-h-[120px]", header: "p-4 pb-2", content: "px-4 pt-0 pb-4" },
    md: { card: "min-h-[140px]", header: "p-6 pb-3", content: "px-6 pt-0 pb-6" },
    lg: { card: "min-h-[180px]", header: "p-8 pb-4", content: "px-8 pt-0 pb-8" }
  }

  const styles = sizeStyles[size]

  return (
    <Card className={`relative overflow-hidden border bg-transparent ${styles.card}`}>
      <CardHeader className={styles.header}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className={styles.content}>
        <div className="space-y-3">
          <Skeleton className={`h-8 w-32 ${size === 'lg' ? 'h-12 w-40' : size === 'sm' ? 'h-6 w-24' : ''}`} />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

// Utility function to create analytics result from MetricCard props
export const createAnalyticsResult = (current: number, previous: number): AnalyticsResult => {
  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

export default MetricCard 