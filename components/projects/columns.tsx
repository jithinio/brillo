"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from "@tanstack/react-table"
import * as React from "react"
import { useState } from "react"
import { ArrowUpDownIcon, MoreHorizontalIcon, CheckmarkCircleIcon, ClockIcon, PauseIcon, CancelCircleIcon, ViewIcon, Edit03Icon, DocumentAttachmentIcon, Delete01Icon, Calendar01Icon, GitBranchIcon, UserIcon, ActivityIcon, DollarCircleIcon, MinusSignIcon, PlusSignIcon, Building02Icon, ArrowUp01Icon, ArrowDown01Icon, Tick01Icon, CancelIcon, RepeatIcon, TimerIcon, Activity03Icon, WorkIcon, File01Icon, MoneyReceiveCircleIcon, MoneySendCircleIcon, FilterIcon } from '@hugeicons/core-free-icons'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// Project Type Cell Component
function ProjectTypeCell({ project }: { project: Project }) {
  const getProjectTypeConfig = (type: string) => {
    switch (type) {
      case 'fixed':
        return {
          icon: DollarCircleIcon,
          label: 'Fixed',
          color: 'bg-emerald-50 text-emerald-800 ring-emerald-700/20 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800/30'
        }
      case 'recurring':
        return {
          icon: RepeatIcon,
          label: 'Recurring',
          color: 'bg-sky-50 text-sky-800 ring-sky-700/20 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800/30'
        }
      case 'hourly':
        return {
          icon: TimerIcon,
          label: 'Hourly',
          color: 'bg-violet-50 text-violet-800 ring-violet-700/20 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-800/30'
        }
      default:
        return {
          icon: DollarCircleIcon,
          label: 'Fixed',
          color: 'bg-slate-50 text-slate-800 ring-slate-700/20 dark:bg-slate-800/30 dark:text-slate-300 dark:ring-slate-700/30'
        }
    }
  }

  const config = getProjectTypeConfig(project.project_type || 'fixed')
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} border-0 ring-1 ring-inset text-sm font-normal`}>
      <HugeiconsIcon icon={Icon} className="mr-1 h-3 w-3"  />
      {config.label}
    </Badge>
  )
}
import { formatCurrency } from "@/lib/currency"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { DatePickerTable } from "@/components/ui/date-picker-table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Separate component for editable budget cell to avoid hook ordering issues
function EditableBudgetCell({ 
  project, 
  onBudgetUpdate 
}: { 
  project: Project, 
  onBudgetUpdate?: (project: Project, budget: number) => void 
}) {
  const budget = project.total_budget || 0
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(budget.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(budget.toString())
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0
    if (newValue !== budget && newValue >= 0) {
      onBudgetUpdate?.(project, newValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(budget.toString())
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
          autoFocus
        />
      ) : (
        <div 
          className="cursor-pointer overflow-hidden flex items-center group/budget"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm truncate flex-1 min-w-0">
            {budget ? formatCurrency(budget) : formatCurrency(0)}
          </span>
          <HugeiconsIcon icon={Edit03Icon} className="ml-1 h-3 w-3 opacity-0 group-hover/budget:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

// Separate component for editable expenses cell
function EditableExpensesCell({ 
  project, 
  onExpensesUpdate 
}: { 
  project: Project, 
  onExpensesUpdate?: (project: Project, expenses: number) => void 
}) {
  const expenses = project.expenses || 0
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(expenses.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(expenses.toString())
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0
    if (newValue !== expenses && newValue >= 0) {
      onExpensesUpdate?.(project, newValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(expenses.toString())
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
          autoFocus
        />
      ) : (
        <div 
          className="cursor-pointer overflow-hidden flex items-center group/expenses"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm truncate flex-1 min-w-0">
            {formatCurrency(expenses)}
          </span>
          <HugeiconsIcon icon={Edit03Icon} className="ml-1 h-3 w-3 opacity-0 group-hover/expenses:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

// Separate component for editable received cell
function EditableReceivedCell({ 
  project, 
  onReceivedUpdate 
}: { 
  project: Project, 
  onReceivedUpdate?: (project: Project, received: number) => void 
}) {
  const received = project.received || 0
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(received.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(received.toString())
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0
    if (newValue !== received && newValue >= 0) {
      onReceivedUpdate?.(project, newValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(received.toString())
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
          autoFocus
        />
      ) : (
        <div 
          className="cursor-pointer overflow-hidden flex items-center group/received"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm truncate flex-1 min-w-0">
            {formatCurrency(received)}
          </span>
          <HugeiconsIcon icon={Edit03Icon} className="ml-1 h-3 w-3 opacity-0 group-hover/received:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

// Separate component for editable actual hours cell
function EditableActualHoursCell({ 
  project, 
  onActualHoursUpdate 
}: { 
  project: Project, 
  onActualHoursUpdate?: (project: Project, actualHours: number) => void 
}) {
  const actualHours = project.actual_hours || project.total_hours_logged || 0
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(actualHours.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(actualHours.toString())
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0
    if (newValue !== actualHours && newValue >= 0) {
      onActualHoursUpdate?.(project, newValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(actualHours.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const estimatedHours = project.estimated_hours || 0

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
          step="0.25"
          min="0"
          autoFocus
        />
      ) : (
        <div 
          className="cursor-pointer overflow-hidden flex items-center group/hours"
          onClick={handleEdit}
        >
          <span className="font-normal text-sm truncate flex-1 min-w-0">
            {actualHours > 0 || estimatedHours > 0
              ? `${actualHours}${estimatedHours > 0 ? `/${estimatedHours}` : ''}h`
              : '—'
            }
          </span>
          <HugeiconsIcon icon={Edit03Icon} className="ml-1 h-3 w-3 opacity-0 group-hover/hours:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

export type Project = {
  id: string
  name: string
  status: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
  start_date?: string
  due_date?: string
  budget?: number
  total_budget?: number
  expenses?: number
  received?: number
  pending?: number
  recurring_amount?: number
  hourly_rate?: number
  hourly_rate_new?: number
  actual_hours?: number
  total_hours_logged?: number
  estimated_hours?: number
  created_at: string
  clients?: {
    id: string
    name: string
    company?: string
    avatar_url?: string | null
  }
}

const statusConfig = {
  active: {
    label: "Active",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  completed: {
    label: "Completed",
    icon: CheckmarkCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  on_hold: {
    label: "On Hold",
    icon: PauseIcon,
    variant: "outline" as const,
    iconClassName: "text-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: CancelCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-rose-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: FilterIcon,
    variant: "outline" as const,
    iconClassName: "text-sky-500",
  },
  due: {
    label: "Due",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-orange-500",
  },
}

interface ColumnActions {
  onEditProject: (project: Project) => void
  onCreateInvoice: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onDuplicateProject: (project: Project) => void
  onStatusChange: (project: Project, newStatus: string) => void
  onBudgetUpdate?: (project: Project, budget: number) => void
  onExpensesUpdate?: (project: Project, expenses: number) => void
  onReceivedUpdate?: (project: Project, received: number) => void
  onActualHoursUpdate?: (project: Project, actualHours: number) => void
  onDateChange: (project: Project, field: 'start_date' | 'due_date', date: Date | undefined) => void
  onClientChange?: (project: Project, clientId: string | null, onUpdate?: () => void) => void
  availableClients?: Array<{
    id: string
    name: string
    company?: string
    email?: string
    avatar_url?: string | null
  }>
}

// Reusable sortable header component with compact design
function SortableHeader({ 
  column, 
  children, 
  icon: Icon 
}: { 
  column: any; 
  children: React.ReactNode; 
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> 
}) {
  const sortDirection = column.getIsSorted()
  
  return (
            <div className="">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto p-0 font-normal text-sm hover:bg-transparent focus:outline-none flex items-center"
            style={{ gap: '6px' }}
          >
            <HugeiconsIcon icon={Icon} className="flex-shrink-0 h-3 w-3 text-muted-foreground"  />
            <span className="text-sm font-normal">{children}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-32 p-1" 
          align="start" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation()
                column.toggleSorting(false)
              }}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="mr-2 h-3 w-3"  />
              Asc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation()
                column.toggleSorting(true)
              }}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="mr-2 h-3 w-3"  />
              Desc
            </Button>
            {sortDirection && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-8 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  column.clearSorting()
                }}
              >
                <HugeiconsIcon icon={ArrowUpDownIcon} className="mr-2 h-3 w-3"  />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Client selector component
function ClientSelector({
  project,
  client,
  availableClients,
  onClientChange,
}: {
  project: Project
  client: Project['clients']
  availableClients: ColumnActions['availableClients']
  onClientChange: ColumnActions['onClientChange']
}) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredClients = React.useMemo(() => {
    if (!availableClients) return []
    if (!searchQuery) return availableClients
    
    const query = searchQuery.toLowerCase()
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    )
  }, [availableClients, searchQuery])

  const handleClientSelect = (clientId: string) => {
    if (onClientChange) {
      onClientChange(project, clientId, () => setOpen(false))
    }
  }

  const handleRemoveClient = () => {
    if (onClientChange) {
      onClientChange(project, null, () => setOpen(false))
    }
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full justify-start cursor-pointer">
            {client ? (
              <div className="flex items-center space-x-2 min-w-0">
                <ClientAvatar name={client.name} avatarUrl={client.avatar_url} size="sm" className="flex-shrink-0" />
                <div className="truncate font-normal flex-1 min-w-0 text-sm" title={client.name}>
                  {client.name}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No client</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search clients..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {client && (
                  <CommandItem
                    onSelect={handleRemoveClient}
                    className="text-muted-foreground"
                  >
                    <HugeiconsIcon icon={CancelIcon} className="mr-2 h-4 w-4"  />
                    Remove client
                  </CommandItem>
                )}
                {filteredClients.map((availableClient) => {
                  const isSelected = client?.id === availableClient.id
                  return (
                    <CommandItem
                      key={availableClient.id}
                      value={`${availableClient.name} ${availableClient.company || ''}`}
                      onSelect={() => handleClientSelect(availableClient.id)}
                      className="flex items-center space-x-3 py-2"
                    >
                      <ClientAvatar 
                        name={availableClient.name} 
                        avatarUrl={availableClient.avatar_url}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{availableClient.name}</div>
                        {availableClient.company && (
                          <div className="text-xs text-muted-foreground">{availableClient.company}</div>
                        )}
                      </div>
                      <HugeiconsIcon icon={Tick01Icon}
                        className={cn(
                          "ml-auto h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                       />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Status cell component with state management
function StatusCell({ project, actions }: { project: Project; actions: ColumnActions }) {
  const status = project.status
  const config = statusConfig[status as keyof typeof statusConfig]
  const [isOpen, setIsOpen] = React.useState(false)

  if (!config) {
    return <span className="text-muted-foreground">Unknown</span>
  }

  const Icon = config.icon

  const handleStatusChange = (newStatus: string) => {
    const previousStatus = project.status
    const previousConfig = statusConfig[previousStatus as keyof typeof statusConfig]
    
    // Execute the status change immediately
    actions.onStatusChange(project, newStatus)
    setIsOpen(false) // Close popover after status change
    
    // Show toast with undo functionality
    const newConfig = statusConfig[newStatus as keyof typeof statusConfig]
    toast.success(`Status changed to ${newConfig.label}`, {
      description: `${project.name} is now ${newConfig.label.toLowerCase()}`,
      action: {
        label: "Undo",
        onClick: () => {
          actions.onStatusChange(project, previousStatus)
          toast.success(`Reverted to ${previousConfig.label}`, {
            description: `${project.name} status restored`
          })
        },
      },
    })
  }

  return (
    <div className="w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Badge variant={config.variant} className="cursor-pointer hover:bg-slate-100 transition-colors font-normal text-sm focus:outline-none focus-visible:outline-none whitespace-nowrap min-w-fit">
            <HugeiconsIcon icon={Icon} className={`mr-1 h-3 w-3 ${config.iconClassName}`}  />
            <span className="whitespace-nowrap">{config.label}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="grid gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'active' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('active')}
              disabled={project.status === 'active'}
            >
              <HugeiconsIcon icon={ClockIcon} className="mr-2 h-3 w-3 text-blue-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">Active</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'completed' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('completed')}
              disabled={project.status === 'completed'}
            >
              <HugeiconsIcon icon={CheckmarkCircleIcon} className="mr-2 h-3 w-3 text-green-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">Completed</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'on_hold' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('on_hold')}
              disabled={project.status === 'on_hold'}
            >
              <HugeiconsIcon icon={PauseIcon} className="mr-2 h-3 w-3 text-amber-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">On Hold</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'cancelled' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('cancelled')}
              disabled={project.status === 'cancelled'}
            >
              <HugeiconsIcon icon={CancelCircleIcon} className="mr-2 h-3 w-3 text-rose-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">Cancelled</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'pipeline' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('pipeline')}
              disabled={project.status === 'pipeline'}
            >
              <HugeiconsIcon icon={FilterIcon} className="mr-2 h-3 w-3 text-purple-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">Pipeline</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'due' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('due')}
              disabled={project.status === 'due'}
            >
              <HugeiconsIcon icon={ClockIcon} className="mr-2 h-3 w-3 text-orange-500 flex-shrink-0"  />
              <span className="whitespace-nowrap">Due</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function createColumns(actions: ColumnActions): ColumnDef<Project>[] {
  return [
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
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} icon={File01Icon}>
          Project Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <div className="w-full min-w-0">
            <div 
              className="truncate font-medium cursor-pointer transition-colors hover:text-primary text-sm" 
              title={project.name}
              onClick={() => actions.onEditProject(project)}
            >
              {project.name}
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: "client",
      accessorFn: (row) => row.clients?.name || "",
      header: ({ column }) => (
        <SortableHeader column={column} icon={UserIcon}>
          Client
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        const client = row.original.clients

        return (
          <ClientSelector
            project={project}
            client={client}
            availableClients={actions.availableClients || []}
            onClientChange={actions.onClientChange}
          />
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Activity03Icon}>
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <StatusCell project={project} actions={actions} />
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "project_type",
      header: ({ column }) => (
        <SortableHeader column={column} icon={WorkIcon}>
          Type
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return <ProjectTypeCell project={project} />
      },
      enableHiding: true,
    },
    {
      accessorKey: "total_budget",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarCircleIcon}>
          Total Budget
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <EditableBudgetCell 
            project={project} 
            onBudgetUpdate={actions.onBudgetUpdate} 
          />
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "expenses",
      header: ({ column }) => (
        <SortableHeader column={column} icon={MoneySendCircleIcon}>
          Expenses
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <EditableExpensesCell 
            project={project} 
            onExpensesUpdate={actions.onExpensesUpdate} 
          />
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "received",
      header: ({ column }) => (
        <SortableHeader column={column} icon={MoneyReceiveCircleIcon}>
          Received
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <EditableReceivedCell 
            project={project} 
            onReceivedUpdate={actions.onReceivedUpdate} 
          />
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "pending",
      header: ({ column }) => (
        <SortableHeader column={column} icon={ClockIcon}>
          Pending
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        // Auto-calculate pending amount: Use total_budget for new project types, budget for legacy
        const budget = project.total_budget || project.budget || 0
        const received = project.payment_received || project.received || 0
        const pending = Math.max(0, budget - received) // Ensure it's not negative
        
        return (
          <div className="w-full">
            <span className="truncate font-normal text-sm">{formatCurrency(pending)}</span>
          </div>
        )
      },
        enableHiding: true,
      },
      {
        accessorKey: "start_date",
        header: ({ column }) => (
          <SortableHeader column={column} icon={Calendar01Icon}>
            Start Date
          </SortableHeader>
        ),
        cell: ({ row }) => {
          const project = row.original
          const startDate = row.getValue("start_date") as string
          const date = startDate ? new Date(startDate) : undefined

          return (
            <div className="w-full min-w-0">
              <div className="min-w-0">
                <DatePickerTable
                  date={date}
                  onSelect={(newDate) => actions.onDateChange(project, 'start_date', newDate)}
                  placeholder="Start date"
                />
              </div>
            </div>
          )
        },
        enableHiding: true,
      },
      {
        accessorKey: "due_date",
        header: ({ column }) => (
          <SortableHeader column={column} icon={Calendar01Icon}>
            Due Date
          </SortableHeader>
        ),
      cell: ({ row }) => {
        const project = row.original
        const dueDate = row.getValue("due_date") as string
        const date = dueDate ? new Date(dueDate) : undefined

                    return (
            <div className="w-full min-w-0">
              <div className="min-w-0">
                <DatePickerTable
                  date={date}
                  onSelect={(newDate) => actions.onDateChange(project, 'due_date', newDate)}
                  placeholder="Due date"
                />
              </div>
            </div>
          )
      },
      enableHiding: true,
    },
    {
      accessorKey: "recurring_amount",
      header: ({ column }) => (
        <SortableHeader column={column} icon={RepeatIcon}>
          Recurring Amount
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        const recurringAmount = project.recurring_amount || 0
        
        return (
          <div className="w-full">
            <span className="truncate font-normal text-sm">
              {project.project_type === 'recurring' && recurringAmount > 0 
                ? formatCurrency(recurringAmount)
                : '—'
              }
            </span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "hourly_rate_new",
      header: ({ column }) => (
        <SortableHeader column={column} icon={ClockIcon}>
          Hourly Rate
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        const hourlyRate = project.hourly_rate_new || project.hourly_rate || 0
        
        return (
          <div className="w-full">
            <span className="truncate font-normal text-sm">
              {(project.project_type === 'hourly' || hourlyRate > 0)
                ? `${formatCurrency(hourlyRate)}/hr`
                : '—'
              }
            </span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "actual_hours",
      header: ({ column }) => (
        <SortableHeader column={column} icon={ActivityIcon}>
          Actual Hours
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <EditableActualHoursCell 
            project={project} 
            onActualHoursUpdate={actions.onActualHoursUpdate} 
          />
        )
      },
      enableHiding: true,
    },
  ]
}
