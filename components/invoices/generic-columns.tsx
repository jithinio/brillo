"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontalIcon, Tick01Icon, ClockIcon, DollarSend01Icon, CancelCircleIcon, DocumentAttachmentIcon, UserIcon, Building02Icon, BriefcaseIcon, ActivityIcon, Calendar01Icon, DollarCircleIcon, Edit03Icon, CancelIcon, Activity03Icon, WorkIcon, MoneyReceiveCircleIcon, CashbackIcon, SentIcon, CheckmarkCircle04Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatCurrency, getDefaultCurrency } from "@/lib/currency"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import { Invoice } from "@/hooks/use-invoices"
import { SortableHeader } from "@/components/table/column-utils"
import { ClientAvatar } from "@/components/ui/client-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

// Separate component for editable payment cell to avoid hook ordering issues
function EditablePaymentCell({ 
  invoice, 
  onPaymentUpdate 
}: { 
  invoice: Invoice, 
  onPaymentUpdate?: (invoice: Invoice, paymentReceived: number) => void 
}) {
  const invoiceCurrency = invoice.currency || getDefaultCurrency()
  const paymentReceived = invoice.payment_received || 0
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(paymentReceived.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(paymentReceived.toString())
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0
    if (newValue !== paymentReceived && newValue >= 0 && newValue <= (invoice.total_amount || 0)) {
      onPaymentUpdate?.(invoice, newValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(paymentReceived.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="w-[148px] max-w-[148px] overflow-hidden">
      {isEditing ? (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm border border-input bg-background px-2 py-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full max-w-full"
          step="0.01"
          min="0"
          max={invoice.total_amount || 0}
          autoFocus
        />
      ) : (
        <div 
          className="cursor-pointer overflow-hidden flex items-center group/payment"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm truncate flex-1 min-w-0">
            {formatCurrency(paymentReceived, invoiceCurrency)}
          </span>
          <HugeiconsIcon icon={Edit03Icon} className="ml-1 h-3 w-3 opacity-0 group-hover/payment:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

const invoiceStatusConfig = {
  draft: {
    label: "Draft",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-muted-foreground",
  },
  sent: {
    label: "Sent",
    icon: SentIcon,
    variant: "outline" as const,
    iconClassName: "text-primary",
  },
  partially_paid: {
    label: "Partially Paid",
    icon: CheckmarkCircle04Icon,
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
  },
  paid: {
    label: "Paid",
    icon: CheckmarkCircle04Icon,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  overdue: {
    label: "Overdue",
    icon: CancelCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-red-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: CancelCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-muted-foreground",
  },
}

interface InvoiceColumnConfig {
  onStatusChange?: (invoice: Invoice, newStatus: string) => void
  onPaymentUpdate?: (invoice: Invoice, paymentReceived: number) => void
  refetch?: () => void
  onInvoiceClick?: (invoice: Invoice) => void
  editingInvoiceId?: string | null
  formatDate?: (date: Date) => string
}

// Footer cell components
const FooterCell = ({ value, label }: { value: number | string; label?: string }) => (
  <div className="text-sm font-medium text-foreground flex items-center justify-between">
    {label && <span className="text-xs text-muted-foreground mr-2">{label}</span>}
    <span>{value}</span>
  </div>
)

const CurrencyFooterCell = ({ value }: { value: number }) => (
  <div className="text-right text-sm font-normal text-muted-foreground">
    {formatCurrencyAbbreviated(value)}
  </div>
)

// Create footer functions
const createFooterFunctions = () => ({
  totalInvoices: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <span className="text-sm font-normal text-muted-foreground">{aggregations.totalInvoices || 0}</span>
  },
  totalAmount: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalAmount || 0} />
  },
  paidAmount: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.paidAmount || 0} />
  },
  pendingAmount: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.pendingAmount || 0} />
  },
  overdueAmount: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.overdueAmount || 0} />
  },
  totalPaymentReceived: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalPaymentReceived || 0} />
  },
  totalBalanceDue: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <CurrencyFooterCell value={aggregations.totalBalanceDue || 0} />
  }
})

