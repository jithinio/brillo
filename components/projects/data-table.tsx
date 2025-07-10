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
import { ChevronDown, Search, LayoutGrid, Eye, Edit, FileText, Trash2, CheckCircle, Clock, Pause, XCircle } from "lucide-react"

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


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onAddProject?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onViewDetails: (item: TData) => void
    onEditProject: (item: TData) => void
    onCreateInvoice: (item: TData) => void
    onDeleteProject: (item: TData) => void
    onStatusChange: (item: TData, status: string) => void
  }
}

export function DataTable<TData, TValue>({ columns, data, onAddProject, onBatchDelete, contextActions }: DataTableProps<TData, TValue>) {
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

  // Load column visibility from localStorage on mount
  React.useEffect(() => {
    const savedVisibility = localStorage.getItem("projects-table-column-visibility")
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility))
      } catch (error) {
        // If parsing fails, use defaults
        const defaults = {
          expenses: window.innerWidth > 1200,
          pending: window.innerWidth > 1200,
          created_at: window.innerWidth > 1024,
        }
        setColumnVisibility(defaults)
      }
    } else {
      // Set responsive defaults for first-time users
      const defaults = {
        expenses: window.innerWidth > 1200,
        pending: window.innerWidth > 1200,
        created_at: window.innerWidth > 1024,
      }
      setColumnVisibility(defaults)
    }
  }, [])

  // Save column visibility to localStorage when it changes
  React.useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      localStorage.setItem("projects-table-column-visibility", JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])
  


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
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background">
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <ChevronDown className="ml-2 h-4 w-4" />
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
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button 
            type="button"
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddProject?.()
            }}
          >
            <span className="hidden lg:inline">Add Project</span>
            <span className="lg:hidden">Add</span>
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
                        onClick={() => contextActions.onViewDetails(row.original)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={() => contextActions.onEditProject(row.original)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Project
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      
                      {/* Status Change Submenu */}
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Change Status
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          <ContextMenuItem 
                            onClick={() => contextActions.onStatusChange(row.original, 'active')}
                          >
                            <Clock className="mr-2 h-4 w-4 text-blue-600" />
                            In Progress
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => contextActions.onStatusChange(row.original, 'completed')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Completed
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => contextActions.onStatusChange(row.original, 'on_hold')}
                          >
                            <Pause className="mr-2 h-4 w-4 text-yellow-600" />
                            On Hold
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => contextActions.onStatusChange(row.original, 'cancelled')}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-gray-600" />
                            Cancelled
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => contextActions.onCreateInvoice(row.original)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Create Invoice
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => contextActions.onDeleteProject(row.original)}
                        className="text-destructive focus:text-destructive"
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
    </div>
  )
}
