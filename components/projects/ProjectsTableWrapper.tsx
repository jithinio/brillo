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
import { EnhancedAddProjectDialog } from "./EnhancedAddProjectDialog"

import { useInfiniteProjects } from "@/hooks/use-infinite-projects"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { useTablePreferencesEnterprise } from "@/hooks/use-table-preferences-enterprise"
import { PageHeader } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { createColumns } from "@/components/projects/columns"
import { formatCurrency, getDefaultCurrency } from "@/lib/currency"
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

// Import the existing FinalDataTable component
import { FinalDataTable } from "./FinalDataTable"
import { TableErrorBoundary } from "./ErrorBoundary"
import { formatCurrencyAbbreviated } from "@/lib/currency-utils"
import { useCanPerformAction } from "@/components/over-limit-alert"
import { useSubscription } from "@/components/providers/subscription-provider"
import { formatDateForDatabase } from "@/lib/date-format"

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
  pipeline_notes: string
}

// Fixed column widths to prevent layout shift
const COLUMN_WIDTHS = {
  select: 36,
  name: 280,      
  client: 200,    
  status: 140,    
  project_type: 120,  // After status
  start_date: 140,
  total_budget: 110,  // Before expenses
  budget: 110,    
  expenses: 110,  
  received: 110,  
  pending: 110,   
  due_date: 140,
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
  defaultStatus?: string
}

