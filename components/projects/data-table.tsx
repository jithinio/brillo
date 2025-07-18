"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Search, Settings2, Edit, FileText, Trash2, CheckCircle, Clock, Pause, XCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  onAddProject?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onEditProject: (item: TData) => void
    onCreateInvoice: (item: TData) => void
    onDeleteProject: (item: TData) => void
    onStatusChange: (item: TData, status: string) => void
  }
}

export function DataTable<TData, TValue>({ columns, data, loading, onAddProject, onBatchDelete, contextActions }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])
  const [isMounted, setIsMounted] = React.useState(false)

  // Use table preferences hook for account-level persistence
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "projects-table"

  // Memoize the preference functions to prevent infinite loops
  const getTablePreferenceMemo = React.useCallback(getTablePreference, [getTablePreference])
  const updateTablePreferenceMemo = React.useCallback(updateTablePreference, [updateTablePreference])

  // Track if preferences have been loaded to prevent saving during initial load
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Set mounted state
  React.useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Load column visibility from table preferences on mount
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded && isMounted) {
      const savedVisibility = getTablePreferenceMemo(TABLE_NAME, "column_visibility", {})
      if (Object.keys(savedVisibility).length > 0) {
        setColumnVisibility(savedVisibility)
      } else {
        // Set responsive defaults for first-time users
        const defaults = {
          expenses: window.innerWidth > 1200,
          pending: window.innerWidth > 1200,
          created_at: window.innerWidth > 1024,
        }
        setColumnVisibility(defaults)
      }
      setPreferencesLoaded(true)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo, isMounted])

  // Save column visibility to table preferences when it changes
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded && Object.keys(columnVisibility).length > 0 && isMounted) {
      updateTablePreferenceMemo(TABLE_NAME, "column_visibility", columnVisibility)
    }
  }, [columnVisibility, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo, isMounted])

  // Load sorting preferences
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded && isMounted) {
      const savedSorting = getTablePreferenceMemo(TABLE_NAME, "sorting", [])
      if (savedSorting.length > 0) {
        setSorting(savedSorting)
      }
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo, isMounted])

  // Save sorting preferences when they change
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded && sorting.length > 0 && isMounted) {
      updateTablePreferenceMemo(TABLE_NAME, "sorting", sorting)
    }
  }, [sorting, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo, isMounted])

  // Load pagination preferences
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded && isMounted) {
      const savedPagination = getTablePreferenceMemo(TABLE_NAME, "pagination", {
        pageIndex: 0,
        pageSize: 10,
      })
      setPagination(savedPagination)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo, isMounted])

  // Save pagination preferences when they change
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded && isMounted) {
      updateTablePreferenceMemo(TABLE_NAME, "pagination", pagination)
    }
  }, [pagination, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo, isMounted])
  


  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    // Prevent table from updating during initial mount
    enableSorting: isMounted,
    enableColumnFilters: isMounted,
    enableRowSelection: isMounted,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleBatchDelete = () => {
    if (selectedRows.length > 0) {
      const selectedItems = selectedRows.map(row => row.original)
      setItemsToDelete(selectedItems)
      setBatchDeleteOpen(true)
    }
  }

  const handleUndo = (items: TData[]) => {
    // This will be called by the parent component to restore items
  }

  const confirmBatchDelete = () => {
    if (onBatchDelete && itemsToDelete.length > 0) {
      onBatchDelete(itemsToDelete, handleUndo)
      setBatchDeleteOpen(false)
      setItemsToDelete([])
      setRowSelection({}) // Clear selection after deletion
    }
  }

  return (
    <div className="w-full max-w-full space-y-4">
      {!isMounted ? (
        // Show loading skeleton while component is mounting
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-9 w-64 bg-muted/60 rounded-md" />
              <div className="h-9 w-20 bg-muted/40 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-muted/60 rounded-full" />
              <div className="h-9 w-9 bg-primary/20 rounded-full" />
            </div>
          </div>
          <div className="border max-w-full rounded-md">
            <div className="p-4">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-muted/60 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {loading ? (
                <>
                  <div className="h-9 w-64 bg-muted/60 rounded-md" />
                  <div className="h-9 w-20 bg-muted/40 rounded-md" />
                </>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                      onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                      className="max-w-sm pl-8"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings2 className="mr-1.5 h-4 w-4" />
                        <span className="hidden lg:inline">View</span>
                        <span className="lg:hidden">View</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                          const getColumnLabel = (columnId: string) => {
                            switch (columnId) {
                              case "client":
                                return "Client"
                              case "expenses":
                                return "Expenses"
                              case "received":
                                return "Received"
                              case "pending":
                                return "Pending"
                              case "end_date":
                                return "Due Date"
                              case "created_at":
                                return "Created"
                              case "name":
                                return "Project Name"
                              case "status":
                                return "Status"
                              case "budget":
                                return "Budget"
                              default:
                                return columnId
                            }
                          }

                          return (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              className="capitalize"
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) => column.toggleVisibility(!!value)}
                            >
                              {getColumnLabel(column.id)}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading ? (
                <>
                  <div className="h-9 w-9 bg-muted/60 rounded-full" />
                  <div className="h-9 w-9 bg-primary/20 rounded-full" />
                </>
              ) : (
                <>
                  {selectedCount > 0 && (
                    <Button
                      size="icon"
                      className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full"
                      onClick={handleBatchDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button 
                    type="button"
                    size="icon" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAddProject?.()
                    }}
                    title="Add Project"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="border max-w-full" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1200px] table-auto">
                        <TableHeader className="bg-card">
                {table.getHeaderGroups().map((headerGroup, groupIndex) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header, headerIndex) => {
                      const isActionsColumn = header.column.id === "actions"
                      const isFirstHeader = headerIndex === 0
                      const isLastHeader = headerIndex === headerGroup.headers.length - 1
                      
                      let borderRadius: React.CSSProperties = {}
                      if (groupIndex === 0) {
                        if (isFirstHeader) {
                          borderRadius.borderTopLeftRadius = 'var(--radius-md)'
                        }
                        if (isLastHeader) {
                          borderRadius.borderTopRightRadius = 'var(--radius-md)'
                        }
                      }
                      
                      return (
                        <TableHead 
                          key={header.id} 
                          style={{ 
                            width: header.getSize(),
                            ...borderRadius
                          }} 
                          className={`whitespace-nowrap ${
                            isActionsColumn ? "sticky right-0 bg-card shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                          }`}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        {columns.map((column, colIndex) => {
                          const isActionsColumn = column.id === "actions"
                          const isCheckboxColumn = column.id === "select"
                          const isNameColumn = column.id === "name"
                          const isStatusColumn = column.id === "status"
                          const isBudgetColumn = column.id === "budget"
                          
                          let skeletonContent
                          if (isCheckboxColumn) {
                            skeletonContent = <div className="h-4 w-4 bg-muted/60 rounded-sm" />
                          } else if (isNameColumn) {
                            skeletonContent = (
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-muted/60 rounded-full" />
                                <div className="space-y-1">
                                  <div className="h-4 w-32 bg-muted/80 rounded-sm" />
                                  <div className="h-3 w-24 bg-muted/40 rounded-sm" />
                                </div>
                              </div>
                            )
                          } else if (isStatusColumn) {
                            skeletonContent = <div className="h-6 w-16 bg-muted/60 rounded-full" />
                          } else if (isBudgetColumn) {
                            skeletonContent = <div className="h-4 w-20 bg-muted/60 rounded-sm" />
                          } else if (isActionsColumn) {
                            skeletonContent = <div className="h-8 w-16 bg-muted/60 rounded-sm" />
                          } else {
                            skeletonContent = <div className="h-4 w-20 bg-muted/40 rounded-sm" />
                          }
                          
                          return (
                            <TableCell 
                              key={`skeleton-cell-${i}-${colIndex}`}
                              className={`whitespace-nowrap ${
                                isActionsColumn ? "sticky right-0 bg-background shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                              }`}
                            >
                              {skeletonContent}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <ContextMenu key={row.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow 
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-default"
                        >
                      {row.getVisibleCells().map((cell) => {
                        const isActionsColumn = cell.column.id === "actions"
                        return (
                          <TableCell 
                            key={cell.id} 
                            style={{ width: cell.column.getSize() }} 
                            className={`whitespace-nowrap ${
                                  isActionsColumn ? "sticky right-0 bg-background shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                          }`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                      </ContextMenuTrigger>
                      {contextActions && (
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem 
                            onClick={() => contextActions.onEditProject(row.original)}
                          >
                            <Edit className="mr-1.5 h-4 w-4" />
                            Edit Project
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          
                          {/* Status Change Submenu */}
                          <ContextMenuSub>
                            <ContextMenuSubTrigger>
                              <CheckCircle className="mr-1.5 h-4 w-4" />
                              Change Status
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              <ContextMenuItem 
                                onClick={() => contextActions.onStatusChange(row.original, 'active')}
                              >
                                <Clock className="mr-1.5 h-4 w-4 text-green-600" />
                                Active
                              </ContextMenuItem>
                              <ContextMenuItem 
                                onClick={() => contextActions.onStatusChange(row.original, 'completed')}
                              >
                                <CheckCircle className="mr-1.5 h-4 w-4 text-blue-600" />
                                Completed
                              </ContextMenuItem>
                              <ContextMenuItem 
                                onClick={() => contextActions.onStatusChange(row.original, 'on_hold')}
                              >
                                <Pause className="mr-1.5 h-4 w-4 text-yellow-600" />
                                On Hold
                              </ContextMenuItem>
                              <ContextMenuItem 
                                onClick={() => contextActions.onStatusChange(row.original, 'cancelled')}
                              >
                                <XCircle className="mr-1.5 h-4 w-4 text-red-600" />
                                Cancelled
                              </ContextMenuItem>
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => contextActions.onCreateInvoice(row.original)}
                          >
                            <FileText className="mr-1.5 h-4 w-4" />
                            Create Invoice
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => contextActions.onDeleteProject(row.original)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
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
          </div>

          <div className="flex items-center justify-between space-x-2 py-4">
            {loading ? (
              <>
                <div className="h-4 w-32 bg-muted/40 rounded-sm" />
                <div className="flex items-center space-x-4">
                  <div className="h-8 w-20 bg-muted/60 rounded-md" />
                  <div className="h-4 w-16 bg-muted/40 rounded-sm" />
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-muted/60 rounded-md" />
                    <div className="h-8 w-8 bg-muted/60 rounded-md" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                  {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
                  selected.
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="rows-per-page" className="text-sm font-medium">
                      Rows per page
                    </Label>
                    <Select
                      value={`${table.getState().pagination.pageSize}`}
                      onValueChange={(value) => {
                        table.setPageSize(Number(value))
                      }}
                    >
                      <SelectTrigger className="w-20" id="rows-per-page">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      className="h-8 w-8 bg-background"
                      size="icon"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <span className="sr-only">Go to previous page</span>←
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 bg-background"
                      size="icon"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <span className="sr-only">Go to next page</span>→
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Batch Delete Confirmation Dialog */}
          <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {itemsToDelete.length} project{itemsToDelete.length !== 1 ? 's' : ''}. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemsToDelete([])}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBatchDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
