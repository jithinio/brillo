"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { Button } from "@/components/ui/button"
import { Delete01Icon, Edit03Icon, DocumentAttachmentIcon, Tick02Icon, ViewIcon, DollarSend01Icon, FolderAddIcon, UserTime01Icon, ZapIcon, ClockIcon, MailSend02Icon } from '@hugeicons/core-free-icons'
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
import { toast } from "sonner"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import { GenericEntity, GenericTableProps, TableFeatures } from "./types"

// Position constants for floating indicators
const BADGE_POSITION = {
  bottom: '24px',
  right: '24px'
}

const LOADER_POSITION = {
  bottom: '24px',
  right: '24px'
}

// Import the same scrollbar styles from FinalDataTable
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

function GenericDataTableComponent<T extends GenericEntity>({
  entityType,
  data,
  columns,
  totalCount,
  metrics,
  features = {},
  actions = {},
  isLoading = false,
  isFetching = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  loadMore,
  updateStatus,
  refetch,
  forceRefresh,
  onResizeStart,
  preferencesLoading = false,
  preferencesLoaded = true,
}: GenericTableProps<T>) {
  const tableRef = React.useRef<HTMLDivElement>(null)
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  // Default features
  const enabledFeatures: TableFeatures = {
    infiniteScroll: true,
    batchOperations: true,
    columnReordering: true,
    columnResizing: true,
    contextMenu: true,
    footerAggregations: true,
    ...features
  }

  React.useEffect(() => {
    if (!isLoading && data.length > 0) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, data.length])

  // Calculate selected items
  const selectedItems = React.useMemo(() => {
    return data.filter((_, index) => rowSelection[index])
  }, [data, rowSelection])

  // Setup infinite scroll
  React.useEffect(() => {
    if (!enabledFeatures.infiniteScroll || !hasNextPage || isLoading || isFetchingNextPage || !loadMore) return

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
  }, [hasNextPage, isLoading, isFetchingNextPage, loadMore, enabledFeatures.infiniteScroll])

  // Calculate table width
  const tableWidth = React.useMemo(() => {
    return columns.reduce((total: number, col: any) => total + (col.size || 150), 0)
  }, [columns])

  // Handle batch delete
  const handleBatchDelete = React.useCallback(() => {
    if (actions.onBatchDelete && selectedItems.length > 0) {
      actions.onBatchDelete(selectedItems)
      setRowSelection({})
    }
  }, [actions, selectedItems])

  return (
    <div className="w-full h-full flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      
      {/* Batch Selection Toolbar */}
      {enabledFeatures.batchOperations && selectedItems.length > 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-full shadow-lg backdrop-blur-sm">
                <span className="text-sm font-medium text-foreground">
                  {selectedItems.length} selected
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
                  {actions.onBatchDelete && (
                    <Button
                      variant="destructive" 
                      size="sm"
                      onClick={handleBatchDelete}
                      className="h-7 px-3 text-xs text-white"
                    >
                                                    <HugeiconsIcon icon={Delete01Icon} className="mr-1 h-3 w-3"  />
                      Delete
                    </Button>
                  )}
                </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div ref={tableRef} className="flex-1 overflow-auto relative border-l border-border custom-scrollbar table-container">
        {/* Loading Overlay - Only show for preferences loading, not for data loading since we have skeleton rows */}
        {(preferencesLoading || !preferencesLoaded) && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 text-xs shadow-md border bg-background text-foreground"
            >
              <Loader size="xs" variant="default" />
              <span>Loading {entityType}...</span>
            </Badge>
          </div>
        )}

        {/* Table Content Wrapper */}
        <div className="table-content-wrapper">
          {/* Table Content */}
          <div className="inline-block min-w-full" style={{ width: `${tableWidth}px` }}>
            {/* Table Header */}
            <div className="sticky top-0 z-10 bg-background border-t border-b border-border">
              <div className="flex h-11" style={{ width: `${tableWidth}px` }}>
                {columns.map((column: any, colIndex: number) => (
                  <div
                    key={column.id || colIndex}
                    className={`px-3 text-sm font-normal text-muted-foreground flex-shrink-0 flex items-center h-11 relative group ${
                      (column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''
                    }`}
                    style={{ 
                      width: column.size ? `${column.size}px` : 'auto',
                      minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                      maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                    }}
                  >
                    {typeof column.header === 'function'
                      ? column.header({
                          column: {
                            getIsSorted: column.getIsSorted || (() => false),
                            toggleSorting: column.toggleSorting || (() => {}),
                            clearSorting: column.clearSorting || (() => {}),
                            getIsVisible: () => true,
                          },
                          table: {
                            getIsAllPageRowsSelected: () => Object.keys(rowSelection).length === data.length && data.length > 0,
                            getIsSomePageRowsSelected: () => Object.keys(rowSelection).length > 0 && Object.keys(rowSelection).length < data.length,
                            toggleAllPageRowsSelected: (value?: boolean) => {
                              if (value) {
                                const newSelection: Record<string, boolean> = {}
                                data.forEach((_, index) => {
                                  newSelection[index] = true
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
                    {enabledFeatures.columnResizing && colIndex < columns.length - 1 && (column.accessorKey || column.id) !== 'select' && onResizeStart && (
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

            {/* Table Body */}
            <div className="bg-background relative" data-table-body>
              {/* Show skeleton rows during initial loading to prevent layout shift */}
              {(isLoading && !hasLoadedOnce && data.length === 0) ? (
                <>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="flex h-11 border-b border-border animate-pulse">
                      {columns.map((column: any, colIndex: number) => (
                        <div
                          key={`skeleton-${index}-${column.id || colIndex}`}
                          className={`px-3 flex-shrink-0 flex items-center h-11 ${
                            (column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''
                          }`}
                          style={{ 
                            width: column.size ? `${column.size}px` : 'auto',
                            minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                            maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                          }}
                        >
                          {(column.accessorKey || column.id) === 'select' ? (
                            <div className="w-4 h-4 bg-muted rounded" />
                          ) : (
                            <div className="h-4 bg-muted rounded w-full max-w-[80%]" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : data.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-muted-foreground">No {entityType} found.</div>
                </div>
              ) : (
                <>
                  {data.map((item: T, index: number) => (
                    <ContextMenu key={item.id}>
                      <ContextMenuTrigger asChild>
                        <div className="flex hover:bg-muted/50 transition-colors group cursor-default h-11 border-b border-border">
                          {columns.map((column: any, colIndex: number) => (
                            <div
                              key={`${item.id}-${column.id || colIndex}`}
                              className={`px-3 text-sm flex-shrink-0 flex items-center h-11 ${
                                (column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''
                              }`}
                              style={{ 
                                width: column.size ? `${column.size}px` : 'auto',
                                minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                                maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                              }}
                                                      >
                                {column.cell && typeof column.cell === 'function'
                                  ? column.cell({
                                      row: {
                                        original: item,
                                        getValue: (key: string) => item[key],
                                        getIsSelected: () => rowSelection[index] || false,
                                        toggleSelected: (value?: boolean) => {
                                          setRowSelection(prev => ({
                                            ...prev,
                                            [index]: value !== undefined ? value : !prev[index]
                                          }))
                                        }
                                      }
                                    })
                                  : column.accessorKey ? item[column.accessorKey] : null}
                            </div>
                          ))}
                        </div>
                      </ContextMenuTrigger>
                      
                      {/* Context Menu */}
                      {enabledFeatures.contextMenu && (
                        <ContextMenuContent className="w-48">
                          {actions.onEdit && (
                            <ContextMenuItem onClick={() => actions.onEdit!(item)}>
                              <HugeiconsIcon icon={Edit03Icon} className="mr-1.5 h-4 w-4" />
                              Edit {entityType.slice(0, -1)}
                            </ContextMenuItem>
                          )}
                          {actions.customActions && (() => {
                            // Separate relationship actions from other actions
                            const relationshipActions: [string, (item: any) => void][] = []
                            const otherActions: [string, (item: any) => void][] = []
                            
                            Object.entries(actions.customActions).forEach(([label, action]) => {
                              if (label.startsWith('Change to ')) {
                                relationshipActions.push([label, action])
                              } else {
                                otherActions.push([label, action])
                              }
                            })
                            
                            return (
                              <>
                                {/* Regular custom actions */}
                                {otherActions.map(([label, action]) => {
                                  // Map action labels to appropriate icons
                                  const getActionIcon = (actionLabel: string) => {
                                    const lowerLabel = actionLabel.toLowerCase()
                                    if (lowerLabel.includes('view details')) return ViewIcon
                                    if (lowerLabel.includes('send invoice')) return MailSend02Icon
                                    if (lowerLabel.includes('view pdf')) return DocumentAttachmentIcon
                                    if (lowerLabel.includes('create invoice')) return DocumentAttachmentIcon
                                    if (lowerLabel.includes('new project')) return FolderAddIcon
                                    return DocumentAttachmentIcon // default
                                  }
                                  
                                  const ActionIcon = getActionIcon(label)
                                  
                                  return (
                                    <ContextMenuItem key={label} onClick={() => action(item)}>
                                      <HugeiconsIcon icon={ActionIcon} className="mr-1.5 h-4 w-4" />
                                      {label}
                                    </ContextMenuItem>
                                  )
                                })}
                                
                                {/* Relationship submenu */}
                                {relationshipActions.length > 0 && (
                                  <ContextMenuSub>
                                    <ContextMenuSubTrigger className="flex items-center">
                                      <HugeiconsIcon icon={UserTime01Icon} className="mr-1.5 h-4 w-4"  />
                                      Relationship
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent className="w-44">
                                      {relationshipActions.map(([label, action]) => {
                                        // Get relationship type from label (e.g., "Change to Recurring" -> "recurring")
                                        const relationshipType = label.replace('Change to ', '').toLowerCase()
                                        
                                        // Map relationship types to match clientRelationshipConfig
                                        const getRelationshipConfig = (type: string) => {
                                          switch (type) {
                                            case 'recurring': 
                                              return { icon: UserTime01Icon, label: 'Recurring', className: 'text-blue-500' }
                                            case 'one time': 
                                              return { icon: ZapIcon, label: 'One Time', className: 'text-orange-500' }
                                            case 'regular': 
                                              return { icon: ClockIcon, label: 'Regular', className: 'text-green-500' }
                                            default: 
                                              return { icon: ClockIcon, label: 'Regular', className: 'text-green-500' }
                                          }
                                        }
                                        
                                        const config = getRelationshipConfig(relationshipType)
                                        const RelationshipIcon = config.icon
                                        
                                        return (
                                          <ContextMenuItem key={label} onClick={() => action(item)}>
                                            <HugeiconsIcon icon={RelationshipIcon} className={`mr-1.5 h-3 w-3 ${config.className}`} />
                                            {config.label}
                                          </ContextMenuItem>
                                        )
                                      })}
                                    </ContextMenuSubContent>
                                  </ContextMenuSub>
                                )}
                              </>
                            )
                          })()}
                          {(actions.onEdit || actions.customActions) && actions.onDelete && (
                            <ContextMenuSeparator />
                          )}
                          {actions.onDelete && (
                            <ContextMenuItem
                              onClick={() => actions.onDelete!(item)}
                              className="text-destructive focus:text-destructive"
                            >
                              <HugeiconsIcon icon={Delete01Icon} className="mr-1.5 h-4 w-4"  />
                              Delete {entityType.slice(0, -1)}
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      )}
                    </ContextMenu>
                  ))}
                  
                  {/* Infinite Scroll Indicators */}
                  {enabledFeatures.infiniteScroll && (
                    <>
                      
                      {/* All loaded indicator - positioned relative to table end */}
                      {!hasNextPage && data.length > 0 && !isFetchingNextPage && (
                        <div className="h-12 relative">
                          <div className="absolute z-10" style={BADGE_POSITION}>
                            <Badge 
                              variant="outline" 
                              className="flex items-center gap-1 text-xs bg-background/80 backdrop-blur-sm border-border/50"
                            >
                              <HugeiconsIcon icon={Tick02Icon} className="w-2 h-2"  />
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
                </>
              )}
            </div>

            {/* Table Footer */}
            {enabledFeatures.footerAggregations && metrics && (
              <div className="sticky-footer bg-background border-t border-b border-border h-11">
                <div className="flex h-full" style={{ width: `${tableWidth}px` }}>
                  {columns.map((column: any, colIndex: number) => (
                    <div
                      key={`footer-${column.id || colIndex}`}
                      className={`px-3 text-sm flex-shrink-0 flex items-center h-11 ${
                        (column.accessorKey || column.id) !== 'select' ? 'border-r border-border' : ''
                      }`}
                      style={{ 
                        width: column.size ? `${column.size}px` : 'auto',
                        minWidth: column.minSize ? `${column.minSize}px` : 'auto',
                        maxWidth: column.maxSize ? `${column.maxSize}px` : 'auto'
                      }}
                    >
                      {column.footer && typeof column.footer === 'function' 
                        ? column.footer({ 
                            table: { 
                              aggregations: metrics, 
                              metrics,
                              getFilteredRowModel: () => ({ rows: data.map(item => ({ original: item })) })
                            } 
                          }) 
                        : null
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer to ensure footer has proper positioning space */}
            {enabledFeatures.footerAggregations && metrics && (
              <div style={{ height: '1px', minHeight: '1px' }} />
            )}
          </div>
        </div>

      </div>

      {/* Loading and completion indicators */}
      {enabledFeatures.infiniteScroll && isFetchingNextPage && (
        <div
          className="fixed z-50 pointer-events-none"
          style={LOADER_POSITION}
        >
          <Badge 
            variant="secondary" 
            className="flex items-center gap-2 text-xs shadow-lg border bg-background/95"
          >
            <Loader size="xs" variant="default" />
            <span>Loading more {entityType}...</span>
          </Badge>
        </div>
      )}
    </div>
  )
}

export const GenericDataTable = React.memo(GenericDataTableComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.data === nextProps.data &&
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
}) as <T extends GenericEntity>(props: GenericTableProps<T>) => React.ReactElement 