"use client"

import * as React from "react"
import { Clock, Search, Check, ChevronsUpDown } from "lucide-react"

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
import { DataTable } from "@/components/projects/data-table"
import { createColumns, type Project } from "@/components/projects/columns"
import { formatCurrency } from "@/lib/currency"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"

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

// Remove mock data - projects will be loaded from database

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

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pipeline", label: "Pipeline" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

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

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = React.useState(true)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [undoData, setUndoData] = React.useState<{ items: Project[], timeout: NodeJS.Timeout } | null>(null)

  // Client state management
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(true)
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = React.useState("")
  const [displayedClientsCount, setDisplayedClientsCount] = React.useState(10)

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

  // Fetch projects and clients on component mount
  React.useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [])

  // Reset displayed count when search query changes
  React.useEffect(() => {
    setDisplayedClientsCount(10)
  }, [clientSearchQuery])

  // Cleanup undo timeout on unmount
  React.useEffect(() => {
    return () => {
      if (undoData) {
        clearTimeout(undoData.timeout)
      }
    }
  }, [undoData])

  // Listen for command menu events
  React.useEffect(() => {
    const handleCommandMenuAddProject = () => {
      handleAddProject()
    }

    window.addEventListener('trigger-add-project', handleCommandMenuAddProject)
    return () => {
      window.removeEventListener('trigger-add-project', handleCommandMenuAddProject)
    }
  }, [])

  // Fetch projects from database and sessionStorage
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true)
      let allProjects: Project[] = []
      
      if (isSupabaseConfigured()) {
        // Load from database - automatically filtered by RLS policies
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            clients (
              name,
              company,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching projects:', error)
          throw error
        }

        // Transform the data to match our Project interface
        const dbProjects = (data || []).map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          start_date: project.start_date,
          due_date: project.due_date,
          budget: project.budget,
          expenses: project.expenses,
          received: project.payment_received, // Map payment_received to received
          pending: project.payment_pending, // Map payment_pending to pending
          created_at: project.created_at,
          clients: project.clients ? {
            name: project.clients.name,
            company: project.clients.company,
            avatar_url: project.clients.avatar_url
          } : undefined
        }))

        allProjects = [...dbProjects]
        console.log('Fetched projects from database:', dbProjects)
      } else {
        // Use mock data when database is not configured
        // allProjects = [...mockProjects] // Removed mockProjects
        // console.log('Using mock projects data') // Removed mockProjects
      }

      // Also load any imported projects from sessionStorage (demo mode)
      // const demoProjects = JSON.parse(sessionStorage.getItem('demo-projects') || '[]') // Removed demoProjects
      // if (demoProjects.length > 0) { // Removed demoProjects
      //   // Map demo projects to match Project interface // Removed demoProjects
      //   const mappedDemoProjects = demoProjects.map((project: any) => ({ // Removed demoProjects
      //     id: project.id, // Removed demoProjects
      //     name: project.name, // Removed demoProjects
      //     status: project.status, // Removed demoProjects
      //     start_date: project.start_date, // Removed demoProjects
      //     end_date: project.end_date, // Removed demoProjects
      //     budget: project.budget, // Removed demoProjects
      //     expenses: project.expenses, // Removed demoProjects
      //     received: project.payment_received || project.received, // Map payment_received to received // Removed demoProjects
      //     pending: project.payment_pending || project.pending, // Map payment_pending to pending // Removed demoProjects
      //     created_at: project.created_at, // Removed demoProjects
      //     clients: project.clients // Removed demoProjects
      //   })) // Removed demoProjects
          
      //   allProjects = [...allProjects, ...mappedDemoProjects] // Removed demoProjects
      //   console.log('Added demo projects from sessionStorage:', mappedDemoProjects) // Removed demoProjects
      // } // Removed demoProjects

      setProjects(allProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      // Fallback to mock data on error
      // setProjects(mockProjects) // Removed mockProjects
      toast.error('Failed to fetch projects. Using demo data.')
    } finally {
      setProjectsLoading(false)
    }
  }

  // Fetch clients from Supabase
  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      
      if (isSupabaseConfigured()) {
        // Data is automatically filtered by RLS policies
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching clients:', error)
          throw error
        }

        setClients(data || [])
        console.log('Fetched user-specific clients from Supabase:', data)
      } else {
        // No clients when Supabase is not configured
        console.log('Supabase not configured')
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      // Fallback to mock data on error
      // setClients(mockClients) // Removed mockClients
      toast.error('Failed to fetch clients. Using demo data.')
    } finally {
      setClientsLoading(false)
    }
  }

  // Check for client pre-selection from sessionStorage and URL parameters
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const action = urlParams.get('action')
    
    if (action === 'add-project') {
      // Check for pre-selected client data
      const clientDataStr = sessionStorage.getItem('project-client-data')
      if (clientDataStr) {
        try {
          const clientData = JSON.parse(clientDataStr)
          
          // Find matching client by name and company instead of ID
          const matchingClient = clients.find(client => 
            client.name === clientData.clientName || 
            client.company === clientData.clientCompany
          )
          
          if (matchingClient) {
            // Set the client_id in the form
            setNewProject(prev => ({
              ...prev,
              client_id: matchingClient.id
            }))
            setSelectedClient(matchingClient)
            
            toast.success(`${clientData.clientName} has been pre-selected for the new project`)
          } else {
            // If no exact match, try to find by name similarity
            const similarClient = clients.find(client => 
              client.name.toLowerCase().includes(clientData.clientName.toLowerCase()) ||
              clientData.clientName.toLowerCase().includes(client.name.toLowerCase())
            )
            
            if (similarClient) {
              setNewProject(prev => ({
                ...prev,
                client_id: similarClient.id
              }))
              setSelectedClient(similarClient)
              
              toast.success(`Selected ${similarClient.name} as the closest match for ${clientData.clientName}`)
            } else {
              toast.error(`Could not find ${clientData.clientName} in the projects client list. Please select manually`)
            }
          }
          
          // Clean up sessionStorage
          sessionStorage.removeItem('project-client-data')
        } catch (error) {
          console.error('Error parsing client data from sessionStorage:', error)
        }
      }
      
      // Open the add project dialog
      setIsAddDialogOpen(true)
      
      // Clean up URL parameter
      window.history.replaceState({}, '', '/dashboard/projects')
    }
  }, [toast])

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setClientSearchQuery("") // Clear search query
    setDisplayedClientsCount(10) // Reset displayed count
    // Find the client for this project
    const projectClient = project.clients ? clients.find(c => c.name === project.clients!.name) : null
    setSelectedClient(projectClient || null)
    
    // Populate editing form with current project data
    setNewProject({
      name: project.name,
      client_id: projectClient?.id || "",
      status: project.status,
      start_date: project.start_date ? new Date(project.start_date) : undefined,
      due_date: project.due_date ? new Date(project.due_date) : undefined,
      budget: project.budget?.toString() || "",
      expenses: project.expenses?.toString() || "",
      received: project.received?.toString() || "",
      description: "", // We don't have description in current data
    })
    setIsEditDialogOpen(true)
  }

  const handleCreateInvoice = (project: Project) => {
    // Navigate to invoices page with project pre-selected
    const clientName = project.clients?.name || "Unknown Client"
    const projectName = project.name
    
    toast.success(`Creating invoice for "${projectName}" - ${clientName}`, {
      description: "Redirecting to generate invoice..."
    })
    
    // Store project data for invoice creation
    sessionStorage.setItem('invoice-project-data', JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      clientName: project.clients?.name,
      clientCompany: project.clients?.company,
      projectBudget: project.budget,
      projectPending: project.pending,
      projectStatus: project.status,
    }))
    
    // Navigate to invoices page
    setTimeout(() => {
      window.location.href = '/dashboard/invoices/generate'
    }, 1000)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
  }

  const handleStatusChange = async (project: Project, newStatus: string) => {
    try {
      if (isSupabaseConfigured()) {
        // Prepare update data
        const updateData: any = { status: newStatus }
        
        // If changing to pipeline, set default pipeline fields
        if (newStatus === 'pipeline') {
          updateData.pipeline_stage = 'Lead'  // Use capitalized 'Lead' to match database
          updateData.deal_probability = 10
          updateData.pipeline_notes = null
        }
        // If changing from pipeline to other status, clear pipeline fields
        else if (project.status === 'pipeline') {
          updateData.pipeline_stage = null
          updateData.deal_probability = null
          updateData.pipeline_notes = null
        }

        // Update status in database
        const { error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', project.id)

        if (error) {
          console.error('Error updating project status:', error)
          throw new Error(error.message)
        }
      }

      // Update the project status in the local state
      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, status: newStatus } : p
      ))
      
      // Show success toast with additional info for pipeline conversion
      const statusLabel = statusOptions.find(option => option.value === newStatus)?.label || newStatus
      if (newStatus === 'pipeline') {
        toast.success(`Project "${project.name}" moved to Pipeline`, {
          description: "Project will appear in the Pipeline page with default Lead stage"
        })
      } else {
        toast.success(`Project "${project.name}" status changed to ${statusLabel}`)
      }
    } catch (error) {
      console.error('Error updating project status:', error)
      toast.error(`Failed to update project status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDateChange = async (project: Project, field: 'start_date' | 'due_date', date: Date | undefined) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('projects')
          .update({ [field]: date ? date.toISOString().split('T')[0] : null })
          .eq('id', project.id)

        if (error) {
          console.error('Error updating project date:', error)
          throw new Error(error.message)
        }
      }

      // Update local state
      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, [field]: date ? date.toISOString().split('T')[0] : undefined } : p
      ))

      const fieldLabel = field === 'start_date' ? 'start date' : 'due date'
      toast.success(`Project "${project.name}" ${fieldLabel} updated`)
    } catch (error) {
      console.error('Error updating project date:', error)
      toast.error(`Failed to update project date: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleBatchDelete = (projects: Project[], onUndo: (items: Project[]) => void) => {
    if (projects.length === 0) return
    confirmBatchDelete(projects, onUndo)
  }

  const handleUndo = (deletedProjects: Project[]) => {
    // Clear any existing undo timeout
    if (undoData) {
      clearTimeout(undoData.timeout)
    }
    
    // Restore the deleted projects
    setProjects(prev => [...deletedProjects, ...prev])
    setUndoData(null)
    
    toast.success(`${deletedProjects.length} project${deletedProjects.length > 1 ? 's' : ''} restored successfully`)
  }

  const confirmBatchDelete = async (projectsToDelete: Project[], onUndo: (items: Project[]) => void) => {
    if (projectsToDelete.length === 0) return

    // Show progress toast for operations with 3+ items or after 1 second delay
    const showProgress = projectsToDelete.length >= 3
    let progressToastId: string | number | undefined
    let progressTimeout: NodeJS.Timeout | undefined

    try {
      // Set up progress notification for longer operations
      if (showProgress) {
        progressToastId = toast.loading(`Deleting ${projectsToDelete.length} project${projectsToDelete.length > 1 ? 's' : ''}...`, {
          description: "Please wait while we process your request."
        })
      } else {
        // For smaller operations, show progress toast after 1 second delay
        progressTimeout = setTimeout(() => {
          progressToastId = toast.loading(`Deleting ${projectsToDelete.length} project${projectsToDelete.length > 1 ? 's' : ''}...`, {
            description: "Please wait while we process your request."
          })
        }, 1000)
      }

      const deletedIds = projectsToDelete.map(project => project.id)
      
      // Process deletion with database operations
      for (let i = 0; i < projectsToDelete.length; i++) {
        const project = projectsToDelete[i]
        
        // Update progress for larger operations
        if (progressToastId) {
          const progress = Math.round(((i + 1) / projectsToDelete.length) * 100)
          toast.loading(`Deleting projects... ${i + 1}/${projectsToDelete.length} (${progress}%)`, {
            id: progressToastId,
            description: `Processing "${project.name}"`
          })
        }
        
        // Delete from database if configured
        if (isSupabaseConfigured()) {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id)
            
          if (error) {
            console.error(`Error deleting project ${project.id}:`, error)
            throw new Error(`Failed to delete "${project.name}": ${error.message}`)
          }
        }
        
        // Also remove from demo storage if it exists
        // const demoProjects = JSON.parse(sessionStorage.getItem('demo-projects') || '[]') // Removed demoProjects
        // const updatedDemoProjects = demoProjects.filter((p: any) => p.id !== project.id) // Removed demoProjects
        // sessionStorage.setItem('demo-projects', JSON.stringify(updatedDemoProjects)) // Removed demoProjects
        
        // Small delay for progress visualization
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Clear progress notifications
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      // Remove from local state
      setProjects(prev => prev.filter(project => !deletedIds.includes(project.id)))
      
      // Clear any existing undo timeout
      if (undoData) {
        clearTimeout(undoData.timeout)
      }
      
      // Set up new undo timeout (30 seconds)
      const timeout = setTimeout(() => {
        setUndoData(null)
      }, 30000)
      
      setUndoData({ items: projectsToDelete, timeout })
      
      // Show toast with undo action
      toast.success(`${deletedIds.length} project${deletedIds.length > 1 ? 's' : ''} deleted successfully`, {
        action: {
          label: "Undo",
          onClick: () => handleUndo(projectsToDelete),
        },
      })
    } catch (error) {
      console.error('Error during batch delete:', error)
      
      // Clear progress notifications on error
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      toast.error(`Failed to delete projects: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAddProject = () => {
    setSelectedProject(null) // Clear any selected project
    setSelectedClient(null) // Clear any selected client
    setClientSearchQuery("") // Clear search query
    setDisplayedClientsCount(10) // Reset displayed count
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
    setIsAddDialogOpen(true)
  }

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
          // Update in database
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

          if (!data || data.length === 0) {
            throw new Error('No data returned from update')
          }

          // Update local state with database data
          const updatedProject: Project = {
            ...selectedProject,
            name: data[0].name,
            status: data[0].status,
            start_date: data[0].start_date,
            due_date: data[0].due_date,
            budget: data[0].budget,
            expenses: data[0].expenses,
            received: data[0].payment_received,
            pending: data[0].payment_pending,
            clients: clientForProject ? {
              name: clientForProject.name,
              company: clientForProject.company,
              avatar_url: clientForProject.avatar_url,
            } : undefined,
          }

          setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p))
          setIsEditDialogOpen(false)
          toast.success(`Project "${updatedProject.name}" has been updated successfully`)
        } else {
          // Fallback to local state only
          const updatedProject: Project = {
            ...selectedProject,
            name: newProject.name,
            status: newProject.status,
            start_date: newProject.start_date ? newProject.start_date.toISOString() : undefined,
            due_date: newProject.due_date ? newProject.due_date.toISOString() : undefined,
            budget: budget || undefined,
            expenses: expenses,
            received: received,
            pending: pending,
            clients: clientForProject ? {
              name: clientForProject.name,
              company: clientForProject.company,
              avatar_url: clientForProject.avatar_url,
            } : undefined,
          }

          setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p))
          setIsEditDialogOpen(false)
          toast.success(`Project "${updatedProject.name}" has been updated successfully`)
        }
      } else {
        // Adding new project
        if (isSupabaseConfigured()) {
          // Insert into database
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
            console.error('Error creating project:', error)
            throw new Error(error.message)
          }

          if (!data || data.length === 0) {
            throw new Error('No data returned from insert')
          }

          // Add to local state with database data
          const newProjectData: Project = {
            id: data[0].id,
            name: data[0].name,
            status: data[0].status,
            start_date: data[0].start_date,
            due_date: data[0].due_date,
            budget: data[0].budget,
            expenses: data[0].expenses,
            received: data[0].payment_received,
            pending: data[0].payment_pending,
            created_at: data[0].created_at,
            clients: clientForProject ? {
              name: clientForProject.name,
              company: clientForProject.company,
              avatar_url: clientForProject.avatar_url,
            } : undefined,
          }

          setProjects([newProjectData, ...projects])
          setIsAddDialogOpen(false)
          toast.success(`Project "${newProjectData.name}" has been created successfully`)
        } else {
          // Fallback to local state only
          const project: Project = {
            id: Date.now().toString(),
            name: newProject.name,
            status: newProject.status,
            start_date: newProject.start_date ? newProject.start_date.toISOString() : undefined,
            due_date: newProject.due_date ? newProject.due_date.toISOString() : undefined,
            budget: budget || undefined,
            expenses: expenses,
            received: received,
            pending: pending,
            created_at: new Date().toISOString(),
            clients: clientForProject ? {
              name: clientForProject.name,
              company: clientForProject.company,
              avatar_url: clientForProject.avatar_url,
            } : undefined,
          }

          setProjects([project, ...projects])
          setIsAddDialogOpen(false)
          toast.success(`Project "${project.name}" has been created successfully`)
        }
      }

      // Reset form
      setSelectedProject(null)
      setSelectedClient(null)
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const confirmDelete = async () => {
    if (selectedProject) {
      try {
        if (isSupabaseConfigured()) {
          // Delete from database
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', selectedProject.id)

          if (error) {
            console.error('Error deleting project:', error)
            throw new Error(error.message)
          }
        }

        // Remove from local state
        setProjects(projects.filter((p) => p.id !== selectedProject.id))
        toast.success(`Project "${selectedProject.name}" deleted successfully`)
        setIsDeleteDialogOpen(false)
        setSelectedProject(null)
      } catch (error) {
        console.error('Error deleting project:', error)
        toast.error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Name', 'Status', 'Start Date', 'End Date', 'Budget', 'Expenses', 'Received', 'Pending', 'Client Name', 'Client Company', 'Created At']
    const csvContent = [
      headers.join(','),
      ...projects.map(project => [
        project.name,
        project.status,
        project.start_date || '',
        project.due_date || '',
        project.budget || '',
        project.expenses || '',
        project.received || '',
        project.pending || '',
        project.clients?.name || '',
        project.clients?.company || '',
        project.created_at || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projects-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Exported ${projects.length} projects to CSV`)
  }

  const columns = createColumns({
    onEditProject: handleEditProject,
    onCreateInvoice: handleCreateInvoice,
    onDeleteProject: handleDeleteProject,
    onStatusChange: handleStatusChange,
    onDateChange: handleDateChange,
  })

  // Summary calculations
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const pipelineProjects = projects.filter((p) => p.status === "pipeline").length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const onHoldProjects = projects.filter((p) => p.status === "on_hold").length
  const cancelledProjects = projects.filter((p) => p.status === "cancelled").length
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalExpenses = projects.reduce((sum, p) => sum + (p.expenses || 0), 0)
  const totalReceived = projects.reduce((sum, p) => sum + (p.received || 0), 0)
  // Auto-calculate total pending from budget - received for each project
  const totalPending = projects.reduce((sum, p) => {
    const budget = p.budget || 0
    const received = p.received || 0
    const pending = Math.max(0, budget - received)
    return sum + pending
  }, 0)

  return (
    <>
      <PageHeader
        title="Projects"
        action={<PageActionsMenu entityType="projects" onExport={handleExport} />}
      />
      <PageContent>


        {/* Summary Cards */}
        {projectsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-muted/60 rounded-sm"></div>
                  <div className="h-8 w-12 bg-muted/80 rounded-sm"></div>
                  <div className="h-3 w-28 bg-muted/40 rounded-sm"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-normal text-muted-foreground">Total Projects</h3>
              </div>
              <div className="text-2xl font-normal">{totalProjects}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {activeProjects} Active • {pipelineProjects} Pipeline • {completedProjects} Completed
              </div>
            </div>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-normal text-muted-foreground">Active Projects</h3>
              </div>
              <div className="text-2xl font-normal text-blue-600">{activeProjects}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pipelineProjects} in Pipeline • {onHoldProjects} On Hold
              </div>
            </div>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-normal text-muted-foreground">Total Received</h3>
              </div>
              <div className="text-2xl font-normal text-green-600">{formatCurrency(totalReceived)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalBudget)} Total Budget
              </div>
            </div>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-normal text-muted-foreground">Total Pending</h3>
              </div>
              <div className="text-2xl font-normal text-yellow-600">{formatCurrency(totalPending)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {cancelledProjects} Cancelled Projects
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        <DataTable 
          columns={columns} 
          data={projects} 
          loading={projectsLoading}
          onAddProject={handleAddProject} 
          onBatchDelete={handleBatchDelete}
          contextActions={{
            onEditProject: handleEditProject,
            onCreateInvoice: handleCreateInvoice,
            onDeleteProject: handleDeleteProject,
            onStatusChange: handleStatusChange,
          }}
        />
      </PageContent>

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
                      disabled={clientsLoading}
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
                        <span className="text-muted-foreground flex-1 mr-2">
                          {clientsLoading ? "Loading..." : "Select client"}
                        </span>
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
                            {displayedClients.length < filteredClients.length && (
                              <CommandItem
                                onSelect={loadMoreClients}
                                className="text-center text-sm text-muted-foreground p-2 cursor-pointer hover:bg-accent"
                              >
                                Load more clients... ({filteredClients.length - displayedClients.length} remaining)
                              </CommandItem>
                            )}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pipeline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span>Pipeline</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="on_hold">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>On Hold</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>Cancelled</span>
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
            {/* Auto-calculated pending amount display */}
            {(newProject.budget || newProject.received) && (
              <div className="bg-muted/50 p-3 rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending Amount (Auto-calculated):</span>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, (parseFloat(newProject.budget) || 0) - (parseFloat(newProject.received) || 0)))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(parseFloat(newProject.budget) || 0)} (Budget) - {formatCurrency(parseFloat(newProject.received) || 0)} (Received)
                </div>
              </div>
            )}
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
                      disabled={clientsLoading}
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
                        <span className="text-muted-foreground flex-1 mr-2">
                          {clientsLoading ? "Loading..." : "Select client"}
                        </span>
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
                            {displayedClients.length < filteredClients.length && (
                              <CommandItem
                                onSelect={loadMoreClients}
                                className="text-center text-sm text-muted-foreground p-2 cursor-pointer hover:bg-accent"
                              >
                                Load more clients... ({filteredClients.length - displayedClients.length} remaining)
                              </CommandItem>
                            )}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pipeline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span>Pipeline</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="on_hold">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>On Hold</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>Cancelled</span>
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
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <Label htmlFor="add-project-pending">Pending (Auto-calculated)</Label>
                <Input
                  id="add-project-pending"
                  type="number"
                  value={(() => {
                    const budget = newProject.budget ? parseFloat(newProject.budget) : 0
                    const received = newProject.received ? parseFloat(newProject.received) : 0
                    return budget - received
                  })()}
                  disabled
                  className="bg-muted"
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
              Add Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
