"use client"

import * as React from "react"
import { Filter, ChevronDown, Search, Plus, Calendar, Settings, CheckCircle, Users, X, Crown, Tag } from "lucide-react"
import { ColumnViewFilter } from "./column-view-filter"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { hasActiveFilters, countActiveFilters, getTimePeriodLabel } from "@/lib/project-filters-v2"
import { cn } from "@/lib/utils"
import { useCanPerformAction } from "@/components/over-limit-alert"
import Link from "next/link"

interface Client {
  id: string
  name: string
  company?: string
}

interface ProjectFiltersV2Props {
  clients: Client[]
  showStatusFilter?: boolean
  className?: string
  onAddProject?: () => void
  table?: any // React Table instance for column visibility
  // Column view filter props
  columns?: Array<{
    id: string
    accessorKey?: string
    header: string | ((props: any) => React.ReactNode)
    visible: boolean
    canHide?: boolean
  }>
  onColumnReorder?: (activeId: string, overId: string) => void
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pipeline", label: "Pipeline" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "due", label: "Due" },
]

const PROJECT_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "recurring", label: "Recurring" },
  { value: "hourly", label: "Hourly" },
]

const TIME_PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
]

export function ProjectFiltersV2({ 
  clients = [], 
  showStatusFilter = false,
  className,
  onAddProject,
  table,
  columns,
  onColumnReorder,
  onColumnVisibilityChange
}: ProjectFiltersV2Props) {
  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()
  
  const {
    filters,
    loading,
    isSearching,
    updateFilter,
    debouncedUpdateFilters,
    updateSearch,
    toggleStatus,
    toggleClient,
    toggleProjectType,
    clearFilters,
    clearFilterType,
  } = useProjectFiltersV2()

  const [statusOpen, setStatusOpen] = React.useState(false)
  const [projectTypeOpen, setProjectTypeOpen] = React.useState(false)
  const [clientOpen, setClientOpen] = React.useState(false)
  const [timePeriodOpen, setTimePeriodOpen] = React.useState(false)
  const [viewOpen, setViewOpen] = React.useState(false)

  const activeCount = countActiveFilters(filters)
  const isActive = hasActiveFilters(filters)

  // Debug log for filter state (only when active state changes)
  React.useEffect(() => {
    console.log('🎯 Filters active:', isActive, 'count:', activeCount)
  }, [isActive, activeCount])

  const handleTimePeriodSelect = (value: string) => {
    const typedValue = value as 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year'
    updateFilter('timePeriod', value === filters.timePeriod ? null : typedValue)
    setTimePeriodOpen(false)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Top row: Search, Filters, and Action Buttons */}
      <div className="flex flex-wrap items-center" style={{ gap: '0.3rem' }}>
        {/* Search Input */}
        <div className="relative w-[200px]">
          {isSearching ? (
            <Loader size="sm" variant="primary" className="absolute left-3 top-2" />
          ) : (
            <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search projects..."
            className={`h-8 pl-9 pr-8 text-sm font-normal transition-colors ${
              isSearching 
                ? "border-primary/50 bg-primary/5 text-foreground placeholder:text-muted-foreground/60" 
                : "text-muted-foreground placeholder:text-muted-foreground/60"
            }`}
            value={filters.search}
            onChange={(e) => updateSearch(e.target.value)}
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-gray-100"
              onClick={() => updateSearch("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center" style={{ gap: '0.3rem' }}>
          {/* Column View Filter */}
          {columns && onColumnReorder && onColumnVisibilityChange ? (
            <ColumnViewFilter
              columns={columns}
              onColumnReorder={onColumnReorder}
              onColumnVisibilityChange={onColumnVisibilityChange}
            />
          ) : table && (
            <Popover open={viewOpen} onOpenChange={setViewOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-600 dark:hover:border-gray-400"
                >
                  <Settings className="mr-1 h-3 w-3 text-muted-foreground" />
                  View
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search columns..." />
                  <CommandList>
                    <CommandEmpty>No columns found.</CommandEmpty>
                    <CommandGroup>
                      {table
                        .getAllColumns()
                        .filter((column: any) => column.getCanHide())
                        .map((column: any) => {
                          const isVisible = column.getIsVisible()
                          return (
                            <CommandItem
                              key={column.id}
                              onSelect={() => {
                                column.toggleVisibility(!isVisible)
                                setViewOpen(false)
                                setTimeout(() => setViewOpen(true), 50)
                              }}
                            >
                              <Checkbox
                                checked={isVisible}
                                className="mr-2"
                                onCheckedChange={() => {}}
                              />
                              <span className="capitalize">{column.id}</span>
                            </CommandItem>
                          )
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Status Filter */}
          {showStatusFilter && (
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                    filters.status.length > 0 && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  )}
                >
                                      <CheckCircle className={cn("mr-1 h-3 w-3", filters.status.length > 0 ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
                  Status
                  {filters.status.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {filters.status.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {STATUS_OPTIONS.map((status) => (
                        <CommandItem
                          key={status.value}
                          onSelect={() => toggleStatus(status.value as 'active' | 'pipeline' | 'on_hold' | 'completed' | 'cancelled')}
                        >
                          <Checkbox
                            checked={filters.status.includes(status.value as 'active' | 'pipeline' | 'on_hold' | 'completed' | 'cancelled')}
                            className="mr-2"
                          />
                          {status.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Project Type Filter */}
          <Popover open={projectTypeOpen} onOpenChange={setProjectTypeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                  filters.projectType.length > 0 && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                )}
              >
                <Tag className={cn("mr-1 h-3 w-3", filters.projectType.length > 0 ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
                Type
                {filters.projectType.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {filters.projectType.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search type..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {PROJECT_TYPE_OPTIONS.map((projectType) => (
                      <CommandItem
                        key={projectType.value}
                        onSelect={() => toggleProjectType(projectType.value as 'fixed' | 'recurring' | 'hourly')}
                      >
                        <Checkbox
                          checked={filters.projectType.includes(projectType.value as 'fixed' | 'recurring' | 'hourly')}
                          className="mr-2"
                        />
                        {projectType.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Client Filter */}
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                  filters.client.length > 0 && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                )}
              >
                <Users className={cn("mr-1 h-3 w-3", filters.client.length > 0 ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
                Client
                {filters.client.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {filters.client.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search clients..." />
                <CommandList>
                  <CommandEmpty>No clients found.</CommandEmpty>
                  <CommandGroup>
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => toggleClient(client.id)}
                      >
                        <Checkbox
                          checked={filters.client.includes(client.id)}
                          className="mr-2"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          {client.company && (
                            <span className="text-sm text-muted-foreground">
                              {client.company}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Time Period Filter */}
          <Popover open={timePeriodOpen} onOpenChange={setTimePeriodOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                  filters.timePeriod && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                )}
              >
                                  <Calendar className={cn("mr-1 h-3 w-3", filters.timePeriod ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
                {filters.timePeriod ? getTimePeriodLabel(filters.timePeriod) : "Period"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {TIME_PERIOD_OPTIONS.map((period) => (
                      <CommandItem
                        key={period.value}
                        onSelect={() => handleTimePeriodSelect(period.value)}
                      >
                        <Checkbox
                          checked={filters.timePeriod === period.value}
                          className="mr-2"
                        />
                        {period.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Clear Filters Button */}
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-sm font-normal text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center ml-auto" style={{ gap: '0.3rem' }}>
          {/* Add Project Button */}
          {onAddProject && (
            <div className="flex items-center gap-2">
              {!canCreateResource('projects') && (
                <Button asChild variant="outline" size="sm" className="h-8 text-sm font-normal">
                  <Link href="/pricing">
                    <Crown className="mr-1 h-3 w-3" />
                    Upgrade to Pro
                  </Link>
                </Button>
              )}
              <Button 
                onClick={onAddProject} 
                className="h-8 text-sm font-normal"
                disabled={!canCreateResource('projects')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          )}
        </div>
      </div>


    </div>
  )
} 