export function ProjectsTableWrapper({
  pageTitle,
  defaultFilters = {},
  showSummaryCards = true,
  showStatusFilter = true,
  lockedFilters = {},
  defaultStatus = "active",
}: ProjectsTableWrapperProps) {
  // Apply default filters to the filter hook
  const { filters, updateFilter } = useProjectFiltersV2()
  
  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()
  
  // Subscription management for refreshing usage after creation/deletion
  const { refetchSubscription } = useSubscription()
  
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
    pipeline_notes: "",
  })

  // Recently received amount (temporary field, not stored in database)
  const [recentlyReceived, setRecentlyReceived] = React.useState<string>("")

  // Function to handle adding recently received amount to current received
  const handleAddRecentlyReceived = React.useCallback(() => {
    if (recentlyReceived && !isNaN(parseFloat(recentlyReceived))) {
      const currentReceived = parseFloat(newProject.received) || 0
      const recentAmount = parseFloat(recentlyReceived)
      const newTotalReceived = currentReceived + recentAmount
      
      setNewProject({ ...newProject, received: newTotalReceived.toString() })
      setRecentlyReceived("") // Clear the recently received field
    }
  }, [newProject, recentlyReceived])

  // Enterprise table preferences with batching and debouncing
  const { 
    getTablePreference, 
    updateTablePreference, 
    updateMultipleTablePreferences,
    forceImmediateSave,
    isLoading: preferencesLoading,
    isSaving: preferencesSaving,
    saveMetrics,
    hasPendingUpdates
  } = useTablePreferencesEnterprise()
  const TABLE_NAME = `projects-table-${pageTitle.toLowerCase().replace(/\s+/g, '-')}`
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)

  // Column state
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({})
  const columnWidthsRef = React.useRef<Record<string, number>>({})
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

  // Track if preferences have been initialized to prevent re-runs (fixes tab focus issue)
  const preferencesInitializedRef = React.useRef(false)

  // Load preferences with inheritance from main projects page (only once)
  React.useEffect(() => {
    if (!preferencesLoading && !preferencesLoaded && !preferencesInitializedRef.current) {
      preferencesInitializedRef.current = true
      
      // Define parent table name (main projects page)
      const PARENT_TABLE_NAME = "projects-table-all-projects"
      const isMainPage = TABLE_NAME === PARENT_TABLE_NAME
      
      // Load saved preferences for current page
      let savedWidths = getTablePreference(TABLE_NAME, "column_widths", {})
      let savedOrder = getTablePreference(TABLE_NAME, "column_order", [])
      let savedVisibility = getTablePreference(TABLE_NAME, "column_visibility", {})
      const savedSort = getTablePreference(TABLE_NAME, "sorting", {})
      const lastInheritedFrom = getTablePreference(TABLE_NAME, "last_inherited_from", null)
      
      // If this is a sub-page, check if we should inherit from parent
      if (!isMainPage) {
        // Get parent preferences and their update time
        const parentWidths = getTablePreference(PARENT_TABLE_NAME, "column_widths", {})
        const parentOrder = getTablePreference(PARENT_TABLE_NAME, "column_order", [])
        const parentVisibility = getTablePreference(PARENT_TABLE_NAME, "column_visibility", {})
        const parentLastUpdated = getTablePreference(PARENT_TABLE_NAME, "last_updated", 0)
        
        // Check if we have any saved preferences for this page
        const hasOwnWidths = Object.keys(savedWidths).length > 0
        const hasOwnOrder = savedOrder.length > 0
        const hasOwnVisibility = Object.keys(savedVisibility).length > 0
        
        // Determine if we should inherit from parent
        const shouldInheritFromParent = !hasOwnWidths && !hasOwnOrder && !hasOwnVisibility || 
          (lastInheritedFrom && parentLastUpdated > lastInheritedFrom)
        
        if (shouldInheritFromParent) {
          // Inherit all preferences from parent
          if (Object.keys(parentWidths).length > 0) {
            savedWidths = parentWidths
          }
          if (parentOrder.length > 0) {
            savedOrder = parentOrder
          }
          if (Object.keys(parentVisibility).length > 0) {
            savedVisibility = parentVisibility
          }
          
          // Mark that we've inherited from parent at this time (silently, no batching)
          if (parentLastUpdated > 0) {
            updateTablePreference(TABLE_NAME, "last_inherited_from", parentLastUpdated)
          }
        }
      }

      // Apply the preferences (either own or inherited)
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
  }, [preferencesLoading, preferencesLoaded, TABLE_NAME]) // Removed function dependencies to prevent tab focus re-runs

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
          // Prepare update data
          const updateData: any = {
            name: newProject.name,
            status: newProject.status,
            start_date: formatDateForDatabase(newProject.start_date),
            due_date: formatDateForDatabase(newProject.due_date),
            budget: budget || null,
            expenses: expenses,
            payment_received: received,
            payment_pending: pending,
            description: newProject.description || null,
            pipeline_notes: newProject.pipeline_notes || null,
            client_id: newProject.client_id || null,
          }
          
          // Handle pipeline status change
          if (newProject.status === 'pipeline') {
            updateData.pipeline_stage = 'lead'
            updateData.deal_probability = 10
          } else {
            updateData.pipeline_stage = null
            updateData.deal_probability = null
          }

          const { data, error } = await supabase
            .from('projects')
            .update(updateData)
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
          // Refresh usage limits after updating a project (in case status changed)
          refetchSubscription(true)
        }
      } else {
        // Check if user can create more projects
        if (!canCreateResource('projects')) {
          const reason = getActionBlockedReason('projects')
          toast.error("Cannot create project", {
            description: reason || "You've reached your project limit for your current plan. Please upgrade to Pro for unlimited projects."
          })
          return
        }

        // Adding new project
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('projects')
            .insert([{
              name: newProject.name,
              status: newProject.status,
              start_date: formatDateForDatabase(newProject.start_date),
              due_date: formatDateForDatabase(newProject.due_date),
              budget: budget || null,
              expenses: expenses,
              payment_received: received,
              payment_pending: pending,
              description: newProject.description || null,
              pipeline_notes: newProject.pipeline_notes || null,
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
          // Refresh usage limits immediately after creating a project
          refetchSubscription(true)
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

        // Store the full project data for potential restoration
        const deletedProjectData = { ...project }

        try {
          if (isSupabaseConfigured()) {
            const { error } = await supabase
              .from('projects')
              .delete()
              .eq('id', project.id)

            if (error) throw error

            // Show success toast with undo functionality
            toast.success(`Project "${project.name}" deleted successfully`, {
              description: `${project.name} has been removed`,
              action: {
                label: "Undo",
                onClick: async () => {
                  try {
                    // Restore the deleted project
                    const restoreData = {
                      name: deletedProjectData.name,
                      description: deletedProjectData.description,
                      client_id: deletedProjectData.client_id,
                      status: deletedProjectData.status,
                      start_date: deletedProjectData.start_date,
                      due_date: deletedProjectData.due_date,
                      budget: deletedProjectData.budget,
                      hourly_rate: deletedProjectData.hourly_rate,
                      estimated_hours: deletedProjectData.estimated_hours,
                      actual_hours: deletedProjectData.actual_hours,
                      progress: deletedProjectData.progress,
                      notes: deletedProjectData.notes,
                      pipeline_stage: deletedProjectData.pipeline_stage,
                      deal_probability: deletedProjectData.deal_probability
                    }

                    const { error: restoreError } = await supabase
                      .from('projects')
                      .insert([restoreData])

                    if (restoreError) {
                      console.error('Error restoring project:', restoreError)
                      toast.error('Failed to restore project', {
                        description: 'Please check your database connection and try again'
                      })
                      return
                    }

                    toast.success(`Project "${project.name}" restored successfully`, {
                      description: 'The deleted project has been recovered'
                    })
                    refetch()
                    forceRefresh()
                    // Refresh usage limits since project was restored
                    refetchSubscription(true)
                  } catch (error: any) {
                    console.error('Error restoring project:', error)
                    toast.error('Failed to restore project', {
                      description: error.message
                    })
                  }
                },
              },
            })
            refetch()
            forceRefresh()
            // Refresh usage limits immediately after successful deletion
            refetchSubscription(true)
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
              [field]: formatDateForDatabase(date),
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
      onDuplicateProject: async (project: any) => {
        try {
          // Check if user can create more projects
          if (!canCreateResource('projects')) {
            const reason = getActionBlockedReason('projects')
            toast.error("Cannot duplicate project", {
              description: reason || "You've reached your project limit for your current plan. Please upgrade to Pro for unlimited projects."
            })
            return
          }

                  if (isSupabaseConfigured()) {
          // Create a copy of the project data, excluding id, created_at, and updated_at
          const duplicateData = {
            name: `${project.name} (Copy)`,
            description: project.description,
            client_id: project.clients?.id || project.client_id || null, // Handle both nested and direct client_id
            status: project.status, // Carry forward the original status
            start_date: project.start_date,
            due_date: project.due_date,
            
            // Legacy fields (for backward compatibility)
            budget: project.budget,
            hourly_rate: project.hourly_rate,
            
            // New multi-project type fields
            project_type: project.project_type || 'fixed',
            total_budget: project.total_budget || project.budget || 0,
            auto_calculate_total: project.auto_calculate_total || false,
            
            // Recurring project fields
            recurring_frequency: project.recurring_frequency,
            recurring_amount: project.recurring_amount,
            recurring_end_date: project.recurring_end_date,
            last_recurring_calculation: null, // Reset for duplicate
            
            // Hourly project fields
            hourly_rate_new: project.hourly_rate_new,
            total_hours_logged: 0, // Reset logged hours for duplicate
            
            // Financial fields
            expenses: project.expenses || 0,
            revenue: project.revenue || 0,
            profit_margin: project.profit_margin || 0,
            currency: project.currency || 'USD',
            payment_status: project.payment_status || 'pending',
            invoice_amount: project.invoice_amount || 0,
            payment_received: 0, // Reset received amount for duplicate
            payment_pending: project.total_budget || project.budget || 0, // Set pending to total budget
            
            // Time tracking fields
            estimated_hours: project.estimated_hours,
            actual_hours: 0, // Reset actual hours for duplicate
            progress: 0, // Reset progress for duplicate
            
            // Other fields
            notes: project.notes,
            pipeline_stage: project.pipeline_stage,
            pipeline_notes: project.pipeline_notes,
            deal_probability: project.deal_probability
          }

            const { data, error } = await supabase
              .from('projects')
              .insert([duplicateData])
              .select()

            if (error) {
              console.error('Error duplicating project:', error)
              throw new Error(error.message)
            }

            toast.success(`Project "${duplicateData.name}" created successfully`, {
              description: `Duplicated from "${project.name}"`
            })
            refetch()
            forceRefresh()
            // Refresh usage limits immediately after creating a project
            refetchSubscription(true)
          }
        } catch (error: any) {
          console.error('Error duplicating project:', error)
          toast.error(`Failed to duplicate project: ${error.message}`)
        }
      },
      availableClients: clients,
    })

    // Apply dynamic widths and add footer functions
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
      
      // Add footer functions for specific columns
      let footer = undefined
      if (columnKey === 'name') {
        footer = ({ table }: any) => {
          const total = table.aggregations?.totalProjects || 0
          return total > 0 ? (
            <span className="text-muted-foreground font-normal">{total}</span>
          ) : null
        }
      } else if (columnKey === 'status') {
        footer = ({ table }: any) => {
          const active = table.aggregations?.activeCount || 0
          return active > 0 ? (
            <span className="text-muted-foreground font-normal">{active}</span>
          ) : null
        }
      } else if (columnKey === 'total_budget' || columnKey === 'budget') {
        footer = ({ table }: any) => {
          const total = table.aggregations?.totalBudget || 0
          return total > 0 ? (
            <span className="text-muted-foreground font-normal">{formatCurrencyAbbreviated(total)}</span>
          ) : null
        }
      } else if (columnKey === 'expenses') {
        footer = ({ table }: any) => {
          const total = table.aggregations?.totalExpenses || 0
          return total > 0 ? (
            <span className="text-muted-foreground font-normal">{formatCurrencyAbbreviated(total)}</span>
          ) : null
        }
      } else if (columnKey === 'received') {
        footer = ({ table }: any) => {
          const total = table.aggregations?.totalReceived || 0
          return total > 0 ? (
            <span className="text-muted-foreground font-normal">{formatCurrencyAbbreviated(total)}</span>
          ) : null
        }
      } else if (columnKey === 'pending') {
        footer = ({ table }: any) => {
          const total = table.aggregations?.totalPending || 0
          return total > 0 ? (
            <span className="text-muted-foreground font-normal">{formatCurrencyAbbreviated(total)}</span>
          ) : null
        }
      }
      
      return {
        ...column,
        size: currentWidth,
        minSize: 80,
        maxSize: 500,
        ...(footer ? { footer } : {})
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
      status: defaultStatus,
      start_date: undefined,
      due_date: undefined,
      budget: "",
      expenses: "",
      received: "",
      description: "",
      pipeline_notes: "",
    })
    setSelectedClient(null)
    setSelectedProject(null)
    setIsAddDialogOpen(true)
  }

  function handleEditProject(project: any) {
    setSelectedProject(project)
    
    // Populate the form with existing project data
    setNewProject({
      name: project.name || "",
      client_id: project.client_id || "",
      status: project.status || "active",
      start_date: project.start_date ? new Date(project.start_date) : undefined,
      due_date: project.due_date ? new Date(project.due_date) : undefined,
      budget: (project.total_budget || project.budget || 0).toString(),
      expenses: (project.expenses || 0).toString(),
      received: (project.payment_received || project.received || 0).toString(),
      description: project.description || "",
      pipeline_notes: project.pipeline_notes || "",
    })
    
    // Set client if available
    if (project.clients) {
      setSelectedClient(project.clients)
    } else if (project.client_id && clients.length > 0) {
      const client = clients.find(c => c.id === project.client_id)
      if (client) {
        setSelectedClient(client)
      }
    }
    
    setIsEditDialogOpen(true)
  }
  
  const handleDuplicateProject = async (project: any) => {
    try {
      // Check if user can create more projects
      if (!canCreateResource('projects')) {
        const reason = getActionBlockedReason('projects')
        toast.error("Cannot duplicate project", {
          description: reason || "You've reached your project limit for your current plan. Please upgrade to Pro for unlimited projects."
        })
        return
      }

      if (isSupabaseConfigured()) {
        // Create a copy of the project data, excluding id, created_at, and updated_at
        const duplicateData = {
          name: `${project.name} (Copy)`,
          description: project.description,
          client_id: project.clients?.id || project.client_id || null, // Handle both nested and direct client_id
          status: project.status, // Carry forward the original status
          start_date: project.start_date,
          due_date: project.due_date,
          
          // Legacy fields (for backward compatibility)
          budget: project.budget,
          hourly_rate: project.hourly_rate,
          
          // New multi-project type fields
          project_type: project.project_type || 'fixed',
          total_budget: project.total_budget || project.budget || 0,
          auto_calculate_total: project.auto_calculate_total || false,
          
          // Recurring project fields
          recurring_frequency: project.recurring_frequency,
          recurring_amount: project.recurring_amount,
          recurring_end_date: project.recurring_end_date,
          last_recurring_calculation: null, // Reset for duplicate
          
          // Hourly project fields
          hourly_rate_new: project.hourly_rate_new,
          total_hours_logged: 0, // Reset logged hours for duplicate
          
          // Financial fields
          expenses: project.expenses || 0,
          revenue: project.revenue || 0,
          profit_margin: project.profit_margin || 0,
          currency: project.currency || 'USD',
          payment_status: project.payment_status || 'pending',
          invoice_amount: project.invoice_amount || 0,
          payment_received: 0, // Reset received amount for duplicate
          payment_pending: project.total_budget || project.budget || 0, // Set pending to total budget
          
          // Time tracking fields
          estimated_hours: project.estimated_hours,
          actual_hours: 0, // Reset actual hours for duplicate
          progress: 0, // Reset progress for duplicate
          
          // Other fields
          notes: project.notes,
          pipeline_stage: project.pipeline_stage,
          pipeline_notes: project.pipeline_notes,
          deal_probability: project.deal_probability
        }

        const { data, error } = await supabase
          .from('projects')
          .insert([duplicateData])
          .select()

        if (error) {
          console.error('Error duplicating project:', error)
          throw new Error(error.message)
        }

        toast.success(`Project "${duplicateData.name}" created successfully`, {
          description: `Duplicated from "${project.name}"`
        })
        refetch()
        forceRefresh()
        // Refresh usage limits immediately after creating a project
        refetchSubscription(true)
      }
    } catch (error: any) {
      console.error('Error duplicating project:', error)
      toast.error(`Failed to duplicate project: ${error.message}`)
    }
  }
  
  const handleBatchDelete = async (projects: any[]) => {
    if (projects.length === 0) return
    
    const projectNames = projects.map(p => p.name).join(', ')
    const confirmed = window.confirm(`Are you sure you want to delete ${projects.length} project(s)?\n\n${projectNames}`)
    if (!confirmed) return

    // Store the full project data for potential restoration
    const deletedProjectsData = projects.map(project => ({ ...project }))

    try {
      if (isSupabaseConfigured()) {
        const projectIds = projects.map(p => p.id)
        const { error } = await supabase
          .from('projects')
          .delete()
          .in('id', projectIds)

        if (error) throw error

        // Show success toast with undo functionality
        toast.success(`${projects.length} project(s) deleted successfully`, {
          description: `${projectNames.length > 50 ? projects.length + ' projects' : projectNames} removed`,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                // Restore the deleted projects
                const restoreDataArray = deletedProjectsData.map(project => ({
                  name: project.name,
                  description: project.description,
                  client_id: project.client_id,
                  status: project.status,
                  start_date: project.start_date,
                  due_date: project.due_date,
                  
                  // Legacy fields
                  budget: project.budget,
                  hourly_rate: project.hourly_rate,
                  
                  // New multi-project type fields
                  project_type: project.project_type,
                  total_budget: project.total_budget,
                  auto_calculate_total: project.auto_calculate_total,
                  
                  // Recurring project fields
                  recurring_frequency: project.recurring_frequency,
                  recurring_amount: project.recurring_amount,
                  recurring_end_date: project.recurring_end_date,
                  last_recurring_calculation: project.last_recurring_calculation,
                  
                  // Hourly project fields
                  hourly_rate_new: project.hourly_rate_new,
                  total_hours_logged: project.total_hours_logged,
                  
                  // Financial and tracking fields
                  expenses: project.expenses,
                  revenue: project.revenue,
                  profit_margin: project.profit_margin,
                  currency: project.currency,
                  payment_status: project.payment_status,
                  invoice_amount: project.invoice_amount,
                  payment_received: project.payment_received,
                  payment_pending: project.payment_pending,
                  estimated_hours: project.estimated_hours,
                  actual_hours: project.actual_hours,
                  progress: project.progress,
                  notes: project.notes,
                  pipeline_stage: project.pipeline_stage,
                  pipeline_notes: project.pipeline_notes,
                  deal_probability: project.deal_probability
                }))

                const { error: restoreError } = await supabase
                  .from('projects')
                  .insert(restoreDataArray)

                if (restoreError) {
                  console.error('Error restoring projects:', restoreError)
                  toast.error('Failed to restore projects', {
                    description: 'Please check your database connection and try again'
                  })
                  return
                }

                toast.success(`${projects.length} project(s) restored successfully`, {
                  description: 'All deleted projects have been recovered'
                })
                refetch()
                forceRefresh()
                // Refresh usage limits since projects were restored
                refetchSubscription(true)
              } catch (error: any) {
                console.error('Error restoring projects:', error)
                toast.error('Failed to restore projects', {
                  description: error.message
                })
              }
            },
          },
        })
        refetch()
        forceRefresh()
        // Refresh usage limits immediately after successful batch deletion
        refetchSubscription(true)
      }
    } catch (error: any) {
      console.error('Error deleting projects:', error)
      toast.error(`Failed to delete projects: ${error.message}`)
    }
  }

  const handleExport = () => {
    console.log('Export projects')
  }

  // Helper function to get proper column display names
  const getColumnDisplayName = (col: any) => {
    const key = col.id || col.accessorKey
    const displayNames: Record<string, string> = {
      'select': 'Select',
      'name': 'Project Name',
      'client': 'Client',
      'status': 'Status',
      'project_type': 'Project Type',
      'start_date': 'Start Date',
      'total_budget': 'Total Budget',
      'budget': 'Budget',
      'expenses': 'Expenses',
      'received': 'Received',
      'pending': 'Pending',
      'due_date': 'Due Date',
      'actions': 'Actions'
    }
    return displayNames[key] || key
  }

  // Column metadata for view filter
  const columnMetadata = React.useMemo(() => {
    if (columnOrder.length === 0) {
      return allColumns.map(col => ({
        id: col.id || col.accessorKey,
        accessorKey: col.accessorKey,
        header: getColumnDisplayName(col),
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
      header: getColumnDisplayName(col),
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
  
  // Force refresh table preferences to recognize new columns
  const forceRefreshTablePreferences = React.useCallback(() => {
    // Clear all preferences to force recognition of new columns
    updateTablePreference(TABLE_NAME, "column_widths", {})
    updateTablePreference(TABLE_NAME, "column_order", [])
    updateTablePreference(TABLE_NAME, "column_visibility", {})
    updateTablePreference(TABLE_NAME, "last_updated", Date.now())
    
    // Reset state to defaults - new columns will be auto-detected
    setColumnWidths({})
    setColumnOrder([])
    setColumnVisibility({})
    
    toast.success("Table preferences reset - new columns are now visible")
  }, [TABLE_NAME]) // Removed function dependency to prevent tab focus triggers

  // Auto-refresh preferences if new columns (like project_type) are missing (but only once on initial load)
  const [hasAutoRefreshed, setHasAutoRefreshed] = React.useState(false)
  
  React.useEffect(() => {
    if (allColumns.length > 0 && preferencesLoaded && !hasAutoRefreshed) {
      const hasProjectTypeColumn = allColumns.some(col => (col.id || col.accessorKey) === 'project_type')
      const projectTypeVisible = columnVisibility['project_type']
      
      // Only refresh if project_type column exists but isn't in visibility settings (first time only)
      if (hasProjectTypeColumn && projectTypeVisible === undefined && Object.keys(columnVisibility).length > 0) {
        forceRefreshTablePreferences()
        setHasAutoRefreshed(true)
      }
    }
  }, [allColumns, columnVisibility, preferencesLoaded, hasAutoRefreshed]) // Removed function dependency

  // Reset to parent preferences (for sub-pages)
  const resetToParentPreferences = React.useCallback(() => {
    const PARENT_TABLE_NAME = "projects-table-all-projects"
    const isMainPage = TABLE_NAME === PARENT_TABLE_NAME
    
    if (!isMainPage) {
      // Clear current page preferences and inheritance timestamp
      updateTablePreference(TABLE_NAME, "column_widths", {})
      updateTablePreference(TABLE_NAME, "column_order", [])
      updateTablePreference(TABLE_NAME, "column_visibility", {})
      updateTablePreference(TABLE_NAME, "last_inherited_from", null)
      
      // Load parent preferences
      const parentWidths = getTablePreference(PARENT_TABLE_NAME, "column_widths", {})
      const parentOrder = getTablePreference(PARENT_TABLE_NAME, "column_order", [])
      const parentVisibility = getTablePreference(PARENT_TABLE_NAME, "column_visibility", {})
      const parentLastUpdated = getTablePreference(PARENT_TABLE_NAME, "last_updated", Date.now())
      
      // Apply parent preferences
      if (Object.keys(parentWidths).length > 0) {
        setColumnWidths(parentWidths)
      }
      if (parentOrder.length > 0) {
        setColumnOrder(parentOrder)
      }
      if (Object.keys(parentVisibility).length > 0) {
        setColumnVisibility(parentVisibility)
      }
      
      // Mark that we've inherited from parent at this time
      updateTablePreference(TABLE_NAME, "last_inherited_from", parentLastUpdated)
      
      toast.success("Reset to main page column settings")
    }
  }, [TABLE_NAME]) // Removed function dependencies to prevent tab focus triggers

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

  // Enterprise batched preference updates
  const updatePreferencesBatch = React.useCallback((updates: Record<string, any>) => {
    if (preferencesLoaded) {
      // Add timestamp for main projects page
      if (TABLE_NAME === "projects-table-all-projects") {
        updates.last_updated = Date.now()
      }
      updateMultipleTablePreferences(TABLE_NAME, updates)
    }
  }, [TABLE_NAME, updateMultipleTablePreferences, preferencesLoaded])

  // Save column widths with batching
  const saveColumnWidths = React.useCallback((widths: Record<string, number>) => {
    if (preferencesLoaded && Object.keys(widths).length > 0) {
      updatePreferencesBatch({ column_widths: widths })
    }
  }, [updatePreferencesBatch, preferencesLoaded])

  // Keep ref in sync with state for immediate access
  React.useEffect(() => {
    columnWidthsRef.current = columnWidths
  }, [columnWidths])

  const handleResizeEnd = React.useCallback(() => {
    // Save column widths immediately when resize ends
    const currentWidths = columnWidthsRef.current
    if (preferencesLoaded && Object.keys(currentWidths).length > 0) {
      saveColumnWidths(currentWidths)
    }
    
    setIsResizing(null)
    setResizeStartX(0)
    setResizeStartWidth(0)
    setResizeTooltip(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [preferencesLoaded, saveColumnWidths])

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

  // Save preferences on unmount or page unload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const currentWidths = columnWidthsRef.current
      if (preferencesLoaded && Object.keys(currentWidths).length > 0) {
        // Use synchronous localStorage as a fallback for immediate save
        const preferences = JSON.parse(localStorage.getItem('table-preferences') || '{}')
        preferences[TABLE_NAME] = {
          ...preferences[TABLE_NAME],
          column_widths: currentWidths
        }
        localStorage.setItem('table-preferences', JSON.stringify(preferences))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Save on component unmount
      const currentWidths = columnWidthsRef.current
      if (preferencesLoaded && Object.keys(currentWidths).length > 0) {
        saveColumnWidths(currentWidths)
      }
    }
  }, [TABLE_NAME, preferencesLoaded, saveColumnWidths])

  // Track if initial state has been set to prevent saving during initial load
  const initialStateSetRef = React.useRef(false)

  // Optimized single effect for all preference changes with batching
  React.useEffect(() => {
    if (!preferencesLoaded) return
    
    // Skip during initial load to prevent saving initial state
    if (!initialStateSetRef.current) {
      initialStateSetRef.current = true
      return
    }

    const updates: Record<string, any> = {}
    
    if (columnOrder.length > 0) {
      updates.column_order = columnOrder
    }
    
    if (Object.keys(columnVisibility).length > 0) {
      updates.column_visibility = columnVisibility
    }
    
    if (sortBy || sortDirection) {
      updates.sorting = { sortBy, sortDirection }
    }

    // Only update if we have changes to save
    if (Object.keys(updates).length > 0) {
      updatePreferencesBatch(updates)
    }
  }, [columnOrder, columnVisibility, sortBy, sortDirection, preferencesLoaded]) // Removed function dependency

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
    <div className="w-full h-screen flex flex-col bg-muted/30">
      {/* Resize Tooltip */}
      <AnimatePresence>
        {resizeTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg pointer-events-none">
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
        action={
          <div className="flex items-center gap-2">
            {/* Enterprise Performance Indicator */}
            {hasPendingUpdates && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Saving...
              </div>
            )}
            {preferencesSaving && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Syncing
              </div>
            )}
            <PageActionsMenu 
              entityType="projects" 
              onExport={handleExport}
              onResetColumns={TABLE_NAME === "projects-table-all-projects" ? forceRefreshTablePreferences : resetToParentPreferences}
              showResetColumns={true}
              // Enterprise features
              onForceSave={hasPendingUpdates ? forceImmediateSave : undefined}
              saveMetrics={saveMetrics}
            />
          </div>
        }
      />
      
      {/* Fixed Summary Cards and Filters */}
      <div className="flex-shrink-0 sticky top-16 z-10">
        {/* Summary Cards */}
        {showSummaryCards && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 w-full border-t border-border">
              <div className="px-6 py-4 border-r border-border last:border-r-0">
                <div className="text-lg font-medium text-foreground">{summaryMetrics.totalProjects}</div>
                <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Projects</h3>
              </div>
              <div className="px-6 py-4 border-r border-border last:border-r-0">
                <div className="text-lg font-medium text-foreground">{summaryMetrics.activeProjects}</div>
                <h3 className="text-xs font-medium text-muted-foreground mt-1">Active Projects</h3>
              </div>
              <div className="px-6 py-4 border-r border-border last:border-r-0">
                <div className="text-lg font-medium text-foreground">{formatCurrencyAbbreviated(summaryMetrics.totalReceived)}</div>
                <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Received</h3>
              </div>
              <div className="px-6 py-4 border-r border-border last:border-r-0">
                <div className="text-lg font-medium text-foreground">{formatCurrencyAbbreviated(summaryMetrics.totalPending)}</div>
                <h3 className="text-xs font-medium text-muted-foreground mt-1">Total Pending</h3>
              </div>
            </div>
            <div className="border-b border-border"></div>
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
        <TableErrorBoundary>
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
            onDuplicateProject={handleDuplicateProject}
            onBatchDelete={handleBatchDelete}
            onResizeStart={handleResizeStart}
            createSortingFunctions={createSortingFunctions}
            preferencesLoading={preferencesLoading}
            preferencesLoaded={preferencesLoaded}
          />
        </TableErrorBoundary>
      </div>

      {/* Edit Project Dialog */}
      <EnhancedAddProjectDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setSelectedProject(null)
          }
        }}
        onProjectUpdate={forceRefresh}
        editProject={selectedProject}
        defaultType="fixed"
        context="project"
      />






      {/* Enhanced Add Project Dialog */}
      <EnhancedAddProjectDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onProjectUpdate={forceRefresh}
        defaultType="fixed"
        context="project"
      />
    </div>
  )
} 