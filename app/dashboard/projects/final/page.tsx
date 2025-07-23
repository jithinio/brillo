"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertCircle,
  Trash2,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { toast } from "sonner"

import { useInfiniteProjects } from "@/hooks/use-infinite-projects"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { PageHeader, PageContent } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { createColumns } from "@/components/projects/columns"
import { formatCurrency, getDefaultCurrency } from "@/lib/currency"

// Abbreviated currency formatter for large numbers
function formatCurrencyAbbreviated(amount: number): string {
  if (amount === 0) return formatCurrency(0)
  
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const defaultCurrency = getDefaultCurrency()
  
  // Get currency symbol based on default currency
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', 
      JPY: '¥', CHF: 'CHF', CNY: '¥', INR: '₹'
    }
    return symbols[currency] || '$'
  }
  
  const currencySymbol = getCurrencySymbol(defaultCurrency)
  
  if (absAmount >= 1000000000) {
    const formatted = (absAmount / 1000000000).toFixed(1)
    const value = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
    return `${sign}${currencySymbol}${value}B`
  } else if (absAmount >= 1000000) {
    const formatted = (absAmount / 1000000).toFixed(1)
    const value = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
    return `${sign}${currencySymbol}${value}M`
  } else if (absAmount >= 1000) {
    const formatted = (absAmount / 1000).toFixed(1)
    const value = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
    return `${sign}${currencySymbol}${value}K`
  } else {
    return formatCurrency(amount, defaultCurrency)
  }
}
import { cn, debounce } from "@/lib/utils"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
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
import { 
  Edit, 
  FileText, 
  CheckCircle, 
  Clock, 
  Pause, 
  XCircle, 
  GitBranch 
} from "lucide-react"

// Fixed column widths to prevent layout shift
const COLUMN_WIDTHS = {
  select: 36,
  name: 280,      
  client: 200,    
  status: 140,    
  dates: 140,     
  budget: 110,    
  expenses: 110,  
  received: 110,  
  pending: 110,   
  actions: 80,    
} as const

// Types
interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  avatar_url?: string
}

interface NewProject {
  name: string
  client_id: string
  status: string
  start_date: Date | undefined
  due_date: Date | undefined
  budget: string
  expenses: string
  received: string
  description: string
}

