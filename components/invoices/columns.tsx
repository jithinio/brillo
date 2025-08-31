"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDownIcon, MoreHorizontalIcon, Tick01Icon, ClockIcon, DollarSend01Icon, CancelCircleIcon, ViewIcon, Edit03Icon, DownloadIcon, Delete01Icon, UserIcon, Calendar01Icon, DocumentAttachmentIcon, DollarCircleIcon, CancelIcon, ArrowRight01Icon, Activity03Icon, WorkIcon, MoneyReceiveCircleIcon, CashbackIcon, MailSend02Icon, CheckmarkCircle04Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatCurrencyWithConversion, getDefaultCurrency } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"
import { useState } from "react"

// Separate component for editable payment cell to avoid hook ordering issues
function EditablePaymentCell({ 
  invoice, 
  onPaymentUpdate 
}: { 
  invoice: Invoice, 
  onPaymentUpdate: (invoice: Invoice, paymentReceived: number) => void 
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
      onPaymentUpdate(invoice, newValue)
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
          <Edit className="ml-1 h-3 w-3 opacity-0 group-hover/payment:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

export type Invoice = {
  id: string
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  payment_received?: number
  balance_due?: number
  currency?: string
  status: string
  issue_date: string
  due_date: string
  notes?: string
  invoice_description?: string
  tax_summary?: string
  terms?: string
  created_at: string
  updated_at?: string
  clients?: {
    id?: string
    name: string
    company?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
  }
  projects?: {
    name: string
  }
  items?: {
    id: string
    item_name: string
    item_description: string
    quantity: number
    rate: number
    amount: number
  }[]
}

const statusConfig = {
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
    iconClassName: "text-blue-500",
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

interface ColumnActions {
  onViewDetails: (invoice: Invoice) => void
  onEditInvoice: (invoice: Invoice) => void
  onSendInvoice: (invoice: Invoice) => void
  onViewInvoice: (invoice: Invoice) => void
  onDeleteInvoice: (invoice: Invoice) => void
  onStatusChange: (invoice: Invoice, newStatus: string) => void
  onPaymentUpdate: (invoice: Invoice, paymentReceived: number) => void
  onClientClick: (client: { name: string; company?: string; id?: string; email?: string }) => void
  onProjectClick?: (projectName: string) => void
  downloadingPDF?: string | null
}

export function createColumns(actions: ColumnActions): ColumnDef<Invoice>[] {
  const { formatDate } = useSettings()
  
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "invoice_number",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Invoice Number</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="min-w-[120px] max-w-[150px]">
            <div className="flex items-center space-x-2">
              <HugeiconsIcon icon={DocumentAttachmentIcon} className="h-4 w-4 text-muted-foreground shrink-0"  />
              <Button
                variant="ghost"
                className="p-0 h-auto font-medium text-sm"
                onClick={() => actions.onViewDetails(invoice)}
                title={invoice.invoice_number}
              >
                <span className="truncate">{invoice.invoice_number}</span>
              </Button>
            </div>
          </div>
        )
      },
      size: 150,
      enableHiding: false,
    },
    {
      id: "client",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Client</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original.clients
        return client ? (
          <div className="flex items-center space-x-2 min-w-[120px] max-w-[150px]">
            <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-muted-foreground shrink-0"  />
            <Button
              variant="ghost"
              className="p-0 h-auto font-medium text-sm"
              onClick={() => actions.onClientClick(client)}
              title={client.name}
            >
              <span className="truncate">{client.name}</span>
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[120px] block">No client</span>
        )
      },
      size: 150,
      enableHiding: true,
    },
    {
      id: "project",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-normal flex items-center gap-2"
        >
          <HugeiconsIcon icon={WorkIcon} className="h-3 w-3 text-muted-foreground"  />
          Project
          <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
        </Button>
      ),
      cell: ({ row }) => {
        const project = row.original.projects
        return project ? (
          <div className="min-w-[120px] max-w-[150px]">
            <Button
              variant="ghost"
              className="p-0 h-auto font-medium text-sm truncate"
              onClick={() => {
                if (actions.onProjectClick) {
                  actions.onProjectClick(project.name)
                } else {
                  // Fallback to navigating to projects page
                  window.location.href = '/dashboard/projects'
                }
              }}
              title={project.name}
            >
              <span className="truncate">{project.name}</span>
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm min-w-[120px] block">—</span>
        )
      },
      size: 150,
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <HugeiconsIcon icon={Activity03Icon} className="mr-2 h-3 w-3 text-muted-foreground"  />
            <span className="truncate min-w-0 flex-1 text-left">Status</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const config = statusConfig[status as keyof typeof statusConfig]

        if (!config) {
          return <span className="text-muted-foreground">Unknown</span>
        }

        const Icon = config.icon

        return (
          <div className="min-w-[100px]">
            <Badge 
              variant={config.variant}
              className="text-zinc-700 font-normal text-sm whitespace-nowrap"
            >

              {config.label}
            </Badge>
          </div>
        )
      },
      size: 144,
      minSize: 144,
      enableHiding: true,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Total Amount</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = row.getValue("total_amount") as number
        const invoice = row.original
        const invoiceCurrency = invoice.currency || getDefaultCurrency()
        const defaultCurrency = getDefaultCurrency()
        
        return (
          <div className="min-w-[120px] max-w-[180px]">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-normal">
                  {formatCurrency(amount, invoiceCurrency)}
                </span>
                {invoiceCurrency && invoiceCurrency !== defaultCurrency && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {invoiceCurrency}
                  </Badge>
                )}
              </div>
              {invoiceCurrency !== defaultCurrency && (
                <span className="text-xs text-muted-foreground">
                  {formatCurrencyWithConversion(amount, invoiceCurrency, defaultCurrency)}
                </span>
              )}
            </div>
          </div>
        )
      },
      size: 180,
      enableHiding: true,
    },
    {
      accessorKey: "payment_received",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <HugeiconsIcon icon={MoneyReceiveCircleIcon} className="mr-2 h-3 w-3 text-muted-foreground"  />
            <span className="truncate min-w-0 flex-1 text-left">Received</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <EditablePaymentCell 
            invoice={invoice} 
            onPaymentUpdate={actions.onPaymentUpdate} 
          />
        )
      },
      size: 168,
      minSize: 168,
      enableHiding: true,
    },
    {
      accessorKey: "balance_due",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <HugeiconsIcon icon={CashbackIcon} className="mr-2 h-3 w-3 text-muted-foreground"  />
            <span className="truncate min-w-0 flex-1 text-left">Balance Due</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
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
      size: 140,
      enableHiding: true,
    },
    {
      accessorKey: "issue_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Issue Date</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const issueDate = row.getValue("issue_date") as string
        if (issueDate) {
          const date = new Date(issueDate)
          return (
            <div className="min-w-[100px] max-w-[120px]">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{formatDate(date)}</span>
              </div>
            </div>
          )
        }
        return <span className="text-muted-foreground min-w-[100px] block">—</span>
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Due Date</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
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
            <div className="min-w-[172px]">
              <div className="w-full max-w-full flex items-center gap-1 overflow-hidden pr-1">
                <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                  <span className="text-sm truncate block w-full">{formatDate(date)}</span>
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
              {status !== "paid" && status !== "cancelled" && !showOverdueBadge && (
                <div
                  className={`text-xs truncate ${
                    diffDays < 0 ? "text-red-600" : diffDays <= 7 ? "text-yellow-600" : "text-muted-foreground"
                  }`}
                >
                  {diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`}
                </div>
              )}
            </div>
          )
        }
        return <span className="text-muted-foreground min-w-[172px] block">—</span>
      },
      size: 172,
      enableHiding: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal w-full max-w-full overflow-hidden flex items-center justify-start"
          >
            <span className="truncate min-w-0 flex-1 text-left">Created At</span>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3 flex-shrink-0" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[100px] max-w-[120px] truncate">
            {formatDate(date)}
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const invoice = row.original

        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-dashed hover:border-solid"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4"  />
                  <span className="sr-only">Open actions menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => actions.onViewDetails(invoice)} className="whitespace-nowrap">
                  <HugeiconsIcon icon={ViewIcon} className="mr-2 h-4 w-4"  />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onEditInvoice(invoice)} className="whitespace-nowrap">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Status Change Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="whitespace-nowrap">
                    <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4"  />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'draft')}
                      disabled={invoice.status === 'draft'}
                    >
                      <HugeiconsIcon icon={ClockIcon} className="mr-2 h-4 w-4 text-muted-foreground"  />
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'sent')}
                      disabled={invoice.status === 'sent'}
                    >
                      <HugeiconsIcon icon={DollarSend01Icon} className="mr-2 h-4 w-4 text-blue-600"  />
                      Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'partially_paid')}
                      disabled={invoice.status === 'partially_paid'}
                    >
                      <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4 text-yellow-600"  />
                      Partially Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'paid')}
                      disabled={invoice.status === 'paid'}
                    >
                      <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4 text-green-600"  />
                      Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'overdue')}
                      disabled={invoice.status === 'overdue'}
                    >
                      <HugeiconsIcon icon={CancelCircleIcon} className="mr-2 h-4 w-4 text-red-600"  />
                      Overdue
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'cancelled')}
                      disabled={invoice.status === 'cancelled'}
                    >
                      <HugeiconsIcon icon={CancelCircleIcon} className="mr-2 h-4 w-4 text-muted-foreground"  />
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onSendInvoice(invoice)} className="whitespace-nowrap">
                  <HugeiconsIcon icon={MailSend02Icon} className="mr-2 h-4 w-4"  />
                  Send Invoice
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => actions.onViewInvoice(invoice)} 
                  className="whitespace-nowrap"
                >
                  <HugeiconsIcon icon={ViewIcon} className="mr-2 h-4 w-4"  />
                  View PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => actions.onDeleteInvoice(invoice)}
                  className="text-destructive whitespace-nowrap"
                >
                  <HugeiconsIcon icon={Delete01Icon} className="mr-2 h-4 w-4"  />
                  Delete Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      size: 36,
    },
  ]
} 