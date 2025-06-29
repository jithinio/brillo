"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Mail, Phone, Building, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  notes?: string
  created_at: string
  projects?: Array<{
    id: string
    name: string
    status: string
  }>
}

// Mock data fallback
const mockClients: Client[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@acmecorp.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Corporation",
    address: "123 Business Ave",
    city: "New York",
    state: "NY",
    zip_code: "10001",
    country: "United States",
    notes: "Long-term client, prefers email communication",
    created_at: "2024-01-01T00:00:00Z",
    projects: [{ id: "1", name: "Website Redesign", status: "active" }],
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@techstart.io",
    phone: "+1 (555) 234-5678",
    company: "TechStart Inc.",
    address: "456 Innovation Dr",
    city: "San Francisco",
    state: "CA",
    zip_code: "94105",
    country: "United States",
    notes: "Startup client, fast-paced projects",
    created_at: "2024-01-15T00:00:00Z",
    projects: [{ id: "2", name: "Mobile App Development", status: "active" }],
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "mbrown@globalsolutions.com",
    phone: "+1 (555) 345-6789",
    company: "Global Solutions LLC",
    address: "789 Enterprise Blvd",
    city: "Chicago",
    state: "IL",
    zip_code: "60601",
    country: "United States",
    notes: "Enterprise client, requires detailed reporting",
    created_at: "2024-01-10T00:00:00Z",
    projects: [{ id: "3", name: "Brand Identity Package", status: "completed" }],
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.davis@creativestudio.com",
    phone: "+1 (555) 456-7890",
    company: "Creative Studio",
    address: "321 Design St",
    city: "Los Angeles",
    state: "CA",
    zip_code: "90210",
    country: "United States",
    notes: "Creative agency, values innovative solutions",
    created_at: "2024-01-20T00:00:00Z",
    projects: [{ id: "4", name: "E-commerce Platform", status: "active" }],
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david@retailplus.com",
    phone: "+1 (555) 567-8901",
    company: "Retail Plus",
    address: "654 Commerce Way",
    city: "Miami",
    state: "FL",
    zip_code: "33101",
    country: "United States",
    notes: "Retail client, seasonal projects",
    created_at: "2024-02-01T00:00:00Z",
    projects: [{ id: "5", name: "Marketing Automation", status: "on_hold" }],
  },
]

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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      setError(null)

      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, using mock data")
        setClients(mockClients)
        setError("Using demo data - Supabase not configured")
        return
      }

      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          projects (
            id,
            name,
            status
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        // Use mock data as fallback
        setClients(mockClients)
        setError("Using demo data - database connection failed")
      } else {
        setClients(data || [])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      // Use mock data as fallback
      setClients(mockClients)
      setError("Using demo data - connection error")
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <>
        <PageHeader title="Clients" breadcrumbs={[{ label: "Clients" }]} />
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
        title="Clients"
        breadcrumbs={[{ label: "Clients" }]}
        action={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        }
      />
      <PageContent>
        <PageTitle
          title="Clients"
          description="Manage your client relationships and contact information"
          error={error}
        />

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  {client.company && (
                    <CardDescription className="text-xs flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>{client.company}</span>
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
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Client</DropdownMenuItem>
                    <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                    <DropdownMenuItem>New Project</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Client</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.email && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{client.phone}</span>
                  </div>
                )}

                {(client.city || client.state) && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {client.city}
                      {client.city && client.state && ", "}
                      {client.state}
                    </span>
                  </div>
                )}

                {client.projects && client.projects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Active Projects:</p>
                    <div className="space-y-1">
                      {client.projects.slice(0, 2).map((project) => (
                        <div key={project.id} className="flex items-center justify-between">
                          <span className="text-xs truncate">{project.name}</span>
                          <Badge
                            variant="secondary"
                            className={`text-white text-xs ${statusColors[project.status as keyof typeof statusColors]}`}
                          >
                            {statusLabels[project.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                      ))}
                      {client.projects.length > 2 && (
                        <p className="text-xs text-muted-foreground">+{client.projects.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )}

                {client.notes && <p className="text-xs text-muted-foreground line-clamp-2">{client.notes}</p>}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Client since {new Date(client.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No clients found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first client"}
            </p>
          </div>
        )}
      </PageContent>
    </>
  )
}
