"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  ChevronDown, 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  GripVertical, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  ArrowUpDown,
  Activity,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Types
export interface EnhancedProject {
  id: string
  name: string
  status: string
  start_date: string | null
  due_date: string | null
  budget: number | null
  expenses: number | null
  received: number | null
  pending: number | null
  created_at: string
  updated_at: string
  clients?: {
    id: string
    name: string
    company?: string
    avatar_url?: string
  } | null
}

export interface EnhancedColumn {
  id: string
  label: string
  width: number
  visible: boolean
  aggregation?: 'sum' | 'average' | 'count' | null
  format?: 'currency' | 'date' | 'status' | null
  sortable?: boolean
}

export interface TableActions {
  onStatusChange: (project: EnhancedProject, newStatus: string) => void
  onEditProject: (project: EnhancedProject) => void
  onDeleteProject: (project: EnhancedProject) => void
}

// Default columns configuration
const defaultColumns: EnhancedColumn[] = [
  { id: 'name', label: 'Project Name', width: 280, visible: true, aggregation: 'count', sortable: true },
  { id: 'clients', label: 'Client', width: 200, visible: true, aggregation: 'count', sortable: true },
  { id: 'status', label: 'Status', width: 140, visible: true, aggregation: 'count', format: 'status', sortable: true },
  { id: 'project_type', label: 'Type', width: 120, visible: true, aggregation: 'count', format: 'project_type', sortable: true },
  { id: 'total_budget', label: 'Budget', width: 140, visible: true, aggregation: 'sum', format: 'currency', sortable: true },
  { id: 'expenses', label: 'Expenses', width: 140, visible: true, aggregation: 'sum', format: 'currency', sortable: true },
  { id: 'received', label: 'Received', width: 140, visible: true, aggregation: 'sum', format: 'currency', sortable: true },
  { id: 'pending', label: 'Pending', width: 140, visible: true, aggregation: 'sum', format: 'currency', sortable: true },
  { id: 'recurring_amount', label: 'Recurring Amount', width: 160, visible: false, aggregation: 'sum', format: 'currency', sortable: true },
  { id: 'hourly_rate_new', label: 'Hourly Rate', width: 120, visible: false, aggregation: 'avg', format: 'currency', sortable: true },
  { id: 'actual_hours', label: 'Actual Hours', width: 120, visible: false, aggregation: 'sum', format: 'number', sortable: true },
  { id: 'start_date', label: 'Start Date', width: 140, visible: true, format: 'date', sortable: true },
  { id: 'due_date', label: 'Due Date', width: 140, visible: true, format: 'date', sortable: true },
]

// Status configuration with flat colors
const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800 ring-emerald-700/20', dot: 'bg-emerald-700' },
  pipeline: { label: 'Pipeline', color: 'bg-sky-100 text-sky-800 ring-sky-700/20', dot: 'bg-sky-700' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-800 ring-slate-700/20', dot: 'bg-slate-700' },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-800 ring-amber-700/20', dot: 'bg-amber-700' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800 ring-rose-700/20', dot: 'bg-rose-700' },
} as const

// Project type configuration with flat colors
const PROJECT_TYPE_CONFIG = {
  fixed: { label: 'Fixed', color: 'bg-emerald-100 text-emerald-800 ring-emerald-700/20' },
  recurring: { label: 'Recurring', color: 'bg-sky-100 text-sky-800 ring-sky-700/20' },
  hourly: { label: 'Hourly', color: 'bg-violet-100 text-violet-800 ring-violet-700/20' },
} as const

// Custom hook for infinite scroll with intersection observer
const useInfiniteScroll = (callback: () => void, hasMore: boolean) => {
  const observer = useRef<IntersectionObserver>()
  
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore) {
        callback()
      }
    })
    if (node) observer.current.observe(node)
  }, [callback, hasMore])
  
  return lastElementRef
}

// Enhanced loading component
function LoadingState({ 
  isLoading, 
  isFetching, 
  isFetchingNextPage, 
  hasMore 
}: {
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasMore: boolean
}) {
  if (isFetchingNextPage && hasMore) {
    return (
      <motion.div 
        className="flex justify-center items-center py-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Loading more projects...</span>
        </div>
      </motion.div>
    )
  }

  if (isFetching && !isFetchingNextPage) {
    return (
      <motion.div 
        className="flex justify-center items-center py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Refreshing data...</span>
        </div>
      </motion.div>
    )
  }

  return null
}

