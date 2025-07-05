"use client"

import * as React from "react"
import { Eye, Clock } from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { DataTable } from "@/components/projects/data-table"
import { createColumns, type Project } from "@/components/projects/columns"
import { formatCurrency } from "@/lib/currency"

// Mock data for projects with new fields
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign Project",
    status: "active",
    start_date: "2024-01-15",
    end_date: "2024-03-15",
    budget: 15000,
    expenses: 2500,
    received: 7500,
    pending: 5000,
    created_at: "2024-01-10T10:00:00Z",
    clients: {
      name: "John Smith",
      company: "Acme Corporation",
    },
  },
  {
    id: "2",
    name: "Mobile App Development",
    status: "completed",
    start_date: "2023-10-01",
    end_date: "2024-01-31",
    budget: 45000,
    expenses: 8500,
    received: 45000,
    pending: 0,
    created_at: "2023-09-25T14:30:00Z",
    clients: {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
    },
  },
  {
    id: "3",
    name: "E-commerce Platform Build",
    status: "on_hold",
    start_date: "2024-02-01",
    end_date: "2024-06-30",
    budget: 32000,
    expenses: 1200,
    received: 10000,
    pending: 21800,
    created_at: "2024-01-28T09:15:00Z",
    clients: {
      name: "Michael Brown",
      company: "Global Solutions LLC",
    },
  },
  {
    id: "4",
    name: "Data Analytics Dashboard",
    status: "active",
    start_date: "2024-03-01",
    end_date: "2024-05-15",
    budget: 28000,
    expenses: 3200,
    received: 14000,
    pending: 10800,
    created_at: "2024-02-25T16:45:00Z",
    clients: {
      name: "Emily Davis",
      company: "Creative Studio",
    },
  },
  {
    id: "5",
    name: "Legacy System Migration",
    status: "cancelled",
    start_date: "2024-01-01",
    end_date: "2024-04-30",
    budget: 55000,
    expenses: 0,
    received: 0,
    pending: 0,
    created_at: "2023-12-20T11:20:00Z",
    clients: {
      name: "David Wilson",
      company: "Retail Plus",
    },
  },
]

// Mock clients data for project creation (matching clients page data)
const mockClients = [
  { id: "1", name: "John Smith", company: "Acme Corporation", avatar_url: undefined },
  { id: "2", name: "Sarah Johnson", company: "TechStart Inc.", avatar_url: undefined },
  { id: "3", name: "Michael Brown", company: "Global Solutions LLC", avatar_url: undefined },
  { id: "4", name: "Emily Davis", company: "Creative Studio", avatar_url: undefined },
  { id: "5", name: "David Wilson", company: "Retail Plus", avatar_url: undefined },
]

