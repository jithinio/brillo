"use client"

import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  FolderPlus,
  Trash2,
  Mail,
  Phone,
  Building,
  MapPin,
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  created_at: string
  projects?: Array<{
    id: string
    name: string
    status: string
  }>
}

const statusColors = {
  active: "bg-green-600",
  completed: "bg-blue-600",
  on_hold: "bg-yellow-600",
  cancelled: "bg-red-600",
}

const statusLabels = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
}

interface ColumnActions {
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onCreateInvoice: (client: Client) => void
  onNewProject: (client: Client) => void
  onDeleteClient: (client: Client) => void
}

export function createColumns(actions: ColumnActions): ColumnDef<Client>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const client = row.original
        const name = row.getValue("name") as string
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
        
        return (
          <div className="flex items-center space-x-3 min-w-[180px]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={client.avatar_url || "/placeholder-user.jpg"} alt={name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium truncate" title={name}>{name}</span>
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const company = row.getValue("company") as string
        return company ? (
          <div className="flex items-center space-x-2 min-w-[180px]">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return email ? (
          <div className="flex items-center space-x-2 min-w-[220px]">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate lowercase" title={email}>
              {email}
            </span>
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
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const client = row.original
        const location = client.city || client.state
        return location ? (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  variant="secondary"
                  className={`text-white text-xs flex-shrink-0 ${statusColors[project.status as keyof typeof statusColors]}`}
                >
                  {statusLabels[project.status as keyof typeof statusLabels]}
                </Badge>
                <span className="text-sm truncate" title={project.name}>
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[100px]">
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
                <DropdownMenuItem onClick={() => actions.onViewDetails(client)} className="whitespace-nowrap">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
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
