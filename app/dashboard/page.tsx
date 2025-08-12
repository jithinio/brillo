"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, LabelList, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, Calendar, DollarSign, CalendarIcon, RefreshCw, AlertCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns"

import { formatCurrency, getCurrencySymbol } from "@/lib/currency"
import { formatLargeNumber } from "@/lib/utils"
import { useSettings } from "@/components/settings-provider"
import { UpgradeSuccessHandler } from "@/components/upgrade-success-handler"
import { useAuth } from "@/components/auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardData, type DashboardProject } from "@/hooks/use-unified-projects"
import { PageHeader } from "@/components/page-header"


// Re-export type for compatibility
type Project = DashboardProject

// Removed fetchProjects - now handled by useDashboardData hook

const calculateMRR = (projects: Project[], period: string): { current: number; previous: number; trend: 'up' | 'down'; percentage: number } => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'current-month':
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
      break
    case 'last-month':
      currentStart = startOfMonth(subMonths(now, 1))
      currentEnd = endOfMonth(subMonths(now, 1))
      previousStart = startOfMonth(subMonths(now, 2))
      previousEnd = endOfMonth(subMonths(now, 2))
      break
    case '3-months':
      currentStart = startOfMonth(subMonths(now, 2))
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 5))
      previousEnd = endOfMonth(subMonths(now, 3))
      break
    default:
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
  }

  const currentProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= currentStart && projectDate <= currentEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const previousProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= previousStart && projectDate <= previousEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const current = currentProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)
  
  const previous = previousProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

const calculateQRR = (projects: Project[], period: string): { current: number; previous: number; trend: 'up' | 'down'; percentage: number } => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'current-quarter':
      currentStart = startOfQuarter(now)
      currentEnd = endOfQuarter(now)
      previousStart = startOfQuarter(subQuarters(now, 1))
      previousEnd = endOfQuarter(subQuarters(now, 1))
      break
    case 'last-quarter':
      currentStart = startOfQuarter(subQuarters(now, 1))
      currentEnd = endOfQuarter(subQuarters(now, 1))
      previousStart = startOfQuarter(subQuarters(now, 2))
      previousEnd = endOfQuarter(subQuarters(now, 2))
      break
    case '3-quarters':
      currentStart = startOfQuarter(subQuarters(now, 2))
      currentEnd = endOfQuarter(now)
      previousStart = startOfQuarter(subQuarters(now, 5))
      previousEnd = endOfQuarter(subQuarters(now, 3))
      break
    default:
      currentStart = startOfQuarter(now)
      currentEnd = endOfQuarter(now)
      previousStart = startOfQuarter(subQuarters(now, 1))
      previousEnd = endOfQuarter(subQuarters(now, 1))
  }

  const currentProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= currentStart && projectDate <= currentEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const previousProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= previousStart && projectDate <= previousEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const current = currentProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)
  
  const previous = previousProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

const calculateARR = (projects: Project[], period: string): { current: number; previous: number; trend: 'up' | 'down'; percentage: number } => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'current-year':
      currentStart = startOfYear(now)
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = endOfYear(subYears(now, 1))
      break
    case 'last-year':
      currentStart = startOfYear(subYears(now, 1))
      currentEnd = endOfYear(subYears(now, 1))
      previousStart = startOfYear(subYears(now, 2))
      previousEnd = endOfYear(subYears(now, 2))
      break
    case '2-years':
      // Last 2 years: compare last 2 years vs previous 2 years
      currentStart = startOfYear(subYears(now, 1))
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 3))
      previousEnd = endOfYear(subYears(now, 1))
      break
    default:
      currentStart = startOfYear(now)
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = endOfYear(subYears(now, 1))
  }

  const currentProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= currentStart && projectDate <= currentEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const previousProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= previousStart && projectDate <= previousEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const current = currentProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)
  
  const previous = previousProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

