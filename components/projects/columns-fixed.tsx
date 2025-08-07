"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
  Eye,
  Edit,
  FileText,
  Trash2,
  Calendar,
  GitBranch,
  User,
  Activity,
  DollarSign,
  Minus,
  Plus,
  CalendarDays,
  Building2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

export type Project = {
  id: string
  name: string
  status: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
  start_date: string | null
  due_date: string | null
  budget: number | null
  total_budget: number | null
  expenses: number | null
  received: number | null
  pending: number | null
  recurring_amount?: number | null
  hourly_rate?: number | null
  hourly_rate_new?: number | null
  actual_hours?: number | null
  total_hours_logged?: number | null
  estimated_hours?: number | null
  created_at: string
  updated_at: string
  clients?: {
    id: string
    name: string
    company?: string
    avatar_url?: string
  } | null
}

interface ColumnActions {
  onEditProject: (project: Project) => void
  onCreateInvoice: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onStatusChange: (project: Project, newStatus: string) => void
  onDateChange: (project: Project, field: 'start_date' | 'due_date', date: Date | undefined) => void
}

// Fixed column widths to prevent layout shift
const COLUMN_WIDTHS = {
  select: 50,
  name: 280,      // Fixed width for project name
  client: 200,    // Fixed width for client
  status: 120,    // Fixed width for status
  dates: 140,     // Fixed width for dates
  budget: 110,    // Fixed width for budget
  expenses: 110,  // Fixed width for expenses
  received: 110,  // Fixed width for received
  pending: 110,   // Fixed width for pending
  actions: 80,    // Fixed width for actions
} as const

// Status configuration with flat colors
const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: Activity,
    variant: "default" as const,
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
  pipeline: {
    label: "Pipeline", 
    icon: GitBranch,
    variant: "secondary" as const,
    className: "bg-sky-100 text-sky-800 hover:bg-sky-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    variant: "outline" as const,
    className: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    variant: "secondary" as const,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    variant: "destructive" as const,
    className: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  },
} as const

// Reusable sortable header component with fixed width
function SortableHeader({ 
  column, 
  children, 
  className,
  width 
}: { 
  column: any
  children: React.ReactNode
  className?: string
  width: number
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2 text-left justify-start font-medium text-xs",
        "hover:bg-muted/50 data-[state=open]:bg-accent",
        className
      )}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span className="truncate">{children}</span>
      <div className="ml-auto flex-shrink-0">
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3" />
        )}
      </div>
    </Button>
  )
}

