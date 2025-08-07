"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Clock, Repeat, DollarSign, Calculator, Eye, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { format } from "date-fns"
import type { EnhancedProject } from "@/lib/types/enhanced-project"

// Enhanced project type with actions
export interface ProjectWithActions extends EnhancedProject {
  onView?: (project: EnhancedProject) => void
  onEdit?: (project: EnhancedProject) => void
  onDelete?: (project: EnhancedProject) => void
}

// Project type indicator component
function ProjectTypeIndicator({ project }: { project: EnhancedProject }) {
  const typeConfig = {
    fixed: {
      icon: DollarSign,
      label: "Fixed",
      variant: "default" as const,
      className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
    },
    recurring: {
      icon: Repeat,
      label: "Recurring",
      variant: "secondary" as const,
      className: "bg-sky-100 text-sky-800 hover:bg-sky-200"
    },
    hourly: {
      icon: Clock,
      label: "Hourly",
      variant: "outline" as const,
      className: "bg-violet-100 text-violet-800 hover:bg-violet-200"
    }
  }

  const config = typeConfig[project.project_type] || typeConfig.fixed
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={`${config.className} text-xs font-medium`}>
      <Icon className="h-3 w-3 mr-1.5" />
      {config.label}
    </Badge>
  )
}

// Budget display component with type-specific information
function BudgetDisplay({ project }: { project: EnhancedProject }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: project.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const isAutoCalculated = project.auto_calculate_total && project.project_type !== 'fixed'

  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1">
        <span className="font-medium">
          {formatCurrency(project.total_budget || 0)}
        </span>
        {isAutoCalculated && (
          <Calculator className="h-3 w-3 text-muted-foreground" title="Auto-calculated" />
        )}
      </div>
      
      {/* Type-specific additional info */}
      {project.project_type === 'recurring' && project.recurring_amount && (
        <div className="text-xs text-muted-foreground">
          {formatCurrency(project.recurring_amount)}/{project.recurring_frequency}
        </div>
      )}
      
      {project.project_type === 'hourly' && project.hourly_rate_new && (
        <div className="text-xs text-muted-foreground">
          {formatCurrency(project.hourly_rate_new)}/hr
          {((project.actual_hours && project.actual_hours > 0) || project.estimated_hours) && 
            ` × ${(project.actual_hours && project.actual_hours > 0) ? project.actual_hours : project.estimated_hours}h`}
        </div>
      )}
    </div>
  )
}

// Progress/Status indicator with type-specific details
function ProjectProgress({ project }: { project: EnhancedProject }) {
  const statusConfig = {
    active: {
      label: "Active",
      variant: "default" as const,
      className: "bg-emerald-100 text-emerald-800"
    },
    completed: {
      label: "Completed",
      variant: "secondary" as const,
      className: "bg-slate-100 text-slate-800"
    },
    on_hold: {
      label: "On Hold",
      variant: "secondary" as const,
      className: "bg-amber-100 text-amber-800"
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive" as const,
      className: "bg-rose-100 text-rose-800"
    },
    pipeline: {
      label: "Pipeline",
      variant: "outline" as const,
      className: "bg-sky-100 text-sky-800"
    }
  }

  const config = statusConfig[project.status] || statusConfig.active

  return (
    <div className="space-y-1">
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
      
      {/* Show additional progress info for different project types */}
      {project.project_type === 'hourly' && project.total_hours_logged && (
        <div className="text-xs text-muted-foreground">
          {project.total_hours_logged}h logged
        </div>
      )}
      
      {project.project_type === 'recurring' && project.last_recurring_calculation && (
        <div className="text-xs text-muted-foreground">
          Updated {format(new Date(project.last_recurring_calculation), 'MMM d')}
        </div>
      )}
    </div>
  )
}

