"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown01Icon, Settings01Icon, SearchIcon, ViewIcon, Edit03Icon, DocumentAttachmentIcon, FolderAddIcon, Delete01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'

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
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert01Icon } from '@hugeicons/core-free-icons'
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
  onAddClient?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onEditClient: (item: TData) => void
    onCreateInvoice: (item: TData) => void
    onNewProject: (item: TData) => void
    onDeleteClient: (item: TData) => void
  }
}

export function DataTable<TData, TValue>({ 
  columns, 
  data, 
  onAddClient,
  onBatchDelete,
  contextActions 
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])

  // Use table preferences hook for account-level persistence
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "clients-table"

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
          phone: window.innerWidth > 768,
          location: window.innerWidth > 1200,
          company: window.innerWidth > 768,
        }
        setColumnVisibility(defaults)
      }
      setPreferencesLoaded(true)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreferenceMemo])

  // Save column visibility to table preferences when it changes
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
                            <HugeiconsIcon icon={SearchIcon} className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"  />
            <Input
              placeholder="Search clients..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              className="max-w-sm pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <HugeiconsIcon icon={Settings01Icon} className="mr-1.5 h-4 w-4"  />
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
                      case "location":
                        return "Location"
                      case "projects":
                        return "Projects"
                      case "created_at":
                        return "Client Since"
                      case "name":
                        return "Client Name"
                      case "email":
                        return "Email"
                      case "phone":
                        return "Phone"
                      case "company":
                        return "Company"
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
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button
              size="icon"
              className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full"
              onClick={handleBatchDelete}
            >
              <HugeiconsIcon icon={Delete01Icon} className="h-3.5 w-3.5"  />
            </Button>
          )}

          <Button 
            type="button"
            size="icon" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddClient?.()
            }}
            title="Add Client"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5"  />
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
                        onClick={() => contextActions.onEditClient(row.original)}
                      >
                                                  <Edit className="mr-1.5 h-4 w-4" />
                          Edit Client
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => contextActions.onCreateInvoice(row.original)}
                      >
                                                  <HugeiconsIcon icon={DocumentAttachmentIcon} className="mr-1.5 h-4 w-4"  />
                          Create Invoice
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => contextActions.onNewProject(row.original)}
                      >
                                                  <HugeiconsIcon icon={FolderAddIcon} className="mr-1.5 h-4 w-4"  />
                          New Project
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => contextActions.onDeleteClient(row.original)}
                        className="text-destructive focus:text-destructive"
                      >
                                                  <HugeiconsIcon icon={Delete01Icon} className="mr-1.5 h-4 w-4"  />
                          Delete Client
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
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>←
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 bg-background"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>→
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemsToDelete.length} client{itemsToDelete.length !== 1 ? 's' : ''}. 
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
    </div>
  )
}
