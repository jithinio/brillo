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
  Edit,
  Check,
  X,
} from "lucide-react"
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
    <div className="min-w-[148px] max-w-[148px] overflow-hidden">
      {isEditing ? (
        <div className="flex items-center gap-1 w-full overflow-hidden">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-8 text-sm border border-input bg-background px-2 py-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 min-w-0"
            step="0.01"
            min="0"
            max={invoice.total_amount || 0}
            autoFocus
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSave}
            className="h-8 w-6 p-0 flex-shrink-0"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            className="h-8 w-6 p-0 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div 
          className="cursor-pointer hover:bg-muted rounded px-2 py-1"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm">
            {formatCurrency(paymentReceived, invoiceCurrency)}
          </span>
          <Edit className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 inline" />
        </div>
      )}
    </div>
  )
}

const invoiceStatusConfig = {
  draft: {
    label: "Draft",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-muted-foreground",
  },
  sent: {
    label: "Sent",
    icon: Send,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  partially_paid: {
    label: "Partially Paid",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
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
  <div className="text-right font-mono text-sm font-normal text-muted-foreground">
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
        <SortableHeader column={column} icon={FileText} className="px-0">
          Invoice Number
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoiceNumber = row.getValue("invoice_number") as string
        const invoice = row.original
        
        return (
          <button
            onClick={() => columnConfig.onInvoiceClick?.(invoice)}
            className="font-medium text-sm cursor-pointer"
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
        <SortableHeader column={column} icon={User} className="px-0">
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
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer font-normal text-sm whitespace-nowrap">
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
      size: 144,
      minSize: 144,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarSign} className="px-0">
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
        <SortableHeader column={column} icon={DollarSign} className="px-0">
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
        <SortableHeader column={column} icon={DollarSign} className="px-0">
          Balance Due
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const invoice = row.original
        const invoiceCurrency = invoice.currency || getDefaultCurrency()
        const balanceDue = invoice.balance_due || (invoice.total_amount || 0) - (invoice.payment_received || 0)
        
        // Check if invoice is overdue
        const isOverdue = invoice.status === 'overdue'
        
        return (
          <div className="min-w-[120px] max-w-[180px]">
            <span className={`font-normal text-sm ${isOverdue && balanceDue > 0 ? 'text-red-600' : ''}`}>
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
        <SortableHeader column={column} icon={Calendar} className="px-0">
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
        <SortableHeader column={column} icon={Calendar} className="px-0">
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