"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Calendar, DollarSign, User, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface Project {
  id: string
  name: string
  description?: string
  status: string
  start_date?: string
  end_date?: string
  budget?: number
  hourly_rate?: number
  estimated_hours?: number
  actual_hours?: number
  progress?: number
  notes?: string
  created_at: string
  clients?: {
    name: string
    company?: string
  }
}

const statusColors = {
  active: "bg-green-500",
  completed: "bg-blue-500",
  on_hold: "bg-yellow-500",
  cancelled: "bg-red-500",
}

const statusLabels = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
}

// Mock data fallback
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete redesign of corporate website with modern UI/UX",
    status: "active",
    start_date: "2024-01-15",
    end_date: "2024-03-15",
    budget: 15000,
    hourly_rate: 125,
    estimated_hours: 120,
    actual_hours: 45,
    progress: 65,
    notes: "Phase 1 completed, working on responsive design",
    created_at: "2024-01-15T00:00:00Z",
    clients: {
      name: "John Smith",
      company: "Acme Corporation",
    },
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Native iOS and Android app for customer engagement",
    status: "active",
    start_date: "2024-02-01",
    end_date: "2024-06-01",
    budget: 45000,
    hourly_rate: 150,
    estimated_hours: 300,
    actual_hours: 120,
    progress: 40,
    notes: "Backend API development in progress",
    created_at: "2024-02-01T00:00:00Z",
    clients: {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
    },
  },
  {
    id: "3",
    name: "Brand Identity Package",
    description: "Logo design, brand guidelines, and marketing materials",
    status: "completed",
    start_date: "2023-11-01",
    end_date: "2024-01-31",
    budget: 8500,
    hourly_rate: 100,
    estimated_hours: 85,
    actual_hours: 85,
    progress: 100,
    notes: "Project completed successfully, client very satisfied",
    created_at: "2023-11-01T00:00:00Z",
    clients: {
      name: "Michael Brown",
      company: "Global Solutions LLC",
    },
  },
  {
    id: "4",
    name: "E-commerce Platform",
    description: "Custom e-commerce solution with payment integration",
    status: "active",
    start_date: "2024-01-01",
    end_date: "2024-04-30",
    budget: 25000,
    hourly_rate: 140,
    estimated_hours: 180,
    actual_hours: 60,
    progress: 35,
    notes: "Payment gateway integration phase",
    created_at: "2024-01-01T00:00:00Z",
    clients: {
      name: "Emily Davis",
      company: "Creative Studio",
    },
  },
  {
    id: "5",
    name: "Marketing Automation",
    description: "Email marketing and CRM integration system",
    status: "on_hold",
    start_date: "2024-02-15",
    end_date: "2024-05-15",
    budget: 12000,
    hourly_rate: 120,
    estimated_hours: 100,
    actual_hours: 25,
    progress: 25,
    notes: "On hold pending client budget approval",
    created_at: "2024-02-15T00:00:00Z",
    clients: {
      name: "David Wilson",
      company: "Retail Plus",
    },
  },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setError(null)

      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, using mock data")
        setProjects(mockProjects)
        setError("Using demo data - Supabase not configured")
        return
      }

      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        // Use mock data as fallback
        setProjects(mockProjects)
        setError("Using demo data - database connection failed")
      } else {
        setProjects(data || [])
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      // Use mock data as fallback
      setProjects(mockProjects)
      setError("Using demo data - connection error")
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clients?.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Projects" breadcrumbs={[{ label: "Projects" }]} />
        <PageContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Projects"
        breadcrumbs={[{ label: "Projects" }]}
        action={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />
      <PageContent>
        <PageTitle title="Projects" description="Track progress and manage your active projects" error={error} />

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  {project.clients && (
                    <CardDescription className="text-xs">
                      {project.clients.company || project.clients.name}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Project</DropdownMenuItem>
                    <DropdownMenuItem>Edit Project</DropdownMenuItem>
                    <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                    <DropdownMenuItem>Time Tracking</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Project</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-white ${statusColors[project.status as keyof typeof statusColors]}`}
                  >
                    {statusLabels[project.status as keyof typeof statusLabels]}
                  </Badge>
                  {project.budget && (
                    <div className="flex items-center space-x-1 text-sm font-semibold">
                      <DollarSign className="h-3 w-3" />
                      <span>${project.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}

                {project.progress !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {project.estimated_hours && project.actual_hours !== undefined && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {project.actual_hours}h / {project.estimated_hours}h
                      </span>
                    </div>
                  )}

                  {project.hourly_rate && (
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">${project.hourly_rate}/hr</span>
                    </div>
                  )}
                </div>

                {project.end_date && project.status !== "completed" && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {new Date(project.end_date).toLocaleDateString()}</span>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        getDaysRemaining(project.end_date) < 0
                          ? "text-red-600"
                          : getDaysRemaining(project.end_date) <= 7
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {getDaysRemaining(project.end_date) < 0
                        ? `${Math.abs(getDaysRemaining(project.end_date))} days overdue`
                        : `${getDaysRemaining(project.end_date)} days left`}
                    </span>
                  </div>
                )}

                {project.clients && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{project.clients.name}</span>
                  </div>
                )}

                {project.notes && <p className="text-xs text-muted-foreground line-clamp-2">{project.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first project"}
            </p>
          </div>
        )}
      </PageContent>
    </>
  )
}
