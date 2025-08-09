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
import { Loader } from "@/components/ui/loader"
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
  onAddProject?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onEditProject: (item: TData) => void
    onCreateInvoice: (item: TData) => void
    onDeleteProject: (item: TData) => void
    onStatusChange: (item: TData, status: string) => void
  }
  filterComponent?: React.ReactNode
}

export function DataTable<TData, TValue>({ columns, data, onAddProject, onBatchDelete, contextActions, filterComponent }: DataTableProps<TData, TValue>) {
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

  // Use table preferences hook for account-level persistence
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "projects-table"

  // Memoize the preference functions to prevent infinite loops
  const getTablePreferenceMemo = React.useCallback(getTablePreference, [getTablePreference])
  const updateTablePreferenceMemo = React.useCallback(updateTablePreference, [updateTablePreference])

  // Track if preferences have been loaded to prevent saving during initial load
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Load column visibility from table preferences on mount
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded) {
      const savedVisibility = getTablePreferenceMemo(TABLE_NAME, "column_visibility", {})
      if (Object.keys(savedVisibility).length > 0) {
        setColumnVisibility(savedVisibility)
      } else {
        // Set responsive defaults for first-time users
        const defaults = {
          expenses: window.innerWidth > 1200,
          pending: window.innerWidth > 1200,
          created_at: window.innerWidth > 1024,
          recurring_amount: false, // Hidden by default
          hourly_rate_new: false, // Hidden by default  
          actual_hours: false, // Hidden by default
        }
        setColumnVisibility(defaults)
      }
      setPreferencesLoaded(true)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo])

  // Save column visibility to table preferences when it changes (only after initial load)
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded && Object.keys(columnVisibility).length > 0) {
      updateTablePreferenceMemo(TABLE_NAME, "column_visibility", columnVisibility)
    }
  }, [columnVisibility, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo])

  // Load sorting preferences
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded) {
      const savedSorting = getTablePreferenceMemo(TABLE_NAME, "sorting", [])
      if (savedSorting.length > 0) {
        setSorting(savedSorting)
      }
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo])

  // Save sorting preferences when they change
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded && sorting.length > 0) {
      updateTablePreferenceMemo(TABLE_NAME, "sorting", sorting)
    }
  }, [sorting, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo])

  // Load pagination preferences
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded) {
      const savedPagination = getTablePreferenceMemo(TABLE_NAME, "pagination", {
        pageIndex: 0,
        pageSize: 10,
      })
      setPagination(savedPagination)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo])

  // Save pagination preferences when they change
  React.useEffect(() => {
    if (!preferencesLoading && preferencesLoaded) {
      updateTablePreferenceMemo(TABLE_NAME, "pagination", pagination)
    }
  }, [pagination, preferencesLoading, preferencesLoaded, updateTablePreferenceMemo])
  


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

  // Don't render table until preferences are loaded to prevent layout shift
  if (preferencesLoading || !preferencesLoaded) {
    return (
      <div className="w-full max-w-full space-y-4">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Loader size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading table preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
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
          {filterComponent}
        </div>
        <div className="flex items-center gap-2">
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
              {table.getRowModel().rows?.length ? (
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
                            <ContextMenuItem 
                              onClick={() => contextActions.onStatusChange(row.original, 'due')}
                            >
                              <Clock className="mr-1.5 h-4 w-4 text-orange-600" />
                              Due
                            </ContextMenuItem>
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                        
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          onClick={() => contextActions.onDeleteProject(row.original)}
                          className="text-red-600"
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

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {itemsToDelete.length} selected project{itemsToDelete.length > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBatchDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
