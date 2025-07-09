"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, LabelList } from "recharts"
import { TrendingUp, TrendingDown, Calendar, DollarSign, CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"


import { formatCurrency } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"

// Sample data - replace with real data from your API
const mrrData = {
  current: 28420,
  previous: 24350,
  trend: 'up' as const,
  percentage: 16.7
}

const arrData = {
  current: 341040,
  previous: 292200,
  trend: 'up' as const,
  percentage: 16.7
}

const revenueData = {
  current: 95000,
  previous: 84000,
  trend: 'up' as const,
  percentage: 13.1
}

const revenueLineData = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 2000, expenses: 9800 },
  { month: 'Apr', revenue: 2780, expenses: 3908 },
  { month: 'May', revenue: 1890, expenses: 4800 },
  { month: 'Jun', revenue: 2390, expenses: 3800 },
  { month: 'Jul', revenue: 3490, expenses: 4300 },
  { month: 'Aug', revenue: 4000, expenses: 2400 },
  { month: 'Sep', revenue: 3000, expenses: 1398 },
  { month: 'Oct', revenue: 2000, expenses: 9800 },
  { month: 'Nov', revenue: 2780, expenses: 3908 },
  { month: 'Dec', revenue: 1890, expenses: 4800 },
]

const yearlyData = [
  { year: '2020', revenue: 45000, expenses: 32000 },
  { year: '2021', revenue: 52000, expenses: 38000 },
  { year: '2022', revenue: 68000, expenses: 45000 },
  { year: '2023', revenue: 84000, expenses: 52000 },
  { year: '2024', revenue: 95000, expenses: 58000 },
]

// Chart configurations
const miniChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
}

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
}

const yearlyChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
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
  formatCurrency 
}: {
  title: string
  current: number
  previous: number
  trend: 'up' | 'down'
  percentage: number
  period: string
  onPeriodChange: (value: string) => void
  formatCurrency: (amount: number) => string
}) => (
  <Card className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-0 shadow-none">
    <CardHeader className="p-8 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-auto h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {title === 'MRR' ? (
              <>
                <SelectItem value="current-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="3-months">Last 3 Months</SelectItem>
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
    <CardContent className="px-8 pt-0 pb-8">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-3xl font-normal text-foreground">
            {formatCurrency(current)}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: '12px' }}>
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-normal ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {percentage}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs previous period</span>
          </div>
        </div>
        
        {/* Mini chart */}
        <div className="h-12 w-full" style={{ marginTop: '48px' }}>
          <ChartContainer config={miniChartConfig} className="h-full w-full">
            <LineChart data={revenueLineData.slice(-6)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={trend === 'up' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
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
  formatCurrency 
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
}) => {
  // Filter data based on selected period
  const getFilteredData = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    
    switch (period) {
      case 'this-year':
        // Show current year data up to current month only
        const currentMonth = currentDate.getMonth() // 0-based (0 = January, 6 = July)
        return revenueLineData.slice(0, currentMonth + 1)
      case 'monthly':
        // Show detailed monthly breakdown (full year)
        return revenueLineData
      case 'quarterly':
        // Show quarterly data (group by quarters)
        const quarterlyData = [
          { month: 'Q1', revenue: 9000, expenses: 13598 },
          { month: 'Q2', revenue: 7060, expenses: 12508 },
          { month: 'Q3', revenue: 8490, expenses: 7700 },
          { month: 'Q4', revenue: 6670, expenses: 14108 },
        ]
        return quarterlyData
      case 'last-year':
        // Show last year's monthly data (simulated)
        return revenueLineData.map(item => ({
          ...item,
          revenue: item.revenue * 0.85,
          expenses: item.expenses * 0.9
        }))

      default:
        return revenueLineData
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
      percentage: Math.abs(trendPercentage).toFixed(1),
      trend: trendPercentage >= 0 ? 'up' as const : 'down' as const
    }
  }

  const dynamicAmount = calculateDynamicAmount()
  const dynamicTrend = calculateDynamicTrend()

  return (
  <Card className="bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-0 shadow-none">
    <CardHeader className="p-8 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {period === 'this-year' ? 'This Year Revenue' :
           period === 'monthly' ? 'Monthly Revenue' :
           period === 'quarterly' ? 'Quarterly Revenue' :
           period === 'last-year' ? 'Last Year Revenue' : 'This Year Revenue'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
                    <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-32 h-9">
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
    <CardContent className="px-8 pt-0 pb-8">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-3xl font-normal text-foreground">
            {formatCurrency(dynamicAmount)}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: '12px' }}>
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
        </div>
        
        {/* Chart */}
        <div className="h-80 w-full" style={{ marginTop: '48px' }}>
          <ChartContainer config={revenueChartConfig} className="h-full w-full">
            <LineChart data={filteredData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                className="dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-300"
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: any) => [formatCurrency(value), type]}
              />
              <Line 
                type="monotone" 
                dataKey={type} 
                stroke={type === 'revenue' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'} 
                strokeWidth={3}
                dot={{ fill: type === 'revenue' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: type === 'revenue' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </CardContent>
  </Card>
  )
}

const YearlyBarChart = ({ 
  type, 
  onTypeChange,
  formatCurrency 
}: {
  type: 'revenue' | 'expenses'
  onTypeChange: (value: 'revenue' | 'expenses') => void
  formatCurrency: (amount: number) => string
}) => (
  <Card className="bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-0 shadow-none">
    <CardHeader className="p-8 pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Yearly {type === 'revenue' ? 'Revenue' : 'Expenses'}
        </CardTitle>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent className="px-8 pt-0 pb-8">
      <div className="space-y-4">
        {/* Yearly Growth section */}
        <div className="space-y-1">
          <div className="text-3xl font-normal text-foreground">
            {(() => {
              // Calculate yearly growth percentage
              const currentYear = yearlyData[yearlyData.length - 1][type]
              const previousYear = yearlyData[yearlyData.length - 2][type]
              const growthPercentage = ((currentYear - previousYear) / previousYear) * 100
              return `${growthPercentage.toFixed(1)}%`
            })()}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: '12px' }}>
            <div className="flex items-center gap-1">
              {(() => {
                const currentYear = yearlyData[yearlyData.length - 1][type]
                const previousYear = yearlyData[yearlyData.length - 2][type]
                const growthPercentage = ((currentYear - previousYear) / previousYear) * 100
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
        </div>

        {/* Chart */}
        <div className="h-96 w-full" style={{ marginTop: '48px' }}>
        <ChartContainer config={yearlyChartConfig} className="h-full w-full">
          <BarChart data={yearlyData} barCategoryGap="20%" margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
            />
            <Bar 
              dataKey={type} 
              fill={type === 'revenue' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'}
              radius={[64, 64, 0, 0]}
            >
              <LabelList 
                dataKey={type} 
                position="top" 
                offset={16}
                style={{ fontSize: '14px', fontWeight: '600' }}
                fill="hsl(var(--foreground))"
                className="fill-foreground"
                formatter={(value: any) => `${formatCurrency(value / 1000)}k`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function DashboardPage() {
  const { settings, formatCurrency: settingsFormatCurrency } = useSettings()
  const [mrrPeriod, setMrrPeriod] = useState("current-month")
  const [arrPeriod, setArrPeriod] = useState("current-year")
  const [revenueType, setRevenueType] = useState<'revenue' | 'expenses'>('revenue')
  const [revenuePeriod, setRevenuePeriod] = useState("this-year")
  const [yearlyType, setYearlyType] = useState<'revenue' | 'expenses'>('revenue')
  const [greeting, setGreeting] = useState("")
  const [userName] = useState("Jithin") // Replace with actual user name from context/auth

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours()
      if (hour < 12) return "Good morning"
      if (hour < 17) return "Good afternoon"
      return "Good evening"
    }
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="p-12">
      {/* Dynamic Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-normal text-foreground mb-2">
          {greeting}, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">Here's what's happening with your business today.</p>
      </div>

      {/* Summary Section */}
      <div className="mb-8">
        {/* MRR and ARR Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="MRR"
            current={mrrData.current}
            previous={mrrData.previous}
            trend={mrrData.trend}
            percentage={mrrData.percentage}
            period={mrrPeriod}
            onPeriodChange={setMrrPeriod}
            formatCurrency={settingsFormatCurrency}
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
          />
        </div>

        {/* Revenue Line Chart */}
        <div className="mb-8">
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
          />
        </div>

        {/* Yearly Bar Chart */}
        <div>
          <YearlyBarChart
            type={yearlyType}
            onTypeChange={setYearlyType}
            formatCurrency={settingsFormatCurrency}
          />
        </div>
      </div>
    </div>
  )
}