export function createInvoiceColumns(columnConfig: InvoiceColumnConfig): ColumnDef<Invoice>[] {
  
  const footerFunctions = createFooterFunctions()
  const formatDate = columnConfig.formatDate || ((date: Date) => date.toLocaleDateString())
  
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
        <SortableHeader column={column} icon={DocumentAttachmentIcon} className="px-0">
          Invoice Number
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoiceNumber = row.getValue("invoice_number") as string
        const invoice = row.original
        
        return (
          <button
            onClick={() => columnConfig.onInvoiceClick?.(invoice)}
            onMouseEnter={() => {
              // Preload the preview page on hover for faster navigation
              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => {
                  const link = document.createElement('link')
                  link.rel = 'prefetch'
                  link.href = `/dashboard/invoices/${invoice.id}/preview`
                  document.head.appendChild(link)
                })
              }
            }}
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
          >
            {invoiceNumber}
          </button>
        )
      },
      footer: footerFunctions.totalInvoices,
      size: 150,
    },
    {
      accessorKey: "client",
      header: ({ column }) => (
        <SortableHeader column={column} icon={UserIcon} className="px-0">
          Client
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        const clientName = invoice.clients?.name || "Unknown Client"
        
        return (
          <div className="flex items-center space-x-3">
            <ClientAvatar 
              name={clientName} 
              avatarUrl={invoice.clients?.avatar_url}
              size="sm"
            />
            <span className="text-sm truncate" title={clientName}>
              {clientName}
            </span>
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "project",
      header: ({ column }) => (
        <SortableHeader column={column} icon={WorkIcon} className="px-0">
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
        <SortableHeader column={column} icon={Activity03Icon} className="px-0">
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
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer font-normal text-sm whitespace-nowrap">
                <HugeiconsIcon icon={Icon} className={`h-3 w-3 ${config.iconClassName}`} />
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
                    <HugeiconsIcon icon={StatusIcon} className={`mr-2 h-3 w-3 ${statusConfig.iconClassName}`} />
                    {statusConfig.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 144,
      minSize: 144,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarCircleIcon} className="px-0">
          Total Amount
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("total_amount") as number
        const invoice = row.original
        const invoiceCurrency = invoice.currency || 'USD'
        
        return (
          <div className="min-w-[120px] max-w-[180px]">
            <div className="flex items-center space-x-2">
              <span className="font-normal text-sm">
                {formatCurrency(amount, invoiceCurrency)}
              </span>
              {invoiceCurrency && invoiceCurrency !== getDefaultCurrency() && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {invoiceCurrency}
                </Badge>
              )}
            </div>
          </div>
        )
      },
      footer: footerFunctions.totalAmount,
      size: 180,
    },
    {
      accessorKey: "payment_received",
      header: ({ column }) => (
        <SortableHeader column={column} icon={MoneyReceiveCircleIcon} className="px-0">
          Received
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <EditablePaymentCell 
            invoice={invoice} 
            onPaymentUpdate={columnConfig.onPaymentUpdate} 
          />
        )
      },
      footer: footerFunctions.totalPaymentReceived,
      size: 148,
      minSize: 148,
    },
    {
      accessorKey: "balance_due",
      header: ({ column }) => (
        <SortableHeader column={column} icon={CashbackIcon} className="px-0">
          Balance Due
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        const invoiceCurrency = invoice.currency || getDefaultCurrency()
        const balanceDue = invoice.balance_due || (invoice.total_amount || 0) - (invoice.payment_received || 0)
        
        // Check if due date has passed
        const dueDate = new Date(invoice.due_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate day calculation
        const dueDateOnly = new Date(dueDate)
        dueDateOnly.setHours(0, 0, 0, 0)
        const isDueDatePassed = dueDateOnly.getTime() < today.getTime()
        
        // Check if invoice is overdue or due date has passed
        const isOverdue = invoice.status === 'overdue'
        const shouldShowRed = (isOverdue || isDueDatePassed) && balanceDue > 0
        
        return (
          <div className="min-w-[120px] max-w-[140px] overflow-hidden">
            <span className={`font-normal text-sm truncate block ${shouldShowRed ? 'text-red-600' : ''}`}>
              {formatCurrency(balanceDue, invoiceCurrency)}
            </span>
          </div>
        )
      },
      footer: footerFunctions.totalBalanceDue,
      size: 140,
    },
    {
      accessorKey: "issue_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar01Icon} className="px-0">
          Issue Date
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const date = row.getValue("issue_date") as string
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(new Date(date))}
          </span>
        )
      },
      size: 120,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar01Icon} className="px-0">
          Due Date
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const dueDate = row.getValue("due_date") as string
        const status = row.original.status
        
        if (dueDate) {
          const date = new Date(dueDate)
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate day calculation
          const dueDateOnly = new Date(date)
          dueDateOnly.setHours(0, 0, 0, 0)
          const diffTime = dueDateOnly.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const isOverdue = diffDays < 0   // Past due
          const isDueToday = diffDays === 0 // Due today
          const showOverdueBadge = (isOverdue || isDueToday) && ['sent', 'partially_paid', 'overdue'].includes(status)

                      return (
              <div className="w-full max-w-full flex items-center gap-1 overflow-hidden pr-1">
                <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                  <span className="text-sm text-muted-foreground truncate block w-full">
                    {columnConfig.formatDate ? columnConfig.formatDate(date) : date.toLocaleDateString()}
                  </span>
                </div>
                {showOverdueBadge && (
                  <div className="flex-shrink-0">
                    <Badge 
                      variant="outline"
                      className="text-xs px-1 py-0 h-4 bg-orange-100 border-orange-300 text-orange-800 whitespace-nowrap"
                    >
                      {isDueToday ? 'DUE' : `${Math.abs(diffDays)}d`}
                    </Badge>
                  </div>
                )}
              </div>
            )
        }
        return <span className="text-muted-foreground min-w-[172px] block">—</span>
      },
      size: 172,
    },
  ]

  return columns
} 