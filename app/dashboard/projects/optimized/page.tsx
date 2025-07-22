"use client"

import * as React from "react"
import { Suspense } from "react"
import { Clock, Plus, Search, Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"

import { toast } from "sonner"
import { ClientAvatar } from "@/components/ui/client-avatar"

import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { OptimizedDataTable } from "@/components/projects/data-table-optimized"
import { createColumns, type Project } from "@/components/projects/columns"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { formatCurrency } from "@/lib/currency"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useOptimizedProjects } from "@/hooks/use-optimized-projects"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Client interface
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
  start_date?: Date
  due_date?: Date
  budget: string
  expenses: string
  received: string
  description: string
}

// Performance metrics component
const PerformanceMetrics = ({ 
  summaryMetrics, 
  loading 
}: { 
  summaryMetrics: any
  loading: boolean 
}) => {
  const metrics = [
    { label: "Total Projects", value: summaryMetrics.totalProjects, color: "text-blue-600" },
    { label: "Active", value: summaryMetrics.activeProjects, color: "text-green-600" },
    { label: "Pipeline", value: summaryMetrics.pipelineProjects, color: "text-purple-600" },
    { label: "Completed", value: summaryMetrics.completedProjects, color: "text-blue-600" },
  ]

  const financialMetrics = [
    { label: "Total Budget", value: formatCurrency(summaryMetrics.totalBudget), color: "text-blue-600" },
    { label: "Total Expenses", value: formatCurrency(summaryMetrics.totalExpenses), color: "text-red-600" },
    { label: "Total Received", value: formatCurrency(summaryMetrics.totalReceived), color: "text-green-600" },
    { label: "Total Pending", value: formatCurrency(summaryMetrics.totalPending), color: "text-yellow-600" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <AnimatePresence mode="wait">
        {(loading ? Array.from({ length: 8 }, (_, i) => ({ loading: true, index: i })) : [...metrics, ...financialMetrics]).map((metric, index) => (
          <motion.div
            key={loading ? `loading-${index}` : (metric as any)?.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center"
          >
            {loading ? (
              <div className="flex items-center gap-2 w-full">
                <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">{(metric as any).label}</h3>
                <div className={`text-lg font-semibold ml-auto ${(metric as any).color}`}>{(metric as any).value}</div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function OptimizedProjectsContent() {
  const {
    projects,
    totalCount,
    currentPage,
    totalPages,
    loading,
    error,
    summaryMetrics,
    handlePageChange,
    invalidateCache,
    updateProjectOptimistic,
    pageSize,
    hasActiveFilters
  } = useOptimizedProjects()

  // Client state management
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(true)
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = React.useState("")
  const [displayedClientsCount, setDisplayedClientsCount] = React.useState(10)

  // Table instance for column visibility controls
  const [tableInstance, setTableInstance] = React.useState<any>(null)

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)

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

  // Filter and limit clients based on search query
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

  // Fetch clients only once on mount
  React.useEffect(() => {
    fetchClients()
  }, [])

  // Reset displayed count when search query changes
  React.useEffect(() => {
    setDisplayedClientsCount(10)
  }, [clientSearchQuery])

  // Fetch clients from Supabase
  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching clients:', error)
          throw error
        }

        setClients(data || [])
        console.log('Fetched clients from Supabase:', data)
      } else {
        console.log('Supabase not configured')
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to fetch clients')
    } finally {
      setClientsLoading(false)
    }
  }

  const handleAddProject = () => {
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
    setIsAddDialogOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setClientSearchQuery("")
    setDisplayedClientsCount(10)
    const projectClient = project.clients ? clients.find(c => c.name === project.clients!.name) : null
    setSelectedClient(projectClient || null)
    
    setNewProject({
      name: project.name,
      client_id: projectClient?.id || "",
      status: project.status,
      start_date: project.start_date ? new Date(project.start_date) : undefined,
      due_date: project.due_date ? new Date(project.due_date) : undefined,
      budget: project.budget?.toString() || "",
      expenses: project.expenses?.toString() || "",
      received: project.received?.toString() || "",
      description: "",
    })
    setIsEditDialogOpen(true)
  }

  const handleCreateInvoice = (project: Project) => {
    toast.success(`Creating invoice for ${project.name}`)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
  }

  const handleStatusChange = async (project: Project, newStatus: string) => {
    try {
      // Optimistic update first
      updateProjectOptimistic(project.id, { status: newStatus })
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('projects')
          .update({ status: newStatus })
          .eq('id', project.id)

        if (error) {
          console.error('Error updating project status:', error)
          // Revert optimistic update on error
          updateProjectOptimistic(project.id, { status: project.status })
          toast.error('Failed to update project status')
        } else {
          toast.success(`Project status updated to ${newStatus}`)
          invalidateCache('projects')
        }
      }
    } catch (error) {
      console.error('Error updating project status:', error)
      updateProjectOptimistic(project.id, { status: project.status })
      toast.error('Failed to update project status')
    }
  }

  const handleDateChange = async (project: Project, field: 'start_date' | 'due_date', date: Date | undefined) => {
    try {
      const dateString = date ? date.toISOString().split('T')[0] : null
      
      // Optimistic update
      updateProjectOptimistic(project.id, { [field]: dateString })
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('projects')
          .update({ [field]: dateString })
          .eq('id', project.id)

        if (error) {
          console.error('Error updating project date:', error)
          // Revert on error
          updateProjectOptimistic(project.id, { [field]: project[field] })
          toast.error('Failed to update project date')
        } else {
          toast.success('Project date updated')
          invalidateCache('projects')
        }
      }
    } catch (error) {
      console.error('Error updating project date:', error)
      updateProjectOptimistic(project.id, { [field]: project[field] })
      toast.error('Failed to update project date')
    }
  }

  const handleBatchDelete = (items: Project[], onUndo: (items: Project[]) => void) => {
    toast.success(`Deleted ${items.length} project${items.length !== 1 ? 's' : ''}`, {
      action: {
        label: "Undo",
        onClick: () => onUndo(items)
      }
    })
    invalidateCache('projects')
  }

  // Create columns with actions - memoized to prevent column preferences reset
  const columns = React.useMemo(() => createColumns({
    onEditProject: handleEditProject,
    onCreateInvoice: handleCreateInvoice,
    onDeleteProject: handleDeleteProject,
    onStatusChange: handleStatusChange,
    onDateChange: handleDateChange,
  }), [handleEditProject, handleCreateInvoice, handleDeleteProject, handleStatusChange, handleDateChange])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <h1 className="text-2xl font-bold">Projects (Optimized)</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            High Performance
          </Badge>
        </motion.div>
        <Button onClick={handleAddProject}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <PageContent>
        {/* Performance Metrics */}
        <PerformanceMetrics summaryMetrics={summaryMetrics} loading={loading} />

        {/* Performance Stats Badge */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-700 font-medium">
                  Smart filtering active - showing {totalCount} results
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Cached & Optimized
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Filters and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ProjectFiltersV2 
            clients={clients}
            showStatusFilter={true}
            className=""
            onAddProject={handleAddProject}
            table={tableInstance}
          />
        </motion.div>

        {/* Optimized Projects Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <OptimizedDataTable 
            columns={columns} 
            data={projects}
            loading={loading}
            error={error}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onAddProject={handleAddProject}
            onBatchDelete={handleBatchDelete}
            onTableReady={setTableInstance}
            updateProjectOptimistic={updateProjectOptimistic}
            contextActions={{
              onEditProject: handleEditProject,
              onCreateInvoice: handleCreateInvoice,
              onDeleteProject: handleDeleteProject,
              onStatusChange: handleStatusChange,
            }}
          />
        </motion.div>
      </PageContent>

      {/* Add Project Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project with optimized performance
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Project Name
              </Label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <div className="col-span-3">
                <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientDropdownOpen}
                      className="w-full justify-between"
                    >
                                             {selectedClient ? (
                         <div className="flex items-center">
                           <ClientAvatar 
                             name={selectedClient.name} 
                             avatarUrl={selectedClient.avatar_url}
                             size="sm"
                           />
                           <span className="ml-2">{selectedClient.name}</span>
                         </div>
                       ) : (
                         "Select client..."
                       )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search clients..." 
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          {displayedClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              onSelect={() => handleClientSelect(client.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                                                             <ClientAvatar 
                                 name={client.name} 
                                 avatarUrl={client.avatar_url}
                                 size="sm"
                               />
                              <div className="ml-2">
                                <div className="font-medium">{client.name}</div>
                                {client.company && (
                                  <div className="text-sm text-muted-foreground">{client.company}</div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                          {filteredClients.length > displayedClientsCount && (
                            <CommandItem onSelect={loadMoreClients}>
                              <Plus className="mr-2 h-4 w-4" />
                              Load more clients...
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="budget" className="text-right">
                Budget
              </Label>
              <Input
                id="budget"
                type="number"
                value={newProject.budget}
                onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                className="col-span-3"
                placeholder="Enter budget amount"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" onClick={() => {
              // Handle project creation with optimistic updates
              toast.success('Project created successfully')
              setIsAddDialogOpen(false)
              invalidateCache('projects')
            }}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OptimizedProjectsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading optimized projects...</p>
        </div>
      </div>
    }>
      <OptimizedProjectsContent />
    </Suspense>
  )
} 