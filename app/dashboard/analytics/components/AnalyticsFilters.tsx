"use client"

import { useState } from "react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, X, Calendar, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DateRange, AnalyticsFilters } from "@/hooks/use-unified-projects"
import type { Client } from "@/lib/analytics-calculations"
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns"
import { useSettings } from "@/components/settings-provider"

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters
  onFiltersChange: (filters: AnalyticsFilters) => void
  clients: Client[]
  isLoading?: boolean
  onRefresh?: () => void
}

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'planning', label: 'Planning' },
  { value: 'in progress', label: 'In Progress' },
] as const

const QUICK_DATE_RANGES = [
  {
    label: 'This Month',
    getValue: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  },
  {
    label: 'Last Month',
    getValue: () => ({
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1))
    })
  },
  {
    label: 'This Quarter',
    getValue: () => ({
      start: startOfQuarter(new Date()),
      end: endOfQuarter(new Date())
    })
  },
  {
    label: 'Last Quarter',
    getValue: () => ({
      start: startOfQuarter(subQuarters(new Date(), 1)),
      end: endOfQuarter(subQuarters(new Date(), 1))
    })
  },
  {
    label: 'This Year',
    getValue: () => ({
      start: startOfYear(new Date()),
      end: endOfYear(new Date())
    })
  },
  {
    label: 'Last Year',
    getValue: () => ({
      start: startOfYear(subYears(new Date(), 1)),
      end: endOfYear(subYears(new Date(), 1))
    })
  }
] as const

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  clients,
  isLoading = false,
  onRefresh
}: AnalyticsFiltersProps) {
  const { formatDate } = useSettings()
  const [clientSelectOpen, setClientSelectOpen] = useState(false)
  const [statusSelectOpen, setStatusSelectOpen] = useState(false)
  const [quickPeriodValue, setQuickPeriodValue] = useState<string>("")

  // Selected clients for display
  const selectedClients = clients.filter(client => 
    filters.clientIds?.includes(client.id)
  )

  // Selected statuses for display
  const selectedStatuses = PROJECT_STATUSES.filter(status =>
    filters.projectStatuses?.includes(status.value)
  )

  // Handle date range change
  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange
    })
  }

  // Handle quick date range selection
  const handleQuickDateRange = (quickRange: typeof QUICK_DATE_RANGES[number]) => {
    const dateRange = quickRange.getValue()
    handleDateRangeChange(dateRange)
  }

  // Handle client selection
  const handleClientToggle = (clientId: string) => {
    const currentClientIds = filters.clientIds || []
    const newClientIds = currentClientIds.includes(clientId)
      ? currentClientIds.filter(id => id !== clientId)
      : [...currentClientIds, clientId]

    onFiltersChange({
      ...filters,
      clientIds: newClientIds.length > 0 ? newClientIds : undefined
    })
  }

  // Handle status selection
  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.projectStatuses || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]

    onFiltersChange({
      ...filters,
      projectStatuses: newStatuses.length > 0 ? newStatuses : undefined
    })
  }

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({})
    setQuickPeriodValue("")
  }

  // Check if any filters are active (exclude default states)
  const hasActiveFilters = Boolean(
    filters.dateRange || 
    (filters.clientIds && filters.clientIds.length > 0) || 
    (filters.projectStatuses && filters.projectStatuses.length > 0)
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {/* From Date */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">From:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 min-w-[80px] max-w-[160px] w-auto justify-start text-left font-normal border-dashed text-sm px-3"
                >
                  <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {filters.dateRange?.start ? (
                      formatDate(filters.dateRange.start)
                    ) : (
                      <span className="text-muted-foreground">Start</span>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-lg border" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateRange?.start}
                  onSelect={(date) => {
                    if (date) {
                      handleDateRangeChange({
                        start: date,
                        end: filters.dateRange?.end || date
                      })
                    }
                  }}
                  defaultMonth={filters.dateRange?.start} // Preserve the month of the selected date when opening
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  captionLayout="dropdown"
                  fromYear={2004}
                  toYear={new Date().getFullYear()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">To:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 min-w-[80px] max-w-[160px] w-auto justify-start text-left font-normal border-dashed text-sm px-3"
                >
                  <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {filters.dateRange?.end ? (
                      formatDate(filters.dateRange.end)
                    ) : (
                      <span className="text-muted-foreground">End</span>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-lg border" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateRange?.end}
                  onSelect={(date) => {
                    if (date) {
                      handleDateRangeChange({
                        start: filters.dateRange?.start || date,
                        end: date
                      })
                    }
                  }}
                  defaultMonth={filters.dateRange?.end} // Preserve the month of the selected date when opening
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  captionLayout="dropdown"
                  fromYear={2004}
                  toYear={new Date().getFullYear()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick Periods Dropdown */}
          <Select value={quickPeriodValue} onValueChange={(value) => {
            const quickRange = QUICK_DATE_RANGES.find(r => r.label === value)
            if (quickRange) {
              handleQuickDateRange(quickRange)
              setQuickPeriodValue(value)
            }
          }}>
            <SelectTrigger className="h-8 w-[120px] border-dashed text-sm font-normal text-muted-foreground">
              <SelectValue placeholder="Quick">
                <span className="truncate">{quickPeriodValue || "Quick"}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="shadow-lg border">
              {QUICK_DATE_RANGES.map((quickRange) => (
                <SelectItem key={quickRange.label} value={quickRange.label}>
                  {quickRange.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client Filter */}
          <Popover open={clientSelectOpen} onOpenChange={setClientSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientSelectOpen}
                className="h-8 w-[140px] justify-between border-dashed text-sm font-normal text-muted-foreground"
              >
                {selectedClients.length === 0
                  ? "All clients"
                  : selectedClients.length === 1
                  ? selectedClients[0].name
                  : `${selectedClients.length} clients`}
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 shadow-lg border">
              <Command>
                <CommandInput placeholder="Search clients..." />
                <CommandList>
                  <CommandEmpty>No clients found.</CommandEmpty>
                  <CommandGroup>
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => handleClientToggle(client.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filters.clientIds?.includes(client.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{client.name}</span>
                          {client.company && (
                            <span className="text-xs text-muted-foreground">{client.company}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Popover open={statusSelectOpen} onOpenChange={setStatusSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={statusSelectOpen}
                className="h-8 w-[120px] justify-between border-dashed text-sm font-normal text-muted-foreground"
              >
                {selectedStatuses.length === 0
                  ? "All status"
                  : selectedStatuses.length === 1
                  ? selectedStatuses[0].label
                  : `${selectedStatuses.length} status`}
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[150px] p-0 shadow-lg border">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {PROJECT_STATUSES.map((status) => (
                      <CommandItem
                        key={status.value}
                        onSelect={() => handleStatusToggle(status.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filters.projectStatuses?.includes(status.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {status.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 border-dashed text-sm font-normal text-muted-foreground"
              title={isLoading ? "Analytics refreshing..." : "Refresh analytics data"}
            >
              <RefreshCw className={cn("mr-1 h-3 w-3", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 border-dashed text-sm font-normal text-muted-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {/* Client Badges - Only show when specific clients are selected */}
          {filters.clientIds && filters.clientIds.length > 0 && selectedClients.map((client) => (
            <Badge key={client.id} variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
              {client.name}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleClientToggle(client.id)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}

          {/* Status Badges - Only show when specific statuses are selected */}
          {filters.projectStatuses && filters.projectStatuses.length > 0 && selectedStatuses.map((status) => (
            <Badge key={status.value} variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
              {status.label}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleStatusToggle(status.value)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}

          {/* Date Range Badge - Only show when custom date range is set */}
          {filters.dateRange && (
            <Badge variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
              {formatDate(filters.dateRange.start)} - {formatDate(filters.dateRange.end)}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => {
                  handleDateRangeChange(undefined)
                  setQuickPeriodValue("")
                }}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
} 