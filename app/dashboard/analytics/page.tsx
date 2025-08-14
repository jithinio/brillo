"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, Line, LineChart } from "recharts"
import { DollarSign, TrendingUp, TrendingDown, FileText, Users, Calendar, Activity, BarChart3, Wallet, Clock } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Loader } from "@/components/ui/loader"
import { useAnalyticsData, type AnalyticsFilters as AnalyticsFiltersType, type DateRange } from "@/hooks/use-unified-projects"

import {
  calculateOverallRevenue,
  calculateOverallExpenses,
  calculateTotalProjects,
  calculateMRR,
  calculateARR,
  calculateYoYGrowth,
  calculateTopPayingClients,
  calculateCLTV,
  calculateTotalPending,
  generateRevenueBarChartData,
  calculateCashFlow,
  generateMRRSparklineData,
  generateARRSparklineData,
  diagnoseProjectFiltering,
  type Project,
  type Client
} from "@/lib/analytics-calculations"

import { AnalyticsFilters } from "./components/AnalyticsFilters"
import MetricCard from "./components/MetricCard"
import { CashFlowChart } from "./components/CashFlowChart"
import { TopClientsCard } from "./components/TopClientsCard"

import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"
import { Badge } from "@/components/ui/badge"
import { AdvancedAnalyticsGate } from "@/components/gates/pro-feature-gate"

// Period options for different metrics
const MRR_PERIODS = [
  { value: 'current-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: '3-months', label: 'Last 3 Months' }
]

const ARR_PERIODS = [
  { value: 'current-year', label: 'This Year' },
  { value: 'last-year', label: 'Last Year' }
]

const CHART_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
]

// Chart configuration
const revenueChartConfig: ChartConfig = {
  value: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  }
}

