"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertCircle,
  Trash2
} from "lucide-react"

import { useInfiniteProjects } from "@/hooks/use-infinite-projects"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { PageHeader, PageContent } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { createColumns } from "@/components/projects/columns"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
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
  select: 40,
  name: 280,      
  client: 200,    
  status: 120,    
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
        className="flex justify-center items-center py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Badge 
          variant="outline" 
          className="flex items-center gap-2 text-xs shadow-md"
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
        className="flex justify-center items-center py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Badge 
          variant="secondary" 
          className="flex items-center gap-2 text-xs shadow-sm border"
        >
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Updating</span>
        </Badge>
      </motion.div>
    )
  }

  return null
}

// Fixed Data Table with div-based sticky structure
function FinalDataTable({
  projects,
  columns,
  totalCount,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  loadMore,
  updateStatus,
  refetch,
  onEditProject,
  onBatchDelete,
}: {
  projects: any[]
  columns: any[]
  totalCount: number
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  loadMore: () => void
  updateStatus: any
  refetch: any
  onEditProject: (project: any) => void
  onBatchDelete: (projects: any[]) => void
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
  
  // Use projects directly (sorting handled by filter dropdown)
  const sortedProjects = projects

  // Selected rows for batch operations
  const selectedProjects = React.useMemo(() => {
    return sortedProjects.filter((project) => rowSelection[project.id])
  }, [sortedProjects, rowSelection])

  // Calculate footer aggregations
  const aggregations = React.useMemo(() => {
    const projectsArray = Array.isArray(sortedProjects) ? sortedProjects : []
    if (!projectsArray.length) return {
      totalProjects: 0,
      totalBudget: 0,
      totalExpenses: 0,
      totalReceived: 0,
      totalPending: 0,
      activeCount: 0,
      completedCount: 0,
    }
    
    return {
      totalProjects: projectsArray.length,
      totalBudget: projectsArray.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalExpenses: projectsArray.reduce((sum, p) => sum + (p.expenses || 0), 0),
      totalReceived: projectsArray.reduce((sum, p) => sum + (p.received || 0), 0),
      totalPending: projectsArray.reduce((sum, p) => {
        const budget = p.budget || 0
        const received = p.received || 0
        return sum + Math.max(0, budget - received)
      }, 0),
      activeCount: projectsArray.filter((p) => p.status === 'active').length,
      completedCount: projectsArray.filter((p) => p.status === 'completed').length,
    }
  }, [sortedProjects])

  // Stable intersection observer for infinite scroll
  React.useEffect(() => {
    if (!hasNextPage || isLoading || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    // Find the last row and observe it
    const lastRow = tableRef.current?.querySelector('[data-last-row]')
    if (lastRow) {
      observer.observe(lastRow)
    }

    return () => {
      observer.disconnect()
    }
  }, [sortedProjects.length, hasNextPage, isLoading, isFetchingNextPage, loadMore])

  // Calculate table width based on column widths
  const tableWidth = React.useMemo(() => {
    return columns.reduce((total, col) => total + (col.size || 150), 0)
  }, [columns])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Batch Selection Actions */}
      <AnimatePresence>
        {selectedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border mx-4 mt-4"
          >
            <span className="text-sm text-muted-foreground">
              {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
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
                onClick={() => onBatchDelete(selectedProjects)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container with div-based sticky structure */}
      <div ref={tableRef} className="flex-1 overflow-auto relative">
        <div className="min-w-full inline-block align-middle" style={{ minWidth: `${tableWidth}px` }}>
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200/80">
            <div className="flex">
              {columns.map((column: any, colIndex: number) => (
                                                    <div
                    key={`header-${column.id || colIndex}`}
                    className="flex-shrink-0 px-3 py-3 font-medium text-gray-700 text-sm flex items-center gap-2 select-none"
                    style={{ 
                      width: column.size ? `${column.size}px` : 'auto',
                      minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                      maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                    }}
                >
                                      {typeof column.header === 'function' 
                      ? column.header({ 
                          column: { 
                            toggleSorting: () => {}, // No direct sorting - use dropdown
                            getIsSorted: () => false, // No direct sorting state
                            clearSorting: () => {} // No direct sorting state
                          },
                          table: {
                            getIsAllPageRowsSelected: () => Object.keys(rowSelection).length === sortedProjects.length && sortedProjects.length > 0,
                            getIsSomePageRowsSelected: () => Object.keys(rowSelection).length > 0 && Object.keys(rowSelection).length < sortedProjects.length,
                            toggleAllPageRowsSelected: (value?: boolean) => {
                              if (value) {
                                const newSelection: Record<string, boolean> = {}
                                sortedProjects.forEach(project => {
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
                </div>
              ))}
            </div>
          </div>

          {/* Table Body - Div-based */}
          <div className="bg-white relative">
            {/* Show skeletons during initial loading */}
            {(isLoading || (!hasLoadedOnce && isFetching)) ? (
              <>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={`skeleton-${i}`} 
                    className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                  >
                    {columns.map((column: any, j: number) => (
                      <div 
                        key={`skeleton-${i}-${j}`} 
                        className="px-3 py-3 text-sm flex-shrink-0 flex items-center"
                        style={{ 
                          width: column.size ? `${column.size}px` : 'auto',
                          minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                          maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                        }}
                      >
                        {/* Skeleton content optimized by column type */}
                        {(() => {
                          const columnKey = column.accessorKey || column.id
                          
                          // Checkbox column
                          if (columnKey === 'select') {
                            return (
                              <div 
                                className="w-4 h-4 bg-gray-200 rounded animate-pulse"
                              />
                            )
                          }
                          
                          // Project name column
                          if (columnKey === 'name') {
                            return (
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                            )
                          }
                          
                          // Client column
                          if (columnKey === 'client') {
                            return (
                              <div className="flex items-center space-x-2 w-full">
                                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
                                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                              </div>
                            )
                          }
                          
                          // Status column
                          if (columnKey === 'status') {
                            return (
                              <div className="h-5 bg-gray-200 rounded-full animate-pulse w-16" />
                            )
                          }
                          
                          // Currency columns
                          if (['budget', 'expenses', 'received', 'pending'].includes(columnKey)) {
                            return (
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                            )
                          }
                          
                          // Date columns
                          if (['start_date', 'due_date'].includes(columnKey)) {
                            return (
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                            )
                          }
                          
                          // Default skeleton
                          return (
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : sortedProjects.length === 0 ? (
              // Empty state - Only show when not loading and no data
              <div className="p-12 text-center">
                <div className="text-muted-foreground">No projects found.</div>
              </div>
            ) : (
              <>
                {sortedProjects.map((project, index) => (
                  <ContextMenu key={project.id}>
                    <ContextMenuTrigger asChild>
                      <motion.div
                        className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group cursor-default"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.3) }}
                        data-last-row={index === sortedProjects.length - 1 ? 'true' : undefined}
                      >
                        {columns.map((column: any, colIndex: number) => (
                          <div
                            key={`${project.id}-${column.id || colIndex}`}
                            className="px-3 py-3 text-sm flex-shrink-0 flex items-center"
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
                                    getIsAllPageRowsSelected: () => Object.keys(rowSelection).length === sortedProjects.length && sortedProjects.length > 0,
                                    getIsSomePageRowsSelected: () => Object.keys(rowSelection).length > 0 && Object.keys(rowSelection).length < sortedProjects.length,
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
                      <ContextMenuItem onClick={() => {}}>
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
                            setTimeout(() => refetch(), 50)
                          }}>
                            <Clock className="mr-2 h-4 w-4 text-green-500" />
                            Active
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'completed' })
                            setTimeout(() => refetch(), 50)
                          }}>
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                            Completed
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'on_hold' })
                            setTimeout(() => refetch(), 50)
                          }}>
                            <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                            On Hold
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'cancelled' })
                            setTimeout(() => refetch(), 50)
                          }}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Cancelled
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            updateStatus({ id: project.id, status: 'pipeline' })
                            setTimeout(() => refetch(), 50)
                          }}>
                            <GitBranch className="mr-2 h-4 w-4 text-purple-500" />
                            Pipeline
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => {}}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
                
                {/* Bottom padding to keep footer stable */}
                <div className="h-20"></div>
              </>
            )}

            {/* Loading indicators positioned absolutely to not affect layout */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <SubtleLoadingIndicator
                isFetching={isFetching}
                isFetchingNextPage={isFetchingNextPage}
                hasMore={hasNextPage}
                currentCount={sortedProjects.length}
                totalCount={totalCount}
              />
            </div>
          </div>

          {/* Sticky Footer with Calculations */}
          <div className="sticky bottom-0 bg-white z-10 border-t border-gray-200/80">
            <div className="flex">
              {columns.map((column: any, colIndex: number) => (
                <div
                  key={`footer-${column.id || colIndex}`}
                  className="px-3 py-3 text-sm font-medium flex-shrink-0 flex items-center"
                  style={{ 
                    width: column.size ? `${column.size}px` : 'auto'
                  }}
                >
                  {/* Footer aggregations */}
                  {column.accessorKey === 'name' && aggregations.totalProjects > 0 && (
                    <div className="text-muted-foreground">
                      Total: <span className="text-foreground font-semibold">{aggregations.totalProjects}</span>
                    </div>
                  )}
                  {column.accessorKey === 'status' && aggregations.activeCount > 0 && (
                    <div className="text-muted-foreground">
                      Active: <span className="text-green-600 font-semibold">{aggregations.activeCount}</span>
                    </div>
                  )}
                  {column.accessorKey === 'budget' && aggregations.totalBudget > 0 && (
                    <div className="text-muted-foreground">
                      Total: <span className="text-foreground font-semibold">{formatCurrency(aggregations.totalBudget)}</span>
                    </div>
                  )}
                  {column.accessorKey === 'expenses' && aggregations.totalExpenses > 0 && (
                    <div className="text-muted-foreground">
                      Total: <span className="text-foreground font-semibold">{formatCurrency(aggregations.totalExpenses)}</span>
                    </div>
                  )}
                  {column.accessorKey === 'received' && aggregations.totalReceived > 0 && (
                    <div className="text-muted-foreground">
                      Total: <span className="text-green-600 font-semibold">{formatCurrency(aggregations.totalReceived)}</span>
                    </div>
                  )}
                  {column.accessorKey === 'pending' && aggregations.totalPending > 0 && (
                    <div className="text-muted-foreground">
                      Total: <span className="text-foreground font-semibold">{formatCurrency(aggregations.totalPending)}</span>
                    </div>
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
  } = useInfiniteProjects(filters)

  // Client state management
  const [clients, setClients] = React.useState<Client[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<any>(null)
  const [tableInstance, setTableInstance] = React.useState<any>(null)

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

  // Summary metrics
  const summaryMetrics = React.useMemo(() => ({
    totalProjects: metrics?.totalProjects || 0,
    activeProjects: metrics?.activeProjects || 0,
    totalReceived: metrics?.totalReceived || 0,
    totalPending: metrics?.totalPending || 0,
  }), [metrics])

  // Create columns with fixed widths and proper actions
  const columns = React.useMemo(() => {
    const allColumns = createColumns({
      onEditProject: handleEditProject,
      onCreateInvoice: () => {},
      onDeleteProject: () => {},
      onStatusChange: (project: any, status: string) => {
        updateStatus({ id: project.id, status })
        setTimeout(() => refetch(), 50)
      },
      onDateChange: () => {},
    })

         // Apply fixed widths to prevent layout shift
     return allColumns.map((column: any) => {
       // Handle different column identifier patterns
       const columnKey = column.accessorKey || column.id
       const baseWidth = columnKey === 'select' ? COLUMN_WIDTHS.select : 
                        COLUMN_WIDTHS[columnKey as keyof typeof COLUMN_WIDTHS] || 150
       return {
         ...column,
         size: baseWidth,
         minSize: baseWidth,
         maxSize: baseWidth,
       }
     })
  }, [updateStatus, refetch])

  // Handle add project
  function handleAddProject() {
    setIsAddDialogOpen(true)
  }

  // Handle edit project  
  function handleEditProject(project: any) {
    setSelectedProject(project)
    setIsEditDialogOpen(true)
  }
  
  // Handle batch delete
  const handleBatchDelete = (projects: any[]) => {
    console.log('Batch delete:', projects)
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
          <p className="text-muted-foreground mb-4">{error?.message}</p>
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
      <div className="flex-shrink-0 p-6 space-y-4 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 sticky top-16 z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Projects</h3>
              <div className="text-lg font-semibold ml-auto">{summaryMetrics.totalProjects}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Active Projects</h3>
              <div className="text-lg font-semibold text-blue-600 ml-auto">{summaryMetrics.activeProjects}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Received</h3>
              <div className="text-lg font-semibold text-green-600 ml-auto">{formatCurrency(summaryMetrics.totalReceived)}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Pending</h3>
              <div className="text-lg font-semibold text-yellow-600 ml-auto">{formatCurrency(summaryMetrics.totalPending)}</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <ProjectFiltersV2 
          clients={clients}
          showStatusFilter={true}
          className=""
          onAddProject={handleAddProject}
          table={tableInstance}
        />
      </div>

      {/* Full Height Table Container with Proper Overflow */}
      <div className="flex-1 overflow-hidden relative">
        <FinalDataTable
          projects={projects}
          columns={columns}
          totalCount={totalCount}
          isLoading={isLoading}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadMore={loadMore}
          updateStatus={updateStatus}
          refetch={refetch}
          onEditProject={handleEditProject}
          onBatchDelete={handleBatchDelete}
        />
      </div>
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