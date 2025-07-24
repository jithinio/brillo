"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { DatePickerTable } from "@/components/ui/date-picker-table"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  Clock, 
  Pause, 
  XCircle, 
  GitBranch 
} from "lucide-react"

// Status configuration
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

// Memoized Project Name Cell
export const ProjectNameCell = React.memo(({ name }: { name: string }) => {
  return (
    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
      {name}
    </div>
  )
})
ProjectNameCell.displayName = "ProjectNameCell"

// Memoized Status Cell
export const StatusCell = React.memo(({ 
  status, 
  onStatusChange 
}: { 
  status: string
  onStatusChange: (newStatus: string) => void 
}) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
  const Icon = config.icon
  
  return (
    <div className="">
      <Badge
        variant={config.variant}
        className="font-normal flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => onStatusChange(status)}
      >
        <Icon className={cn("h-3 w-3", config.iconClassName)} />
        {config.label}
      </Badge>
    </div>
  )
})
StatusCell.displayName = "StatusCell"

// Memoized Client Cell
export const ClientCell = React.memo(({ 
  client 
}: { 
  client?: { name: string; company?: string; avatar_url?: string | null } 
}) => {
  if (!client) {
    return (
      <div className="">
        <span className="text-muted-foreground text-sm">No client</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2">
      <ClientAvatar 
        name={client.name} 
        avatarUrl={client.avatar_url} 
        size="sm" 
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium truncate">{client.name}</span>
        {client.company && (
          <span className="text-xs text-muted-foreground truncate">{client.company}</span>
        )}
      </div>
    </div>
  )
})
ClientCell.displayName = "ClientCell"

// Memoized Date Cell
export const DateCell = React.memo(({ 
  date, 
  onChange,
  placeholder = "Select date"
}: { 
  date?: string
  onChange: (date: Date | undefined) => void
  placeholder?: string
}) => {
  return (
    <div className="">
      <DatePickerTable
        date={date ? new Date(date) : undefined}
        onSelect={onChange}
        placeholder={placeholder}
      />
    </div>
  )
})
DateCell.displayName = "DateCell"

// Memoized Currency Cell
export const CurrencyCell = React.memo(({ 
  value,
  isNegative = false 
}: { 
  value?: number
  isNegative?: boolean 
}) => {
  return (
    <div className={cn(
              "text-right font-mono text-sm",
      isNegative && value && value > 0 && "text-red-600 dark:text-red-400"
    )}>
      {value ? formatCurrency(value) : "—"}
    </div>
  )
})
CurrencyCell.displayName = "CurrencyCell" 