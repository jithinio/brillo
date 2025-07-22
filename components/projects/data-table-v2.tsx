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
import { ChevronDown, Edit, FileText, Trash2, CheckCircle, Clock, Pause, XCircle, Plus, GitBranch } from "lucide-react"

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

interface DataTableV2Props<TData, TValue> {
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
  columnVisibility?: any
  onColumnVisibilityChange?: (columnVisibility: any) => void
  onTableReady?: (table: any) => void
}

export function DataTableV2<TData, TValue>({ 
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
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  onTableReady,
}: DataTableV2Props<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [preferencesInitialized, setPreferencesInitialized] = React.useState(false)

  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])

  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  // Use table preferences hook
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "projects-table-v2"

  // Load preferences synchronously on mount to prevent layout shift
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesInitialized) {
      const savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      
      if (Object.keys(savedVisibility).length > 0) {
        // Use saved preferences
        setColumnVisibility(savedVisibility)
      } else {
        // Set responsive defaults for first-time users
        const defaults = {
          status: true,
          start_date: false,
          due_date: false,
          budget: true,
          expenses: false,
          pending: false,
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
    
    // Only save preferences after they've been initialized to prevent saving during initial load
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

  // Smart responsive behavior - stretch when few columns, scroll when many
  const visibleColumns = table.getVisibleFlatColumns()
  const columnCount = visibleColumns.length
  
  // Enable horizontal scroll only when we have too many columns for most screens
  // 10+ columns typically exceed standard screen widths, allow 9 to stretch
  const shouldUseHorizontalScroll = columnCount > 9
  
  // Table responsive configuration
  const tableConfig = React.useMemo(() => {
    const isScrollMode = shouldUseHorizontalScroll
    
    return {
      layout: isScrollMode ? 'table-fixed' : 'table-auto',
      minWidth: isScrollMode ? '1400px' : '700px',
      width: isScrollMode ? '1400px' : '100%'
    }
  }, [shouldUseHorizontalScroll])
  
  // Column width configuration - centralized for maintainability
  const columnWidths = React.useMemo(() => ({
    // Fixed layout widths (when horizontal scroll is enabled)
    fixed: {
      select: '50px',
      name: '250px',
      client: '200px',
      status: '140px',
      start_date: '150px',
      due_date: '150px',
      budget: '130px',
      expenses: '130px',
      received: '130px',
      pending: '130px',
      default: '140px'
    },
    // Minimum widths for stretching mode
    min: {
      select: '50px',
      name: '180px',
      client: '150px',
      status: '100px',
      start_date: '120px',
      due_date: '120px',
      budget: '100px',
      expenses: '100px',
      received: '100px',
      pending: '100px',
      default: '100px'
    }
  }), [])
  
  // Helper functions for column sizing
  const getColumnWidth = React.useCallback((columnId: string) => {
    if (!shouldUseHorizontalScroll) return 'auto'
    return columnWidths.fixed[columnId as keyof typeof columnWidths.fixed] || columnWidths.fixed.default
  }, [shouldUseHorizontalScroll, columnWidths.fixed])
  
  const getMinColumnWidth = React.useCallback((columnId: string) => {
    return columnWidths.min[columnId as keyof typeof columnWidths.min] || columnWidths.min.default
  }, [columnWidths.min])



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
        // Reset selection after undo
        setRowSelection({})
      }
      onBatchDelete(itemsToDelete, onUndo)
    }
    setBatchDeleteOpen(false)
    setRowSelection({})
  }

  // Don't render table until preferences are loaded to prevent layout shift
  if (preferencesLoading || !preferencesInitialized) {
    return (
      <div className="space-y-4">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading table preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Table */}
      <div ref={tableContainerRef} className={cn(
        "rounded-md border",
        shouldUseHorizontalScroll ? "overflow-x-auto" : "overflow-x-hidden"
      )}>
        <Table 
          className={cn("w-full", tableConfig.layout)} 
          style={{ 
            minWidth: tableConfig.minWidth,
            tableLayout: shouldUseHorizontalScroll ? 'fixed' : 'auto'
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  return (
                                        <TableHead 
                      key={header.id}
                      className={cn(
                        "relative px-0 py-2 h-auto whitespace-nowrap",
                        index < headerGroup.headers.length - 1 && "border-r border-border/40",
                        // Regular columns without sticky positioning
                      )}
                      style={{ 
                        width: getColumnWidth(header.id),
                        minWidth: shouldUseHorizontalScroll 
                          ? (header.id === 'select' ? '50px' : undefined)
                          : getMinColumnWidth(header.id),
                        maxWidth: header.id === 'select' 
                          ? (shouldUseHorizontalScroll ? '50px' : '50px') 
                          : undefined
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        row.getIsSelected() && "bg-muted/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell, index) => (
                        <TableCell 
                          key={cell.id}
                          className={cn(
                            "px-0 py-2",
                            index < row.getVisibleCells().length - 1 && "border-r border-border/40",
                            // Regular columns without sticky positioning
                          )}
                          style={{ 
                            width: getColumnWidth(cell.column.id),
                            minWidth: shouldUseHorizontalScroll 
                              ? (cell.column.id === 'select' ? '50px' : undefined)
                              : getMinColumnWidth(cell.column.id),
                            maxWidth: cell.column.id === 'select' 
                              ? (shouldUseHorizontalScroll ? '50px' : '50px') 
                              : undefined
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </ContextMenuTrigger>
                  {contextActions && (
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => contextActions.onEditProject(row.original)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Project
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => contextActions.onCreateInvoice(row.original)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Create Invoice
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Change Status
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          <ContextMenuItem onClick={() => contextActions.onStatusChange(row.original, 'active')}>
                            <Clock className="mr-2 h-4 w-4 text-green-500" />
                            <span className="ml-2">Active</span>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => contextActions.onStatusChange(row.original, 'completed')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                            <span className="ml-2">Completed</span>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => contextActions.onStatusChange(row.original, 'on_hold')}>
                            <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                            <span className="ml-2">On Hold</span>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => contextActions.onStatusChange(row.original, 'cancelled')}>
                            <XCircle className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="ml-2">Cancelled</span>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => contextActions.onStatusChange(row.original, 'pipeline')}>
                            <GitBranch className="mr-2 h-4 w-4 text-purple-500" />
                            <span className="ml-2">Pipeline</span>
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => contextActions.onDeleteProject(row.original)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </ContextMenuItem>
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} projects
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {itemsToDelete.length} Project{itemsToDelete.length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected project{itemsToDelete.length > 1 ? 's' : ''} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Bar for Batch Operations */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/40 px-4 py-3 flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Object.keys(rowSelection).length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
              className="h-8 px-3 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 