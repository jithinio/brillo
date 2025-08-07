"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Optimized badge component with memoization
const StatusBadge = React.memo(({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
      case 'completed':
        return { label: 'Completed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
      case 'on_hold':
        return { label: 'On Hold', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
      case 'pipeline':
        return { label: 'Pipeline', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
    }
  }

  const config = getStatusConfig(status)
  
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  )
})

StatusBadge.displayName = "StatusBadge"

// Optimized client display component
const ClientDisplay = React.memo(({ client }: { client: any }) => {
  if (!client) return <span className="text-muted-foreground">—</span>
  
  return (
    <div className="flex items-center gap-2 min-w-0">
      {client.avatar_url && (
        <img 
          src={client.avatar_url} 
          alt={client.name}
          className="w-6 h-6 rounded-full flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{client.name}</div>
        {client.company && (
          <div className="text-xs text-muted-foreground truncate">{client.company}</div>
        )}
      </div>
    </div>
  )
})

ClientDisplay.displayName = "ClientDisplay"

// Optimized currency display component
const CurrencyCell = React.memo(({ 
  value, 
  currency = 'USD',
  className = ""
}: { 
  value: number | null | undefined
  currency?: string
  className?: string 
}) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }
  
  return (
    <span className={cn("font-mono text-sm", className)}>
      {formatCurrencyAbbreviated(value, currency)}
    </span>
  )
})

CurrencyCell.displayName = "CurrencyCell"

// Optimized date display component
const DateCell = React.memo(({ date }: { date: string | null }) => {
  if (!date) return <span className="text-muted-foreground">—</span>
  
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  
  return <span className="text-sm">{formattedDate}</span>
})

DateCell.displayName = "DateCell"

// Optimized header component with sorting
const SortableHeader = React.memo(({ 
  column, 
  children, 
  className = "" 
}: { 
  column: any
  children: React.ReactNode
  className?: string 
}) => {
  const sortDirection = column.getIsSorted()
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 px-2 lg:px-3 font-medium", className)}
      onClick={() => column.toggleSorting()}
    >
      {children}
      {sortDirection === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : sortDirection === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  )
})

SortableHeader.displayName = "SortableHeader"

// Optimized actions menu component
const ActionsMenu = React.memo(({ 
  project, 
  onEdit, 
  onStatusUpdate, 
  canUpdate 
}: {
  project: any
  onEdit: (project: any) => void
  onStatusUpdate: (data: { id: string; status: string }) => void
  canUpdate: boolean
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onEdit(project)} disabled={!canUpdate}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={() => onStatusUpdate({ id: project.id, status: 'active' })}
        disabled={!canUpdate || project.status === 'active'}
      >
        Set Active
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => onStatusUpdate({ id: project.id, status: 'completed' })}
        disabled={!canUpdate || project.status === 'completed'}
      >
        Set Completed
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => onStatusUpdate({ id: project.id, status: 'on_hold' })}
        disabled={!canUpdate || project.status === 'on_hold'}
      >
        Set On Hold
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
))

ActionsMenu.displayName = "ActionsMenu"

