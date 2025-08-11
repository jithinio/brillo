import React from "react"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"

interface ClientMetrics {
  totalClients: number
  activeClients: number
  totalProjects: number
  totalRevenue: number
}

interface ClientMetricsProps {
  metrics: ClientMetrics | null
}

export function ClientMetrics({ metrics }: ClientMetricsProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-r border-border last:border-r-0">
            <div className="h-6 bg-muted rounded animate-pulse w-20 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 w-full">
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-black dark:text-white">{metrics.totalClients}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Clients</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-black dark:text-white">{metrics.activeClients}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Active Clients</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-black dark:text-white">{metrics.totalProjects}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Projects</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-black dark:text-white">{formatCurrencyAbbreviated(metrics.totalRevenue)}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Revenue</h3>
      </div>
    </div>
  )
} 