// Enhanced project columns
export const enhancedProjectColumns: ColumnDef<ProjectWithActions>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Project Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const project = row.original
      return (
        <div className="space-y-1">
          <div className="font-medium">{project.name}</div>
          {project.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {project.description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "project_type",
    header: "Type",
    cell: ({ row }) => <ProjectTypeIndicator project={row.original} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "clients",
    header: "Client",
    cell: ({ row }) => {
      const client = row.original.clients
      if (!client) return <span className="text-muted-foreground">No client</span>
      
      return (
        <div className="flex items-center gap-2">
          <ClientAvatar client={client} size="sm" />
          <div>
            <div className="font-medium">{client.name}</div>
            {client.company && (
              <div className="text-sm text-muted-foreground">{client.company}</div>
            )}
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const client = row.original.clients
      return client ? value.includes(client.id) : false
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ProjectProgress project={row.original} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "total_budget",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 justify-end"
        >
          Budget
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <BudgetDisplay project={row.original} />,
    meta: {
      align: "right" as const,
    },
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Start Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("start_date") as string
      return date ? format(new Date(date), "MMM d, yyyy") : "—"
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string
      if (!date) return "—"
      
      const dueDate = new Date(date)
      const today = new Date()
      const isOverdue = dueDate < today
      const isPastDue = dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000
      
      return (
        <div className={`${isOverdue ? 'text-red-600' : isPastDue ? 'text-yellow-600' : ''}`}>
          {format(dueDate, "MMM d, yyyy")}
        </div>
      )
    },
  },
  {
    accessorKey: "payment_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 justify-end"
        >
          Received
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const project = row.original
      const received = project.payment_received || 0
      const total = project.total_budget || 0
      const percentage = total > 0 ? (received / total) * 100 : 0
      
      return (
        <div className="text-right">
          <div className="font-medium">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: project.currency || 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(received)}
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}%
          </div>
        </div>
      )
    },
    meta: {
      align: "right" as const,
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const project = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(project.id)}
            >
              Copy project ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => project.onView?.(project)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => project.onEdit?.(project)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => project.onDelete?.(project)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// Backwards compatible columns (for gradual migration)
export const compatibleProjectColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Project Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const project = row.original
      return (
        <div className="space-y-1">
          <div className="font-medium">{project.name}</div>
          {project.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {project.description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "project_type",
    header: "Type",
    cell: ({ row }) => {
      const project = row.original
      // Show project type if available, otherwise show "Fixed" as default
      const projectType = project.project_type || 'fixed'
      return <ProjectTypeIndicator project={{ ...project, project_type: projectType }} />
    },
    filterFn: (row, id, value) => {
      const projectType = row.original.project_type || 'fixed'
      return value.includes(projectType)
    },
  },
  {
    accessorKey: "clients",
    header: "Client",
    cell: ({ row }) => {
      const client = row.original.clients
      if (!client) return <span className="text-muted-foreground">No client</span>
      
      return (
        <div className="flex items-center gap-2">
          <ClientAvatar client={client} size="sm" />
          <div>
            <div className="font-medium">{client.name}</div>
            {client.company && (
              <div className="text-sm text-muted-foreground">{client.company}</div>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const project = row.original
      return <ProjectProgress project={{ ...project, project_type: project.project_type || 'fixed' }} />
    },
  },
  {
    accessorKey: "budget",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 justify-end"
        >
          Budget
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const project = row.original
      // Use total_budget if available, fallback to budget
      const budget = project.total_budget || project.budget || 0
      const enhancedProject = { 
        ...project, 
        total_budget: budget,
        project_type: project.project_type || 'fixed'
      }
      return <BudgetDisplay project={enhancedProject} />
    },
    meta: {
      align: "right" as const,
    },
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Start Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("start_date") as string
      return date ? format(new Date(date), "MMM d, yyyy") : "—"
    },
  },
  {
    accessorKey: "payment_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 justify-end"
        >
          Received
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const project = row.original
      const received = project.payment_received || 0
      const total = project.total_budget || project.budget || 0
      const percentage = total > 0 ? (received / total) * 100 : 0
      
      return (
        <div className="text-right">
          <div className="font-medium">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: project.currency || 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(received)}
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}%
          </div>
        </div>
      )
    },
    meta: {
      align: "right" as const,
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const project = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(project.id)}
            >
              Copy project ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => project.onView?.(project)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => project.onEdit?.(project)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => project.onDelete?.(project)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// Export default enhanced columns
export default enhancedProjectColumns