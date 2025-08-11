"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { ColumnDef } from "@tanstack/react-table"
import { GenericDataTable } from "./GenericDataTable"
import { TableErrorBoundary } from "@/components/projects/ErrorBoundary"
import { ColumnViewFilter } from "@/components/projects/column-view-filter"
import { PageHeader } from "@/components/page-header"
import { Loader } from "@/components/ui/loader"
import { PageActionsMenu } from "@/components/page-actions-menu"
import type { GenericEntity, DataHookReturn, TableFeatures, EntityActions } from "./types"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Search, X, Calendar, Plus, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { getTimePeriodLabel } from "@/lib/project-filters-v2"

interface GenericTableWrapperProps<T extends GenericEntity> {
  entityType: string
  pageTitle: string
  dataHook: () => DataHookReturn<T>
  createColumns: (actions: EntityActions<T>) => ColumnDef<T>[]
  features?: TableFeatures
  actions?: EntityActions<T>
  filters?: Record<string, any>
  defaultColumnWidths?: Record<string, number>
  showSummaryCards?: boolean
  summaryCards?: React.ReactNode
  className?: string
  addButton?: React.ReactNode
  metricsComponent?: React.ReactNode
  onFiltersChange?: (filters: any) => void
}

const TIME_PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
]

const RELATIONSHIP_OPTIONS = [
  { value: "recurring", label: "Recurring" },
  { value: "one-time", label: "One Time" },
  { value: "regular", label: "Regular" },
]

