"use client"

import * as React from "react"
import { Plus, Eye, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

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

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>(mockProjects)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project)
    setIsViewDialogOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setIsEditDialogOpen(true)
  }

  const handleCreateInvoice = (project: Project) => {
    toast.success(`Creating invoice for ${project.name}`)
  }

  const handleTimeTracking = (project: Project) => {
    toast.success(`Opening time tracking for ${project.name}`)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
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
        action={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        }
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
        <DataTable columns={columns} data={projects} />
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
