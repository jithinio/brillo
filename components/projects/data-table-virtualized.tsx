"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, MoreHorizontal, Eye, EyeOff, Settings2, Maximize2, Minimize2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { cn } from "@/lib/utils"

interface VirtualizedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  totalCount: number
  isLoading?: boolean
  showOptimisticUpdates?: boolean
  estimateSize?: number // Estimated row height
  overscan?: number // Number of items to render outside visible area
  enableVirtualization?: boolean // Toggle virtualization on/off
}

// Performance metrics component
function VirtualizationMetrics({
  totalRows,
  visibleRows,
  overscanRows,
  isVirtualized,
  scrollElementRef,
}: {
  totalRows: number
  visibleRows: [number, number]
  overscanRows: number
  isVirtualized: boolean
  scrollElementRef: React.RefObject<HTMLDivElement | null>
}) {
  const [renderTime, setRenderTime] = React.useState(0)
  const [memoryUsage, setMemoryUsage] = React.useState(0)

  // Measure render performance
  React.useEffect(() => {
    const start = performance.now()
    const timer = setTimeout(() => {
      setRenderTime(performance.now() - start)
    }, 0)
    return () => clearTimeout(timer)
  }, [visibleRows])

  // Estimate memory usage (rough calculation)
  React.useEffect(() => {
    const estimated = isVirtualized 
      ? (visibleRows[1] - visibleRows[0] + overscanRows) * 0.5 // KB per row
      : totalRows * 0.5
    setMemoryUsage(estimated)
  }, [totalRows, visibleRows, overscanRows, isVirtualized])

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">
            {isVirtualized ? 'Virtualization Active' : 'Standard Rendering'}
          </span>
        </div>
        <div className="flex space-x-4 text-xs text-green-600">
          <span>📊 Rows: {totalRows.toLocaleString()}</span>
          <span>👁️ Visible: {visibleRows[0]}-{visibleRows[1]}</span>
          <span>⚡ Render: {renderTime.toFixed(1)}ms</span>
          <span>💾 Memory: ~{memoryUsage.toFixed(1)}KB</span>
        </div>
      </div>
    </div>
  )
}

export function VirtualizedDataTable<TData, TValue>({
  columns,
  data,
  totalCount,
  isLoading = false,
  showOptimisticUpdates = false,
  estimateSize = 60, // Default row height
  overscan = 10, // Default overscan
  enableVirtualization = true,
}: VirtualizedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [fullscreen, setFullscreen] = React.useState(false)
  
  // Load table preferences
  const { 
    preferences, 
    updateTablePreference,
    isLoading: preferencesLoading 
  } = useTablePreferences()

  // Initialize column visibility from preferences
  React.useEffect(() => {
    if (preferences && !preferencesLoading) {
      setColumnVisibility(preferences.visibility || {})
    }
  }, [preferences, preferencesLoading])

  // Update preferences when visibility changes
  React.useEffect(() => {
    if (!preferencesLoading) {
      updateTablePreference('projects-virtualized', 'visibility', columnVisibility)
    }
  }, [columnVisibility, updateTablePreference, preferencesLoading])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  })

  // Virtualization setup
  const scrollElementRef = React.useRef<HTMLDivElement>(null)
  const tableBodyRef = React.useRef<HTMLTableSectionElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: enableVirtualization ? data.length : 0,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => estimateSize,
    overscan: overscan,
  })

  const visibleRows = enableVirtualization 
    ? [rowVirtualizer.getVirtualItems()[0]?.index || 0, rowVirtualizer.getVirtualItems().slice(-1)[0]?.index || 0]
    : [0, data.length - 1]

  // Performance monitoring
  const renderStartTime = React.useRef(0)
  React.useEffect(() => {
    renderStartTime.current = performance.now()
  })

  // Loading skeleton
  if (isLoading && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TableContent = () => (
    <>
      {/* Virtualization Metrics */}
      <VirtualizationMetrics
        totalRows={data.length}
        visibleRows={visibleRows as [number, number]}
        overscanRows={overscan}
        isVirtualized={enableVirtualization}
        scrollElementRef={scrollElementRef}
      />

      {/* Table Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Badge variant={enableVirtualization ? "default" : "secondary"}>
            {enableVirtualization ? "🚀 Virtualized" : "📋 Standard"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {data.length.toLocaleString()} rows • {table.getVisibleFlatColumns().length} columns
          </Badge>
          {showOptimisticUpdates && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
              ⚡ Optimistic Updates
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Columns
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div 
        className={cn(
          "border rounded-lg bg-white",
          fullscreen && "fixed inset-4 z-50 overflow-hidden"
        )}
      >
        {fullscreen && (
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h3 className="font-semibold">Projects Table - Fullscreen</h3>
            <Button variant="outline" size="sm" onClick={() => setFullscreen(false)}>
              <Minimize2 className="w-4 h-4 mr-2" />
              Exit Fullscreen
            </Button>
          </div>
        )}
        
        <div 
          ref={scrollElementRef}
          className={cn(
            "overflow-auto",
            fullscreen ? "h-[calc(100%-64px)]" : "max-h-[600px]"
          )}
        >
          <table className="w-full">
            {/* Table Header */}
            <thead className="sticky top-0 bg-white z-10 border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-r last:border-r-0 bg-gray-50/50"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Table Body */}
            <tbody ref={tableBodyRef}>
              {enableVirtualization ? (
                // Virtualized rendering
                <>
                  {/* Spacer before visible items */}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr>
                      <td 
                        colSpan={table.getVisibleFlatColumns().length}
                        style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}
                      />
                    </tr>
                  )}
                  
                  {/* Visible items */}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = table.getRowModel().rows[virtualRow.index]
                    return (
                      <motion.tr
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={(node) => rowVirtualizer.measureElement(node)}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="p-4 align-middle border-r last:border-r-0"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    )
                  })}
                  
                  {/* Spacer after visible items */}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr>
                      <td 
                        colSpan={table.getVisibleFlatColumns().length}
                        style={{ 
                          height: `${
                            rowVirtualizer.getTotalSize() - 
                            (rowVirtualizer.getVirtualItems().slice(-1)[0]?.end || 0)
                          }px` 
                        }}
                      />
                    </tr>
                  )}
                </>
              ) : (
                // Standard rendering (no virtualization)
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="p-4 align-middle border-r last:border-r-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>

          {/* Empty state */}
          {data.length === 0 && !isLoading && (
            <div className="p-12 text-center">
              <div className="text-muted-foreground">No results found.</div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="text-center">
          <div className="font-semibold text-green-600">
            {enableVirtualization ? 'Virtualized' : 'Standard'}
          </div>
          <div className="text-xs text-muted-foreground">Rendering Mode</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-blue-600">
            {enableVirtualization 
              ? `${visibleRows[1] - visibleRows[0] + 1}/${data.length}`
              : data.length
            }
          </div>
          <div className="text-xs text-muted-foreground">Rendered Rows</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-purple-600">
            {estimateSize}px
          </div>
          <div className="text-xs text-muted-foreground">Row Height</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-orange-600">
            {overscan}
          </div>
          <div className="text-xs text-muted-foreground">Overscan</div>
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <TableContent />
    </div>
  )
} 