"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { Label } from "@/components/ui/label"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { DialogTrigger } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Search, Plus, Calendar, Users } from "lucide-react"

interface Project {
  id: number
  name: string
  client: string
  status: string
  progress: number
  dueDate: string
  team: number
}

const mockProjects: Project[] = [
  {
    id: 1,
    name: "Website Redesign",
    client: "Acme Corporation",
    status: "In Progress",
    progress: 65,
    dueDate: "2024-02-15",
    team: 4,
  },
  {
    id: 2,
    name: "Mobile App Development",
    client: "TechStart Inc.",
    status: "Planning",
    progress: 20,
    dueDate: "2024-03-30",
    team: 6,
  },
  {
    id: 3,
    name: "Brand Identity",
    client: "Global Solutions",
    status: "Completed",
    progress: 100,
    dueDate: "2024-01-20",
    team: 3,
  },
]

const mockClients = ["Acme Corporation", "TechStart Inc.", "Global Solutions", "New Client"]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    progress: "",
    dueDate: "",
    team: "",
    status: "In Progress" as "In Progress" | "Planning" | "Completed",
  })

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const progress = Number.parseInt(formData.progress)
    const team = Number.parseInt(formData.team) || 0

    if (editingProject) {
      setProjects(
        projects.map((project) =>
          project.id === editingProject.id
            ? {
                ...project,
                name: formData.name,
                client: formData.client,
                progress,
                dueDate: formData.dueDate,
                team,
                status: formData.status,
              }
            : project,
        ),
      )
    } else {
      const newProject: Project = {
        id: Date.now(),
        name: formData.name,
        client: formData.client,
        progress,
        dueDate: formData.dueDate,
        team,
        status: formData.status,
      }
      setProjects([...projects, newProject])
    }
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      client: "",
      progress: "",
      dueDate: "",
      team: "",
      status: "In Progress",
    })
    setEditingProject(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      client: project.client,
      progress: project.progress.toString(),
      dueDate: project.dueDate,
      team: project.team.toString(),
      status: project.status,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (projectId: number) => {
    setProjects(projects.filter((project) => project.id !== projectId))
  }

  const handleGenerateInvoice = (project: Project) => {
    // Navigate to invoice generation page
    console.log("Generate invoice for project:", project.name)
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Track and manage your ongoing projects and deliverables.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProject(null)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project information below." : "Add a new project to your portfolio."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="client" className="text-right">
                    Client
                  </Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="progress" className="text-right">
                    Progress
                  </Label>
                  <Input
                    id="progress"
                    type="number"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="team" className="text-right">
                    Team Size
                  </Label>
                  <Input
                    id="team"
                    type="number"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Planning">Planning</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingProject ? "Update" : "Add"} Project</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge
                  variant={
                    project.status === "Completed"
                      ? "default"
                      : project.status === "In Progress"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <CardDescription>{project.client}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{project.dueDate}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{project.team} members</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => console.log("View Details for project:", project.name)}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleEdit(project)}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