// Enhanced cell renderers
function ProjectNameCell({ project }: { project: EnhancedProject }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate" title={project.name}>
          {project.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          ID: {project.id.slice(-8)}
        </p>
      </div>
    </div>
  )
}

function ClientCell({ client }: { client: EnhancedProject['clients'] }) {
  if (!client) {
    return <span className="text-muted-foreground text-sm">No client</span>
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
        {client.name?.charAt(0)?.toUpperCase() || 'C'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate" title={client.name}>
          {client.name}
        </p>
        {client.company && (
          <p className="text-xs text-muted-foreground truncate" title={client.company}>
            {client.company}
          </p>
        )}
      </div>
    </div>
  )
}

function ProjectTypeCell({ projectType }: { projectType: 'fixed' | 'recurring' | 'hourly' }) {
  const config = PROJECT_TYPE_CONFIG[projectType] || PROJECT_TYPE_CONFIG.fixed
  
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.color}`}>
      {config.label}
    </span>
  )
}

function StatusCell({ 
  status, 
  project, 
  onStatusChange 
}: { 
  status: string
  project: EnhancedProject
  onStatusChange: (project: EnhancedProject, newStatus: string) => void
}) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pipeline

  return (
    <button
      onClick={() => {
        // Simple status rotation for demo
        const statuses = ['active', 'pipeline', 'completed', 'on_hold', 'cancelled']
        const currentIndex = statuses.indexOf(status)
        const nextStatus = statuses[(currentIndex + 1) % statuses.length]
        onStatusChange(project, nextStatus)
      }}
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ring-1 transition-all hover:shadow-sm",
        config.color
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)} />
      {config.label}
    </button>
  )
}

function CurrencyCell({ 
  amount, 
  className,
  columnId 
}: { 
  amount: number | null
  className?: string
  columnId: string
}) {
  const getColorClass = () => {
    if (columnId === 'received') return 'text-green-600'
    if (columnId === 'expenses') return 'text-red-600'
    if (columnId === 'pending' && (amount || 0) > 0) return 'text-orange-600'
    if (columnId === 'budget') return 'text-blue-600'
    return 'text-gray-900'
  }

  return (
    <span className={cn("font-medium tabular-nums text-sm", getColorClass(), className)}>
      {amount ? formatCurrency(amount) : '—'}
    </span>
  )
}

function DateCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>

  const formatted = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  })

  return (
    <span className="text-sm text-gray-600" title={new Date(date).toLocaleDateString()}>
      {formatted}
    </span>
  )
}

// Main Enhanced Data Table Component
export function EnhancedDataTable({
  projects,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  loadMore,
  totalCount,
  actions,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  projects: EnhancedProject[]
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  loadMore: () => void
  totalCount: number
  actions: TableActions
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
}) {
  // Add global styles for dragging
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .dragging-column * {
        cursor: grabbing !important;
      }
      .dragging-column {
        user-select: none;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .column-reorder {
        animation: slideIn 0.3s ease-out;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // State management
  const [columns, setColumns] = useState<EnhancedColumn[]>(defaultColumns)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'left' | 'right'>('left')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const tableRef = useRef<HTMLDivElement>(null)

  // Monitor container width changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width)
      }
    })
    
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Calculate aggregations for footer
  const aggregations = useMemo(() => {
    const visibleColumns = columns.filter(col => col.visible)
    return visibleColumns.reduce((acc, col) => {
      if (!col.aggregation) return acc
      
      switch (col.aggregation) {
        case 'sum':
          if (col.id === 'pending') {
            // Calculate pending as total_budget - received
            acc[col.id] = projects.reduce((sum, proj) => {
              const budget = proj.total_budget || 0
              const received = proj.payment_received || 0
              return sum + Math.max(0, budget - received)
            }, 0)
          } else {
            acc[col.id] = projects.reduce((sum, proj) => sum + (proj[col.id as keyof EnhancedProject] as number || 0), 0)
          }
          break
        case 'average':
          if (col.id === 'pending') {
            const totalPending = projects.reduce((sum, proj) => {
              const budget = proj.total_budget || 0
              const received = proj.payment_received || 0
              return sum + Math.max(0, budget - received)
            }, 0)
            acc[col.id] = totalPending / projects.length
          } else {
            acc[col.id] = projects.reduce((sum, proj) => sum + (proj[col.id as keyof EnhancedProject] as number || 0), 0) / projects.length
          }
          break
        case 'count':
          if (col.id === 'clients') {
            acc[col.id] = projects.filter(p => p.clients).length
          } else {
            acc[col.id] = projects.length
          }
          break
      }
      return acc
    }, {} as Record<string, number>)
  }, [projects, columns])

  // Calculate table width and adjust column widths if needed
  const { tableWidth, adjustedColumns } = useMemo(() => {
    const visibleCols = columns.filter(col => col.visible)
    const totalWidth = visibleCols.reduce((sum, col) => sum + col.width, 0)
    
    // If table is smaller than container, stretch columns proportionally
    if (totalWidth < containerWidth && containerWidth > 0) {
      const scaleFactor = containerWidth / totalWidth
      const adjusted = visibleCols.map(col => ({
        ...col,
        width: Math.floor(col.width * scaleFactor)
      }))
      return { tableWidth: containerWidth, adjustedColumns: adjusted }
    }
    
    return { tableWidth: totalWidth, adjustedColumns: visibleCols }
  }, [columns, containerWidth])

  const visibleColumns = adjustedColumns

  // Column drag and drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    document.body.classList.add('dragging-column')
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
    setDropPosition('left')
    document.body.classList.remove('dragging-column')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    setDropPosition(x > width / 2 ? 'right' : 'left')
  }

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }

  const handleDragLeave = () => {
    setTimeout(() => {
      setDragOverColumn(null)
      setDropPosition('left')
    }, 50)
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumnId) return
    
    const newColumns = [...columns]
    const draggedIndex = newColumns.findIndex(col => col.id === draggedColumn)
    const targetIndex = newColumns.findIndex(col => col.id === targetColumnId)
    
    const [removed] = newColumns.splice(draggedIndex, 1)
    
    let insertIndex = targetIndex
    if (dropPosition === 'right') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    }
    
    newColumns.splice(insertIndex, 0, removed)
    
    setColumns(newColumns)
    setDraggedColumn(null)
    setDragOverColumn(null)
    setDropPosition('left')
    document.body.classList.remove('dragging-column')
  }

  // Column visibility toggle
  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ))
  }

  // Format aggregation values
  const formatAggregation = (value: number, column: EnhancedColumn) => {
    if (column.format === 'currency') {
      return formatCurrency(value)
    }
    return Math.round(value).toLocaleString()
  }

  // Infinite scroll
  const lastElementRef = useInfiniteScroll(loadMore, hasNextPage)

  // Unique status options
  const statusOptions = ['all', 'active', 'pipeline', 'completed', 'on_hold', 'cancelled']

  return (
    <div className="w-full h-full flex flex-col bg-gray-50/50">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search with instant feedback */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects and clients..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-80 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {projects.length} results
                </Badge>
              )}
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:border-gray-300"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, 
                backgroundPosition: 'right 0.5rem center', 
                backgroundRepeat: 'no-repeat', 
                backgroundSize: '1.5em 1.5em', 
                paddingRight: '2.5rem' 
              }}
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Data freshness indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{totalCount.toLocaleString()} projects</span>
              {isFetching && !isFetchingNextPage && (
                <Badge variant="outline" className="text-xs">
                  Refreshing
                </Badge>
              )}
            </div>

            {/* Column Settings */}
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all group"
                title="Customize columns"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              
              {showColumnSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-30">
                  <h3 className="font-medium text-gray-900 mb-3">Visible Columns</h3>
                  <div className="space-y-1">
                    {columns.map(col => (
                      <label key={col.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumnVisibility(col.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div ref={tableRef} className="flex-1 overflow-auto relative">
        <div className="min-w-full inline-block align-middle" style={{ minWidth: `${tableWidth}px` }}>
          {/* Fixed Table Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200/80">
            <div className="flex">
              {visibleColumns.map((col) => {
                const isDragging = draggedColumn === col.id
                const isDragOver = dragOverColumn === col.id
                const showDropIndicator = isDragOver && draggedColumn && draggedColumn !== col.id
                
                return (
                  <div
                    key={col.id}
                    className={cn(
                      "relative group flex-shrink-0 transition-all duration-200",
                      isDragging && "opacity-40 scale-95"
                    )}
                    style={{ width: `${col.width}px` }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {/* Drop indicator */}
                    {showDropIndicator && (
                      <div className={cn(
                        "absolute top-0 bottom-0 w-1 bg-blue-500 z-20 transition-all duration-150",
                        dropPosition === 'left' ? '-left-0.5' : '-right-0.5'
                      )}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-6 py-4 font-medium text-gray-700 text-sm flex items-center gap-2 select-none transition-all duration-200",
                      draggedColumn && !isDragging ? "cursor-grabbing" : "cursor-grab group-hover:bg-gray-50"
                    )}>
                      <GripVertical className={cn(
                        "w-3 h-3 transition-all duration-200",
                        isDragging ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-40"
                      )} />
                      <span className="flex-1">{col.label}</span>
                      {col.sortable && (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Table Body */}
          <div className="bg-white">
            <AnimatePresence mode="popLayout">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  ref={index === projects.length - 1 ? lastElementRef : null}
                  className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, delay: index * 0.005 }}
                  layout
                >
                  {visibleColumns.map(col => {
                    const isDragOver = dragOverColumn === col.id
                    const showDropIndicator = isDragOver && draggedColumn && draggedColumn !== col.id
                    
                    return (
                      <div
                        key={col.id}
                        className="px-6 py-4 text-sm flex-shrink-0 relative"
                        style={{ width: `${col.width}px` }}
                      >
                        {/* Drop indicator for body cells */}
                        {showDropIndicator && (
                          <div className={cn(
                            "absolute top-0 bottom-0 w-0.5 bg-blue-500/50 z-10",
                            dropPosition === 'left' ? 'left-0' : 'right-0'
                          )} />
                        )}
                        
                        {/* Cell content */}
                        {col.id === 'name' && <ProjectNameCell project={project} />}
                        {col.id === 'clients' && <ClientCell client={project.clients} />}
                        {col.id === 'status' && (
                          <StatusCell 
                            status={project.status} 
                            project={project} 
                            onStatusChange={actions.onStatusChange} 
                          />
                        )}
                        {col.id === 'project_type' && (
                          <ProjectTypeCell projectType={project.project_type || 'fixed'} />
                        )}
                        {(col.id === 'start_date' || col.id === 'due_date') && (
                          <DateCell date={project[col.id]} />
                        )}
                        {col.format === 'currency' && (
                          <CurrencyCell 
                            amount={project[col.id as keyof EnhancedProject] as number} 
                            columnId={col.id}
                          />
                        )}
                      </div>
                    )
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading State */}
            <LoadingState
              isLoading={isLoading}
              isFetching={isFetching}
              isFetchingNextPage={isFetchingNextPage}
              hasMore={hasNextPage}
            />

            {/* End of data indicator */}
            {!hasNextPage && projects.length > 0 && (
              <motion.div 
                className="text-center py-8 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-px bg-gray-200" />
                  <span>🎉 All {totalCount.toLocaleString()} projects loaded</span>
                  <div className="w-12 h-px bg-gray-200" />
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Fixed Footer with Aggregations */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200/80">
            <div className="flex">
              {visibleColumns.map(col => {
                const isDragOver = dragOverColumn === col.id
                const showDropIndicator = isDragOver && draggedColumn && draggedColumn !== col.id
                
                return (
                  <div
                    key={col.id}
                    className="px-6 py-4 flex-shrink-0 relative bg-gray-50/50"
                    style={{ width: `${col.width}px` }}
                  >
                    {/* Drop indicator for footer cells */}
                    {showDropIndicator && (
                      <div className={cn(
                        "absolute top-0 bottom-0 w-0.5 bg-blue-500/50 z-10",
                        dropPosition === 'left' ? 'left-0' : 'right-0'
                      )} />
                    )}
                    
                    {col.aggregation && aggregations[col.id] !== undefined && (
                      <div className="text-sm">
                        {col.aggregation === 'count' && (
                          <span className="text-gray-500">
                            Total: <span className="font-medium text-gray-900">{aggregations[col.id]}</span>
                          </span>
                        )}
                        {col.aggregation === 'sum' && (
                          <span className="text-gray-500">
                            Total: <span className="font-medium text-gray-900">{formatAggregation(aggregations[col.id], col)}</span>
                          </span>
                        )}
                        {col.aggregation === 'average' && (
                          <span className="text-gray-500">
                            Avg: <span className="font-medium text-gray-900">{formatAggregation(aggregations[col.id], col)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 