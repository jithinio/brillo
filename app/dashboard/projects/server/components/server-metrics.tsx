"use client"

import { motion } from "framer-motion"
import { formatCurrency } from "@/lib/currency"

interface Metrics {
  totalProjects: number
  activeProjects: number
  pipelineProjects: number
  completedProjects: number
  onHoldProjects: number
  cancelledProjects: number
  totalBudget: number
  totalExpenses: number
  totalReceived: number
  totalPending: number
}

interface ServerMetricsProps {
  metrics: Metrics | null
}

export function ServerMetrics({ metrics }: ServerMetricsProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statusMetrics = [
    { label: "Total Projects", value: metrics.totalProjects, color: "text-blue-600" },
    { label: "Active", value: metrics.activeProjects, color: "text-green-600" },
    { label: "Pipeline", value: metrics.pipelineProjects, color: "text-purple-600" },
    { label: "Completed", value: metrics.completedProjects, color: "text-blue-600" },
  ]

  const financialMetrics = [
    { label: "Total Budget", value: formatCurrency(metrics.totalBudget), color: "text-blue-600" },
    { label: "Total Expenses", value: formatCurrency(metrics.totalExpenses), color: "text-red-600" },
    { label: "Total Received", value: formatCurrency(metrics.totalReceived), color: "text-green-600" },
    { label: "Total Pending", value: formatCurrency(metrics.totalPending), color: "text-yellow-600" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...statusMetrics, ...financialMetrics].map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center"
        >
          <div className="flex items-center gap-2 w-full">
            <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">
              {metric.label}
            </h3>
            <div className={`text-lg font-semibold ml-auto ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
} 