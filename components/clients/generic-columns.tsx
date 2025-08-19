"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDownIcon, MailIcon, Call02Icon, Building01Icon, LocationIcon, CheckmarkCircleIcon, ClockIcon, GitBranchIcon, UserIcon, Building02Icon, BriefcaseIcon, ActivityIcon, CopyIcon, Calendar01Icon, UserTime01Icon, ZapIcon, Activity03Icon, WorkIcon, FilterIcon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { SourceLabel } from "@/components/ui/source-label"
import { formatCurrency } from "@/lib/currency"
import { Client } from "@/hooks/use-clients"
import { SortableHeader } from "@/components/table/column-utils"

import { toast } from "sonner"
import { countries } from "@/lib/countries"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { formatDateForDatabase } from "@/lib/date-format"

const clientStatusConfig = {
  active: {
    label: "Active",
    icon: CheckmarkCircleIcon,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  pipeline: {
    label: "Pipeline",
    icon: FilterIcon,
    variant: "outline" as const,
    iconClassName: "text-purple-500",
  },
  closed: {
    label: "Closed",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-muted-foreground",
  },
}

const clientRelationshipConfig = {
  recurring: {
    label: "Recurring",
    icon: UserTime01Icon,
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  "one-time": {
    label: "One Time",
    icon: ZapIcon,
    variant: "outline" as const,
    iconClassName: "text-orange-500",
  },
  regular: {
    label: "Regular",
    icon: ClockIcon,
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
}

interface ClientColumnConfig {
  onStatusChange?: (clientId: string, newStatus: string) => void
  onRelationshipChange?: (clientId: string, newRelationship: string) => void
  onProjectClick?: (projectId: string) => void
  onEditClient?: (client: any) => void
  refetch?: () => void
  formatDate?: (date: Date | string | null | undefined) => string
}

// Create footer functions
const createFooterFunctions = () => ({
  totalClients: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <span className="text-sm font-normal text-muted-foreground">{aggregations.totalClients || 0}</span>
  },
  totalProjects: ({ table }: any) => {
    const aggregations = table.aggregations || {}
    return <span className="text-sm font-normal text-muted-foreground">{aggregations.totalProjects || 0}</span>
  }
})

// Helper function to get full country name from country code
const getCountryName = (countryCode: string): string => {
  if (!countryCode) return ""
  const country = countries.find(c => c.code === countryCode)
  return country ? country.name : countryCode // Fallback to code if not found
}

export function createClientColumns(columnConfig: ClientColumnConfig): ColumnDef<Client>[] {
  const formatDate = columnConfig.formatDate || ((date: any) => date?.toString() || "")
  
  const footerFunctions = createFooterFunctions()
  
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const columns: ColumnDef<Client>[] = [
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
    // 1. Name
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} icon={UserIcon} className="px-0">
          Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const name = row.getValue("name") as string
        
        return (
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
            onClick={() => columnConfig.onEditClient?.(client)}
          >
            <ClientAvatar 
              name={name} 
              avatarUrl={client.avatar_url}
              size="sm"
            />
            <span className="font-medium truncate text-foreground hover:underline" title={name}>
              {name}
            </span>
          </div>
        )
      },
      footer: footerFunctions.totalClients,
      size: 250,
    },
    // 2. Company
    {
      accessorKey: "company",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Building01Icon} className="px-0">
          Company
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const company = row.getValue("company") as string
        return company ? (
          <span className="text-sm text-muted-foreground truncate" title={company}>
            {company}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 200,
    },
    // 3. Relationship
    {
      accessorKey: "relationship",
      header: ({ column }) => (
        <SortableHeader column={column} icon={UserTime01Icon} className="px-0">
          Relationship
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const relationship = row.getValue("relationship") as string || "regular"
        const config = clientRelationshipConfig[relationship as keyof typeof clientRelationshipConfig] || clientRelationshipConfig.regular
        const Icon = config.icon
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer font-normal text-sm">
                {config.icon && <HugeiconsIcon icon={config.icon} className={`h-3 w-3 ${config.iconClassName}`} />}
                <span>{config.label}</span>
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(clientRelationshipConfig).map(([key, relationshipConfig]) => {
                const RelationshipIcon = relationshipConfig.icon
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => columnConfig.onRelationshipChange?.(row.original.id, key)}
                    disabled={relationship === key}
                  >
                    <HugeiconsIcon icon={RelationshipIcon} className={`mr-2 h-3 w-3 ${relationshipConfig.iconClassName}`} />
                    {relationshipConfig.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 130,
    },
    // 4. Source
    {
      id: "source",
      accessorKey: "source",
      header: ({ column }) => (
        <SortableHeader column={column} icon={ZapIcon} className="px-0">
          Source
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const source = row.getValue("source") as string
        return <SourceLabel value={source} />
      },
      size: 140,
    },
    // 5. Status
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Activity03Icon} className="px-0">
          Status
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const config = clientStatusConfig[status as keyof typeof clientStatusConfig] || clientStatusConfig.active
        const Icon = config.icon
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant={config.variant} className="flex items-center space-x-1 cursor-pointer font-normal text-sm">
                {config.icon && <HugeiconsIcon icon={config.icon} className={`h-3 w-3 ${config.iconClassName}`} />}
                <span>{config.label}</span>
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(clientStatusConfig).map(([key, statusConfig]) => {
                const StatusIcon = statusConfig.icon
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => columnConfig.onStatusChange?.(row.original.id, key)}
                    disabled={status === key}
                  >
                    <HugeiconsIcon icon={StatusIcon} className={`mr-2 h-3 w-3 ${statusConfig.iconClassName}`} />
                    {statusConfig.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 120,
    },
    // 6. Client since
    {
      accessorKey: "client_since",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Calendar01Icon} className="px-0">
          Client Since
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const date = client.client_since ? new Date(client.client_since) : undefined
        
        return (
          <div className="w-full max-w-[100px]">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer w-full text-left">
                  {date ? formatDate(date) : "—"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    // Update client_since date
                    if (columnConfig.onStatusChange && newDate) {
                      columnConfig.onStatusChange(client.id, `client_since:${formatDateForDatabase(newDate)}`)
                    }
                  }}
                  defaultMonth={date} // Preserve the month of the selected date when opening
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2004}
                  toYear={new Date().getFullYear()}
                 />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
      size: 140,
    },
    // 7. Projects
    {
      id: "projects",
      header: ({ column }) => (
        <SortableHeader column={column} icon={WorkIcon} className="px-0">
          Projects
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const projects = row.original.projects || []
        const activeProjects = projects.filter(p => p.status === 'active').length
        const totalProjects = projects.length
        
        return (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {activeProjects}/{totalProjects}
            </Badge>
          </div>
        )
      },
      footer: footerFunctions.totalProjects,
      size: 120,
    },
    // 8. Email
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortableHeader column={column} icon={MailIcon} className="px-0">
          Email
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return email ? (
          <div className="relative group/cell w-full">
            <a 
              href={`mailto:${email}`} 
              className="text-sm text-muted-foreground hover:text-foreground truncate block"
              title={email}
            >
              {email}
            </a>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-20 bg-background border shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleCopyToClipboard(email, "Email")
              }}
            >
              <HugeiconsIcon icon={CopyIcon} className="h-3 w-3"  />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 250,
    },
    // 9. Phone
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <SortableHeader column={column} icon={Call02Icon} className="px-0">
          Phone
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="relative group/cell w-full">
            <a 
              href={`tel:${phone}`} 
              className="text-sm text-muted-foreground hover:text-foreground truncate block"
              title={phone}
            >
              {phone}
            </a>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity z-20 bg-background border shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleCopyToClipboard(phone, "Phone")
              }}
            >
              <HugeiconsIcon icon={CopyIcon} className="h-3 w-3"  />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 150,
    },
    // 10. Location
    {
      id: "location",
      header: ({ column }) => (
        <SortableHeader column={column} icon={LocationIcon} className="px-0">
          Location
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const client = row.original
        const countryName = getCountryName(client.country || "")
        
        return countryName ? (
          <span className="text-sm text-muted-foreground truncate" title={countryName}>
            {countryName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
      size: 200,
    },
  ]

  return columns
} 