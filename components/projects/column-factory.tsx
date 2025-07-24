"use client"

import { createColumns } from "@/components/projects/columns"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import type { ColumnDef } from "@tanstack/react-table"

// Column width constants
export const COLUMN_WIDTHS = {
  select: 36,
  name: 250,
  status: 120,
  clients: 200,
  start_date: 140,
  due_date: 140,
  budget: 120,
  expenses: 120,
  received: 120,
  pending: 120,
} as const

// Footer cell components - memoized for performance
const FooterCell = ({ value, label }: { value: number | string; label?: string }) => (
  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between px-2">
    {label && <span className="text-xs text-muted-foreground mr-2">{label}</span>}
    <span>{value}</span>
  </div>
)

const CurrencyFooterCell = ({ value }: { value: number }) => (
  <div className="text-right font-mono text-sm font-medium text-gray-900 dark:text-gray-100 px-2">
    {formatCurrencyAbbreviated(value)}
  </div>
)

// Create footer functions that can be reused
const createFooterFunctions = () => ({
  totalProjects: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <FooterCell value={aggregations.totalProjects || 0} label="Total" />
  },
  activeCount: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return (
      <FooterCell 
        value={`${aggregations.activeCount || 0} active`} 
        label={`${aggregations.completedCount || 0} done`}
      />
    )
  },
  totalBudget: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalBudget || 0} />
  },
  totalExpenses: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalExpenses || 0} />
  },
  totalReceived: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalReceived || 0} />
  },
  totalPending: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalPending || 0} />
  }
})

// Memoized column factory
export function createOptimizedColumns(
  actions: any,
  columnWidths: Record<string, number> = {}
): ColumnDef<any>[] {
  const baseColumns = createColumns(actions)
  const footerFunctions = createFooterFunctions()
  
  return baseColumns.map((column: any) => {
    const columnKey = column.accessorKey || column.id
    const defaultWidth = columnKey === 'select' ? COLUMN_WIDTHS.select : 
                        COLUMN_WIDTHS[columnKey as keyof typeof COLUMN_WIDTHS] || 150
    
    // Special handling for select column
    if (columnKey === 'select') {
      return {
        ...column,
        size: 36,
        minSize: 36,
        maxSize: 36,
      }
    }
    
    const currentWidth = columnWidths[columnKey] || defaultWidth
    
    // Add footer functions
    let footer = undefined
    switch (columnKey) {
      case 'name':
        footer = footerFunctions.totalProjects
        break
      case 'status':
        footer = footerFunctions.activeCount
        break
      case 'budget':
        footer = footerFunctions.totalBudget
        break
      case 'expenses':
        footer = footerFunctions.totalExpenses
        break
      case 'received':
        footer = footerFunctions.totalReceived
        break
      case 'pending':
        footer = footerFunctions.totalPending
        break
    }
    
    return {
      ...column,
      size: currentWidth,
      minSize: 80,
      maxSize: 500,
      ...(footer ? { footer } : {})
    }
  })
} 