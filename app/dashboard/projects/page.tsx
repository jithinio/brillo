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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { DataTable } from "@/components/projects/data-table"
import { createColumns, type Project } from "@/components/projects/columns"

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
      company: "Tech Corp",
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
      company: "StartupXYZ",
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
      name: "Mike Davis",
      company: "Retail Plus",
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
      name: "Lisa Chen",
      company: "DataFlow Inc",
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
      name: "Robert Wilson",
      company: "Enterprise Solutions",
    },
  },
  {
    id: "6",
    name: "Brand Identity Package Design",
    status: "completed",
    start_date: "2023-11-01",
    end_date: "2024-01-15",
    budget: 12000,
    expenses: 800,
    received: 12000,
    pending: 0,
    created_at: "2023-10-25T13:30:00Z",
    clients: {
      name: "Emma Thompson",
      company: "Creative Studio",
    },
  },
]

// Mock clients data for project creation
const mockClients = [
  { id: "1", name: "John Smith", company: "Tech Corp" },
  { id: "2", name: "Sarah Johnson", company: "StartupXYZ" },
  { id: "3", name: "Mike Davis", company: "Retail Plus" },
  { id: "4", name: "Lisa Chen", company: "DataFlow Inc" },
  { id: "5", name: "Robert Wilson", company: "Enterprise Solutions" },
  { id: "6", name: "Emma Thompson", company: "Creative Studio" },
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
  const [acceptTerms, setAcceptTerms] = React.useState(false)
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
  const { toast } = useToast()

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project)
    setIsViewDialogOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setIsEditDialogOpen(true)
  }

  const handleCreateInvoice = (project: Project) => {
    toast({
      title: "Invoice Creation",
      description: `Creating invoice for ${project.name}`,
    })
  }

  const handleTimeTracking = (project: Project) => {
    toast({
      title: "Time Tracking",
      description: `Opening time tracking for ${project.name}`,
    })
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
  }

  const handleAddProject = () => {
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
    setAcceptTerms(false)
    setIsAddDialogOpen(true)
  }

  const handleSaveProject = () => {
    if (!newProject.name || !acceptTerms) {
      return
    }

    const selectedClient = mockClients.find(c => c.id === newProject.client_id)
    
    const budget = newProject.budget ? parseFloat(newProject.budget) : 0
    const expenses = newProject.expenses ? parseFloat(newProject.expenses) : 0
    const received = newProject.received ? parseFloat(newProject.received) : 0
    const pending = Math.max(0, budget - received)

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
    toast({
      title: "Project Created",
      description: `Project "${project.name}" has been created successfully.`,
    })
  }

  const confirmDelete = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id))
      toast({
        title: "Project Deleted",
        description: `Project "${selectedProject.name}" deleted successfully`,
      })
      setIsDeleteDialogOpen(false)
      setSelectedProject(null)
    }
  }

  const columns = createColumns({
    onViewDetails: handleViewDetails,
    onEditProject: handleEditProject,
    onCreateInvoice: handleCreateInvoice,
    onTimeTracking: handleTimeTracking,
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
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined project value</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Received</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">${totalReceived.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Payments received</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Pending</h3>
            </div>
            <div className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding payments</p>
          </div>
        </div>

        {/* Projects Table */}
        <DataTable columns={columns} data={projects} onAddProject={handleAddProject} />
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
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
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
                  <p className="mt-1 text-sm font-medium">${selectedProject.budget?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expenses</Label>
                  <p className="mt-1 text-sm font-medium text-red-600">${selectedProject.expenses?.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Received</Label>
                  <p className="mt-1 text-sm font-medium text-green-600">
                    ${selectedProject.received?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pending</Label>
                  <p className="mt-1 text-sm font-medium text-yellow-600">
                    ${selectedProject.pending?.toLocaleString()}
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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                        {client.name} - {client.company}
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
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="project-terms" 
                checked={acceptTerms} 
                onCheckedChange={(checked) => setAcceptTerms(checked === true)} 
              />
              <Label
                htmlFor="project-terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the terms and conditions for creating this project
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={!newProject.name || !acceptTerms}>
              Create Project
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
