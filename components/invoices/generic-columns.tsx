"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  CheckCircle,
  Clock,
  Send,
  XCircle,
  FileText,
  User,
  Building2,
  Briefcase,
  Activity,
  Calendar,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { Invoice } from "@/hooks/use-invoices"
import { SortableHeader } from "@/components/table/column-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const invoiceStatusConfig = {
  draft: {
    label: "Draft",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-gray-500",
  },
  sent: {
    label: "Sent",
    icon: Send,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  overdue: {
    label: "Overdue",
    icon: XCircle,
    variant: "outline" as const,
    iconClassName: "text-red-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
}

interface InvoiceColumnConfig {
  onStatusChange?: (invoice: Invoice, newStatus: string) => void
  refetch?: () => void
}

export function createInvoiceColumns(columnConfig: InvoiceColumnConfig): ColumnDef<Invoice>[] {
  
  const columns: ColumnDef<Invoice>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center w-full">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="h-4 w-4"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="h-4 w-4"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "invoice_number",
      header: ({ column }) => (
        <SortableHeader column={column} icon={FileText} className="px-0">
          Invoice #
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoiceNumber = row.getValue("invoice_number") as string
        return (
          <span className="font-medium text-sm">
            {invoiceNumber}
          </span>
        )
      },
      size: 150,
    },
    {
      accessorKey: "client",
      header: ({ column }) => (
        <SortableHeader column={column} icon={User} className="px-0">
          Client
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        const clientName = invoice.clients?.name || "Unknown Client"
        
        return (
          <span className="text-sm">
            {clientName}
          </span>
        )
      },
      size: 200,
    },
    {
      accessorKey: "project",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Briefcase} className="px-0">
          Project
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        const projectName = invoice.projects?.name || "No Project"
        
        return (
          <span className="text-sm text-muted-foreground">
            {projectName}
          </span>
        )
      },
      size: 200,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Activity} className="px-0">
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const config = invoiceStatusConfig[status as keyof typeof invoiceStatusConfig] || invoiceStatusConfig.draft
        const Icon = config.icon
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer">
                <Icon className={`h-3 w-3 ${config.iconClassName}`} />
                <span>{config.label}</span>
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(invoiceStatusConfig).map(([key, statusConfig]) => {
                const StatusIcon = statusConfig.icon
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => columnConfig.onStatusChange?.(row.original, key)}
                    disabled={status === key}
                  >
                    <StatusIcon className={`mr-2 h-3 w-3 ${statusConfig.iconClassName}`} />
                    {statusConfig.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 120,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarSign} className="px-0">
          Amount
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("total_amount") as number
        return (
          <span className="font-medium text-sm">
            {formatCurrency(amount)}
          </span>
        )
      },
      size: 150,
    },
    {
      accessorKey: "issue_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar} className="px-0">
          Issue Date
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const date = row.getValue("issue_date") as string
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        )
      },
      size: 120,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar} className="px-0">
          Due Date
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const date = row.getValue("due_date") as string
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        )
      },
      size: 120,
    },
  ]

  return columns
} 