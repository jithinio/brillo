"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Send,
  XCircle,
  Eye,
  Edit,
  Download,
  Trash2,
  User,
  Calendar,
  FileText,
  DollarSign,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { formatCurrency, formatCurrencyWithConversion, getDefaultCurrency } from "@/lib/currency"

export type Invoice = {
  id: string
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  currency?: string
  status: string
  issue_date: string
  due_date: string
  notes?: string
  created_at: string
  clients?: {
    id?: string
    name: string
    company?: string
  }
  projects?: {
    name: string
  }
  items?: {
    id: string
    description: string
    quantity: number
    rate: number
    amount: number
  }[]
}

const statusConfig = {
  draft: {
    label: "Draft",
    icon: Clock,
    className: "text-gray-700",
    color: "bg-gray-100",
  },
  sent: {
    label: "Sent",
    icon: Send,
    className: "text-blue-700",
    color: "bg-blue-100",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    className: "text-green-700",
    color: "bg-green-100",
  },
  overdue: {
    label: "Overdue",
    icon: XCircle,
    className: "text-red-700",
    color: "bg-red-100",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "text-gray-600",
    color: "bg-gray-50",
  },
}

interface ColumnActions {
  onViewDetails: (invoice: Invoice) => void
  onEditInvoice: (invoice: Invoice) => void
  onSendInvoice: (invoice: Invoice) => void
  onDownloadPDF: (invoice: Invoice) => void
  onDeleteInvoice: (invoice: Invoice) => void
  onStatusChange: (invoice: Invoice, newStatus: string) => void
  onClientClick: (client: { name: string; company?: string; id?: string }) => void
  downloadingPDF?: string | null
}

export function createColumns(actions: ColumnActions): ColumnDef<Invoice>[] {
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
            className="h-auto p-0 font-medium"
          >
            Invoice #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="min-w-[120px] max-w-[150px]">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-sm hover:underline"
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
            className="h-auto p-0 font-medium"
          >
            Client
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original.clients
        return client ? (
          <div className="flex items-center space-x-2 min-w-[120px] max-w-[150px]">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-sm hover:underline"
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
      header: "Project",
      cell: ({ row }) => {
        const project = row.original.projects
        return project ? (
          <div className="min-w-[120px] max-w-[150px]">
            <div className="truncate text-sm" title={project.name}>
              {project.name}
            </div>
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
      header: "Status",
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
              variant="secondary" 
              className={`font-normal ${config.color} ${config.className}`}
            >
              <Icon className="mr-1.5 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        )
      },
      size: 100,
      enableHiding: true,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Total Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
            <span className="font-medium">
              {invoiceCurrency !== defaultCurrency 
                ? formatCurrencyWithConversion(amount, invoiceCurrency, defaultCurrency)
                : formatCurrency(amount, invoiceCurrency)
              }
            </span>
          </div>
        )
      },
      size: 180,
      enableHiding: true,
    },
    {
      accessorKey: "issue_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Issue Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{date.toLocaleDateString()}</span>
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
            className="h-auto p-0 font-medium"
          >
            Due Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const dueDate = row.getValue("due_date") as string
        const status = row.original.status
        
        if (dueDate) {
          const date = new Date(dueDate)
          const today = new Date()
          const diffTime = date.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          return (
            <div className="min-w-[120px] max-w-[140px]">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{date.toLocaleDateString()}</span>
              </div>
              {status !== "paid" && status !== "cancelled" && (
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
        return <span className="text-muted-foreground min-w-[120px] block">—</span>
      },
      size: 140,
      enableHiding: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[100px] max-w-[120px] truncate">
            {date.toLocaleDateString()}
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
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open actions menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => actions.onViewDetails(invoice)} className="whitespace-nowrap">
                  <Eye className="mr-2 h-4 w-4" />
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
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'draft')}
                      disabled={invoice.status === 'draft'}
                    >
                      <Clock className="mr-2 h-4 w-4 text-gray-600" />
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'sent')}
                      disabled={invoice.status === 'sent'}
                    >
                      <Send className="mr-2 h-4 w-4 text-blue-600" />
                      Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'paid')}
                      disabled={invoice.status === 'paid'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'overdue')}
                      disabled={invoice.status === 'overdue'}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Overdue
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(invoice, 'cancelled')}
                      disabled={invoice.status === 'cancelled'}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-gray-600" />
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onSendInvoice(invoice)} className="whitespace-nowrap">
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => actions.onDownloadPDF(invoice)} 
                  className="whitespace-nowrap"
                  disabled={actions.downloadingPDF === invoice.id}
                >
                  {actions.downloadingPDF === invoice.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => actions.onDeleteInvoice(invoice)}
                  className="text-destructive whitespace-nowrap"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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