const statusOptions = [
  { value: "active", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

interface NewProject {
  name: string
  client_id: string
  status: string
  start_date: Date | undefined
  end_date: Date | undefined
  budget: string
  expenses: string
  received: string
  description: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>(mockProjects)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [undoData, setUndoData] = React.useState<{ items: Project[], timeout: NodeJS.Timeout } | null>(null)

  const [newProject, setNewProject] = React.useState<NewProject>({
    name: "",
    client_id: "",
    status: "active",
    start_date: undefined,
    end_date: undefined,
    budget: "",
    expenses: "",
    received: "",
    description: "",
  })


  // Cleanup undo timeout on unmount
  React.useEffect(() => {
    return () => {
      if (undoData) {
        clearTimeout(undoData.timeout)
      }
    }
  }, [undoData])

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
          const matchingClient = mockClients.find(client => 
            client.name === clientData.clientName || 
            client.company === clientData.clientCompany
          )
          
          if (matchingClient) {
            // Set the client_id in the form
            setNewProject(prev => ({
              ...prev,
              client_id: matchingClient.id
            }))
            
            toast.success(`${clientData.clientName} has been pre-selected for the new project`)
          } else {
            // If no exact match, try to find by name similarity
            const similarClient = mockClients.find(client => 
              client.name.toLowerCase().includes(clientData.clientName.toLowerCase()) ||
              clientData.clientName.toLowerCase().includes(client.name.toLowerCase())
            )
            
            if (similarClient) {
              setNewProject(prev => ({
                ...prev,
                client_id: similarClient.id
              }))
              
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

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project)
    setIsViewDialogOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    // Populate editing form with current project data
    setNewProject({
      name: project.name,
      client_id: project.clients ? mockClients.find(c => c.name === project.clients!.name)?.id || "" : "",
      status: project.status,
      start_date: project.start_date ? new Date(project.start_date) : undefined,
      end_date: project.end_date ? new Date(project.end_date) : undefined,
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
    try {
      // In a real app, you would delete from the database here
      const deletedIds = projectsToDelete.map(project => project.id)
      
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
      toast(`${deletedIds.length} project${deletedIds.length > 1 ? 's' : ''} deleted successfully`, {
        action: {
          label: "Undo",
          onClick: () => handleUndo(projectsToDelete),
        },
      })
    } catch (error) {
      console.error('Error during batch delete:', error)
      toast.error("Failed to delete projects. Please try again.")
    }
  }

  const handleAddProject = () => {
    setSelectedProject(null) // Clear any selected project
    setNewProject({
      name: "",
      client_id: "",
      status: "active",
      start_date: undefined,
      end_date: undefined,
      budget: "",
      expenses: "",
      received: "",
      description: "",
    })
    setIsAddDialogOpen(true)
  }

  const handleSaveProject = () => {
    if (!newProject.name) {
      toast.error("Project name is required")
      return
    }

    const selectedClient = mockClients.find(c => c.id === newProject.client_id)
    
    const budget = newProject.budget ? parseFloat(newProject.budget) : 0
    const expenses = newProject.expenses ? parseFloat(newProject.expenses) : 0
    const received = newProject.received ? parseFloat(newProject.received) : 0
    const pending = Math.max(0, budget - received)

    if (selectedProject) {
      // Editing existing project
      const updatedProject: Project = {
        ...selectedProject,
        name: newProject.name,
        status: newProject.status,
        start_date: newProject.start_date ? newProject.start_date.toISOString() : undefined,
        end_date: newProject.end_date ? newProject.end_date.toISOString() : undefined,
        budget: budget || undefined,
        expenses: expenses,
        received: received,
        pending: pending,
        clients: selectedClient ? {
          name: selectedClient.name,
          company: selectedClient.company,
        } : undefined,
      }

      setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p))
      setIsEditDialogOpen(false)
      toast.success(`Project "${updatedProject.name}" has been updated successfully`)
    } else {
      // Adding new project
      const project: Project = {
        id: Date.now().toString(),
        name: newProject.name,
        status: newProject.status,
        start_date: newProject.start_date ? newProject.start_date.toISOString() : undefined,
        end_date: newProject.end_date ? newProject.end_date.toISOString() : undefined,
        budget: budget || undefined,
        expenses: expenses,
        received: received,
        pending: pending,
        created_at: new Date().toISOString(),
        clients: selectedClient ? {
          name: selectedClient.name,
          company: selectedClient.company,
        } : undefined,
      }

      setProjects([...projects, project])
      setIsAddDialogOpen(false)
      toast.success(`Project "${project.name}" has been created successfully`)
    }

    // Reset form
    setSelectedProject(null)
  }

  const confirmDelete = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id))
      toast.success(`Project "${selectedProject.name}" deleted successfully`)
      setIsDeleteDialogOpen(false)
      setSelectedProject(null)
    }
  }

  const columns = createColumns({
    onViewDetails: handleViewDetails,
    onEditProject: handleEditProject,
    onCreateInvoice: handleCreateInvoice,
    onDeleteProject: handleDeleteProject,
  })

  // Summary calculations
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalExpenses = projects.reduce((sum, p) => sum + (p.expenses || 0), 0)
  const totalReceived = projects.reduce((sum, p) => sum + (p.received || 0), 0)
  const totalPending = projects.reduce((sum, p) => sum + (p.pending || 0), 0)

  return (
    <>
      <PageHeader
        title="Projects"
        breadcrumbs={[{ label: "Projects" }]}
      />
      <PageContent>
        <PageTitle title="Projects" description="Manage your projects and track their progress" />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Projects</h3>
            </div>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">All projects in system</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Budget</h3>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Combined project value</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Received</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
            <p className="text-xs text-muted-foreground">Payments received</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Pending</h3>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">Outstanding payments</p>
          </div>
        </div>

        {/* Projects Table */}
        <DataTable 
          columns={columns} 
          data={projects} 
          onAddProject={handleAddProject} 
          onBatchDelete={handleBatchDelete}
          contextActions={{
            onViewDetails: handleViewDetails,
            onEditProject: handleEditProject,
            onCreateInvoice: handleCreateInvoice,
            onDeleteProject: handleDeleteProject,
          }}
        />
      </PageContent>

      {/* View Project Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>Project details and financial information</DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-zinc-700 font-medium">
                      {selectedProject.status === "completed" ? (
                        <>
                          <Eye className="fill-green-500 dark:fill-green-400 mr-1 h-3 w-3" />
                          Done
                        </>
                      ) : selectedProject.status === "active" ? (
                        <>
                          <Clock className="mr-1 h-3 w-3" />
                          In Progress
                        </>
                      ) : (
                        selectedProject.status
                      )}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="mt-1 text-sm">{selectedProject.clients?.name || "No client assigned"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Budget</Label>
                  <p className="mt-1 text-sm font-medium">{formatCurrency(selectedProject.budget || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expenses</Label>
                  <p className="mt-1 text-sm font-medium text-red-600">{formatCurrency(selectedProject.expenses || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Received</Label>
                  <p className="mt-1 text-sm font-medium text-green-600">
                    {formatCurrency(selectedProject.received || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pending</Label>
                  <p className="mt-1 text-sm font-medium text-yellow-600">
                    {formatCurrency(selectedProject.pending || 0)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="mt-1 text-sm">
                    {selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <p className="mt-1 text-sm">
                    {selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          setSelectedProject(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>Create a new project and assign it to a client</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="project-client">Client</Label>
                <Select value={newProject.client_id} onValueChange={(value) => setNewProject({ ...newProject, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={client.avatar_url || "/placeholder-user.jpg"} alt={client.name} />
                            <AvatarFallback className="text-xs">
                              {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{client.name} - {client.company}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-status">Status</Label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project-budget">Budget</Label>
                <Input
                  id="project-budget"
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-expenses">Expenses</Label>
                <Input
                  id="project-expenses"
                  type="number"
                  value={newProject.expenses}
                  onChange={(e) => setNewProject({ ...newProject, expenses: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="project-received">Received Amount</Label>
                <Input
                  id="project-received"
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
                <Label>End Date</Label>
                <DatePicker
                  date={newProject.end_date}
                  onSelect={(date) => setNewProject({ ...newProject, end_date: date })}
                  placeholder="Pick end date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description or notes"
                rows={3}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedProject(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={!newProject.name}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setSelectedProject(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
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
                <Select value={newProject.client_id} onValueChange={(value) => setNewProject({ ...newProject, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={client.avatar_url || "/placeholder-user.jpg"} alt={client.name} />
                            <AvatarFallback className="text-xs">
                              {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{client.name} - {client.company}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-project-status">Status</Label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
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
                <Label>End Date</Label>
                <DatePicker
                  date={newProject.end_date}
                  onSelect={(date) => setNewProject({ ...newProject, end_date: date })}
                  placeholder="Pick end date"
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
             <Button variant="outline" onClick={() => {
               setIsEditDialogOpen(false)
               setSelectedProject(null)
             }}>
               Cancel
             </Button>
            <Button onClick={handleSaveProject} disabled={!newProject.name}>
              Update Project
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
