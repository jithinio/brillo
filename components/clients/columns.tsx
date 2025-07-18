"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  FileText,
  FolderPlus,
  Trash2,
  Mail,
  Phone,
  Building,
  MapPin,
  Copy,
  CheckCircle,
  Clock,
  GitBranch,
} from "lucide-react"
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
    iconClassName: "text-green-500",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  on_hold: {
    label: "On Hold",
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
}

const clientStatusConfig = {
  active: {
    label: "Active",
    icon: CheckCircle,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: GitBranch,
    variant: "outline" as const,
    iconClassName: "text-purple-500",
  },
  closed: {
    label: "Closed",
    icon: Clock,
    variant: "outline" as const,
    iconClassName: "text-gray-400",
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
            className="h-auto p-0 font-medium"
          >
            Name
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
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
            className="h-auto p-0 font-medium"
          >
            Company
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const company = row.getValue("company") as string
        return company ? (
          <div className="flex items-center space-x-2 min-w-[180px]">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
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
            className="h-auto p-0 font-medium"
          >
            Email
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
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
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate lowercase" title={email}>
              {email}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              onClick={handleCopyEmail}
            >
              <Copy className="h-3 w-3" />
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
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
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
            className="h-auto p-0 font-medium"
          >
            Status
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        const status = (row.getValue("status") as string) || 'active'
        const config = clientStatusConfig[status as keyof typeof clientStatusConfig]

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
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'active' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(client, 'active')}
                    disabled={client.status === 'active'}
                  >
                    <CheckCircle className="mr-2 h-3 w-3 text-green-500" />
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'pipeline' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(client, 'pipeline')}
                    disabled={client.status === 'pipeline'}
                  >
                    <GitBranch className="mr-2 h-3 w-3 text-purple-500" />
                    Pipeline
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`justify-start h-8 focus:outline-none focus-visible:outline-none ${client.status === 'closed' ? 'bg-accent' : ''}`}
                    onClick={() => actions.onStatusChange(client, 'closed')}
                    disabled={client.status === 'closed'}
                  >
                    <Clock className="mr-2 h-3 w-3 text-gray-400" />
                    Closed
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
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const client = row.original
        const location = client.city || client.state
        return location ? (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
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
      header: "Projects",
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
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${statusConfig[project.status as keyof typeof statusConfig]?.iconClassName?.replace('text-', 'bg-') || 'bg-gray-400'}`}></div>
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
            className="h-auto p-0 font-medium"
          >
            Client Since
            <ArrowUpDown className="ml-2 h-3 w-3" style={{ width: '12px', height: '12px' }} />
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
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open actions menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="whitespace-nowrap">Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => actions.onEditClient(client)} className="whitespace-nowrap">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onCreateInvoice(client)} className="whitespace-nowrap">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onNewProject(client)} className="whitespace-nowrap">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive whitespace-nowrap"
                  onClick={() => actions.onDeleteClient(client)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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