export default function AnalyticsPage() {
  const { formatCurrency } = useSettings()
  const [filters, setFilters] = useState<AnalyticsFiltersType>({})
  const [periods, setPeriods] = useState({
    mrr: 'current-month',
    arr: 'current-year',
    revenueChart: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    cashFlow: 'monthly' as 'monthly' | 'quarterly'
  })

  // Fetch analytics data with filters
  const {
    projects,
    clients,
    filteredProjects,
    filteredClients,
    isLoading,
    error,
    refreshData,
    refreshAnalytics,
    lastUpdated
  } = useAnalyticsData(filters)

  // Handler for filter changes
  const handleFiltersChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters)
  }

  // Calculate filtered metrics (affected by filters)
  const filteredMetrics = useMemo(() => {
    if (isLoading || !filteredProjects.length) {
      return {
        revenue: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        expenses: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        totalProjects: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        totalPending: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        topClients: [],
        revenueChartData: []
      }
    }

    return {
      revenue: calculateOverallRevenue(filteredProjects, filters.dateRange),
      expenses: calculateOverallExpenses(filteredProjects, filters.dateRange),
      totalProjects: calculateTotalProjects(filteredProjects, filters.dateRange),
      totalPending: calculateTotalPending(filteredProjects, filters.dateRange),
      topClients: calculateTopPayingClients(filteredProjects, 5),
      revenueChartData: generateRevenueBarChartData(filteredProjects, periods.revenueChart)
    }
  }, [filteredProjects, filters.dateRange, periods.revenueChart, isLoading])

  // Calculate unfiltered metrics (global metrics)
  const globalMetrics = useMemo(() => {
    // Debug: Log global metrics calculation
    console.log('📊 Analytics: Calculating global metrics', {
      projectsLength: projects.length,
      isLoading,
      lastUpdated,
      firstFewProjects: projects.slice(0, 3).map(p => ({
        name: p.name,
        status: p.status,
        budget: p.budget,
        total_budget: p.total_budget,
        pipeline_stage: p.pipeline_stage,
        created_at: p.created_at,
        start_date: p.start_date
      }))
    })
    
    // Only return zero metrics if we truly have no projects AND we're not loading
    // During loading, we should continue showing calculated metrics if we have project data
    if (!projects.length && !isLoading) {
      console.log('📊 Analytics: Returning zero metrics - no projects available')
      return {
        revenue: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        expenses: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        totalProjects: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        totalPending: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        mrr: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        arr: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        yoyGrowth: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        cltv: { current: 0, previous: 0, trend: 'up' as const, percentage: 0 },
        cashFlowData: [],
        mrrSparklineData: [],
        arrSparklineData: []
      }
    }
    
    // If we have projects, calculate metrics regardless of loading state
    // This prevents showing zero during cache refresh when we have valid data

    console.log('📊 Analytics: Starting calculations for global metrics...')
    
    // Run diagnostic to understand project filtering
    diagnoseProjectFiltering(projects)
    
    const calculatedRevenue = calculateOverallRevenue(projects)
    const calculatedExpenses = calculateOverallExpenses(projects)
    const calculatedTotalProjects = calculateTotalProjects(projects)
    const calculatedTotalPending = calculateTotalPending(projects)
    
    // Debug: Log calculated metrics summary
    console.log('📊 Analytics: Calculated overview metrics', {
      revenueValue: calculatedRevenue.current,
      expensesValue: calculatedExpenses.current,
      totalProjectsValue: calculatedTotalProjects.current,
      totalPendingValue: calculatedTotalPending.current,
      projectsUsed: projects.length,
      projectStatuses: projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })

    return {
      revenue: calculatedRevenue,
      expenses: calculatedExpenses,
      totalProjects: calculatedTotalProjects,
      totalPending: calculatedTotalPending,
      mrr: calculateMRR(projects, periods.mrr),
      arr: calculateARR(projects, periods.arr),
      yoyGrowth: calculateYoYGrowth(projects),
      cltv: calculateCLTV(projects, clients),
      cashFlowData: calculateCashFlow(projects, periods.cashFlow),
      mrrSparklineData: generateMRRSparklineData(projects, periods.mrr),
      arrSparklineData: generateARRSparklineData(projects, periods.arr)
    }
  }, [projects, clients, periods.mrr, periods.arr, periods.cashFlow, isLoading])

  // Handle period changes
  const handlePeriodChange = (metric: string, value: string) => {
    setPeriods(prev => ({ ...prev, [metric]: value }))
  }

  // Check if filters are active
  const hasActiveFilters = Boolean(
    filters.dateRange || 
    (filters.clientIds && filters.clientIds.length > 0) || 
    (filters.projectStatuses && filters.projectStatuses.length > 0)
  )

  return (
    <AdvancedAnalyticsGate>
      <div className="w-full h-screen flex flex-col">
      {/* Page Header - Not sticky */}
      <PageHeader
        title="Analytics"
      />
      
      {/* Sticky Filter Container */}
      <div className="flex-shrink-0 sticky top-16 z-10">
        <div className="p-6 border-t border-b bg-transparent">
            <AnalyticsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              clients={clients}
              isLoading={isLoading}
              onRefresh={refreshData}
            />
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <div className="space-y-8">
              {/* Filtered Analytics Section */}
              {hasActiveFilters && (
                <div className="space-y-6 relative">
                  {/* Badge Loader for Filtered Analytics - Only show for initial loads */}
                  {isLoading && (!filteredProjects.length && !filteredClients.length) && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center">
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-2 text-xs shadow-md border bg-background text-foreground"
                      >
                        <Loader size="xs" variant="default" />
                        <span>Loading filtered analytics...</span>
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Filtered Analytics</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Filtered Metric Cards without skeletons */}
                    <MetricCard
                      title="Revenue"
                      value={filteredMetrics.revenue.current}
                      trend={{
                        direction: filteredMetrics.revenue.trend,
                        percentage: filteredMetrics.revenue.percentage,
                        label: "vs previous period"
                      }}
                      icon={DollarSign}
                      variant="currency"
                      isLoading={false}
                      error={error}
                    />

                    <MetricCard
                      title="Total Projects"
                      value={filteredMetrics.totalProjects.current}
                      trend={{
                        direction: filteredMetrics.totalProjects.trend,
                        percentage: filteredMetrics.totalProjects.percentage,
                        label: "vs previous period"
                      }}
                      icon={FileText}
                      variant="number"
                      isLoading={false}
                      error={error}
                    />

                    <TopClientsCard
                      clients={filteredMetrics.topClients}
                      isLoading={false}
                    />

                    <MetricCard
                      title="Total Pending"
                      value={filteredMetrics.totalPending.current}
                      trend={{
                        direction: filteredMetrics.totalPending.trend,
                        percentage: filteredMetrics.totalPending.percentage,
                        label: "vs previous period"
                      }}
                      icon={Clock}
                      variant="currency"
                      isLoading={false}
                      error={error}
                    />
                  </div>
                </div>
              )}

              {/* Divider between filtered and global sections */}
              {hasActiveFilters && (
                <Separator className="my-8" />
              )}

              {/* Unfiltered Global Metrics Section */}
              <div className="space-y-8 relative">
                {/* Badge Loader for Global Analytics - Only show for initial loads */}
                {isLoading && (!projects.length && !clients.length) && (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center">
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-2 text-xs shadow-md border bg-background text-foreground"
                    >
                      <Loader size="xs" variant="default" />
                      <span>Loading analytics...</span>
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {hasActiveFilters ? 'Global Overview' : 'Analytics Overview'}
                  </h2>
                </div>

                {/* Main Analytics Grid - Bento Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4">
                  {/* Core Financial Metrics - Top Row (4 cards) */}
                  <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        title="Overall Revenue"
                        value={globalMetrics.revenue.current}
                        trend={{
                          direction: globalMetrics.revenue.trend,
                          percentage: globalMetrics.revenue.percentage,
                          label: "vs previous period"
                        }}
                        icon={DollarSign}
                        variant="currency"
                        isLoading={false}
                        error={error}
                      />

                      <MetricCard
                        title="Overall Expenses"
                        value={globalMetrics.expenses.current}
                        trend={{
                          direction: globalMetrics.expenses.trend === 'up' ? 'down' : 'up',
                          percentage: globalMetrics.expenses.percentage,
                          label: "vs previous period"
                        }}
                        icon={Wallet}
                        variant="currency"
                        isLoading={false}
                        error={error}
                      />

                      <MetricCard
                        title="Total Projects"
                        value={globalMetrics.totalProjects.current}
                        trend={{
                          direction: globalMetrics.totalProjects.trend,
                          percentage: globalMetrics.totalProjects.percentage,
                          label: "vs previous period"
                        }}
                        icon={FileText}
                        variant="number"
                        isLoading={false}
                        error={error}
                      />

                      <MetricCard
                        title="Total Pending"
                        value={globalMetrics.totalPending.current}
                        trend={{
                          direction: globalMetrics.totalPending.trend,
                          percentage: globalMetrics.totalPending.percentage,
                          label: "vs previous period"
                        }}
                        icon={Clock}
                        variant="currency"
                        isLoading={false}
                        error={error}
                      />
                    </div>
                  </div>

                  {/* Cash Flow Chart - Large Card */}
                  <div className="lg:col-span-8 flex w-full min-h-[400px] max-h-[450px] h-[450px]">
                    <div className="w-full">
                      <CashFlowChart
                        data={globalMetrics.cashFlowData}
                        period={periods.cashFlow}
                        onPeriodChange={(value) => handlePeriodChange('cashFlow', value as 'monthly' | 'quarterly')}
                        isLoading={false}
                      />
                    </div>
                  </div>

                  {/* Growth Metrics Column */}
                  <div className="lg:col-span-4 flex flex-col min-h-[400px] max-h-[450px] h-[450px]">
                    <div className="grid grid-cols-1 gap-4 h-full">
                      {/* MRR Card */}
                      <div className="flex-1">
                        <MetricCard
                          title="MRR"
                          value={globalMetrics.mrr.current}
                          trend={{
                            direction: globalMetrics.mrr.trend,
                            percentage: globalMetrics.mrr.percentage,
                            label: "vs previous period"
                          }}
                          icon={Calendar}
                          variant="currency"
                          period={periods.mrr}
                          onPeriodChange={(value: string) => handlePeriodChange('mrr', value)}
                          periodOptions={MRR_PERIODS}
                          sparklineData={globalMetrics.mrrSparklineData}
                          isLoading={false}
                          error={error}
                        />
                      </div>

                      {/* ARR Card */}
                      <div className="flex-1">
                        <MetricCard
                          title="ARR"
                          value={globalMetrics.arr.current}
                          trend={{
                            direction: globalMetrics.arr.trend,
                            percentage: globalMetrics.arr.percentage,
                            label: "vs previous period"
                          }}
                          icon={Activity}
                          variant="currency"
                          period={periods.arr}
                          onPeriodChange={(value: string) => handlePeriodChange('arr', value)}
                          periodOptions={ARR_PERIODS}
                          sparklineData={globalMetrics.arrSparklineData}
                          isLoading={false}
                          error={error}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - YoY Growth and CLTV */}
                  <div className="lg:col-span-6">
                    <MetricCard
                      title="Year-over-Year Growth"
                      value={globalMetrics.yoyGrowth.percentage}
                      trend={{
                        direction: globalMetrics.yoyGrowth.trend,
                        percentage: globalMetrics.yoyGrowth.percentage,
                        label: "revenue growth"
                      }}
                      icon={TrendingUp}
                      variant="percentage"
                      size="lg"
                      isLoading={false}
                      error={error}
                    />
                  </div>

                  <div className="lg:col-span-6">
                    <MetricCard
                      title="Customer Lifetime Value"
                      value={globalMetrics.cltv.current}
                      trend={{
                        direction: globalMetrics.cltv.trend,
                        percentage: globalMetrics.cltv.percentage,
                        label: "vs previous period"
                      }}
                      icon={Users}
                      variant="currency"
                      subtitle="Average CLTV per client"
                      size="lg"
                      isLoading={false}
                      error={error}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdvancedAnalyticsGate>
  )
}
