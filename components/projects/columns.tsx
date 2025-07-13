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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { ClientAvatar } from "@/components/ui/client-avatar"

export type Project = {
  id: string
  name: string
  status: string
  start_date?: string
  end_date?: string
  budget?: number
  expenses?: number
  received?: number
  pending?: number
  created_at: string
  clients?: {
    name: string
    company?: string
    avatar_url?: string | null
  }
}

const statusConfig = {
  active: {
    label: "Active",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
}

interface ColumnActions {
  onEditProject: (project: Project) => void
  onCreateInvoice: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onStatusChange: (project: Project, newStatus: string) => void
}

export function createColumns(actions: ColumnActions): ColumnDef<Project>[] {
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Project Name
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const project = row.original
        return (
          <div className="min-w-[200px] max-w-[250px]">
            <div 
              className="truncate font-medium cursor-pointer transition-colors" 
              title={project.name}
              onClick={() => actions.onEditProject(project)}
            >
              {project.name}
            </div>
          </div>
        )
      },
      size: 250,
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
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original.clients
        return client ? (
          <div className="flex items-center space-x-2 min-w-[150px] max-w-[180px]">
            <ClientAvatar name={client.name} avatarUrl={client.avatar_url} size="sm" />
            <div className="truncate font-normal" title={client.name}>
              {client.name}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[150px] block">No client</span>
        )
      },
      size: 180,
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Status
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const project = row.original
        const status = row.getValue("status") as string
        const config = statusConfig[status as keyof typeof statusConfig]

        if (!config) {
          return <span className="text-muted-foreground">Unknown</span>
        }

        const Icon = config.icon

        return (
          <div className="min-w-[120px]">
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant={config.variant} className="cursor-pointer hover:bg-slate-100 transition-colors font-normal text-sm focus:outline-none focus-visible:outline-none">
                  <Icon className={`mr-1.5 h-3 w-3 ${config.iconClassName}`} />
                  {config.label}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="grid gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'active' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'active')}
                    disabled={project.status === 'active'}
                  >
                    <Clock className="mr-2 h-3 w-3 text-green-500" />
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'completed' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'completed')}
                    disabled={project.status === 'completed'}
                  >
                    <CheckCircle className="mr-2 h-3 w-3 text-blue-500" />
                    Completed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'on_hold' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'on_hold')}
                    disabled={project.status === 'on_hold'}
                  >
                    <Pause className="mr-2 h-3 w-3 text-yellow-500" />
                    On Hold
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${project.status === 'cancelled' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(project, 'cancelled')}
                    disabled={project.status === 'cancelled'}
                  >
                    <XCircle className="mr-2 h-3 w-3 text-red-500" />
                    Cancelled
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "budget",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Budget
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const budget = row.getValue("budget") as number
        return (
          <div className="min-w-[100px] max-w-[120px]">
            {budget ? (
              <span className="truncate font-normal">{formatCurrency(budget)}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "expenses",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Expenses
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const expenses = row.getValue("expenses") as number
        return (
          <div className="min-w-[100px] max-w-[120px]">
            {expenses ? (
              <span className="truncate font-normal">{formatCurrency(expenses)}</span>
            ) : (
              <span className="text-muted-foreground">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "received",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Received
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const received = row.getValue("received") as number
        return (
          <div className="min-w-[100px] max-w-[120px]">
            {received ? (
              <span className="truncate font-normal">{formatCurrency(received)}</span>
            ) : (
              <span className="text-muted-foreground">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "pending",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Pending
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const project = row.original
        // Auto-calculate pending amount: budget - received = pending
        const budget = project.budget || 0
        const received = project.received || 0
        const pending = Math.max(0, budget - received) // Ensure it's not negative
        
        return (
          <div className="min-w-[100px] max-w-[120px]">
            <span className="truncate font-normal">{formatCurrency(pending)}</span>
          </div>
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      accessorKey: "end_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Due Date
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const endDate = row.getValue("end_date") as string
        if (endDate) {
          const date = new Date(endDate)

          return (
            <div className="min-w-[120px] max-w-[140px]">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{date.toLocaleDateString()}</span>
              </div>
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
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
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
        const project = row.original

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
                
                <DropdownMenuItem onClick={() => actions.onEditProject(project)} className="whitespace-nowrap">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
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
                      onClick={() => actions.onStatusChange(project, 'active')}
                      disabled={project.status === 'active'}
                    >
                      <Clock className="mr-2 h-4 w-4 text-green-600" />
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(project, 'completed')}
                      disabled={project.status === 'completed'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(project, 'on_hold')}
                      disabled={project.status === 'on_hold'}
                    >
                      <Pause className="mr-2 h-4 w-4 text-yellow-600" />
                      On Hold
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(project, 'cancelled')}
                      disabled={project.status === 'cancelled'}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onCreateInvoice(project)} className="whitespace-nowrap">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive whitespace-nowrap"
                  onClick={() => actions.onDeleteProject(project)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
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
