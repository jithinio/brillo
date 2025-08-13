"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"
import type { CashFlowData } from "@/lib/analytics-calculations"

interface CashFlowChartProps {
  data: CashFlowData[]
  period: 'monthly' | 'quarterly'
  onPeriodChange: (period: 'monthly' | 'quarterly') => void
  isLoading?: boolean
  title?: string
}

const chartConfig: ChartConfig = {
  incoming: {
    label: "Incoming",
    color: "hsl(var(--chart-1))",
  },
  outgoing: {
    label: "Outgoing", 
    color: "hsl(var(--chart-2))",
  },
  net: {
    label: "Net",
    color: "hsl(var(--chart-3))",
  }
}

export function CashFlowChart({
  data,
  period,
  onPeriodChange,
  isLoading = false,
  title = "Cash Flow Dashboard"
}: CashFlowChartProps) {
  const { formatCurrency } = useSettings()

  // Check if data is empty (all values are zero)
  const isEmpty = data.length === 0 || data.every(item => 
    item.incoming === 0 && item.outgoing === 0 && item.net === 0
  )

  // Calculate trends
  const currentPeriodData = data[data.length - 1]
  const previousPeriodData = data[data.length - 2]
  
  const netCashFlowTrend = currentPeriodData && previousPeriodData ? {
    current: currentPeriodData.net,
    previous: previousPeriodData.net,
    percentage: previousPeriodData.net !== 0 
      ? Math.abs(((currentPeriodData.net - previousPeriodData.net) / previousPeriodData.net) * 100)
      : 0,
    direction: currentPeriodData.net >= previousPeriodData.net ? 'up' as const : 'down' as const
  } : null

  const totalIncoming = data.reduce((sum, item) => sum + item.incoming, 0)
  const totalOutgoing = data.reduce((sum, item) => sum + item.outgoing, 0)
  const totalNet = totalIncoming - totalOutgoing

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="h-8 text-sm min-w-0 w-auto rounded-lg shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-4 pt-0 pb-4 flex-1">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-b -mx-4 px-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Incoming</p>
              <p className="text-lg font-semibold text-green-600">
                {formatLargeNumber(totalIncoming, getCurrencySymbol())}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Outgoing</p>
              <p className="text-lg font-semibold text-red-600">
                {formatLargeNumber(totalOutgoing, getCurrencySymbol())}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                {netCashFlowTrend && (
                  <div className="flex items-center gap-1">
                    {netCashFlowTrend.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-normal ${
                      netCashFlowTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {netCashFlowTrend.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <p className={`text-lg font-semibold ${
                totalNet >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatLargeNumber(totalNet, getCurrencySymbol())}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[240px]">
            {isEmpty ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">No cash flow data</h3>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    Start creating projects with payments and expenses to see your cash flow analysis here.
                  </p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <XAxis 
                    dataKey="period" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
                  />
                  
                  {/* Zero reference line */}
                  <ReferenceLine 
                    y={0} 
                    stroke="var(--border)" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                  />
                  
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-sm min-w-0">
                            <div className="mb-2">
                              <p className="text-sm font-medium">{label}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {payload.map((item: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div 
                                    className="flex h-2 w-2 rounded-full" 
                                    style={{ backgroundColor: item.color }} 
                                  />
                                  <span className="text-sm font-medium capitalize">
                                    {item.dataKey}
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-auto">
                                    {formatLargeNumber(item.value, getCurrencySymbol())}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  
                  <Bar 
                    dataKey="incoming" 
                    fill="var(--chart-1)" 
                    radius={[2, 2, 0, 0]}
                    name="Incoming"
                    isAnimationActive={false}
                  />
                  <Bar 
                    dataKey="outgoing" 
                    fill="var(--chart-2)" 
                    radius={[2, 2, 0, 0]}
                    name="Outgoing"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 