// Status badge component with consistent sizing
function StatusBadge({ status, onStatusChange, project }: { 
  status: string
  onStatusChange: (project: Project, newStatus: string) => void
  project: Project
}) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pipeline
  const Icon = config.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-7 px-2 gap-1 text-xs font-medium rounded-full cursor-pointer",
            "border transition-colors duration-200",
            config.className,
            "hover:shadow-sm min-w-[100px] justify-center" // Fixed minimum width
          )}
        >
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{config.label}</span>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(STATUS_CONFIG).map(([value, config]) => {
          const Icon = config.icon
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => onStatusChange(project, value)}
              className="gap-2"
            >
              <Icon className="h-3 w-3" />
              {config.label}
              {status === value && <CheckCircle className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Client cell component with consistent sizing
function ClientCell({ client }: { client: Project['clients'] }) {
  if (!client) {
    return (
      <div className="flex items-center gap-2" style={{ width: `${COLUMN_WIDTHS.client}px` }}>
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs bg-muted">?</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">No client</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2" style={{ width: `${COLUMN_WIDTHS.client}px` }}>
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage src={client.avatar_url || ''} alt={client.name} />
        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
          {client.name?.charAt(0)?.toUpperCase() || 'C'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" title={client.name}>
          {client.name}
        </p>
        {client.company && (
          <p className="text-xs text-muted-foreground truncate" title={client.company}>
            {client.company}
          </p>
        )}
      </div>
    </div>
  )
}

// Currency cell component with consistent width
function CurrencyCell({ amount, className }: { amount: number | null, className?: string }) {
  return (
    <div 
      className={cn("text-right tabular-nums", className)}
      style={{ width: `${COLUMN_WIDTHS.budget}px` }}
    >
      <span className="text-sm font-medium">
        {amount ? formatCurrency(amount) : '—'}
      </span>
    </div>
  )
}

// Date cell component
function DateCell({ date, className }: { date: string | null, className?: string }) {
  if (!date) {
    return (
      <div 
        className={cn("text-sm text-muted-foreground", className)}
        style={{ width: `${COLUMN_WIDTHS.dates}px` }}
      >
        —
      </div>
    )
  }

  const formatted = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  })

  return (
    <div 
      className={cn("text-sm", className)}
      style={{ width: `${COLUMN_WIDTHS.dates}px` }}
      title={new Date(date).toLocaleDateString()}
    >
      {formatted}
    </div>
  )
}

export function createFixedColumns(actions: ColumnActions): ColumnDef<Project>[] {
  return [
    // Select column
    {
      id: "select",
      size: COLUMN_WIDTHS.select,
      minSize: COLUMN_WIDTHS.select,
      maxSize: COLUMN_WIDTHS.select,
      header: ({ table }) => (
        <div style={{ width: `${COLUMN_WIDTHS.select}px` }}>
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div style={{ width: `${COLUMN_WIDTHS.select}px` }}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // Project name column - Fixed width to prevent resizing
    {
      accessorKey: "name",
      size: COLUMN_WIDTHS.name,
      minSize: COLUMN_WIDTHS.name,
      maxSize: COLUMN_WIDTHS.name,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.name}>
          Project Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string
        return (
          <div 
            className="flex items-center gap-2 min-w-0"
            style={{ width: `${COLUMN_WIDTHS.name}px` }}
          >
            <div className="flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p 
                className="font-medium text-sm truncate" 
                title={name}
                style={{ maxWidth: `${COLUMN_WIDTHS.name - 24}px` }}
              >
                {name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                ID: {row.original.id.slice(-8)}
              </p>
            </div>
          </div>
        )
      },
    },

    // Client column - Fixed width
    {
      accessorKey: "clients",
      size: COLUMN_WIDTHS.client,
      minSize: COLUMN_WIDTHS.client,
      maxSize: COLUMN_WIDTHS.client,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.client}>
          Client
        </SortableHeader>
      ),
      cell: ({ row }) => <ClientCell client={row.original.clients} />,
    },

    // Status column - Fixed width
    {
      accessorKey: "status",
      size: COLUMN_WIDTHS.status,
      minSize: COLUMN_WIDTHS.status,
      maxSize: COLUMN_WIDTHS.status,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.status}>
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div style={{ width: `${COLUMN_WIDTHS.status}px` }}>
          <StatusBadge
            status={row.original.status}
            onStatusChange={actions.onStatusChange}
            project={row.original}
          />
        </div>
      ),
    },

    // Project Type column
    {
      accessorKey: "project_type",
      size: 100,
      minSize: 100,
      maxSize: 100,
      header: ({ column }) => (
        <SortableHeader column={column} width={100}>
          Type
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const projectType = row.original.project_type || 'fixed'
                  const config = {
            fixed: { label: 'Fixed', color: 'bg-emerald-100 text-emerald-800 ring-emerald-700/20' },
            recurring: { label: 'Recurring', color: 'bg-sky-100 text-sky-800 ring-sky-700/20' },
            hourly: { label: 'Hourly', color: 'bg-violet-100 text-violet-800 ring-violet-700/20' },
          }[projectType]
        
        return (
          <div style={{ width: '100px' }}>
            <Badge variant="outline" className={`${config.color} border-0 ring-1 ring-inset text-xs font-medium`}>
              {config.label}
            </Badge>
          </div>
        )
      },
    },

    // Start date column
    {
      accessorKey: "start_date",
      size: COLUMN_WIDTHS.dates,
      minSize: COLUMN_WIDTHS.dates,
      maxSize: COLUMN_WIDTHS.dates,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.dates}>
          Start Date
        </SortableHeader>
      ),
      cell: ({ row }) => <DateCell date={row.original.start_date} />,
    },

    // Due date column
    {
      accessorKey: "due_date",
      size: COLUMN_WIDTHS.dates,
      minSize: COLUMN_WIDTHS.dates,
      maxSize: COLUMN_WIDTHS.dates,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.dates}>
          Due Date
        </SortableHeader>
      ),
      cell: ({ row }) => <DateCell date={row.original.due_date} />,
    },

    // Budget column
    {
      accessorKey: "total_budget",
      size: COLUMN_WIDTHS.budget,
      minSize: COLUMN_WIDTHS.budget,
      maxSize: COLUMN_WIDTHS.budget,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.budget}>
          Budget
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell
          amount={row.original.total_budget || row.original.budget}
          className="text-blue-600 font-semibold"
        />
      ),
    },

    // Expenses column
    {
      accessorKey: "expenses",
      size: COLUMN_WIDTHS.expenses,
      minSize: COLUMN_WIDTHS.expenses,
      maxSize: COLUMN_WIDTHS.expenses,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.expenses}>
          Expenses
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell
          amount={row.original.expenses}
          className="text-red-600"
        />
      ),
    },

    // Received column
    {
      accessorKey: "received",
      size: COLUMN_WIDTHS.received,
      minSize: COLUMN_WIDTHS.received,
      maxSize: COLUMN_WIDTHS.received,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.received}>
          Received
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <CurrencyCell
          amount={row.original.received}
          className="text-green-600 font-semibold"
        />
      ),
    },

    // Pending column
    {
      accessorKey: "pending",
      size: COLUMN_WIDTHS.pending,
      minSize: COLUMN_WIDTHS.pending,
      maxSize: COLUMN_WIDTHS.pending,
      header: ({ column }) => (
        <SortableHeader column={column} width={COLUMN_WIDTHS.pending}>
          Pending
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        // Calculate pending dynamically: total_budget - payment_received for new types, budget - received for legacy
        const budget = project.total_budget || project.budget || 0
        const received = project.payment_received || project.received || 0
        const pending = Math.max(0, budget - received)
        
        return (
          <CurrencyCell
            amount={pending}
            className="text-orange-600"
          />
        )
      },
    },

    // Actions column
    {
      id: "actions",
      size: COLUMN_WIDTHS.actions,
      minSize: COLUMN_WIDTHS.actions,
      maxSize: COLUMN_WIDTHS.actions,
      header: () => (
        <div style={{ width: `${COLUMN_WIDTHS.actions}px` }} className="text-center">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <div style={{ width: `${COLUMN_WIDTHS.actions}px` }} className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onEditProject(project)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onCreateInvoice(project)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => actions.onDeleteProject(project)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
} 