"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
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
  Check,
  Copy
} from "lucide-react"
import { toast } from "sonner"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { formatCurrencyAbbreviated } from "../../lib/currency-utils"

// Position constants for floating indicators
const BADGE_POSITION = {
  bottom: '24px',
  right: '24px'
}

const LOADER_POSITION = {
  bottom: '24px',
  right: '24px'
}

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
  onDuplicateProject: (project: any) => void
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
  onDuplicateProject,
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
  
  // Track if we've ever loaded more than the first page
  const [hasLoadedNextPage, setHasLoadedNextPage] = React.useState(false)
  
  // Mark as loaded when we get data
  React.useEffect(() => {
    if (projects && projects.length > 0) {
      setHasLoadedOnce(true)
    }
  }, [projects])
  
  // Track when we've loaded additional pages
  React.useEffect(() => {
    if (isFetchingNextPage) {
      setHasLoadedNextPage(true)
    }
  }, [isFetchingNextPage])
  
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
      {selectedProjects.length > 0 && (
        <div
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-full shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-foreground">
                {selectedProjects.length} selected
              </span>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="h-7 px-3 text-xs hover:bg-muted"
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
        </div>
      )}

      {/* Table Container with div-based sticky structure */}
      <div ref={tableRef} className="flex-1 overflow-auto relative border-l border-border custom-scrollbar table-container">
        {/* Table Loading Overlay - Only show for initial loads, not refetches */}
        {(preferencesLoading || !preferencesLoaded || (isLoading && !hasLoadedOnce && projects.length === 0)) && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 text-xs shadow-md border bg-background text-foreground"
            >
              <Loader size="xs" variant="default" />
              <span>Loading projects...</span>
            </Badge>
          </div>
        )}

        {/* Table Content Wrapper */}
        <div className="table-content-wrapper">
          <div className="inline-block min-w-full" style={{ width: `${tableWidth}px` }}>
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 bg-background border-t border-b border-border">
              <div className="flex" style={{ width: `${tableWidth}px` }}>
                {columns.map((column: any, colIndex: number) => (
                  <div
                    key={`header-${column.id || colIndex}`}
                    className={`flex-shrink-0 px-3 font-normal text-muted-foreground text-sm flex items-center gap-2 select-none h-11 relative group ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''}`}
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
            <div className="bg-background relative" data-table-body>
              {projects.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-muted-foreground">No projects found.</div>
                </div>
              ) : (
                <>
                  {projects.map((project: any, index: number) => (
                    <ContextMenu key={project.id}>
                      <ContextMenuTrigger asChild>
                        <div className="flex hover:bg-muted/50 transition-colors group cursor-default h-11 border-b border-border">
                          {columns.map((column: any, colIndex: number) => (
                            <div
                              key={`${project.id}-${column.id || colIndex}`}
                              className={`px-3 text-sm flex-shrink-0 flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''}`}
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
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={() => onEditProject(project)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Project
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => onDuplicateProject(project)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate Project
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
                              <Clock className="mr-2 h-4 w-4 text-blue-500" />
                              Active
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              updateStatus({ id: project.id, status: 'completed' })
                            }}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              Completed
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              updateStatus({ id: project.id, status: 'on_hold' })
                            }}>
                              <Pause className="mr-2 h-4 w-4 text-amber-500" />
                              On Hold
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              updateStatus({ id: project.id, status: 'cancelled' })
                            }}>
                              <XCircle className="mr-2 h-4 w-4 text-rose-500" />
                              Cancelled
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              updateStatus({ id: project.id, status: 'pipeline' })
                            }}>
                              <GitBranch className="mr-2 h-4 w-4 text-sky-500" />
                              Pipeline
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => {
                              updateStatus({ id: project.id, status: 'due' })
                            }}>
                              <Clock className="mr-2 h-4 w-4 text-orange-500" />
                              Due
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

                  {/* All loaded indicator - positioned relative to table end */}
                  {!hasNextPage && projects.length > 0 && !isFetchingNextPage && hasLoadedNextPage && (
                                            <div className="h-12 relative">
                      <div className="absolute z-10" style={BADGE_POSITION}>
                        <Badge 
                          variant="outline" 
                          className="flex items-center gap-1 text-xs bg-background/80 backdrop-blur-sm border-border/50"
                        >
                          <Check className="w-2 h-2" />
                          <span className="text-xs">All loaded</span>
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Invisible spacer for proper scrolling detection - only when needed */}
                  {(hasNextPage || isFetchingNextPage) && (
                    <div className="h-8 w-full" data-table-body />
                  )}
                </>
              )}
            </div>

            {/* Sticky Footer with Aggregations */}
            <div className="sticky-footer bg-background border-t border-b border-border h-11">
              <div className="flex h-full" style={{ width: `${tableWidth}px` }}>
                {columns.map((column: any, colIndex: number) => (
                  <div
                    key={`footer-${column.id || colIndex}`}
                    className={`px-3 text-sm font-normal flex-shrink-0 flex items-center h-11 ${(column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''}`}
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


          </div>
        </div>

      </div>

      {/* Loading and completion indicators */}
      {isFetchingNextPage && (
        <div
          className="fixed z-50 pointer-events-none"
          style={LOADER_POSITION}
        >
          <Badge 
            variant="secondary" 
            className="flex items-center gap-2 text-xs shadow-lg border bg-background/95"
          >
            <Loader size="xs" variant="default" />
            <span>Loading more projects...</span>
          </Badge>
        </div>
      )}
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