import type { PipelineMetrics as PipelineMetricsType } from "@/lib/types/pipeline"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

interface PipelineMetricsProps {
  metrics: PipelineMetricsType
}

export function PipelineMetrics({ metrics }: PipelineMetricsProps) {
  const metricItems = [
    {
      title: "Total Pipeline Value",
      value: formatLargeNumber(metrics.totalValue, getCurrencySymbol()),
    },
    {
      title: "Revenue Forecast",
      value: formatLargeNumber(metrics.revenueForeccast, getCurrencySymbol()),
    },
    {
      title: "Weighted Value",
      value: formatLargeNumber(metrics.weightedValue, getCurrencySymbol()),
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate}%`,
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate}%`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 w-full border-t border-b border-gray-200 dark:border-gray-700">
      {metricItems.map((metric, index) => (
        <div key={metric.title} className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
          <div className="text-lg font-medium text-black dark:text-white">{metric.value}</div>
          <h3 className="text-xs font-medium text-muted-foreground mt-1">{metric.title}</h3>
        </div>
      ))}
    </div>
  )
} 