// Main optimized column creation function
export function createOptimizedProjectColumns({
  preferences,
  onEdit,
  onStatusUpdate,
  canUpdate = true,
}: {
  preferences: any
  onEdit: (project: any) => void
  onStatusUpdate: (data: { id: string; status: string }) => void
  canUpdate?: boolean
}): ColumnDef<any>[] {
  const baseColumns: ColumnDef<any>[] = [
    // Selection column
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    
    // Project name
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string
        return (
          <div className="font-medium text-sm max-w-[200px] truncate" title={name}>
            {name}
          </div>
        )
      },
      size: preferences?.columnWidths?.name || 200,
    },

    // Client
    {
      accessorKey: "clients",
      header: ({ column }) => (
        <SortableHeader column={column}>Client</SortableHeader>
      ),
      cell: ({ row }) => <ClientDisplay client={row.getValue("clients")} />,
      size: preferences?.columnWidths?.clients || 180,
    },

    // Status
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: preferences?.columnWidths?.status || 120,
    },

    // Project Type
    {
      accessorKey: "project_type",
      header: ({ column }) => (
        <SortableHeader column={column}>Type</SortableHeader>
      ),
      cell: ({ row }) => {
        const type = row.getValue("project_type") as string
        if (!type) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="outline" className="text-xs">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        )
      },
      size: preferences?.columnWidths?.project_type || 100,
    },

    // Start Date
    {
      accessorKey: "start_date",
      header: ({ column }) => (
        <SortableHeader column={column}>Start Date</SortableHeader>
      ),
      cell: ({ row }) => <DateCell date={row.getValue("start_date")} />,
      size: preferences?.columnWidths?.start_date || 120,
    },

    // Due Date
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <SortableHeader column={column}>Due Date</SortableHeader>
      ),
      cell: ({ row }) => <DateCell date={row.getValue("due_date")} />,
      size: preferences?.columnWidths?.due_date || 120,
    },

    // Budget
    {
      accessorKey: "total_budget",
      header: ({ column }) => (
        <SortableHeader column={column}>Budget</SortableHeader>
      ),
      cell: ({ row }) => {
        const budget = row.getValue("total_budget") as number || row.original.budget
        return <CurrencyCell value={budget} currency={row.original.currency} />
      },
      size: preferences?.columnWidths?.total_budget || 110,
    },

    // Expenses
    {
      accessorKey: "expenses",
      header: ({ column }) => (
        <SortableHeader column={column}>Expenses</SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell 
          value={row.getValue("expenses")} 
          currency={row.original.currency}
          className="text-red-600 dark:text-red-400"
        />
      ),
      size: preferences?.columnWidths?.expenses || 110,
    },

    // Received
    {
      accessorKey: "received",
      header: ({ column }) => (
        <SortableHeader column={column}>Received</SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell 
          value={row.getValue("received")} 
          currency={row.original.currency}
          className="text-green-600 dark:text-green-400"
        />
      ),
      size: preferences?.columnWidths?.received || 110,
    },

    // Pending
    {
      accessorKey: "pending",
      header: ({ column }) => (
        <SortableHeader column={column}>Pending</SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell 
          value={row.getValue("pending")} 
          currency={row.original.currency}
          className="text-orange-600 dark:text-orange-400"
        />
      ),
      size: preferences?.columnWidths?.pending || 110,
    },

    // Created Date
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <SortableHeader column={column}>Created</SortableHeader>
      ),
      cell: ({ row }) => <DateCell date={row.getValue("created_at")} />,
      size: preferences?.columnWidths?.created_at || 120,
    },

    // Actions
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionsMenu
          project={row.original}
          onEdit={onEdit}
          onStatusUpdate={onStatusUpdate}
          canUpdate={canUpdate}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 80,
    },
  ]

  // Apply column visibility preferences
  const visibleColumns = baseColumns.filter(column => {
    if (column.id === 'select' || column.id === 'actions') return true
    const columnKey = column.accessorKey as string || column.id
    return preferences?.columnVisibility?.[columnKey] !== false
  })

  // Apply column ordering if preferences exist
  if (preferences?.columnOrder && preferences.columnOrder.length > 0) {
    const orderedColumns = [...visibleColumns]
    orderedColumns.sort((a, b) => {
      const aKey = (a.accessorKey as string) || a.id || ''
      const bKey = (b.accessorKey as string) || b.id || ''
      const aIndex = preferences.columnOrder.indexOf(aKey)
      const bIndex = preferences.columnOrder.indexOf(bKey)
      
      // Keep special columns (select, actions) in their positions
      if (aKey === 'select') return -1
      if (bKey === 'select') return 1
      if (aKey === 'actions') return 1
      if (bKey === 'actions') return -1
      
      // If both columns are in the order preference, sort by that
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      
      // If only one is in the order preference, prioritize it
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      
      // If neither is in the order preference, maintain original order
      return 0
    })
    
    return orderedColumns
  }

  return visibleColumns
}