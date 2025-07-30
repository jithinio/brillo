"use client"

import type { ColumnDef } from "@tanstack/react-table"
import * as React from "react"
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
  Check,
  X,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { DatePickerTable } from "@/components/ui/date-picker-table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export type Project = {
  id: string
  name: string
  status: string
  start_date?: string
  due_date?: string
  budget?: number
  expenses?: number
  received?: number
  pending?: number
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
          iconClassName: "text-gray-400 dark:text-gray-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: GitBranch,
    variant: "outline" as const,
    iconClassName: "text-purple-500",
  },
}

interface ColumnActions {
  onEditProject: (project: Project) => void
  onCreateInvoice: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onStatusChange: (project: Project, newStatus: string) => void
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
            className="h-auto p-0 font-medium text-sm hover:bg-transparent focus:outline-none flex items-center"
            style={{ gap: '6px' }}
          >
            <Icon 
              className="flex-shrink-0" 
              style={{ 
                width: '12px', 
                height: '12px',
                minWidth: '12px',
                minHeight: '12px'
              }} 
            />
            <span className="text-sm font-medium">{children}</span>
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
              <ArrowUp className="mr-2 h-3 w-3" />
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
              <ArrowDown className="mr-2 h-3 w-3" />
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
                <ChevronsUpDown className="mr-2 h-3 w-3" />
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
                    <X className="mr-2 h-4 w-4" />
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
                      <Check
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
            <Icon className={`mr-1.5 h-3 w-3 ${config.iconClassName} flex-shrink-0`} />
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
              <Clock className="mr-2 h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Active</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'completed' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('completed')}
              disabled={project.status === 'completed'}
            >
              <CheckCircle className="mr-2 h-3 w-3 text-blue-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Completed</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'on_hold' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('on_hold')}
              disabled={project.status === 'on_hold'}
            >
              <Pause className="mr-2 h-3 w-3 text-yellow-500 flex-shrink-0" />
              <span className="whitespace-nowrap">On Hold</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'cancelled' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('cancelled')}
              disabled={project.status === 'cancelled'}
            >
              <XCircle className="mr-2 h-3 w-3 text-red-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Cancelled</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none whitespace-nowrap ${project.status === 'pipeline' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('pipeline')}
              disabled={project.status === 'pipeline'}
            >
              <GitBranch className="mr-2 h-3 w-3 text-purple-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Pipeline</span>
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
        <SortableHeader column={column} icon={Building2}>
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
        <SortableHeader column={column} icon={User}>
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
        <SortableHeader column={column} icon={Activity}>
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
      accessorKey: "start_date",
      header: ({ column }) => (
        <SortableHeader column={column} icon={CalendarDays}>
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
      accessorKey: "budget",
      header: ({ column }) => (
        <SortableHeader column={column} icon={DollarSign}>
          Budget
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const budget = row.getValue("budget") as number
        return (
          <div className="w-full">
            {budget ? (
              <span className="truncate font-normal text-sm">{formatCurrency(budget)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "expenses",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Minus}>
          Expenses
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const expenses = row.getValue("expenses") as number
        return (
          <div className="w-full">
            {expenses ? (
              <span className="truncate font-normal text-sm">{formatCurrency(expenses)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "received",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Plus}>
          Received
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const received = row.getValue("received") as number
        return (
          <div className="w-full">
            {received ? (
              <span className="truncate font-normal text-sm">{formatCurrency(received)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">{formatCurrency(0)}</span>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "pending",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Clock}>
          Pending
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const project = row.original
        // Auto-calculate pending amount: budget - received = pending
        const budget = project.budget || 0
        const received = project.received || 0
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
        accessorKey: "due_date",
        header: ({ column }) => (
          <SortableHeader column={column} icon={Calendar}>
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
  ]
}
