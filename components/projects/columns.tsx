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
  User,
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
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"

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
  }
}

const statusConfig = {
  active: {
    label: "In Progress",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  completed: {
    label: "Done",
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
  onViewDetails: (project: Project) => void
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const project = row.original
        return (
          <div className="min-w-[200px] max-w-[250px]">
            <div 
              className="truncate font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors" 
              title={project.name}
              onClick={() => actions.onViewDetails(project)}
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original.clients
        return client ? (
          <div className="flex items-center space-x-2 min-w-[150px] max-w-[180px]">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const config = statusConfig[status as keyof typeof statusConfig]

        if (!config) {
          return <span className="text-muted-foreground">Unknown</span>
        }

        const Icon = config.icon

        return (
          <div className="min-w-[120px]">
            <Badge variant={config.variant} className="text-zinc-700 font-medium">
              <Icon className={`mr-1.5 h-3 w-3 ${config.iconClassName}`} />
              {config.label}
            </Badge>
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const pending = row.getValue("pending") as number
        return (
          <div className="min-w-[100px] max-w-[120px]">
            {pending ? (
              <span className="truncate font-normal">{formatCurrency(pending)}</span>
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
      accessorKey: "end_date",
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
        const endDate = row.getValue("end_date") as string
        if (endDate) {
          const date = new Date(endDate)
          const today = new Date()
          const diffTime = date.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          return (
            <div className="min-w-[120px] max-w-[140px]">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{date.toLocaleDateString()}</span>
              </div>
              {row.original.status !== "completed" && (
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
                <DropdownMenuItem onClick={() => actions.onViewDetails(project)} className="whitespace-nowrap">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
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
                      <Clock className="mr-2 h-4 w-4 text-blue-600" />
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => actions.onStatusChange(project, 'completed')}
                      disabled={project.status === 'completed'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
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
                      <XCircle className="mr-2 h-4 w-4 text-gray-600" />
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
