"use client"

import * as React from "react"
import { Search, X, Settings, CheckCircle, CalendarIcon, Users, FolderKanban, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { countActiveFilters, hasActiveFilters } from "@/lib/project-filters-v2"
import { ColumnViewFilter } from "./column-view-filter"
import { useCanPerformAction } from "@/hooks/use-subscription"
import { toast } from "sonner"

// Memoized filter option lists to prevent recreation
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pipeline", label: "Pipeline" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

const PROJECT_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "recurring", label: "Recurring" },
  { value: "hourly", label: "Hourly" },
] as const

const TIME_PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
] as const

interface OptimizedProjectFiltersProps {
  clients?: Array<{ id: string; name: string; company?: string }>
  showStatusFilter?: boolean
  className?: string
  onAddProject?: () => void
  table?: any
  columns?: any[]
  onColumnReorder?: (columnOrder: string[]) => void
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void
}

// Memoized search input component
const SearchInput = React.memo(({ 
  value, 
  onChange, 
  onClear, 
  isSearching,
  className 
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  isSearching: boolean
  className?: string
}) => (
  <div className={cn("relative w-[200px]", className)}>
    {isSearching ? (
      <div className="absolute left-3 top-2 h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-primary rounded-full animate-spin" />
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-gray-100"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    )}
  </div>
))

SearchInput.displayName = "SearchInput"

// Memoized filter button component
const FilterButton = React.memo(({ 
  children, 
  isActive, 
  onClick, 
  icon: Icon, 
  count, 
  className 
}: {
  children: React.ReactNode
  isActive: boolean
  onClick: () => void
  icon: React.ElementType
  count?: number
  className?: string
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className={cn(
      "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
      isActive && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
      className
    )}
  >
    <Icon className={cn("mr-1 h-3 w-3", isActive ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
    {children}
    {count && count > 0 && (
      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
        {count}
      </Badge>
    )}
  </Button>
))

FilterButton.displayName = "FilterButton"

// Memoized client list to prevent recreation
const ClientList = React.memo(({ 
  clients, 
  selectedClients, 
  onToggle 
}: {
  clients: Array<{ id: string; name: string; company?: string }>
  selectedClients: string[]
  onToggle: (clientId: string) => void
}) => (
  <>
    {clients.map((client) => (
      <CommandItem
        key={client.id}
        onSelect={() => onToggle(client.id)}
      >
        <Checkbox
          checked={selectedClients.includes(client.id)}
          className="mr-2"
        />
        <div className="flex flex-col">
          <span className="font-medium">{client.name}</span>
          {client.company && (
            <span className="text-xs text-muted-foreground">{client.company}</span>
          )}
        </div>
      </CommandItem>
    ))}
  </>
))

ClientList.displayName = "ClientList"

// Main optimized component with aggressive memoization
export const OptimizedProjectFilters = React.memo(({ 
  clients = [], 
  showStatusFilter = false,
  className,
  onAddProject,
  table,
  columns,
  onColumnReorder,
  onColumnVisibilityChange
}: OptimizedProjectFiltersProps) => {
  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()
  
  const {
    filters,
    loading,
    isSearching,
    updateFilter,
    updateSearch,
    toggleStatus,
    toggleClient,
    toggleProjectType,
    clearFilters,
    clearFilterType,
  } = useProjectFiltersV2()

  // Memoized state for dropdowns
  const [popoverStates, setPopoverStates] = React.useState({
    status: false,
    projectType: false,
    client: false,
    timePeriod: false,
    view: false
  })

  // Memoized active filter counts
  const activeCount = React.useMemo(() => countActiveFilters(filters), [filters])
  const isActive = React.useMemo(() => hasActiveFilters(filters), [filters])

  // Memoized handlers to prevent recreation
  const handlePopoverChange = React.useCallback((key: keyof typeof popoverStates, value: boolean) => {
    setPopoverStates(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTimePeriodSelect = React.useCallback((value: string) => {
    const typedValue = value as 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year'
    updateFilter('timePeriod', value === filters.timePeriod ? null : typedValue)
    handlePopoverChange('timePeriod', false)
  }, [filters.timePeriod, updateFilter, handlePopoverChange])

  const handleAddProject = React.useCallback(() => {
    if (!canCreateResource('projects')) {
      const reason = getActionBlockedReason('projects')
      toast.error("Cannot create project", { description: reason })
      return
    }
    onAddProject?.()
  }, [canCreateResource, getActionBlockedReason, onAddProject])

  // Memoized filtered clients for search
  const filteredClients = React.useMemo(() => clients, [clients])

  // Loading state
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Top row: Search, Filters, and Action Buttons */}
      <div className="flex flex-wrap items-center" style={{ gap: '0.3rem' }}>
        {/* Optimized Search Input */}
        <SearchInput
          value={filters.search}
          onChange={updateSearch}
          onClear={() => updateSearch("")}
          isSearching={isSearching}
        />

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
            <Popover open={popoverStates.view} onOpenChange={(open) => handlePopoverChange('view', open)}>
              <PopoverTrigger asChild>
                <FilterButton
                  isActive={false}
                  onClick={() => handlePopoverChange('view', !popoverStates.view)}
                  icon={Settings}
                >
                  View
                </FilterButton>
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
                                handlePopoverChange('view', false)
                                setTimeout(() => handlePopoverChange('view', true), 50)
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
            <Popover open={popoverStates.status} onOpenChange={(open) => handlePopoverChange('status', open)}>
              <PopoverTrigger asChild>
                <FilterButton
                  isActive={filters.status.length > 0}
                  onClick={() => handlePopoverChange('status', !popoverStates.status)}
                  icon={CheckCircle}
                  count={filters.status.length}
                >
                  Status
                </FilterButton>
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
                          onSelect={() => toggleStatus(status.value)}
                        >
                          <Checkbox
                            checked={filters.status.includes(status.value)}
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
          <Popover open={popoverStates.projectType} onOpenChange={(open) => handlePopoverChange('projectType', open)}>
            <PopoverTrigger asChild>
              <FilterButton
                isActive={filters.projectType.length > 0}
                onClick={() => handlePopoverChange('projectType', !popoverStates.projectType)}
                icon={FolderKanban}
                count={filters.projectType.length}
              >
                Type
              </FilterButton>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search type..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {PROJECT_TYPE_OPTIONS.map((type) => (
                      <CommandItem
                        key={type.value}
                        onSelect={() => toggleProjectType(type.value)}
                      >
                        <Checkbox
                          checked={filters.projectType.includes(type.value)}
                          className="mr-2"
                        />
                        {type.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Client Filter */}
          {filteredClients.length > 0 && (
            <Popover open={popoverStates.client} onOpenChange={(open) => handlePopoverChange('client', open)}>
              <PopoverTrigger asChild>
                <FilterButton
                  isActive={filters.client.length > 0}
                  onClick={() => handlePopoverChange('client', !popoverStates.client)}
                  icon={Users}
                  count={filters.client.length}
                >
                  Client
                </FilterButton>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      <ClientList
                        clients={filteredClients}
                        selectedClients={filters.client}
                        onToggle={toggleClient}
                      />
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Time Period Filter */}
          <Popover open={popoverStates.timePeriod} onOpenChange={(open) => handlePopoverChange('timePeriod', open)}>
            <PopoverTrigger asChild>
              <FilterButton
                isActive={!!filters.timePeriod}
                onClick={() => handlePopoverChange('timePeriod', !popoverStates.timePeriod)}
                icon={CalendarIcon}
              >
                Period
              </FilterButton>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search periods..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
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
              className="h-8 px-2 lg:px-3 text-sm font-normal text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200"
            >
              Clear all ({activeCount})
            </Button>
          )}
        </div>

        {/* Add Project Button */}
        {onAddProject && (
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={handleAddProject}
              className="h-8 gap-1 text-sm font-normal"
              disabled={!canCreateResource('projects')}
            >
              <Plus className="h-3 w-3" />
              Add Project
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.clients === nextProps.clients &&
    prevProps.showStatusFilter === nextProps.showStatusFilter &&
    prevProps.className === nextProps.className &&
    prevProps.onAddProject === nextProps.onAddProject &&
    prevProps.table === nextProps.table &&
    prevProps.columns === nextProps.columns &&
    prevProps.onColumnReorder === nextProps.onColumnReorder &&
    prevProps.onColumnVisibilityChange === nextProps.onColumnVisibilityChange
  )
})

OptimizedProjectFilters.displayName = "OptimizedProjectFilters"