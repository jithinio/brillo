"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
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
  GitBranch,
  Check 
} from "lucide-react"
import { toast } from "sonner"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { formatCurrencyAbbreviated } from "../../lib/currency-utils"

// Custom scrollbar styles with performance optimizations
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
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  }
  
  .dark .custom-scrollbar {
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  
  /* Performance optimizations */
  .table-container {
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
    overflow-anchor: none;
    scroll-behavior: smooth;
  }
  
  .table-row {
    contain: layout style paint;
  }
  
  /* Fix for sticky footer movement */
  .sticky-footer {
    position: sticky;
    bottom: 0;
    z-index: 20;
    transform: translateZ(0);
    will-change: transform;
    backface-visibility: hidden;
    contain: layout style paint;
    isolation: isolate;
  }
  
  .table-container::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  /* Force scrollbar to always be visible to prevent layout shifts */
  .table-container {
    scrollbar-gutter: stable;
    overflow-y: scroll;
    overflow-x: auto;
  }
  
  /* Additional fixes for scroll boundary issues */
  .table-content-wrapper {
    min-height: 100%;
    position: relative;
    transform: translateZ(0);
  }

  /* Smooth infinite scroll improvements */
  .table-container {
    scroll-padding-bottom: 20px;
    overscroll-behavior: contain;
  }

  /* Optimize table row rendering for smooth scrolling */
  .table-row {
    content-visibility: auto;
    contain-intrinsic-size: 60px;
  }

  /* Loading indicator improvements */
  .infinite-scroll-loader {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
`

interface FinalDataTableProps {
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
  onResizeStart: (columnId: string, startX: number, event: React.MouseEvent) => void
  createSortingFunctions: (columnId: string) => {
    toggleSorting: (desc?: boolean) => void
    getIsSorted: () => false | 'asc' | 'desc'
    clearSorting: () => void
  }
  preferencesLoading: boolean
  preferencesLoaded: boolean
}

function FinalDataTableComponent({
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
}: FinalDataTableProps) {
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
  
  // Selected rows for batch operations
  const selectedProjects = React.useMemo(() => {
    return projects.filter((project) => rowSelection[project.id])
  }, [projects, rowSelection])

  // Calculate footer aggregations
  const aggregations = React.useMemo(() => {
    return {
      totalProjects: totalCount || 0,
      totalBudget: metrics?.totalBudget || 0,
      totalExpenses: metrics?.totalExpenses || 0,
      totalReceived: metrics?.totalReceived || 0,
      totalPending: metrics?.totalPending || 0,
      activeCount: metrics?.activeProjects || 0,
      completedCount: metrics?.completedProjects || 0,
    }
  }, [totalCount, metrics])

  // Stable intersection observer for infinite scroll with prefetching
  React.useEffect(() => {
    if (!hasNextPage || isLoading || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          // Use requestAnimationFrame for smooth loading
          requestAnimationFrame(() => {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => loadMore(), { timeout: 50 })
            } else {
              loadMore()
            }
          })
        }
      },
      {
        threshold: 0,
        rootMargin: '100px 0px 300px 0px' // Load earlier for smoother experience
      }
    )

    // Create a stable sentinel element
    const sentinel = document.createElement('div')
    sentinel.setAttribute('data-infinite-scroll-sentinel', 'true')
    sentinel.style.height = '1px'
    sentinel.style.visibility = 'hidden'
    sentinel.style.pointerEvents = 'none'
    
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
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedProjects.length} selected
              </span>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="h-7 px-3 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
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
      <div ref={tableRef} className="flex-1 overflow-auto relative border-l border-gray-200/80 dark:border-gray-700/80 custom-scrollbar table-container">
        {/* Table Loading Overlay - Only show for initial loads, not refetches */}
        {(preferencesLoading || !preferencesLoaded || (isLoading && (!hasLoadedOnce || projects.length === 0))) && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 text-xs shadow-md border bg-white dark:bg-gray-800 dark:text-gray-200"
            >
              <div className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </Badge>
          </div>
        )}

        {/* Table Content Wrapper */}
        <div className="table-content-wrapper">
          <div className="inline-block min-w-full" style={{ width: `${tableWidth}px` }}>
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-t border-b border-gray-200/80 dark:border-gray-700/80">
              <div className="flex" style={{ width: `${tableWidth}px` }}>
                {columns.map((column: any, colIndex: number) => (
                  <div
                    key={`header-${column.id || colIndex}`}
                    className={`flex-shrink-0 px-3 font-medium text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2 select-none h-11 relative group ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80 dark:border-gray-700/80' : ''}`}
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
                    
                    {/* Resize Handle */}
                    {colIndex < columns.length - 1 && (column.accessorKey || column.id) !== 'select' && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-50"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const columnKey = column.accessorKey || column.id
                          onResizeStart(columnKey, e.clientX, e)
                        }}
                        style={{ right: '-2px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Table Body - Div-based */}
            <div className="bg-white dark:bg-gray-900 relative" data-table-body>
              {projects.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-muted-foreground">No projects found.</div>
                </div>
              ) : (
                <>
                  {projects.map((project: any, index: number) => (
                    <ContextMenu key={project.id}>
                      <ContextMenuTrigger asChild>
                        <motion.div
                          className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-default h-11"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.3) }}
                        >
                          {columns.map((column: any, colIndex: number) => (
                            <div
                              key={`${project.id}-${column.id || colIndex}`}
                              className={`px-3 text-sm flex-shrink-0 flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80 dark:border-gray-700/80' : ''}`}
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
                          toast.info(`Creating invoice for ${project.name}`, {
                            description: "This feature will be available soon"
                          })
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
                  
                  {/* Infinite Scroll Loading Indicator */}
                  {/* Fixed positioned smooth loading indicator */}
                  <AnimatePresence>
                    {isFetchingNextPage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none"
                      >
                        <Badge 
                          variant="secondary" 
                          className="flex items-center gap-2 text-xs shadow-lg border bg-white/95 dark:bg-gray-800/95 infinite-scroll-loader"
                        >
                          <div className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
                          <span>Loading more projects...</span>
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Subtle end indicator without layout shift */}
                  {!hasNextPage && projects.length > 0 && !isFetchingNextPage && (
                    <div className="h-0 relative">
                      <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '6px' }}>
                        <Badge 
                          variant="outline" 
                          className="flex items-center gap-1 text-xs bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-300/50"
                        >
                          <Check className="w-2 h-2" />
                          <span className="text-xs">All loaded</span>
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Invisible spacer for proper scrolling detection */}
                  <div className="h-8 w-full" data-table-body />
                </>
              )}
            </div>

            {/* Sticky Footer with Aggregations */}
            <div className="sticky-footer bg-white dark:bg-gray-900 border-t border-gray-200/80 dark:border-gray-700/80 h-11 shadow-sm">
              <div className="flex h-full" style={{ width: `${tableWidth}px` }}>
                {columns.map((column: any, colIndex: number) => (
                  <div
                    key={`footer-${column.id || colIndex}`}
                    className={`px-3 text-sm font-medium flex-shrink-0 flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-gray-200/80 dark:border-gray-700/80' : ''}`}
                    style={{ 
                      width: column.size ? `${column.size}px` : 'auto',
                      minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                      maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                    }}
                  >
                    {column.footer && typeof column.footer === 'function' ? column.footer({ table: { aggregations, metrics }, getFilteredRowModel: () => ({ rows: projects.map(p => ({ original: p })) }) }) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Spacer to ensure footer has proper positioning space */}
            <div style={{ height: '1px', minHeight: '1px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const FinalDataTable = React.memo(FinalDataTableComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.projects === nextProps.projects &&
    prevProps.columns === nextProps.columns &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.metrics === nextProps.metrics &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isFetching === nextProps.isFetching &&
    prevProps.isFetchingNextPage === nextProps.isFetchingNextPage &&
    prevProps.hasNextPage === nextProps.hasNextPage &&
    prevProps.preferencesLoading === nextProps.preferencesLoading &&
    prevProps.preferencesLoaded === nextProps.preferencesLoaded
  )
}) 