import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, BarChart3, Trophy } from "lucide-react"
import type { PipelineMetrics as PipelineMetricsType } from "@/lib/types/pipeline"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

interface PipelineMetricsProps {
  metrics: PipelineMetricsType
}

export function PipelineMetrics({ metrics }: PipelineMetricsProps) {
  const metricCards = [
    {
      title: "Total Pipeline Value",
      value: formatLargeNumber(metrics.totalValue, getCurrencySymbol()),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Revenue Forecast",
      value: formatLargeNumber(metrics.revenueForeccast, getCurrencySymbol()),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Weighted Value",
      value: formatLargeNumber(metrics.weightedValue, getCurrencySymbol()),
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate}%`,
      icon: BarChart3,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate}%`,
      icon: Trophy,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title} className="border bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-normal">{metric.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 