const calculateRevenueData = (projects: Project[], period: string): { current: number; previous: number; trend: 'up' | 'down'; percentage: number } => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'this-year':
      currentStart = startOfYear(now)
      currentEnd = now
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = subYears(now, 1)
      break
    case 'monthly':
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
      break
    case 'quarterly':
      currentStart = startOfQuarter(now)
      currentEnd = endOfQuarter(now)
      previousStart = startOfQuarter(subQuarters(now, 1))
      previousEnd = endOfQuarter(subQuarters(now, 1))
      break
    case 'last-year':
      currentStart = startOfYear(subYears(now, 1))
      currentEnd = endOfYear(subYears(now, 1))
      previousStart = startOfYear(subYears(now, 2))
      previousEnd = endOfYear(subYears(now, 2))
      break
    default:
      currentStart = startOfYear(now)
      currentEnd = now
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = subYears(now, 1)
  }

  const currentProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= currentStart && projectDate <= currentEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const previousProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= previousStart && projectDate <= previousEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const current = currentProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)
  
  const previous = previousProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use total_budget as primary, budget as fallback, then revenue, then 0
      amount = project.total_budget || project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

const calculateExpensesData = (projects: Project[], period: string): { current: number; previous: number; trend: 'up' | 'down'; percentage: number } => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'this-year':
      currentStart = startOfYear(now)
      currentEnd = now
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = subYears(now, 1)
      break
    case 'monthly':
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
      break
    case 'quarterly':
      currentStart = startOfQuarter(now)
      currentEnd = endOfQuarter(now)
      previousStart = startOfQuarter(subQuarters(now, 1))
      previousEnd = endOfQuarter(subQuarters(now, 1))
      break
    case 'last-year':
      currentStart = startOfYear(subYears(now, 1))
      currentEnd = endOfYear(subYears(now, 1))
      previousStart = startOfYear(subYears(now, 2))
      previousEnd = endOfYear(subYears(now, 2))
      break
    default:
      currentStart = startOfYear(now)
      currentEnd = now
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = subYears(now, 1)
  }

  const currentProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= currentStart && projectDate <= currentEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const previousProjects = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= previousStart && projectDate <= previousEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
  })

  const current = currentProjects.reduce((sum, project) => {
    // Use expenses field, fallback to 0
    const amount = project.expenses || 0
    return sum + amount
  }, 0)
  const previous = previousProjects.reduce((sum, project) => {
    // Use expenses field, fallback to 0
    const amount = project.expenses || 0
    return sum + amount
  }, 0)

  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

const generateRevenueLineData = (projects: Project[]): Array<{ month: string; revenue: number; expenses: number }> => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentYear = new Date().getFullYear()
  
  return months.map((month, index) => {
    const monthStart = new Date(currentYear, index, 1)
    const monthEnd = new Date(currentYear, index + 1, 0)
    
    const monthProjects = projects.filter(project => {
      const projectDate = new Date(project.start_date || project.created_at)
      return projectDate >= monthStart && projectDate <= monthEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
    })
    
    const revenue = monthProjects.reduce((sum, project) => {
      let amount = 0
      
      // For on hold and canceled projects, use received amount as budget
      if (project.status === 'on hold' || project.status === 'canceled') {
        amount = project.payment_received || 0
      } else {
        // Use total_budget as primary, budget as fallback, then revenue, then 0
        amount = project.total_budget || project.budget || project.revenue || 0
      }
      
      return sum + amount
    }, 0)
    
    const expenses = monthProjects.reduce((sum, project) => {
      // Use expenses field, fallback to 0
      const amount = project.expenses || 0
      return sum + amount
    }, 0)
    
    return { month, revenue, expenses }
  })
}

const generateYearlyData = (projects: Project[]): Array<{ year: string; revenue: number; expenses: number }> => {
  // Get all unique years from project data
  const yearSet = new Set<number>()
  
  projects.forEach(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    yearSet.add(projectDate.getFullYear())
  })
  
  // Convert to array and sort
  const years = Array.from(yearSet).sort()
  
  // If no projects or only current year, show at least current year and previous year
  if (years.length === 0) {
    const currentYear = new Date().getFullYear()
    years.push(currentYear - 1, currentYear)
  } else if (years.length === 1) {
    years.unshift(years[0] - 1) // Add previous year
  }
  
  return years.map(year => {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    
    const yearProjects = projects.filter(project => {
      const projectDate = new Date(project.start_date || project.created_at)
      return projectDate >= yearStart && projectDate <= yearEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
    })
    
    const revenue = yearProjects.reduce((sum, project) => {
      let amount = 0
      
      // For on hold and canceled projects, use received amount as budget
      if (project.status === 'on hold' || project.status === 'canceled') {
        amount = project.payment_received || 0
      } else {
        // Use total_budget as primary, budget as fallback, then revenue, then 0
        amount = project.total_budget || project.budget || project.revenue || 0
      }
      
      return sum + amount
    }, 0)
    
    const expenses = yearProjects.reduce((sum, project) => {
      // Use expenses field, fallback to 0
      const amount = project.expenses || 0
      return sum + amount
    }, 0)
    
    return { year: year.toString(), revenue, expenses }
  })
}