export function GenericTableWrapper<T extends GenericEntity>({
  entityType,
  pageTitle,
  dataHook,
  createColumns,
  features = {},
  actions = {},
  filters,
  defaultColumnWidths = {},
  showSummaryCards = false,
  summaryCards,
  className,
  addButton,
  metricsComponent,
  onFiltersChange,
}: GenericTableWrapperProps<T>) {
  // Data hook
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    refetch,
    updateStatus,
    totalCount,
    metrics,
  } = dataHook()

  // Table preferences
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = `${entityType}-table`
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Column state
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({})
  const columnWidthsRef = React.useRef<Record<string, number>>({})
  const [isResizing, setIsResizing] = React.useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = React.useState(0)
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0)
  const [resizeTooltip, setResizeTooltip] = React.useState<{ x: number; y: number; width: number } | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [timePeriod, setTimePeriod] = React.useState<string | null>(null)
  const [timePeriodOpen, setTimePeriodOpen] = React.useState(false)
  const [relationship, setRelationship] = React.useState<string[]>([])
  const [relationshipOpen, setRelationshipOpen] = React.useState(false)

  // Create sorting functions
  const [sortBy, setSortBy] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)

  const createSortingFunctions = React.useCallback((columnId: string) => ({
    toggleSorting: (desc?: boolean) => {
      if (sortBy === columnId) {
        if (desc === true && sortDirection === 'asc') {
          setSortDirection('desc')
        } else if (desc === false && sortDirection === 'desc') {
          setSortDirection('asc')
        } else if (desc === true) {
          setSortDirection('desc')
        } else if (desc === false) {
          setSortDirection('asc')
        } else {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        }
      } else {
        setSortBy(columnId)
        setSortDirection(desc === false ? 'asc' : 'desc')
      }
    },
    getIsSorted: () => {
      if (sortBy !== columnId) {
        return false
      }
      return sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : false
    },
    clearSorting: () => {
      setSortBy(null)
      setSortDirection(null)
    }
  }), [sortBy, sortDirection])

  // Apply client-side search filtering and sorting
  const filteredAndSortedData = React.useMemo(() => {
    let result = data

    // Apply search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item: any) => {
        // Search in common fields
        if (item.name?.toLowerCase().includes(query)) return true
        if (item.invoice_number?.toLowerCase().includes(query)) return true
        if (item.email?.toLowerCase().includes(query)) return true
        if (item.company?.toLowerCase().includes(query)) return true
        
        // Search in nested fields
        if (item.clients?.name?.toLowerCase().includes(query)) return true
        if (item.clients?.company?.toLowerCase().includes(query)) return true
        if (item.projects?.name?.toLowerCase().includes(query)) return true
        
        return false
      })
    }

    // Apply relationship filtering (for clients)
    if (entityType === "clients" && relationship.length > 0) {
      result = result.filter((item: any) => {
        return relationship.includes(item.relationship || 'regular')
      })
    }

    // Apply sorting
    if (sortBy && sortDirection) {
      result = [...result].sort((a: any, b: any) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]

        // Handle nested values (e.g., clients.name)
        if (sortBy.includes('.')) {
          const keys = sortBy.split('.')
          aValue = keys.reduce((obj, key) => obj?.[key], a)
          bValue = keys.reduce((obj, key) => obj?.[key], b)
        }

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

        // Convert to strings for comparison if needed
        if (typeof aValue === 'string') aValue = aValue.toLowerCase()
        if (typeof bValue === 'string') bValue = bValue.toLowerCase()

        // Compare values
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    } else {
      // If no sort is applied, ensure consistent order (e.g., by ID)
      result = [...result].sort((a: any, b: any) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
    }

    return result
  }, [data, searchQuery, sortBy, sortDirection, entityType, relationship])

  // Keep ref in sync
  React.useEffect(() => {
    columnWidthsRef.current = columnWidths
  }, [columnWidths])

  // Load preferences
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded) {
      const savedWidths = getTablePreference(TABLE_NAME, "column_widths", defaultColumnWidths)
      const savedOrder = getTablePreference(TABLE_NAME, "column_order", [])
      const savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      const savedSorting = getTablePreference(TABLE_NAME, "sorting", { sortBy: null, sortDirection: null })

      // Always set column widths (either saved or defaults)
      setColumnWidths(savedWidths)
      
      if (savedOrder.length > 0) {
        setColumnOrder(savedOrder)
      }
      if (Object.keys(savedVisibility).length > 0) {
        setColumnVisibility(savedVisibility)
      }
      
      // Load sorting preferences
      if (savedSorting.sortBy && savedSorting.sortDirection) {
        setSortBy(savedSorting.sortBy)
        setSortDirection(savedSorting.sortDirection)
      }

      setPreferencesLoaded(true)
    }
  }, [preferencesLoading, preferencesLoaded, TABLE_NAME, getTablePreference, defaultColumnWidths])

  // Save column widths
  React.useEffect(() => {
    if (preferencesLoaded && Object.keys(columnWidths).length > 0) {
      updateTablePreference(TABLE_NAME, "column_widths", columnWidths)
    }
  }, [columnWidths, preferencesLoaded, TABLE_NAME, updateTablePreference])

  // Save column order
  React.useEffect(() => {
    if (preferencesLoaded && columnOrder.length > 0) {
      updateTablePreference(TABLE_NAME, "column_order", columnOrder)
    }
  }, [columnOrder, preferencesLoaded, TABLE_NAME, updateTablePreference])

  // Save column visibility - Always save when preferencesLoaded, even if empty
  React.useEffect(() => {
    if (preferencesLoaded) {
      updateTablePreference(TABLE_NAME, "column_visibility", columnVisibility)
    }
  }, [columnVisibility, preferencesLoaded, TABLE_NAME, updateTablePreference])

  // Save sorting preferences
  React.useEffect(() => {
    if (preferencesLoaded) {
      updateTablePreference(TABLE_NAME, "sorting", { sortBy, sortDirection })
    }
  }, [sortBy, sortDirection, preferencesLoaded, TABLE_NAME, updateTablePreference])

  // Get all columns
  const allColumns = React.useMemo(() => createColumns(actions), [createColumns, actions])

  // Initialize column order and visibility - only if no saved preferences exist
  React.useEffect(() => {
    if (allColumns.length > 0 && columnOrder.length === 0 && preferencesLoaded) {
      // Check if we have any saved preferences first
      const savedOrder = getTablePreference(TABLE_NAME, "column_order", [])
      const savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      
      // Only set defaults if no saved preferences exist
      if (savedOrder.length === 0 && Object.keys(savedVisibility).length === 0) {
        const defaultOrder = allColumns.map((col: any) => col.id || col.accessorKey)
        const defaultVisibility = allColumns.reduce((acc: any, col: any) => {
          acc[col.id || col.accessorKey] = true
          return acc
        }, {})
        
        setColumnOrder(defaultOrder)
        setColumnVisibility(defaultVisibility)
      }
    }
  }, [allColumns, columnOrder.length, preferencesLoaded, TABLE_NAME, getTablePreference])

  // Apply column order and visibility
  const columns = React.useMemo(() => {
    const processColumn = (col: any) => {
      const colId = col.id || col.accessorKey
      const width = columnWidths[colId] || col.size || 150
      const sortingFunctions = createSortingFunctions(colId)
      
      return { 
        ...col, 
        size: width,
        // Add sorting functions for SortableHeader
        toggleSorting: sortingFunctions.toggleSorting,
        getIsSorted: sortingFunctions.getIsSorted,
        clearSorting: sortingFunctions.clearSorting
      }
    }

    if (columnOrder.length === 0) {
      return allColumns.map(processColumn)
    }
    
    // Create a map for quick lookup
    const columnMap = new Map(allColumns.map((col: any) => [col.id || col.accessorKey, col]))
    
    // Reorder columns based on saved order
    const orderedColumns = columnOrder
      .map(colId => {
        const col = columnMap.get(colId)
        if (col && columnVisibility[colId] !== false) {
          return processColumn(col)
        }
        return null
      })
      .filter(Boolean)
    
    // Add any new columns that aren't in the saved order
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns
      .filter((col: any) => !orderedIds.has(col.id || col.accessorKey))
      .filter((col: any) => columnVisibility[col.id || col.accessorKey] !== false)
      .map(processColumn)
    
    return [...orderedColumns, ...newColumns]
  }, [createColumns, actions, columnOrder, columnVisibility, columnWidths, allColumns, createSortingFunctions])

  // Column metadata for view filter
  const columnMetadata = React.useMemo(() => {
    if (columnOrder.length === 0) {
      // If no order is set yet, use original order
      return allColumns.map((col: any) => ({
        id: col.id || col.accessorKey,
        accessorKey: col.accessorKey,
        header: col.header,
        visible: columnVisibility[col.id || col.accessorKey] !== false,
        canHide: col.id !== 'select'
      }))
    }

    // Create a map for quick lookup
    const columnMap = new Map(allColumns.map((col: any) => [col.id || col.accessorKey, col]))
    
    // Create metadata respecting current column order
    const orderedMetadata = columnOrder
      .map(colId => {
        const col = columnMap.get(colId)
        if (col) {
          return {
            id: col.id || col.accessorKey,
            accessorKey: col.accessorKey,
            header: col.header,
            visible: columnVisibility[col.id || col.accessorKey] !== false,
            canHide: col.id !== 'select'
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
    
    // Add any new columns that aren't in the saved order (shouldn't happen but safety measure)
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns
      .filter((col: any) => !orderedIds.has(col.id || col.accessorKey))
      .map((col: any) => ({
        id: col.id || col.accessorKey,
        accessorKey: col.accessorKey,
        header: col.header,
        visible: columnVisibility[col.id || col.accessorKey] !== false,
        canHide: col.id !== 'select'
      }))
    
    return [...orderedMetadata, ...newColumns]
  }, [allColumns, columnVisibility, columnOrder])

  // Handle export
  const handleExport = React.useCallback(() => {
    if (actions.onExport) {
      actions.onExport()
    } else {
      toast.info('Export feature coming soon')
    }
  }, [actions])

  // Handle resize
  const handleResizeStart = React.useCallback((columnId: string, startX: number, event: React.MouseEvent) => {
    setIsResizing(columnId)
    setResizeStartX(startX)
    const currentWidth = columnWidthsRef.current[columnId] || 150
    setResizeStartWidth(currentWidth)
    
    // Show tooltip at mouse position
    setResizeTooltip({
      x: event.clientX,
      y: event.clientY - 40,
      width: currentWidth
    })
  }, [])

  React.useEffect(() => {
    if (!isResizing) {
      setResizeTooltip(null)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX
      const newWidth = Math.max(50, resizeStartWidth + deltaX)
      
      setColumnWidths(prev => {
        const updated = {
          ...prev,
          [isResizing]: newWidth
        }
        columnWidthsRef.current = updated
        return updated
      })
      
      // Update tooltip position and width
      setResizeTooltip({
        x: e.clientX,
        y: e.clientY - 40,
        width: newWidth
      })
    }

    const handleMouseUp = () => {
      setIsResizing(null)
      setResizeTooltip(null)
      updateTablePreference(TABLE_NAME, "last_updated", Date.now())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStartX, resizeStartWidth, TABLE_NAME, updateTablePreference])

  // Reset columns
  const handleResetColumns = React.useCallback(() => {
    // Clear local storage for this table
    updateTablePreference(TABLE_NAME, "column_widths", {})
    updateTablePreference(TABLE_NAME, "column_order", [])
    updateTablePreference(TABLE_NAME, "column_visibility", {})
    
    // Reset state to defaults
    const defaultOrder = allColumns.map((col: any) => col.id || col.accessorKey)
    const defaultVisibility = allColumns.reduce((acc: any, col: any) => {
      acc[col.id || col.accessorKey] = true
      return acc
    }, {})
    
    setColumnWidths(defaultColumnWidths)
    setColumnOrder(defaultOrder)
    setColumnVisibility(defaultVisibility)
    
    toast.success('Table columns reset to defaults')
  }, [TABLE_NAME, allColumns, defaultColumnWidths, updateTablePreference])

  const handleColumnReorder = React.useCallback((activeId: string, overId: string) => {
    setColumnOrder(prev => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      
      if (oldIndex === -1 || newIndex === -1) return prev
      
      const newOrder = [...prev]
      newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, activeId)
      return newOrder
    })
  }, [])

  const handleColumnVisibilityChange = React.useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible
    }))
  }, [])

  const handleTimePeriodSelect = (value: string) => {
    setTimePeriod(value === timePeriod ? null : value)
    setTimePeriodOpen(false)
  }

  const handleRelationshipSelect = (value: string) => {
    setRelationship(prev => 
      prev.includes(value) 
        ? prev.filter(r => r !== value)
        : [...prev, value]
    )
  }

  // Notify parent component when filters change
  React.useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        search: searchQuery,
        timePeriod: timePeriod,
        relationship: relationship,
      })
    }
  }, [searchQuery, timePeriod, relationship, onFiltersChange])

  return (
    <div className={cn("w-full h-screen flex flex-col bg-muted/30", className)}>
      <AnimatePresence>
        {resizeTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg pointer-events-none"
            style={{
              left: resizeTooltip.x - 20,
              top: resizeTooltip.y,
            }}
          >
            {resizeTooltip.width}px
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title={pageTitle}
        action={
          <PageActionsMenu 
            entityType={entityType as "projects" | "invoices" | "clients"}
            onExport={actions.onExport}
            onResetColumns={handleResetColumns}
            showResetColumns={true}
          />
        }
      />

      <div className="flex-shrink-0 sticky top-16 z-10">
        {/* Metrics Component */}
        {metricsComponent && (
          <>
            <div className="border-t border-border">
              {metricsComponent}
            </div>
            <div className="border-b border-border"></div>
          </>
        )}

        {/* Filters Container */}
        <div className="p-6">
          <div className="flex flex-wrap items-center" style={{ gap: '0.3rem' }}>
            {/* Search Input */}
            <div className="relative w-[200px]">
              {isSearching ? (
                <Loader size="sm" variant="primary" className="absolute left-3 top-2" />
              ) : (
                <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder={`Search ${entityType}...`}
                className={`h-8 pl-9 pr-8 text-sm font-normal transition-colors ${
                  isSearching 
                    ? "border-primary/50 bg-primary/5 text-foreground placeholder:text-muted-foreground/60" 
                    : "text-muted-foreground placeholder:text-muted-foreground/60"
                }`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearching(true)
                  setTimeout(() => setIsSearching(false), 300)
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Period Filter - Only show for projects and invoices */}
            {entityType !== "clients" && (
              <Popover open={timePeriodOpen} onOpenChange={setTimePeriodOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                      timePeriod && "border-muted-foreground bg-muted text-muted-foreground"
                    )}
                  >
                    <Calendar className={cn("mr-1 h-3 w-3", timePeriod ? "text-muted-foreground" : "text-muted-foreground")} />
                    {timePeriod ? getTimePeriodLabel(timePeriod) : "Period"}
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
                              checked={timePeriod === period.value}
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
            )}

            {/* Relationship Filter - Only show for clients */}
            {entityType === "clients" && (
              <Popover open={relationshipOpen} onOpenChange={setRelationshipOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
                      relationship.length > 0 && "border-muted-foreground bg-muted text-muted-foreground"
                    )}
                  >
                    <RotateCcw className={cn("mr-1 h-3 w-3", relationship.length > 0 ? "text-muted-foreground" : "text-muted-foreground")} />
                    {relationship.length > 0 ? `Relationship (${relationship.length})` : "Relationship"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {RELATIONSHIP_OPTIONS.map((relationshipOption) => (
                          <CommandItem
                            key={relationshipOption.value}
                            onSelect={() => handleRelationshipSelect(relationshipOption.value)}
                          >
                            <Checkbox
                              checked={relationship.includes(relationshipOption.value)}
                              className="mr-2"
                            />
                            {relationshipOption.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Column View Filter */}
            <ColumnViewFilter
              columns={columnMetadata}
              onColumnReorder={handleColumnReorder}
              onColumnVisibilityChange={handleColumnVisibilityChange}
            />

            {/* Clear Filters Button */}
            {(searchQuery || timePeriod || relationship.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setTimePeriod(null)
                  setRelationship([])
                }}
                className="h-8 text-sm font-normal text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}

            {/* Add Button */}
            <div className="ml-auto">
              {addButton}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <TableErrorBoundary>
          <GenericDataTable
            entityType={entityType as "projects" | "invoices" | "clients"}
            data={filteredAndSortedData}
            columns={columns}
            totalCount={totalCount}
            metrics={metrics}
            features={features}
            actions={actions}
            isLoading={isLoading}
            isFetching={isFetching}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            loadMore={loadMore}
            updateStatus={updateStatus}
            refetch={refetch}
            forceRefresh={refetch}
            onResizeStart={handleResizeStart}
            preferencesLoading={preferencesLoading}
            preferencesLoaded={preferencesLoaded}
          />
        </TableErrorBoundary>
      </div>
    </div>
  )
} 