// Subtle Loading Indicator Component
function SubtleLoadingIndicator({
  isFetching,
  isFetchingNextPage,
  hasMore,
  currentCount,
  totalCount,
}: {
  isFetching: boolean
  isFetchingNextPage: boolean
  hasMore: boolean
  currentCount: number
  totalCount: number
}) {
  if (isFetchingNextPage) {
    return (
      <motion.div 
        className="flex justify-center items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Badge 
          variant="outline" 
          className="flex items-center gap-2 text-xs shadow-md bg-white"
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span>Loading more</span>
        </Badge>
      </motion.div>
    )
  }

  if (isFetching && !isFetchingNextPage) {
    return (
      <motion.div 
        className="flex justify-center items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Badge 
          variant="secondary" 
          className="flex items-center gap-2 text-xs shadow-sm border bg-white"
        >
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Updating</span>
        </Badge>
      </motion.div>
    )
  }

  // Don't show "scroll to load more" by default - only show when actively loading

  return null
}

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    height: 4px;
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  }
`

// Fixed Data Table with div-based sticky structure
function FinalDataTable({
  projects,
  columns,
  totalCount,
  metrics,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  loadMore,
  updateStatus,
  refetch,
  forceRefresh,
  onEditProject,
  onBatchDelete,
  onResizeStart,
  createSortingFunctions,
  preferencesLoading,
  preferencesLoaded,
}: {
  projects: any[]
  columns: any[]
  totalCount: number
  metrics: any
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  loadMore: () => void
  updateStatus: any
  refetch: any
  forceRefresh: () => void
  onEditProject: (project: any) => void
  onBatchDelete: (projects: any[]) => void
  onResizeStart: (columnId: string, startX: number) => void
  createSortingFunctions: (columnId: string) => {
    toggleSorting: (desc?: boolean) => void
    getIsSorted: () => false | 'asc' | 'desc'
    clearSorting: () => void
  }
  preferencesLoading: boolean
  preferencesLoaded: boolean
}) {
  const tableRef = React.useRef<HTMLDivElement>(null)
  
  // Row selection state
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  
  // Track if we've ever loaded data to show initial skeletons
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)
  
  // Mark as loaded when we get data
  React.useEffect(() => {
    if (projects && projects.length > 0) {
      setHasLoadedOnce(true)
    }
  }, [projects])
  
  // Selected rows for batch operations (projects are already sorted server-side)
  const selectedProjects = React.useMemo(() => {
    return projects.filter((project) => rowSelection[project.id])
  }, [projects, rowSelection])

  // Calculate footer aggregations (use full database metrics instead of loaded projects)
  const aggregations = React.useMemo(() => {
    return {
      totalProjects: totalCount || 0, // Use actual total from database
      totalBudget: metrics?.totalBudget || 0, // Use metrics from all projects
      totalExpenses: metrics?.totalExpenses || 0,
      totalReceived: metrics?.totalReceived || 0,
      totalPending: metrics?.totalPending || 0,
      activeCount: metrics?.activeProjects || 0,
      completedCount: metrics?.completedProjects || 0,
    }
  }, [totalCount, metrics])

  // Stable intersection observer for infinite scroll
  React.useEffect(() => {
    if (!hasNextPage || isLoading || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Increased rootMargin for earlier trigger
      }
    )

    // Create a stable sentinel element instead of observing last row
    const sentinel = document.createElement('div')
    sentinel.setAttribute('data-infinite-scroll-sentinel', 'true')
    sentinel.style.height = '1px'
    sentinel.style.visibility = 'hidden'
    
    // Add sentinel after the table body
    const tableContainer = tableRef.current?.querySelector('[data-table-body]')
    if (tableContainer && hasNextPage) {
      tableContainer.appendChild(sentinel)
      observer.observe(sentinel)
    }

    return () => {
      if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel)
      }
      observer.disconnect()
    }
  }, [hasNextPage, isLoading, isFetchingNextPage, loadMore])

  // Calculate table width based on column widths
  const tableWidth = React.useMemo(() => {
    return columns.reduce((total, col) => total + (col.size || 150), 0)
  }, [columns])

  return (
    <div className="w-full h-full flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      {/* Floating Batch Selection Toolbar */}
      <AnimatePresence>
        {selectedProjects.length > 0 && (
                      <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ 
                type: "spring", 
                duration: 0.08, 
                stiffness: 500, 
                damping: 20 
              }}
              className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-gray-700">
                {selectedProjects.length} selected
              </span>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="h-7 px-3 text-xs hover:bg-gray-100"
                >
                  Clear
                </Button>
                                  <Button
                    variant="destructive" 
                    size="sm"
                    onClick={() => onBatchDelete(selectedProjects)}
                    className="h-7 px-3 text-xs text-white"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container with div-based sticky structure */}
      <div ref={tableRef} className="flex-1 overflow-auto relative border-l border-gray-200/80 custom-scrollbar">
        {/* Table Loading Overlay */}
        {(preferencesLoading || !preferencesLoaded || isLoading || (!hasLoadedOnce && isFetching)) && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 text-xs shadow-md border bg-white"
            >
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                             <span>Loading...</span>
            </Badge>
          </div>
        )}



        <div className="min-w-full inline-block align-middle" style={{ minWidth: `${tableWidth}px` }}>
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-10 bg-white border-t border-b border-gray-200/80">
            <div className="flex">
              {columns.map((column: any, colIndex: number) => (
                                                                    <div
                  key={`header-${column.id || colIndex}`}
                  className={`flex-shrink-0 px-3 font-medium text-gray-700 text-sm flex items-center gap-2 select-none h-11 relative group ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80' : ''}`}
                  style={{ 
                    width: column.size ? `${column.size}px` : 'auto',
                    minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                    maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                  }}
                >
                                      {typeof column.header === 'function' 
                      ? column.header({ 
                          column: { 
                            ...createSortingFunctions(column.accessorKey || column.id)
                          },
                          table: {
                            getIsAllPageRowsSelected: () => Object.keys(rowSelection).length === projects.length && projects.length > 0,
                            getIsSomePageRowsSelected: () => Object.keys(rowSelection).length > 0 && Object.keys(rowSelection).length < projects.length,
                            toggleAllPageRowsSelected: (value?: boolean) => {
                              if (value) {
                                const newSelection: Record<string, boolean> = {}
                                projects.forEach((project: any) => {
                                  newSelection[project.id] = true
                                })
                                setRowSelection(newSelection)
                              } else {
                                setRowSelection({})
                              }
                            }
                          }
                        })
                      : column.header
                    }
                    
                    {/* Resize Handle - exclude select column and last column */}
                    {colIndex < columns.length - 1 && (column.accessorKey || column.id) !== 'select' && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-50"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const columnKey = column.accessorKey || column.id
                          onResizeStart(columnKey, e.clientX)
                        }}
                        style={{ right: '-2px' }}
                      />
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Table Body - Div-based */}
          <div className="bg-white relative" data-table-body>
            {projects.length === 0 ? (
              // Empty state - Only show when not loading and no data
              <div className="p-12 text-center">
                <div className="text-muted-foreground">No projects found.</div>
              </div>
            ) : (
              <>
                {projects.map((project: any, index: number) => (
                  <ContextMenu key={project.id}>
                    <ContextMenuTrigger asChild>
                      <motion.div
                        className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group cursor-default h-11"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.3) }}
                      >
                        {columns.map((column: any, colIndex: number) => (
                          <div
                            key={`${project.id}-${column.id || colIndex}`}
                            className={`px-3 text-sm flex-shrink-0 flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80' : ''}`}
                            style={{ 
                              width: column.size ? `${column.size}px` : 'auto',
                              minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                              maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                            }}
                          >
                            {typeof column.cell === 'function' 
                              ? column.cell({ 
                                  row: { 
                                    original: project,
                                    getValue: (key: string) => project[key],
                                    getIsSelected: () => !!rowSelection[project.id],
                                    toggleSelected: () => {
                                      setRowSelection(prev => ({
                                        ...prev,
                                        [project.id]: !prev[project.id]
                                      }))
                                    }
                                  },
                                  table: {
                                    getIsAllPageRowsSelected: () => Object.keys(rowSelection).length === projects.length && projects.length > 0,
                                    getIsSomePageRowsSelected: () => Object.keys(rowSelection).length > 0 && Object.keys(rowSelection).length < projects.length,
                                    toggleAllPageRowsSelected: () => {}
                                  }
                                })
                              : project[column.accessorKey] || '—'
                            }
                          </div>
                        ))}
                      </motion.div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => onEditProject(project)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Project
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => {
                        // Navigate to invoice creation page
                        toast.info(`Creating invoice for ${project.name}`, {
                          description: "This feature will be available soon"
                        })
                        // TODO: Implement invoice creation
                        // router.push(`/dashboard/invoices/create?project=${project.id}`)
                      }}>
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
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'active' })
                          }}>
                            <Clock className="mr-2 h-4 w-4 text-green-500" />
                            Active
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'completed' })
                          }}>
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                            Completed
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'on_hold' })
                          }}>
                            <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                            On Hold
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'cancelled' })
                          }}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Cancelled
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'pipeline' })
                          }}>
                            <GitBranch className="mr-2 h-4 w-4 text-purple-500" />
                            Pipeline
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={async () => {
                          const confirmed = window.confirm(`Are you sure you want to delete "${project.name}"?`)
                          if (!confirmed) return

                          try {
                            if (isSupabaseConfigured()) {
                              const { error } = await supabase
                                .from('projects')
                                .delete()
                                .eq('id', project.id)

                              if (error) throw error

                              toast.success(`Project "${project.name}" deleted successfully`)
                              refetch()
                              forceRefresh()
                            }
                          } catch (error: any) {
                            console.error('Error deleting project:', error)
                            toast.error(`Failed to delete project: ${error.message}`)
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
                
                {/* Bottom padding to keep footer stable */}
                <div className="h-8"></div>
              </>
            )}


          </div>

          {/* Sticky Footer with Calculations */}
          <div className="sticky bottom-0 bg-white z-10 border-t border-b border-gray-200/80 h-11">
            <div className="flex h-11">
              {columns.map((column: any, colIndex: number) => (
                <div
                  key={`footer-${column.id || colIndex}`}
                  className={`flex-shrink-0 ${(column.accessorKey || column.id) === 'select' ? 'px-3' : 'px-5'} text-sm font-medium flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80' : ''}`}
                  style={{ 
                    width: column.size ? `${column.size}px` : 'auto',
                    minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                    maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                  }}
                >
                  {/* Footer aggregations */}
                  {column.accessorKey === 'name' && aggregations.totalProjects > 0 && (
                    <span className="text-black font-medium">{aggregations.totalProjects}</span>
                  )}
                  {column.accessorKey === 'status' && aggregations.activeCount > 0 && (
                    <span className="text-black font-medium">{aggregations.activeCount}</span>
                  )}
                  {column.accessorKey === 'budget' && aggregations.totalBudget > 0 && (
                    <span className="text-black font-medium">{formatCurrencyAbbreviated(aggregations.totalBudget)}</span>
                  )}
                  {column.accessorKey === 'expenses' && aggregations.totalExpenses > 0 && (
                    <span className="text-black font-medium">{formatCurrencyAbbreviated(aggregations.totalExpenses)}</span>
                  )}
                  {column.accessorKey === 'received' && aggregations.totalReceived > 0 && (
                    <span className="text-black font-medium">{formatCurrencyAbbreviated(aggregations.totalReceived)}</span>
                  )}
                  {column.accessorKey === 'pending' && aggregations.totalPending > 0 && (
                    <span className="text-black font-medium">{formatCurrencyAbbreviated(aggregations.totalPending)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main content component
function FinalProjectsContent() {
  const { filters, updateFilter } = useProjectFiltersV2()
  
  // Sorting state
  const [sortBy, setSortBy] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)

  // Create sorting functions for the table
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
          // Toggle current direction
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        }
      } else {
        setSortBy(columnId)
        setSortDirection(desc === false ? 'asc' : 'desc')
      }
    },
    getIsSorted: () => {
      if (sortBy !== columnId) return false
      return sortDirection === 'asc' ? 'asc' : 'desc'
    },
    clearSorting: () => {
      setSortBy(null)
      setSortDirection(null)
    }
  }), [sortBy, sortDirection])
  
  // Merge filters with sorting
  const enhancedFilters = React.useMemo(() => ({
    ...filters,
    sortBy: sortBy || undefined,
    sortOrder: sortDirection || undefined
  }), [filters, sortBy, sortDirection])

  // Sorting functions
  const handleSorting = React.useCallback((columnId: string, direction?: 'asc' | 'desc') => {
    if (sortBy === columnId) {
      if (direction) {
        setSortDirection(direction)
      } else {
        // Toggle direction
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
      }
    } else {
      setSortBy(columnId)
      setSortDirection(direction || 'asc')
    }
  }, [sortBy])

  const clearSorting = React.useCallback(() => {
    setSortBy(null)
    setSortDirection(null)
  }, [])
  
  const {
    projects,
    metrics,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    loadMore,
    updateStatus,
    refetch,
    forceRefresh,
  } = useInfiniteProjects(enhancedFilters)

  // Client state management
  const [clients, setClients] = React.useState<Client[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<any>(null)
  const [tableInstance, setTableInstance] = React.useState<any>(null)
  
  // Track when user reaches end to show temporary completion message
  const [showEndMessage, setShowEndMessage] = React.useState(false)
  
  // Additional state for form handling from original page
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = React.useState("")
  const [displayedClientsCount, setDisplayedClientsCount] = React.useState(10)
  const [newProject, setNewProject] = React.useState<NewProject>({
    name: "",
    client_id: "",
    status: "active",
    start_date: undefined,
    due_date: undefined,
    budget: "",
    expenses: "",
    received: "",
    description: "",
  })

  // Fetch clients on mount
  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        let allClients: Client[] = []
        
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name')

          if (error) {
            console.error('Error fetching clients:', error)
            throw error
          }

          allClients = data || []
        }

        setClients(allClients)
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      }
    }

    fetchClients()
  }, [])

  // Show end message temporarily when reaching the end
  React.useEffect(() => {
    if (!hasNextPage && !isLoading && !isFetching && !isFetchingNextPage && projects.length > 0) {
      setShowEndMessage(true)
      const timer = setTimeout(() => {
        setShowEndMessage(false)
      }, 3000) // Hide after 3 seconds
      
      return () => clearTimeout(timer)
    } else if (isFetching || isFetchingNextPage) {
      // Hide end message when loading starts
      setShowEndMessage(false)
    }
  }, [hasNextPage, isLoading, isFetching, isFetchingNextPage, projects.length])

  // Client handling functions from original page
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  )

  const displayedClients = filteredClients.slice(0, displayedClientsCount)

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setNewProject({ ...newProject, client_id: clientId })
    setClientDropdownOpen(false)
    setClientSearchQuery("")
  }

  const loadMoreClients = () => {
    setDisplayedClientsCount(prev => Math.min(prev + 10, filteredClients.length))
  }

  // Form handling from original page
  const handleSaveProject = async () => {
    if (!newProject.name) {
      toast.error("Project name is required")
      return
    }

    const clientForProject = clients.find(c => c.id === newProject.client_id)
    
    const budget = newProject.budget ? parseFloat(newProject.budget) : 0
    const expenses = newProject.expenses ? parseFloat(newProject.expenses) : 0
    const received = newProject.received ? parseFloat(newProject.received) : 0
    const pending = Math.max(0, budget - received)

    try {
      if (selectedProject) {
        // Editing existing project
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('projects')
            .update({
              name: newProject.name,
              status: newProject.status,
              start_date: newProject.start_date ? newProject.start_date.toISOString().split('T')[0] : null,
              due_date: newProject.due_date ? newProject.due_date.toISOString().split('T')[0] : null,
              budget: budget || null,
              expenses: expenses,
              payment_received: received,
              payment_pending: pending,
              description: newProject.description || null,
              client_id: newProject.client_id || null,
            })
            .eq('id', selectedProject.id)
            .select()

          if (error) {
            console.error('Error updating project:', error)
            throw new Error(error.message)
          }

          setIsEditDialogOpen(false)
          toast.success(`Project "${newProject.name}" has been updated successfully`)
          refetch()
          forceRefresh()
        }
      } else {
        // Adding new project
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('projects')
            .insert([{
              name: newProject.name,
              status: newProject.status,
              start_date: newProject.start_date ? newProject.start_date.toISOString().split('T')[0] : null,
              due_date: newProject.due_date ? newProject.due_date.toISOString().split('T')[0] : null,
              budget: budget || null,
              expenses: expenses,
              payment_received: received,
              payment_pending: pending,
              description: newProject.description || null,
              client_id: newProject.client_id || null,
            }])
            .select()

          if (error) {
            console.error('Error adding project:', error)
            throw new Error(error.message)
          }

          setIsAddDialogOpen(false)
          toast.success(`Project "${newProject.name}" has been added successfully`)
          refetch()
          forceRefresh()
        }
      }
    } catch (error: any) {
      console.error('Error saving project:', error)
      toast.error(`Failed to save project: ${error.message}`)
    }
  }

  // Summary metrics - uses filtered metrics when filters are active
  const summaryMetrics = React.useMemo(() => ({
    totalProjects: totalCount || 0, // This already respects filters
    activeProjects: metrics?.activeProjects || 0,
    totalReceived: metrics?.totalReceived || 0,
    totalPending: metrics?.totalPending || 0,
  }), [metrics, totalCount])

  // Table preferences hook for persistence
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = "final-projects-table"
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Column order and visibility state
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({})
  const [isResizing, setIsResizing] = React.useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = React.useState(0)
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0)

  // Load preferences on mount
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded) {
      const savedWidths = getTablePreference(TABLE_NAME, "column_widths", {})
      const savedOrder = getTablePreference(TABLE_NAME, "column_order", [])
      const savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      const savedSort = getTablePreference(TABLE_NAME, "sorting", {})

      if (Object.keys(savedWidths).length > 0) {
        setColumnWidths(savedWidths)
      }
      if (savedOrder.length > 0) {
        setColumnOrder(savedOrder)
      }
      if (Object.keys(savedVisibility).length > 0) {
        setColumnVisibility(savedVisibility)
      }
      if (savedSort.sortBy) {
        setSortBy(savedSort.sortBy)
        setSortDirection(savedSort.sortDirection)
      }
      
      setPreferencesLoaded(true)
    }
  }, [preferencesLoading, preferencesLoaded, getTablePreference, TABLE_NAME])

  // Save column widths when they change (with debouncing for performance)
  const debouncedSaveWidths = React.useMemo(
    () => debounce((widths: Record<string, number>) => {
      if (preferencesLoaded && Object.keys(widths).length > 0) {
        updateTablePreference(TABLE_NAME, "column_widths", widths)
      }
    }, 200), // Faster response for better UX
    [updateTablePreference, TABLE_NAME, preferencesLoaded]
  )

  // Memoize preference validation to prevent unnecessary updates
  const shouldSavePreferences = React.useCallback((data: any) => {
    return preferencesLoaded && data && (
      typeof data === 'object' ? Object.keys(data).length > 0 : data
    )
  }, [preferencesLoaded])

  React.useEffect(() => {
    if (shouldSavePreferences(columnWidths)) {
      debouncedSaveWidths(columnWidths)
    }
  }, [columnWidths, debouncedSaveWidths, shouldSavePreferences])

  // Save column order when it changes
  React.useEffect(() => {
    if (shouldSavePreferences(columnOrder)) {
      updateTablePreference(TABLE_NAME, "column_order", columnOrder)
    }
  }, [columnOrder, updateTablePreference, TABLE_NAME, shouldSavePreferences])

  // Save column visibility when it changes
  React.useEffect(() => {
    if (shouldSavePreferences(columnVisibility)) {
      updateTablePreference(TABLE_NAME, "column_visibility", columnVisibility)
    }
  }, [columnVisibility, updateTablePreference, TABLE_NAME, shouldSavePreferences])

  // Save sorting state when it changes
  React.useEffect(() => {
    if (preferencesLoaded && (sortBy || sortDirection)) {
      updateTablePreference(TABLE_NAME, "sorting", { sortBy, sortDirection })
    }
  }, [sortBy, sortDirection, updateTablePreference, TABLE_NAME, preferencesLoaded])
  
  // Create columns with fixed widths and proper actions
  const allColumns = React.useMemo(() => {
    const columns = createColumns({
      onEditProject: handleEditProject,
      onCreateInvoice: (project: any) => {
        // Navigate to invoice creation page
        toast.info(`Creating invoice for ${project.name}`, {
          description: "This feature will be available soon"
        })
        // TODO: Implement invoice creation
        // router.push(`/dashboard/invoices/create?project=${project.id}`)
      },
      onDeleteProject: async (project: any) => {
        // Show confirmation dialog
        const confirmed = window.confirm(`Are you sure you want to delete "${project.name}"?`)
        if (!confirmed) return

        try {
          if (isSupabaseConfigured()) {
            const { error } = await supabase
              .from('projects')
              .delete()
              .eq('id', project.id)

            if (error) throw error

            toast.success(`Project "${project.name}" deleted successfully`)
            refetch()
            forceRefresh()
          }
        } catch (error: any) {
          console.error('Error deleting project:', error)
          toast.error(`Failed to delete project: ${error.message}`)
        }
      },
      onStatusChange: (project: any, status: string) => {
        updateStatus({ id: project.id, status })
      },
      onDateChange: async (project: any, field: 'start_date' | 'due_date', date: Date | undefined) => {
        try {
          if (isSupabaseConfigured()) {
            const updateData = {
              [field]: date ? date.toISOString().split('T')[0] : null,
              updated_at: new Date().toISOString()
            }

            const { error } = await supabase
              .from('projects')
              .update(updateData)
              .eq('id', project.id)

            if (error) throw error

            toast.success(`${field === 'start_date' ? 'Start' : 'Due'} date updated successfully`)
            refetch()
          }
        } catch (error: any) {
          console.error(`Error updating ${field}:`, error)
          toast.error(`Failed to update date: ${error.message}`)
        }
      },
      onClientChange: async (project: any, clientId: string | null, onUpdate?: () => void) => {
        try {
          if (isSupabaseConfigured()) {
            const { error } = await supabase
              .from('projects')
              .update({
                client_id: clientId,
                updated_at: new Date().toISOString()
              })
              .eq('id', project.id)

            if (error) throw error

            const clientName = clientId ? clients.find(c => c.id === clientId)?.name : 'removed'
            toast.success(`Client ${clientName ? `updated to ${clientName}` : 'removed'}`)
            
            if (onUpdate) onUpdate()
            refetch()
          }
        } catch (error: any) {
          console.error('Error updating client:', error)
          toast.error(`Failed to update client: ${error.message}`)
        }
      },
      availableClients: clients,
    })

    // Apply dynamic widths with fallback to default widths
    return columns.map((column: any) => {
      const columnKey = column.accessorKey || column.id
      const defaultWidth = columnKey === 'select' ? COLUMN_WIDTHS.select : 
                          COLUMN_WIDTHS[columnKey as keyof typeof COLUMN_WIDTHS] || 150
      
      // Select column is always fixed width, other columns can be resized
      if (columnKey === 'select') {
        return {
          ...column,
          size: 36, // Fixed width for checkbox column
          minSize: 36,
          maxSize: 36,
        }
      }
      
      const currentWidth = columnWidths[columnKey] || defaultWidth
      return {
        ...column,
        size: currentWidth,
        minSize: 80, // Minimum resizable width
        maxSize: 500, // Maximum resizable width
      }
    })
  }, [updateStatus, refetch, forceRefresh, columnWidths, clients])

  // Initialize column order and visibility on first load
  React.useEffect(() => {
    if (allColumns.length > 0 && columnOrder.length === 0) {
      const defaultOrder = allColumns.map(col => col.id || col.accessorKey)
      const defaultVisibility = allColumns.reduce((acc, col) => {
        acc[col.id || col.accessorKey] = true
        return acc
      }, {} as Record<string, boolean>)
      
      setColumnOrder(defaultOrder)
      setColumnVisibility(defaultVisibility)
    }
  }, [allColumns, columnOrder.length])

  // Reorder and filter columns based on user preferences
  const columns = React.useMemo(() => {
    if (columnOrder.length === 0) return allColumns

    // First, create a map for easy lookup
    const columnMap = new Map(allColumns.map(col => [col.id || col.accessorKey, col]))
    
    // Reorder columns according to user preference
    const orderedColumns = columnOrder
      .map(colId => columnMap.get(colId))
      .filter(Boolean) // Remove any undefined columns
      .filter(col => columnVisibility[col.id || col.accessorKey] !== false) // Filter out hidden columns
    
    // Add any new columns that might not be in the order yet
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns.filter(col => !orderedIds.has(col.id || col.accessorKey))
    
    return [...orderedColumns, ...newColumns]
  }, [allColumns, columnOrder, columnVisibility])

  // Create column metadata for the view filter - using ordered columns
  const columnMetadata = React.useMemo(() => {
    // Use the ordered columns but include hidden ones for the view filter
    if (columnOrder.length === 0) {
      // If no order is set yet, use allColumns
    return allColumns.map(col => ({
      id: col.id || col.accessorKey,
      accessorKey: col.accessorKey,
      header: col.header,
      visible: columnVisibility[col.id || col.accessorKey] !== false,
      canHide: col.accessorKey !== 'select' // Can't hide select column
    }))
    }
    
    // Create a map for easy lookup
    const columnMap = new Map(allColumns.map(col => [col.id || col.accessorKey, col]))
    
    // Reorder columns according to user preference (including hidden ones)
    const orderedColumns = columnOrder
      .map(colId => columnMap.get(colId))
      .filter(Boolean) // Remove any undefined columns
    
    // Add any new columns that might not be in the order yet
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns.filter(col => !orderedIds.has(col.id || col.accessorKey))
    
    // Return all columns in the correct order (both visible and hidden)
    return [...orderedColumns, ...newColumns].map(col => ({
      id: col.id || col.accessorKey,
      accessorKey: col.accessorKey,
      header: col.header,
      visible: columnVisibility[col.id || col.accessorKey] !== false,
      canHide: col.accessorKey !== 'select' // Can't hide select column
    }))
  }, [allColumns, columnOrder, columnVisibility])

  // Handle column reordering
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

  // Handle column visibility changes
  const handleColumnVisibilityChange = React.useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible
    }))
  }, [])

  // Column resizing handlers
  const handleResizeStart = React.useCallback((columnId: string, startX: number) => {
    // Don't allow resizing of select column
    if (columnId === 'select') return
    
    const currentWidth = columnWidths[columnId] || COLUMN_WIDTHS[columnId as keyof typeof COLUMN_WIDTHS] || 150
    setIsResizing(columnId)
    setResizeStartX(startX)
    setResizeStartWidth(currentWidth)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [columnWidths])

  const handleResizeMove = React.useCallback((clientX: number) => {
    if (!isResizing) return
    
    const deltaX = clientX - resizeStartX
    const newWidth = Math.max(80, resizeStartWidth + deltaX) // Minimum width of 80px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }))
  }, [isResizing, resizeStartX, resizeStartWidth])

  const handleResizeEnd = React.useCallback(() => {
    setIsResizing(null)
    setResizeStartX(0)
    setResizeStartWidth(0)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Add global mouse events for resizing
  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e.clientX)
    }

    const handleMouseUp = () => {
      handleResizeEnd()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Handle add project
  function handleAddProject() {
    // Reset form for adding new project
    setNewProject({
      name: "",
      client_id: "",
      status: "active",
      start_date: undefined,
      due_date: undefined,
      budget: "",
      expenses: "",
      received: "",
      description: "",
    })
    setSelectedClient(null)
    setSelectedProject(null)
    setIsAddDialogOpen(true)
  }

  // Handle edit project  
  function handleEditProject(project: any) {
    setSelectedProject(project)
    
    // Populate form with project data
    setNewProject({
      name: project.name || "",
      client_id: project.clients?.id || "",
      status: project.status || "active",
      start_date: project.start_date ? new Date(project.start_date) : undefined,
      due_date: project.due_date ? new Date(project.due_date) : undefined,
      budget: project.budget?.toString() || "",
      expenses: project.expenses?.toString() || "",
      received: project.received?.toString() || "",
      description: project.description || "",
    })
    
    // Set selected client if exists
    if (project.clients) {
      const client = clients.find(c => c.id === project.clients.id)
      setSelectedClient(client || null)
    } else {
      setSelectedClient(null)
    }
    
    setIsEditDialogOpen(true)
  }
  
  // Handle batch delete
  const handleBatchDelete = async (projects: any[]) => {
    if (projects.length === 0) return
    
    const projectNames = projects.map(p => p.name).join(', ')
    const confirmed = window.confirm(`Are you sure you want to delete ${projects.length} project(s)?\n\n${projectNames}`)
    if (!confirmed) return

    try {
      if (isSupabaseConfigured()) {
        const projectIds = projects.map(p => p.id)
        const { error } = await supabase
          .from('projects')
          .delete()
          .in('id', projectIds)

        if (error) throw error

        toast.success(`${projects.length} project(s) deleted successfully`)
        refetch()
        forceRefresh()
      }
    } catch (error: any) {
      console.error('Error deleting projects:', error)
      toast.error(`Failed to delete projects: ${error.message}`)
    }
  }

  // Handle export
  const handleExport = () => {
    console.log('Export projects')
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
          <p className="text-muted-foreground mb-4">{error ? error.message : 'An error occurred'}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }



  return (
    <div className="w-full h-screen flex flex-col bg-gray-50/30">
      {/* Fixed Header */}
      <PageHeader
        title="All Projects"
        action={<PageActionsMenu entityType="projects" onExport={handleExport} />}
      />
      
      {/* Fixed Summary Cards and Filters */}
      <div className="flex-shrink-0 sticky top-16 z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 w-full border-t border-gray-200">
          <div className="px-6 py-4 border-r border-gray-200 last:border-r-0">
            <div className="text-lg font-medium text-black">{summaryMetrics.totalProjects}</div>
            <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Projects</h3>
          </div>
          <div className="px-6 py-4 border-r border-gray-200 last:border-r-0">
            <div className="text-lg font-medium text-black">{summaryMetrics.activeProjects}</div>
            <h3 className="text-xs font-medium text-muted-foreground mt-1">Active Projects</h3>
          </div>
          <div className="px-6 py-4 border-r border-gray-200 last:border-r-0">
            <div className="text-lg font-medium text-black">{formatCurrencyAbbreviated(summaryMetrics.totalReceived)}</div>
            <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Received</h3>
          </div>
          <div className="px-6 py-4 border-r border-gray-200 last:border-r-0">
            <div className="text-lg font-medium text-black">{formatCurrencyAbbreviated(summaryMetrics.totalPending)}</div>
            <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Pending</h3>
          </div>
        </div>
        
        {/* Bottom border separator */}
        <div className="border-b border-gray-200"></div>

        {/* Filters and Actions */}
        <div className="p-6">
          <ProjectFiltersV2 
          clients={clients}
          showStatusFilter={true}
          className=""
          onAddProject={handleAddProject}
          table={tableInstance}
          columns={columnMetadata}
          onColumnReorder={handleColumnReorder}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
        </div>
      </div>

      {/* Full Height Table Container with Proper Overflow */}
      <div className="flex-1 overflow-hidden relative">
        <FinalDataTable
          projects={projects}
          columns={columns}
          totalCount={totalCount}
          metrics={metrics}
          isLoading={isLoading}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadMore={loadMore}
          updateStatus={updateStatus}
          refetch={refetch}
          forceRefresh={forceRefresh}
          onEditProject={handleEditProject}
          onBatchDelete={handleBatchDelete}
          onResizeStart={handleResizeStart}
          createSortingFunctions={createSortingFunctions}
          preferencesLoading={preferencesLoading}
          preferencesLoaded={preferencesLoaded}
        />
      </div>

             {/* Fixed Loading Indicators - Only show when actively loading */}
       {/* Infinite Loading Overlay - Only when fetching */}
       {preferencesLoaded && (isFetching || isFetchingNextPage) && (
         <motion.div 
           className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 10 }}
         >
           <SubtleLoadingIndicator
             isFetching={isFetching}
             isFetchingNextPage={isFetchingNextPage}
             hasMore={hasNextPage}
             currentCount={projects.length}
             totalCount={totalCount}
           />
         </motion.div>
       )}

       {/* Temporary End Message - Shows for 3 seconds then fades */}
       <AnimatePresence>
         {showEndMessage && (
           <motion.div 
             className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 10 }}
             transition={{ duration: 0.3 }}
           >
             <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-4 py-2 rounded-full border shadow-sm">
               <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               All {totalCount} projects loaded
             </div>
           </motion.div>
         )}
       </AnimatePresence>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setSelectedProject(null)
          setSelectedClient(null)
          setClientSearchQuery("")
          setDisplayedClientsCount(10)
        }
      }}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project information and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-project-name">Project Name *</Label>
                <Input
                  id="edit-project-name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="edit-project-client">Client</Label>
                <Popover modal={true} open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientDropdownOpen}
                      className="w-full justify-between h-9 px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm text-left"
                    >
                      {selectedClient ? (
                        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                          <ClientAvatar 
                            name={selectedClient.name} 
                            avatarUrl={selectedClient.avatar_url}
                            size="xs"
                          />
                          <span className="truncate">{selectedClient.name} - {selectedClient.company}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex-1 mr-2">Select client</span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search clients..." 
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <div className="max-h-60 overflow-y-auto">
                        <CommandList>
                          <CommandEmpty>No clients found.</CommandEmpty>
                          <CommandGroup>
                            {displayedClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.company || ''}`}
                                onSelect={() => handleClientSelect(client.id)}
                                className="flex items-center space-x-3 p-3"
                              >
                                <ClientAvatar 
                                  name={client.name} 
                                  avatarUrl={client.avatar_url}
                                  size="lg"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{client.name}</div>
                                  {client.company && (
                                    <div className="text-sm text-muted-foreground">{client.company}</div>
                                  )}
                                  {client.email && (
                                    <div className="text-xs text-muted-foreground">{client.email}</div>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </div>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                             <div>
                 <Label htmlFor="edit-project-status">Status</Label>
                 <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                   <SelectTrigger className="text-sm rounded-lg shadow-xs">
                     <SelectValue placeholder="Select status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="active">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Active</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="pipeline">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Pipeline</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="on_hold">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">On Hold</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="completed">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Completed</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="cancelled">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Cancelled</span>
                       </div>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
              <div>
                <Label htmlFor="edit-project-budget">Budget</Label>
                <Input
                  id="edit-project-budget"
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-project-expenses">Expenses</Label>
                <Input
                  id="edit-project-expenses"
                  type="number"
                  value={newProject.expenses}
                  onChange={(e) => setNewProject({ ...newProject, expenses: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-project-received">Received Amount</Label>
                <Input
                  id="edit-project-received"
                  type="number"
                  value={newProject.received}
                  onChange={(e) => setNewProject({ ...newProject, received: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <DatePicker
                  date={newProject.start_date}
                  onSelect={(date) => setNewProject({ ...newProject, start_date: date })}
                  placeholder="Pick start date"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <DatePicker
                  date={newProject.due_date}
                  onSelect={(date) => setNewProject({ ...newProject, due_date: date })}
                  placeholder="Pick due date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description or notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              setIsEditDialogOpen(false)
              setSelectedProject(null)
              setSelectedClient(null)
            }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProject} disabled={!newProject.name}>
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          setSelectedProject(null)
          setSelectedClient(null)
          setClientSearchQuery("")
          setDisplayedClientsCount(10)
          setNewProject({
            name: "",
            client_id: "",
            status: "active",
            start_date: undefined,
            due_date: undefined,
            budget: "",
            expenses: "",
            received: "",
            description: "",
          })
        }
      }}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>Create a new project with client information and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-project-name">Project Name *</Label>
                <Input
                  id="add-project-name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="add-project-client">Client</Label>
                <Popover modal={true} open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientDropdownOpen}
                      className="w-full justify-between h-9 px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm text-left"
                    >
                      {selectedClient ? (
                        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                          <ClientAvatar 
                            name={selectedClient.name} 
                            avatarUrl={selectedClient.avatar_url}
                            size="xs"
                          />
                          <span className="truncate">{selectedClient.name} - {selectedClient.company}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex-1 mr-2">Select client</span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search clients..." 
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <div className="max-h-60 overflow-y-auto">
                        <CommandList>
                          <CommandEmpty>No clients found.</CommandEmpty>
                          <CommandGroup>
                            {displayedClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.company || ''}`}
                                onSelect={() => handleClientSelect(client.id)}
                                className="flex items-center space-x-3 p-3"
                              >
                                <ClientAvatar 
                                  name={client.name} 
                                  avatarUrl={client.avatar_url}
                                  size="lg"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{client.name}</div>
                                  {client.company && (
                                    <div className="text-sm text-muted-foreground">{client.company}</div>
                                  )}
                                  {client.email && (
                                    <div className="text-xs text-muted-foreground">{client.email}</div>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </div>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                             <div>
                 <Label htmlFor="add-project-status">Status</Label>
                 <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                   <SelectTrigger className="text-sm rounded-lg shadow-xs">
                     <SelectValue placeholder="Select status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="active">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Active</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="pipeline">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Pipeline</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="on_hold">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">On Hold</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="completed">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Completed</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="cancelled">
                       <div className="flex items-center gap-2 whitespace-nowrap">
                         <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                         <span className="whitespace-nowrap">Cancelled</span>
                       </div>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
              <div>
                <Label htmlFor="add-project-budget">Budget</Label>
                <Input
                  id="add-project-budget"
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-project-expenses">Expenses</Label>
                <Input
                  id="add-project-expenses"
                  type="number"
                  value={newProject.expenses}
                  onChange={(e) => setNewProject({ ...newProject, expenses: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="add-project-received">Received</Label>
                <Input
                  id="add-project-received"
                  type="number"
                  value={newProject.received}
                  onChange={(e) => setNewProject({ ...newProject, received: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-project-start-date">Start Date</Label>
                <DatePicker
                  date={newProject.start_date}
                  onSelect={(date) => setNewProject({ ...newProject, start_date: date })}
                />
              </div>
              <div>
                <Label htmlFor="add-project-due-date">Due Date</Label>
                <DatePicker
                  date={newProject.due_date}
                  onSelect={(date) => setNewProject({ ...newProject, due_date: date })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-project-description">Description</Label>
              <Textarea
                id="add-project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description or notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedProject(null)
              setSelectedClient(null)
            }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProject} disabled={!newProject.name}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Main page component
export default function FinalProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    }>
      <FinalProjectsContent />
    </React.Suspense>
  )
} 