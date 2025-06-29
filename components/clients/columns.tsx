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

export type Client = {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  notes?: string
  created_at: string
  projects?: Array<{
    id: string
    name: string
    status: string
  }>
}

const statusColors = {
  active: "bg-green-500",
  completed: "bg-blue-500",
  on_hold: "bg-yellow-500",
  cancelled: "bg-red-500",
}

const statusLabels = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
}

interface ColumnActionsProps {
  client: Client
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onCreateInvoice: (client: Client) => void
  onNewProject: (client: Client) => void
  onDeleteClient: (client: Client) => void
}

function ColumnActions({
  client,
  onViewDetails,
  onEditClient,
  onCreateInvoice,
  onNewProject,
  onDeleteClient,
}: ColumnActionsProps) {
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
        <DropdownMenuItem onClick={() => onViewDetails(client)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditClient(client)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Client
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onCreateInvoice(client)}>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewProject(client)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Project
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteClient(client)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const createColumns = (actions: Omit<ColumnActionsProps, "client">): ColumnDef<Client>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const company = row.getValue("company") as string
      return company ? (
        <div className="flex items-center space-x-1">
          <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate" title={company}>
            {company}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return email ? (
        <div className="flex items-center space-x-1">
          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate" title={email}>
            {email}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string
      return phone ? (
        <div className="flex items-center space-x-1">
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate" title={phone}>
            {phone}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const client = row.original
      return client.city || client.state ? (
        <div className="flex items-center space-x-1">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span
            className="text-sm truncate"
            title={`${client.city}${client.city && client.state ? ", " : ""}${client.state}`}
          >
            {client.city}
            {client.city && client.state && ", "}
            {client.state}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
  },
  {
    id: "projects",
    header: "Projects",
    cell: ({ row }) => {
      const client = row.original
      return client.projects && client.projects.length > 0 ? (
        <div className="space-y-1">
          {client.projects.slice(0, 1).map((project) => (
            <div key={project.id} className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className={`text-white text-xs flex-shrink-0 ${statusColors[project.status as keyof typeof statusColors]}`}
              >
                {statusLabels[project.status as keyof typeof statusLabels]}
              </Badge>
              <span className="text-xs truncate" title={project.name}>
                {project.name}
              </span>
            </div>
          ))}
          {client.projects.length > 1 && (
            <div className="text-xs text-muted-foreground">+{client.projects.length - 1} more</div>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No projects</span>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Client Since
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return <span className="text-sm text-muted-foreground whitespace-nowrap">{date.toLocaleDateString()}</span>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const client = row.original
      return (
        <ColumnActions
          client={client}
          onViewDetails={actions.onViewDetails}
          onEditClient={actions.onEditClient}
          onCreateInvoice={actions.onCreateInvoice}
          onNewProject={actions.onNewProject}
          onDeleteClient={actions.onDeleteClient}
        />
      )
    },
  },
]
