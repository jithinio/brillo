import React from "react"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"

interface InvoiceMetrics {
  totalInvoices: number
  paidInvoices: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

interface InvoiceMetricsProps {
  metrics: InvoiceMetrics | null
}

export function InvoiceMetrics({ metrics }: InvoiceMetricsProps) {
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
        <div className="text-lg font-medium text-foreground">{metrics.totalInvoices}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Invoices</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-foreground">{formatCurrencyAbbreviated(metrics.totalAmount)}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Amount</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-foreground">{formatCurrencyAbbreviated(metrics.paidAmount)}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Paid Amount</h3>
      </div>
      <div className="px-6 py-4 border-r border-border last:border-r-0">
        <div className="text-lg font-medium text-foreground">{formatCurrencyAbbreviated(metrics.pendingAmount)}</div>
        <h3 className="text-xs font-medium text-muted-foreground mt-1">Pending Amount</h3>
      </div>
    </div>
  )
} 