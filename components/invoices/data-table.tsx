"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Plus, Search, Eye, Edit, Send, Download, Trash2, CheckCircle, Clock, XCircle, LayoutGrid } from "lucide-react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  onCreateInvoice?: () => void
  onBatchDelete?: (items: TData[], onUndo: (items: TData[]) => void) => void
  contextActions?: {
    onViewDetails: (item: TData) => void
    onEditInvoice: (item: TData) => void
    onSendInvoice: (item: TData) => void
    onDownloadPDF: (item: TData) => void
    onDeleteInvoice: (item: TData) => void
    onStatusChange: (item: TData, status: string) => void
    downloadingPDF?: string | null
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onCreateInvoice,
  onBatchDelete,
  contextActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])

  // Load column visibility from localStorage on mount
  React.useEffect(() => {
    const savedVisibility = localStorage.getItem("invoices-table-column-visibility")
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility))
      } catch (error) {
        // If parsing fails, use defaults
        const defaults = {
          amount: window.innerWidth > 768,
          due_date: window.innerWidth > 1024,
          created_at: window.innerWidth > 1200,
        }
        setColumnVisibility(defaults)
      }
    } else {
      // Set responsive defaults for first-time users
      const defaults = {
        amount: window.innerWidth > 768,
        due_date: window.innerWidth > 1024,
        created_at: window.innerWidth > 1200,
      }
      setColumnVisibility(defaults)
    }
  }, [])

  // Save column visibility to localStorage when it changes
  React.useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      localStorage.setItem("invoices-table-column-visibility", JSON.stringify(columnVisibility))
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
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
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter invoices..."
              value={(table.getColumn("invoice_number")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("invoice_number")?.setFilterValue(event.target.value)
              }
              className="max-w-sm pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Customize Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const getColumnLabel = (columnId: string) => {
                    switch (columnId) {
                      case "invoice_number":
                        return "Invoice Number"
                      case "client":
                        return "Client"
                      case "amount":
                        return "Amount"
                      case "status":
                        return "Status"
                      case "due_date":
                        return "Due Date"
                      case "created_at":
                        return "Created"
                      default:
                        return columnId
                    }
                  }

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
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
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onCreateInvoice && (
            <Button onClick={onCreateInvoice} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px] table-auto">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActionsColumn = header.column.id === "actions"
                    return (
                      <TableHead 
                        key={header.id} 
                        style={{ width: header.getSize() }} 
                        className={`whitespace-nowrap ${
                          isActionsColumn ? "sticky right-0 bg-background shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                        }`}
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
                                isActionsColumn 
                                  ? "sticky right-0 bg-background shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]" 
                                  : ""
                              }`}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
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
                          onClick={() => contextActions.onEditInvoice(row.original)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Invoice
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
                              onClick={() => contextActions.onStatusChange(row.original, 'draft')}
                            >
                              <Clock className="mr-2 h-4 w-4 text-gray-600" />
                              Draft
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => contextActions.onStatusChange(row.original, 'sent')}
                            >
                              <Send className="mr-2 h-4 w-4 text-blue-600" />
                              Sent
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => contextActions.onStatusChange(row.original, 'paid')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Paid
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => contextActions.onStatusChange(row.original, 'overdue')}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              Overdue
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
                          onClick={() => contextActions.onSendInvoice(row.original)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send Invoice
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => contextActions.onDownloadPDF(row.original)}
                          disabled={contextActions.downloadingPDF === (row.original as any).id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          onClick={() => contextActions.onDeleteInvoice(row.original)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Invoice
                        </ContextMenuItem>
                      </ContextMenuContent>
                    )}
                  </ContextMenu>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemsToDelete.length} invoice{itemsToDelete.length !== 1 ? 's' : ''}. 
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