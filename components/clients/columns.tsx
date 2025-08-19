"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDownIcon, MoreHorizontalIcon, Edit03Icon, DocumentAttachmentIcon, FolderAddIcon, Delete01Icon, MailIcon, PhoneIcon, Building01Icon, LocationIcon, CopyIcon, CheckmarkCircleIcon, ClockIcon, GitBranchIcon, UserIcon, Activity03Icon, WorkIcon, AddInvoiceIcon, FilterIcon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { toast } from "sonner"
import { useSettings } from "@/components/settings-provider"
import { DatePickerTable } from "@/components/ui/date-picker-table"

export type Client = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  notes?: string | null
  avatar_url?: string | null
  status?: string
  source?: string | null
  created_at: string
  projects?: Array<{
    id: string
    name: string
    status: string
  }>
}

const statusConfig = {
  active: {
    label: "Active",
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  on_hold: {
    label: "On Hold",
    variant: "outline" as const,
    iconClassName: "text-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline" as const,
    iconClassName: "text-rose-500",
  },
}

const clientStatusConfig = {
  active: {
    label: "Active",
    icon: CheckmarkCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: FilterIcon,
    variant: "outline" as const,
    iconClassName: "text-sky-500",
  },
  closed: {
    label: "Closed",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-muted-foreground",
  },
}

interface ColumnActions {
  onEditClient: (client: Client) => void
  onCreateInvoice: (client: Client) => void
  onNewProject: (client: Client) => void
  onDeleteClient: (client: Client) => void
  onStatusChange: (client: Client, newStatus: string) => void
  onProjectClick?: (projectId: string) => void
  onDateChange: (client: Client, field: 'created_at', date: Date | undefined) => void
}

// Client status cell component with state management
function ClientStatusCell({ client, actions }: { client: Client; actions: ColumnActions }) {
  const status = client.status || 'active'
  const config = clientStatusConfig[status as keyof typeof clientStatusConfig]
  const [isOpen, setIsOpen] = React.useState(false)

  if (!config) {
    return <span className="text-muted-foreground">Unknown</span>
  }

  const Icon = config.icon

  const handleStatusChange = (newStatus: string) => {
    const previousStatus = client.status || 'active'
    const previousConfig = clientStatusConfig[previousStatus as keyof typeof clientStatusConfig]
    
    // Execute the status change immediately
    actions.onStatusChange(client, newStatus)
    setIsOpen(false) // Close popover after status change
    
    // Show toast with undo functionality
    const newConfig = clientStatusConfig[newStatus as keyof typeof clientStatusConfig]
    toast.success(`Status changed to ${newConfig.label}`, {
      description: `${client.name} is now ${newConfig.label.toLowerCase()}`,
      action: {
        label: "Undo",
        onClick: () => {
          actions.onStatusChange(client, previousStatus)
          toast.success(`Reverted to ${previousConfig.label}`, {
            description: `${client.name} status restored`
          })
        },
      },
    })
  }

  return (
    <div className="min-w-[120px]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Badge variant={config.variant} className="cursor-pointer hover:bg-muted transition-colors font-normal text-sm focus:outline-none focus-visible:outline-none">

            {config.label}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="grid gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'active' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('active')}
              disabled={client.status === 'active'}
            >
              <HugeiconsIcon icon={CheckmarkCircleIcon} className="mr-2 h-3 w-3 text-green-500"  />
              Active
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'pipeline' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('pipeline')}
              disabled={client.status === 'pipeline'}
            >
              <HugeiconsIcon icon={FilterIcon} className="mr-2 h-3 w-3 text-purple-500"  />
              Pipeline
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'closed' ? 'bg-accent' : ''}`}
              onClick={() => handleStatusChange('closed')}
              disabled={client.status === 'closed'}
            >
              <HugeiconsIcon icon={ClockIcon} className="mr-2 h-3 w-3 text-muted-foreground"  />
              Closed
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function createColumns(actions: ColumnActions): ColumnDef<Client>[] {
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={UserIcon} className="h-3 w-3 text-muted-foreground"  />
            Name
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        const name = row.getValue("name") as string
        
        return (
          <div 
            className="flex items-center space-x-3 min-w-[180px] cursor-pointer" 
            onClick={() => actions.onEditClient(client)}
          >
            <ClientAvatar 
              name={name} 
              avatarUrl={client.avatar_url}
              size="md"
            />
            <span 
              className="font-medium truncate transition-colors" 
              title={name}
            >
              {name}
            </span>
          </div>
        )
      },
      size: 220,
    },
    {
      accessorKey: "company",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={Building01Icon} className="h-3 w-3 text-muted-foreground"  />
            Company
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const company = row.getValue("company") as string
        return company ? (
          <div className="flex items-center space-x-2 min-w-[180px]">
            <HugeiconsIcon icon={Building01Icon} className="h-4 w-4 text-muted-foreground shrink-0"  />
            <span className="truncate" title={company}>
              {company}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[180px] block">—</span>
        )
      },
      size: 200,
      enableHiding: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={MailIcon} className="h-3 w-3 text-muted-foreground"  />
            Email
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        
        const handleCopyEmail = async () => {
          try {
            await navigator.clipboard.writeText(email)
            toast.success("Email copied to clipboard")
          } catch (err) {
            toast.error("Failed to copy email")
          }
        }
        
        return email ? (
          <div className="flex items-center space-x-2 min-w-[220px] group">
            <HugeiconsIcon icon={MailIcon} className="h-4 w-4 text-muted-foreground shrink-0"  />
            <span className="truncate lowercase" title={email}>
              {email}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              onClick={handleCopyEmail}
            >
              <HugeiconsIcon icon={CopyIcon} className="h-3 w-3"  />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[220px] block">—</span>
        )
      },
      size: 250,
      enableHiding: true,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={PhoneIcon} className="h-3 w-3 text-muted-foreground"  />
            Phone
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <HugeiconsIcon icon={PhoneIcon} className="h-4 w-4 text-muted-foreground shrink-0"  />
            <span className="truncate" title={phone}>
              {phone}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[140px] block">—</span>
        )
      },
      size: 160,
      enableHiding: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={Activity03Icon} className="h-3 w-3 text-muted-foreground"  />
            Status
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        return (
          <ClientStatusCell client={client} actions={actions} />
        )
      },
      size: 120,
      enableHiding: true,
    },
    {
      id: "location",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={LocationIcon} className="h-3 w-3 text-muted-foreground"  />
            Location
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        const location = client.city || client.state
        return location ? (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <HugeiconsIcon icon={LocationIcon} className="h-4 w-4 text-muted-foreground shrink-0"  />
            <span
              className="truncate"
              title={`${client.city}${client.city && client.state ? ", " : ""}${client.state}`}
            >
              {client.city}
              {client.city && client.state && ", "}
              {client.state}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground min-w-[140px] block">—</span>
        )
      },
      size: 160,
      enableHiding: true,
    },
    {
      id: "projects",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={WorkIcon} className="h-3 w-3 text-muted-foreground"  />
            Projects
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        if (client.projects && client.projects.length > 0) {
          const project = client.projects[0]
          return (
            <div className="space-y-1 min-w-[180px]">
              <div className="flex items-center space-x-2">
                <Badge
                  variant={statusConfig[project.status as keyof typeof statusConfig]?.variant || "outline"}
                  className="text-xs shrink-0 text-zinc-700 font-medium"
                >
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${statusConfig[project.status as keyof typeof statusConfig]?.iconClassName?.replace('text-', 'bg-') || 'bg-muted'}`}></div>
                  {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
                </Badge>
                <span 
                  className="text-sm truncate cursor-pointer font-medium" 
                  title={project.name}
                  onClick={() => {
                    if (actions.onProjectClick) {
                      actions.onProjectClick(project.id)
                    } else {
                      // Fallback to navigating to projects page
                      window.location.href = `/dashboard/projects#${project.id}`
                    }
                  }}
                >
                  {project.name}
                </span>
              </div>
              {client.projects.length > 1 && (
                <div className="text-xs text-muted-foreground">+{client.projects.length - 1} more</div>
              )}
            </div>
          )
        }
        return <span className="text-sm text-muted-foreground min-w-[180px] block">No projects</span>
      },
      size: 200,
      enableHiding: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-normal flex items-center gap-2"
          >
            <HugeiconsIcon icon={ClockIcon} className="h-3 w-3 text-muted-foreground"  />
            Client Since
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }}  />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        const createdDate = row.getValue("created_at") as string
        const date = createdDate ? new Date(createdDate) : undefined

        return (
          <div className="min-w-[120px] max-w-[140px]">
            <DatePickerTable
              date={date}
              onSelect={(newDate) => actions.onDateChange(client, 'created_at', newDate)}
              placeholder="Set client since"
              disableFuture={true}
            />
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
        const client = row.original

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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="whitespace-nowrap">Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => actions.onEditClient(client)} className="whitespace-nowrap">
                  <HugeiconsIcon icon={Edit03Icon} className="mr-2 h-4 w-4"  />
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onCreateInvoice(client)} className="whitespace-nowrap">
                  <HugeiconsIcon icon={AddInvoiceIcon} className="mr-2 h-4 w-4"  />
                  Create Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onNewProject(client)} className="whitespace-nowrap">
                  <HugeiconsIcon icon={FolderAddIcon} className="mr-2 h-4 w-4"  />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive whitespace-nowrap"
                  onClick={() => actions.onDeleteClient(client)}
                >
                  <HugeiconsIcon icon={Delete01Icon} className="mr-2 h-4 w-4"  />
                  Delete Client
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