// Chart configurations
const miniChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
}

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
}

const yearlyChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
}

const MetricCard = ({ 
  title, 
  current, 
  previous, 
  trend, 
  percentage, 
  period,
  onPeriodChange,
  formatCurrency,
  isLoading = false
}: {
  title: string
  current: number
  previous: number
  trend: 'up' | 'down'
  percentage: number
  period: string
  onPeriodChange: (value: string) => void
  formatCurrency: (amount: number) => string
  isLoading?: boolean
}) => (
  <Card className="relative overflow-hidden transition-all hover:shadow-sm h-full flex flex-col min-h-[140px]">
    <CardHeader className="p-6 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground min-w-0 w-auto">
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
    </CardHeader>
    <CardContent className="px-6 pt-0 pb-6 flex-1">
      <div className="flex flex-col h-full">
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-2xl font-normal text-foreground transition-all">
              {formatLargeNumber(current, getCurrencySymbol())}
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs font-normal ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

const RevenueChart = ({ 
  type, 
  period, 
  current,
  previous,
  trend,
  percentage,
  onTypeChange, 
  onPeriodChange,
  formatCurrency,
  projects,
  isLoading = false
}: {
  type: 'revenue' | 'expenses'
  period: string
  current: number
  previous: number
  trend: 'up' | 'down'
  percentage: number
  onTypeChange: (value: 'revenue' | 'expenses') => void
  onPeriodChange: (value: string) => void
  formatCurrency: (amount: number) => string
  projects: Project[]
  isLoading?: boolean
}) => {
  // Filter data based on selected period
  const getFilteredData = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    
    switch (period) {
      case 'this-year':
        // Show current year data up to current month only
        const currentMonthData = generateRevenueLineData(projects)
        return currentMonthData.slice(0, currentMonth + 1)
      case 'monthly':
        // Show detailed monthly breakdown (full year)
        const monthlyData = generateRevenueLineData(projects)
        return monthlyData
      case 'quarterly':
        // Show quarterly data (group by quarters) - calculate from real data
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
        const quarterlyData = quarters.map((quarter, index) => {
          const quarterStart = new Date(currentYear, index * 3, 1)
          const quarterEnd = new Date(currentYear, (index + 1) * 3, 0)
          
          const quarterProjects = projects.filter(project => {
            const projectDate = new Date(project.start_date || project.created_at)
            return projectDate >= quarterStart && projectDate <= quarterEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
          })
          
          const revenue = quarterProjects.reduce((sum, project) => {
            let amount = 0
            if (project.status === 'on hold' || project.status === 'canceled') {
              amount = project.payment_received || 0
            } else {
              amount = project.total_budget || project.budget || project.revenue || 0
            }
            return sum + amount
          }, 0)
          
          const expenses = quarterProjects.reduce((sum, project) => {
            return sum + (project.expenses || 0)
          }, 0)
          
          return { month: quarter, revenue, expenses }
        })
        return quarterlyData
      case 'last-year':
        // Show last year's monthly data from real projects
        const lastYear = currentYear - 1
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        const lastYearData = months.map((month, index) => {
          const monthStart = new Date(lastYear, index, 1)
          const monthEnd = new Date(lastYear, index + 1, 0)
          
          const monthProjects = projects.filter(project => {
            const projectDate = new Date(project.start_date || project.created_at)
            return projectDate >= monthStart && projectDate <= monthEnd && project.status !== 'pipeline' && (project as any).pipeline_stage !== 'lost'
          })
          
          const revenue = monthProjects.reduce((sum, project) => {
            let amount = 0
            if (project.status === 'on hold' || project.status === 'canceled') {
              amount = project.payment_received || 0
            } else {
              amount = project.total_budget || project.budget || project.revenue || 0
            }
            return sum + amount
          }, 0)
          
          const expenses = monthProjects.reduce((sum, project) => {
            return sum + (project.expenses || 0)
          }, 0)
          
          return { month, revenue, expenses }
        })
        return lastYearData

      default:
        return generateRevenueLineData(projects)
    }
  }

  const filteredData = getFilteredData()

  // Calculate dynamic amount based on filtered data
  const calculateDynamicAmount = () => {
    if (filteredData.length === 0) return current
    
    const totalAmount = filteredData.reduce((sum, item) => sum + item[type], 0)
    return totalAmount
  }

  // Calculate trend based on filtered data vs previous period
  const calculateDynamicTrend = () => {
    const dynamicAmount = calculateDynamicAmount()
    const trendPercentage = ((dynamicAmount - previous) / previous) * 100
    return {
      percentage: Math.abs(trendPercentage).toFixed(2),
      trend: trendPercentage >= 0 ? 'up' as const : 'down' as const
    }
  }

  const dynamicAmount = calculateDynamicAmount()
  const dynamicTrend = calculateDynamicTrend()

  return (
  <Card className="transition-all hover:shadow-sm">
    <CardHeader className="p-6 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {period === 'this-year' ? 'This Year Revenue' :
           period === 'monthly' ? 'Monthly Revenue' :
           period === 'quarterly' ? 'Quarterly Revenue' :
           period === 'last-year' ? 'Last Year Revenue' : 'This Year Revenue'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground min-w-0 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground min-w-0 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-6 pt-0 pb-6">
      <div className="space-y-4">
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-2xl font-normal text-foreground transition-all">
              {formatLargeNumber(dynamicAmount, getCurrencySymbol())}
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {dynamicTrend.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs font-normal ${dynamicTrend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {dynamicTrend.percentage}%
                </span>
              </div>
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          )}
        </div>
        
        {/* Chart */}
        <div className="h-80 w-full mt-8">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-full w-full">
              <LineChart data={filteredData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
              />
              <ReferenceLine 
                x={0} 
                stroke="var(--border)" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm min-w-0">
                        <div className="flex flex-col gap-2">
                          {payload.map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 min-w-0">
                              <div className="flex h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-medium truncate">{item.dataKey === 'revenue' ? 'Revenue' : 'Expenses'}</span>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">{formatLargeNumber(item.value, getCurrencySymbol())}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line 
                type="monotone" 
                dataKey={type} 
                stroke={type === 'revenue' ? 'var(--chart-1)' : 'var(--chart-2)'} 
                strokeWidth={3}
                dot={{ fill: type === 'revenue' ? 'var(--chart-1)' : 'var(--chart-2)', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: type === 'revenue' ? 'var(--chart-1)' : 'var(--chart-2)', strokeWidth: 2, fill: 'white' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  )
}

const YearlyBarChart = ({ 
  type, 
  onTypeChange,
  formatCurrency,
  projects,
  isLoading = false
}: {
  type: 'revenue' | 'expenses'
  onTypeChange: (value: 'revenue' | 'expenses') => void
  formatCurrency: (amount: number) => string
  projects: Project[]
  isLoading?: boolean
}) => {
  // This will be passed from parent component
  const yearlyData = generateYearlyData(projects)
  
  return (
  <Card className="transition-all hover:shadow-sm">
    <CardHeader className="p-6 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Yearly {type === 'revenue' ? 'Revenue' : 'Expenses'}
        </CardTitle>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground min-w-0 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent className="px-6 pt-0 pb-6">
      <div className="space-y-4">
        {/* Yearly Growth section */}
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-normal text-foreground transition-all">
              {(() => {
                // Calculate yearly growth percentage
                if (yearlyData.length < 2) return '0%'
                const currentYear = yearlyData[yearlyData.length - 1][type]
                const previousYear = yearlyData[yearlyData.length - 2][type]
                const growthPercentage = previousYear > 0 ? ((currentYear - previousYear) / previousYear) * 100 : 0
                return `${growthPercentage.toFixed(1)}%`
              })()} 
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {(() => {
                  if (yearlyData.length < 2) return null
                  const currentYear = yearlyData[yearlyData.length - 1][type]
                  const previousYear = yearlyData[yearlyData.length - 2][type]
                  const growthPercentage = previousYear > 0 ? ((currentYear - previousYear) / previousYear) * 100 : 0
                  const trend = growthPercentage >= 0 ? 'up' : 'down'
                  return (
                    <>
                      {trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs font-normal ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(growthPercentage).toFixed(1)}%
                      </span>
                    </>
                  )
                })()} 
              </div>
              <span className="text-xs text-muted-foreground">yearly growth</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-96 w-full mt-8">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <ChartContainer config={yearlyChartConfig} className="h-full w-full">
            <BarChart data={yearlyData} barCategoryGap="20%" margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
            />
            <YAxis hide={true} />
            <Bar 
              dataKey={type} 
              fill={type === 'revenue' ? 'var(--chart-1)' : 'var(--chart-2)'}
              radius={[64, 64, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList 
                dataKey={type} 
                position="top" 
                offset={16}
                style={{ fontSize: '14px', fontWeight: '600' }}
                fill="var(--foreground)"
                className="fill-foreground"
                formatter={(value: any) => formatLargeNumber(value, getCurrencySymbol())}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        )}
        </div>
      </div>
    </CardContent>
  </Card>
)
}

export default function DashboardPage() {
  const { settings, formatCurrency: settingsFormatCurrency } = useSettings()
  const { user } = useAuth()
  const [mrrPeriod, setMrrPeriod] = useState("current-month")
  const [qrrPeriod, setQrrPeriod] = useState("current-quarter")
  const [arrPeriod, setArrPeriod] = useState("current-year")
  const [revenueType, setRevenueType] = useState<'revenue' | 'expenses'>('revenue')
  const [revenuePeriod, setRevenuePeriod] = useState("this-year")
  const [yearlyType, setYearlyType] = useState<'revenue' | 'expenses'>('revenue')
  const [greeting, setGreeting] = useState("")
  
  // Use new efficient dashboard data hook
  const { projects, isLoading: loading, error, lastUpdated, refreshData } = useDashboardData()

  // Get user first name from auth context
  const userName = user 
    ? (user.user_metadata?.full_name?.split(" ")[0]) || user.email?.split("@")[0] || "User"
    : "User"

  // Removed manual data fetching - now handled by useDashboardData hook

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours()
      if (hour < 12) return "Good morning"
      if (hour < 17) return "Good afternoon"
      return "Good evening"
    }
    setGreeting(getGreeting())
  }, [])

  // Calculate metrics from real project data
  const mrrData = calculateMRR(projects, mrrPeriod)
  const qrrData = calculateQRR(projects, qrrPeriod)
  const arrData = calculateARR(projects, arrPeriod)
  const revenueData = revenueType === 'revenue' 
    ? calculateRevenueData(projects, revenuePeriod)
    : calculateExpensesData(projects, revenuePeriod)

  // Generate chart data from real project data
  const revenueLineData = generateRevenueLineData(projects)
  const yearlyData = generateYearlyData(projects)

  return (
    <div className="flex flex-1 flex-col max-w-full overflow-hidden">
      <UpgradeSuccessHandler />
      
      {/* Page Header */}
      <PageHeader
        title={`${greeting}, ${userName}! 👋`}
        description="Here's what's happening with your business today."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <div className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load dashboard data: {error}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshData}
                      className="ml-2 h-6"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* MRR, QRR, and ARR Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="MRR"
                  current={mrrData.current}
                  previous={mrrData.previous}
                  trend={mrrData.trend}
                  percentage={mrrData.percentage}
                  period={mrrPeriod}
                  onPeriodChange={setMrrPeriod}
                  formatCurrency={settingsFormatCurrency}
                  isLoading={loading}
                />
                <MetricCard
                  title="QRR"
                  current={qrrData.current}
                  previous={qrrData.previous}
                  trend={qrrData.trend}
                  percentage={qrrData.percentage}
                  period={qrrPeriod}
                  onPeriodChange={setQrrPeriod}
                  formatCurrency={settingsFormatCurrency}
                  isLoading={loading}
                />
                <MetricCard
                  title="ARR"
                  current={arrData.current}
                  previous={arrData.previous}
                  trend={arrData.trend}
                  percentage={arrData.percentage}
                  period={arrPeriod}
                  onPeriodChange={setArrPeriod}
                  formatCurrency={settingsFormatCurrency}
                  isLoading={loading}
                />
              </div>

              {/* Revenue Line Chart */}
              <RevenueChart
                type={revenueType}
                period={revenuePeriod}
                current={revenueData.current}
                previous={revenueData.previous}
                trend={revenueData.trend}
                percentage={revenueData.percentage}
                onTypeChange={setRevenueType}
                onPeriodChange={setRevenuePeriod}
                formatCurrency={settingsFormatCurrency}
                projects={projects}
                isLoading={loading}
              />

              {/* Yearly Bar Chart */}
              <YearlyBarChart
                type={yearlyType}
                onTypeChange={setYearlyType}
                formatCurrency={settingsFormatCurrency}
                projects={projects}
                isLoading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
