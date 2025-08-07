"use client"

import * as React from "react"
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Edit, FileText, Trash2, CheckCircle, Clock, Pause, XCircle, Plus, GitBranch, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface OptimizedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onAddProject?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onEditProject: (item: TData) => void
    onCreateInvoice: (item: TData) => void
    onDeleteProject: (item: TData) => void
    onStatusChange: (item: TData, status: string) => void
  }
  pageSize?: number
  currentPage?: number
  totalPages?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  loading?: boolean
  error?: string | null
  columnVisibility?: any
  onColumnVisibilityChange?: (columnVisibility: any) => void
  onTableReady?: (table: any) => void
  updateProjectOptimistic?: (projectId: string, updates: any) => void
}

// Enhanced loading skeleton with better animations
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 10 }).map((_, i) => (
      <motion.div
        key={i}
        className="flex items-center space-x-4 p-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
      </motion.div>
    ))}
  </div>
)

// Enhanced pagination with smooth transitions
const OptimizedPagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  loading 
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  loading: boolean
}) => {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index)
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="transition-all duration-200"
        >
          Previous
        </Button>
        
        <div className="flex space-x-1">
          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => typeof page === 'number' && onPageChange(page)}
                  disabled={loading}
                  className={cn(
                    "transition-all duration-200",
                    currentPage === page && "bg-primary text-primary-foreground"
                  )}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="transition-all duration-200"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function OptimizedDataTable<TData, TValue>({ 
  columns, 
  data, 
  onAddProject, 
  onBatchDelete, 
  contextActions,
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  loading = false,
  error = null,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  onTableReady,
  updateProjectOptimistic,
}: OptimizedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [preferencesInitialized, setPreferencesInitialized] = React.useState(false)

  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])

  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  // Use table preferences hook
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "projects-table-optimized"

  // Load preferences synchronously on mount to prevent layout shift
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesInitialized) {
      const savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      
      if (Object.keys(savedVisibility).length > 0) {
        setColumnVisibility(savedVisibility)
      } else {
        const defaults = {
          status: true,
          start_date: false,
          due_date: false,
          budget: true,
          expenses: false,
          pending: false,
          recurring_amount: false, // Hidden by default
          hourly_rate_new: false, // Hidden by default  
          actual_hours: false, // Hidden by default
          actions: true,
        }
        setColumnVisibility(defaults)
      }
      setPreferencesInitialized(true)
    }
  }, [preferencesLoading, preferencesInitialized, getTablePreference, TABLE_NAME])

  // Save column visibility changes
  const handleColumnVisibilityChange = React.useCallback((updaterOrValue: any) => {
    const newVisibility = typeof updaterOrValue === 'function' 
      ? updaterOrValue(columnVisibility) 
      : updaterOrValue
    setColumnVisibility(newVisibility)
    
    if (preferencesInitialized) {
      updateTablePreference(TABLE_NAME, "column_visibility", newVisibility)
    }
  }, [columnVisibility, updateTablePreference, TABLE_NAME, preferencesInitialized])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    manualPagination: true,
    pageCount: totalPages,
  })

  // Expose table instance to parent
  React.useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [onTableReady, table])

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const hasSelection = selectedRows.length > 0

  const handleBatchDelete = () => {
    const items = selectedRows.map(row => row.original)
    setItemsToDelete(items)
    setBatchDeleteOpen(true)
  }

  const confirmBatchDelete = () => {
    if (onBatchDelete) {
      const onUndo = (items: TData[]) => {
        setRowSelection({})
      }
      onBatchDelete(itemsToDelete, onUndo)
    }
    setBatchDeleteOpen(false)
    setRowSelection({})
  }

  const statusConfig = {
    active: { icon: CheckCircle, label: "Active", color: "bg-emerald-100 text-emerald-800" },
    "on-hold": { icon: Pause, label: "On Hold", color: "bg-amber-100 text-amber-800" },
    completed: { icon: CheckCircle, label: "Completed", color: "bg-slate-100 text-slate-800" },
    cancelled: { icon: XCircle, label: "Cancelled", color: "bg-rose-100 text-rose-800" },
  }

  const handleStatusChange = (item: TData, newStatus: string) => {
    // Optimistic update if available
    if (updateProjectOptimistic && item && typeof item === 'object' && 'id' in item) {
      updateProjectOptimistic((item as any).id as string, { status: newStatus })
    }
    
    if (contextActions?.onStatusChange) {
      contextActions.onStatusChange(item, newStatus)
    }
  }

  // Don't render table until preferences are loaded to prevent layout shift
  if (preferencesLoading || !preferencesInitialized) {
    return (
      <div className="space-y-4">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading table preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selected Items Actions */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
          >
            <span className="text-sm text-muted-foreground">
              {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                Clear selection
              </Button>
              <Button
                variant="destructive" 
                size="sm"
                onClick={handleBatchDelete}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div 
        ref={tableContainerRef} 
        className={cn(
          "rounded-md border relative",
          loading && "overflow-hidden"
        )}
      >
        {/* Loading overlay with blur effect */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
            >
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {data.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No projects found matching your filters.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <TableHead 
                      key={header.id}
                      className={cn(
                        "relative px-0 py-2 h-auto whitespace-nowrap",
                        index < headerGroup.headers.length - 1 && "border-r border-border/40"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                      row.getIsSelected() && "bg-muted"
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell 
                        key={cell.id}
                        className={cn(
                          "px-0 py-2 relative",
                          cellIndex < row.getVisibleCells().length - 1 && "border-r border-border/40"
                        )}
                      >
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-64">
                            <ContextMenuItem onClick={() => contextActions?.onEditProject(row.original)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Project
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => contextActions?.onCreateInvoice(row.original)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Create Invoice
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuSub>
                              <ContextMenuSubTrigger>
                                <GitBranch className="mr-2 h-4 w-4" />
                                Change Status
                              </ContextMenuSubTrigger>
                              <ContextMenuSubContent>
                                {Object.entries(statusConfig).map(([status, config]) => {
                                  const Icon = config.icon
                                  return (
                                    <ContextMenuItem
                                      key={status}
                                      onClick={() => handleStatusChange(row.original, status)}
                                    >
                                      <Icon className="mr-2 h-4 w-4" />
                                      {config.label}
                                    </ContextMenuItem>
                                  )
                                })}
                              </ContextMenuSubContent>
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                            <ContextMenuItem 
                              onClick={() => contextActions?.onDeleteProject(row.original)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Project
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <OptimizedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange || (() => {})}
          loading={loading}
        />
      )}

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Projects</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {itemsToDelete.length} project{itemsToDelete.length !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBatchDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 