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
import { PageHeader } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { createColumns } from "@/components/projects/columns"
import { formatCurrency, getDefaultCurrency } from "@/lib/currency"
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

// Import the existing FinalDataTable component
import { FinalDataTable } from "./FinalDataTable"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"

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

interface ProjectsTableWrapperProps {
  pageTitle: string
  defaultFilters?: {
    status?: string[]
    client?: string[]
    timePeriod?: string
  }
  showSummaryCards?: boolean
  showStatusFilter?: boolean
  lockedFilters?: {
    status?: boolean
    client?: boolean
    timePeriod?: boolean
  }
}

export function ProjectsTableWrapper({
  pageTitle,
  defaultFilters = {},
  showSummaryCards = true,
  showStatusFilter = true,
  lockedFilters = {},
}: ProjectsTableWrapperProps) {
  // Apply default filters to the filter hook
  const { filters, updateFilter } = useProjectFiltersV2()
  
  // Initialize filters on mount
  React.useEffect(() => {
    if (defaultFilters.status && !lockedFilters.status) {
      updateFilter('status', defaultFilters.status as ("active" | "pipeline" | "completed" | "on_hold" | "cancelled")[])
    }
    if (defaultFilters.client && !lockedFilters.client) {
      updateFilter('client', defaultFilters.client)
    }
    if (defaultFilters.timePeriod && !lockedFilters.timePeriod) {
      updateFilter('timePeriod', defaultFilters.timePeriod as any)
    }
  }, []) // Only run on mount

  // Override filters if locked
  const enhancedFilters = React.useMemo(() => ({
    ...filters,
    ...(lockedFilters.status && defaultFilters.status ? { status: defaultFilters.status } : {}),
    ...(lockedFilters.client && defaultFilters.client ? { client: defaultFilters.client } : {}),
    ...(lockedFilters.timePeriod && defaultFilters.timePeriod ? { timePeriod: defaultFilters.timePeriod } : {}),
  }), [filters, defaultFilters, lockedFilters])

  // All the existing logic from FinalProjectsContent
  const [sortBy, setSortBy] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)

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
  const finalFilters = React.useMemo(() => ({
    ...enhancedFilters,
    sortBy: sortBy || undefined,
    sortOrder: sortDirection || undefined
  }), [enhancedFilters, sortBy, sortDirection])
  
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
  } = useInfiniteProjects(finalFilters)

  // Client state management
  const [clients, setClients] = React.useState<Client[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<any>(null)
  const [tableInstance, setTableInstance] = React.useState<any>(null)
  
  // Additional state for form handling
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

  // Table preferences
  const { getTablePreference, updateTablePreference, isLoading: preferencesLoading } = useTablePreferences()
  const TABLE_NAME = `projects-table-${pageTitle.toLowerCase().replace(/\s+/g, '-')}`
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Column state
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({})
  const [isResizing, setIsResizing] = React.useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = React.useState(0)
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0)
  const [resizeTooltip, setResizeTooltip] = React.useState<{ x: number; y: number; width: number } | null>(null)

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

  // Load preferences
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

  // All the handler functions from the original implementation
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setNewProject({ ...newProject, client_id: clientId })
    setClientDropdownOpen(false)
    setClientSearchQuery("")
  }

  const handleSaveProject = async () => {
    if (!newProject.name) {
      toast.error("Project name is required")
      return
    }
    
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

  // Create all the column actions
  const allColumns = React.useMemo(() => {
    const columns = createColumns({
      onEditProject: handleEditProject,
      onCreateInvoice: (project: any) => {
        toast.info(`Creating invoice for ${project.name}`, {
          description: "This feature will be available soon"
        })
      },
      onDeleteProject: async (project: any) => {
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

    // Apply dynamic widths
    return columns.map((column: any) => {
      const columnKey = column.accessorKey || column.id
      const defaultWidth = columnKey === 'select' ? COLUMN_WIDTHS.select : 
                          COLUMN_WIDTHS[columnKey as keyof typeof COLUMN_WIDTHS] || 150
      
      if (columnKey === 'select') {
        return {
          ...column,
          size: 36,
          minSize: 36,
          maxSize: 36,
        }
      }
      
      const currentWidth = columnWidths[columnKey] || defaultWidth
      return {
        ...column,
        size: currentWidth,
        minSize: 80,
        maxSize: 500,
      }
    })
  }, [updateStatus, refetch, forceRefresh, columnWidths, clients])

  // Initialize column order and visibility
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

    const columnMap = new Map(allColumns.map(col => [col.id || col.accessorKey, col]))
    const orderedColumns = columnOrder
      .map(colId => columnMap.get(colId))
      .filter(Boolean)
      .filter(col => columnVisibility[col.id || col.accessorKey] !== false)
    
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns.filter(col => !orderedIds.has(col.id || col.accessorKey))
    
    return [...orderedColumns, ...newColumns]
  }, [allColumns, columnOrder, columnVisibility])

  // All the handler functions
  function handleAddProject() {
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

  function handleEditProject(project: any) {
    setSelectedProject(project)
    
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
    
    if (project.clients) {
      const client = clients.find(c => c.id === project.clients.id)
      setSelectedClient(client || null)
    } else {
      setSelectedClient(null)
    }
    
    setIsEditDialogOpen(true)
  }
  
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

  const handleExport = () => {
    console.log('Export projects')
  }

  // Column metadata for view filter
  const columnMetadata = React.useMemo(() => {
    if (columnOrder.length === 0) {
      return allColumns.map(col => ({
        id: col.id || col.accessorKey,
        accessorKey: col.accessorKey,
        header: col.header,
        visible: columnVisibility[col.id || col.accessorKey] !== false,
        canHide: col.accessorKey !== 'select'
      }))
    }
    
    const columnMap = new Map(allColumns.map(col => [col.id || col.accessorKey, col]))
    const orderedColumns = columnOrder
      .map(colId => columnMap.get(colId))
      .filter(Boolean)
    
    const orderedIds = new Set(columnOrder)
    const newColumns = allColumns.filter(col => !orderedIds.has(col.id || col.accessorKey))
    
    return [...orderedColumns, ...newColumns].map(col => ({
      id: col.id || col.accessorKey,
      accessorKey: col.accessorKey,
      header: col.header,
      visible: columnVisibility[col.id || col.accessorKey] !== false,
      canHide: col.accessorKey !== 'select'
    }))
  }, [allColumns, columnOrder, columnVisibility])

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

  const handleColumnVisibilityChange = React.useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible
    }))
  }, [])

  const handleResizeStart = React.useCallback((columnId: string, startX: number, event: React.MouseEvent) => {
    if (columnId === 'select') return
    
    const currentWidth = columnWidths[columnId] || COLUMN_WIDTHS[columnId as keyof typeof COLUMN_WIDTHS] || 150
    setIsResizing(columnId)
    setResizeStartX(startX)
    setResizeStartWidth(currentWidth)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    // Show resize tooltip - position above the mouse cursor
    setResizeTooltip({
      x: startX,
      y: event.clientY - 30, // Position 30px above the cursor
      width: currentWidth
    })
  }, [columnWidths])

  const handleResizeMove = React.useCallback((clientX: number, clientY: number) => {
    if (!isResizing) return
    
    const deltaX = clientX - resizeStartX
    const newWidth = Math.max(80, resizeStartWidth + deltaX)
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }))
    
    // Update tooltip position and width
    setResizeTooltip({
      x: clientX,
      y: clientY - 30, // Keep it 30px above cursor
      width: Math.round(newWidth)
    })
  }, [isResizing, resizeStartX, resizeStartWidth])

  const handleResizeEnd = React.useCallback(() => {
    setIsResizing(null)
    setResizeStartX(0)
    setResizeStartWidth(0)
    setResizeTooltip(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e.clientX, e.clientY)
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

  // Save preferences
  const debouncedSaveWidths = React.useMemo(
    () => debounce((widths: Record<string, number>) => {
      if (preferencesLoaded && Object.keys(widths).length > 0) {
        updateTablePreference(TABLE_NAME, "column_widths", widths)
      }
    }, 200),
    [updateTablePreference, TABLE_NAME, preferencesLoaded]
  )

  React.useEffect(() => {
    if (preferencesLoaded && Object.keys(columnWidths).length > 0) {
      debouncedSaveWidths(columnWidths)
    }
  }, [columnWidths, debouncedSaveWidths, preferencesLoaded])

  React.useEffect(() => {
    if (preferencesLoaded && columnOrder.length > 0) {
      updateTablePreference(TABLE_NAME, "column_order", columnOrder)
    }
  }, [columnOrder, updateTablePreference, TABLE_NAME, preferencesLoaded])

  React.useEffect(() => {
    if (preferencesLoaded && Object.keys(columnVisibility).length > 0) {
      updateTablePreference(TABLE_NAME, "column_visibility", columnVisibility)
    }
  }, [columnVisibility, updateTablePreference, TABLE_NAME, preferencesLoaded])

  React.useEffect(() => {
    if (preferencesLoaded && (sortBy || sortDirection)) {
      updateTablePreference(TABLE_NAME, "sorting", { sortBy, sortDirection })
    }
  }, [sortBy, sortDirection, updateTablePreference, TABLE_NAME, preferencesLoaded])

  // Summary metrics
  const summaryMetrics = React.useMemo(() => ({
    totalProjects: totalCount || 0,
    activeProjects: metrics?.activeProjects || 0,
    totalReceived: metrics?.totalReceived || 0,
    totalPending: metrics?.totalPending || 0,
  }), [metrics, totalCount])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  )

  const displayedClients = filteredClients.slice(0, displayedClientsCount)

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
      {/* Resize Tooltip */}
      <AnimatePresence>
        {resizeTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none"
            style={{
              left: resizeTooltip.x - 20,
              top: resizeTooltip.y,
            }}
          >
            {resizeTooltip.width}px
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Fixed Header */}
      <PageHeader
        title={pageTitle}
        action={<PageActionsMenu entityType="projects" onExport={handleExport} />}
      />
      
      {/* Fixed Summary Cards and Filters */}
      <div className="flex-shrink-0 sticky top-16 z-10">
        {/* Summary Cards */}
        {showSummaryCards && (
          <>
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
            <div className="border-b border-gray-200"></div>
          </>
        )}

        {/* Filters and Actions */}
        <div className="p-6">
          <ProjectFiltersV2 
            clients={clients}
            showStatusFilter={showStatusFilter && !lockedFilters.status}
            className=""
            onAddProject={handleAddProject}
            table={tableInstance}
            columns={columnMetadata}
            onColumnReorder={handleColumnReorder}
            onColumnVisibilityChange={handleColumnVisibilityChange}
          />
        </div>
      </div>

      {/* Full Height Table Container */}
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