"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { DataTable } from "@/components/clients/data-table"
import { createColumns, type Client } from "@/components/clients/columns"

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
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Partial<Client>>({})
  const { toast } = useToast()

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

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client)
    setShowViewDialog(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setEditingClient(client)
    setShowEditDialog(true)
  }

  const handleAddClient = () => {
    setEditingClient({})
    setShowAddDialog(true)
  }

  const handleCreateInvoice = (client: Client) => {
    toast({
      title: "Create Invoice",
      description: `Creating invoice for ${client.name}...`,
    })
    // TODO: Navigate to invoice creation page with client pre-selected
  }

  const handleNewProject = (client: Client) => {
    toast({
      title: "New Project",
      description: `Creating new project for ${client.name}...`,
    })
    // TODO: Navigate to project creation page with client pre-selected
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedClient) return

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("clients").delete().eq("id", selectedClient.id)

        if (error) throw error
      }

      // Remove from local state
      setClients(clients.filter((c) => c.id !== selectedClient.id))

      toast({
        title: "Client Deleted",
        description: `${selectedClient.name} has been deleted successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setShowDeleteDialog(false)
      setSelectedClient(null)
    }
  }

  const handleSaveClient = async () => {
    try {
      if (isSupabaseConfigured()) {
        if (selectedClient) {
          // Update existing client
          const { error } = await supabase.from("clients").update(editingClient).eq("id", selectedClient.id)

          if (error) throw error

          // Update local state
          setClients(clients.map((c) => (c.id === selectedClient.id ? { ...c, ...editingClient } : c)))
        } else {
          // Add new client
          const newClient = {
            ...editingClient,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
          }

          const { error } = await supabase.from("clients").insert([newClient])

          if (error) throw error

          // Add to local state
          setClients([newClient as Client, ...clients])
        }
      } else {
        // Mock data handling
        if (selectedClient) {
          setClients(clients.map((c) => (c.id === selectedClient.id ? { ...c, ...editingClient } : c)))
        } else {
          const newClient = {
            ...editingClient,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
          } as Client
          setClients([newClient, ...clients])
        }
      }

      toast({
        title: selectedClient ? "Client Updated" : "Client Added",
        description: `${editingClient.name} has been ${selectedClient ? "updated" : "added"} successfully.`,
      })

      setShowEditDialog(false)
      setShowAddDialog(false)
      setSelectedClient(null)
      setEditingClient({})
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedClient ? "update" : "add"} client. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const columns = createColumns({
    onViewDetails: handleViewDetails,
    onEditClient: handleEditClient,
    onCreateInvoice: handleCreateInvoice,
    onNewProject: handleNewProject,
    onDeleteClient: handleDeleteClient,
  })

  if (loading) {
    return (
      <>
        <PageHeader title="Clients" breadcrumbs={[{ label: "Clients" }]} />
        <PageContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <Button size="sm" onClick={handleAddClient}>
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

        <DataTable columns={columns} data={clients} />
      </PageContent>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>Complete information for {selectedClient?.name}</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Company</Label>
                  <p className="text-sm text-muted-foreground">{selectedClient.company || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedClient.email || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-muted-foreground">{selectedClient.phone || "N/A"}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedClient.address && (
                    <>
                      {selectedClient.address}
                      <br />
                      {selectedClient.city}, {selectedClient.state} {selectedClient.zip_code}
                      <br />
                      {selectedClient.country}
                    </>
                  )}
                  {!selectedClient.address && "N/A"}
                </p>
              </div>
              {selectedClient.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedClient.notes}</p>
                </div>
              )}
              {selectedClient.projects && selectedClient.projects.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Projects</Label>
                  <div className="space-y-2 mt-2">
                    {selectedClient.projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{project.name}</span>
                        <Badge
                          variant="secondary"
                          className={`text-white text-xs ${statusColors[project.status as keyof typeof statusColors]}`}
                        >
                          {statusLabels[project.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={editingClient.name || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editingClient.company || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingClient.email || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingClient.phone || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editingClient.address || ""}
                onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editingClient.city || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editingClient.state || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={editingClient.zip_code || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, zip_code: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={editingClient.country || ""}
                onChange={(e) => setEditingClient({ ...editingClient, country: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editingClient.notes || ""}
                onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={!editingClient.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client record</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-name">Name *</Label>
                <Input
                  id="new-name"
                  value={editingClient.name || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-company">Company</Label>
                <Input
                  id="new-company"
                  value={editingClient.company || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={editingClient.email || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={editingClient.phone || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={editingClient.address || ""}
                onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-city">City</Label>
                <Input
                  id="new-city"
                  value={editingClient.city || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-state">State</Label>
                <Input
                  id="new-state"
                  value={editingClient.state || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-zip_code">Zip Code</Label>
                <Input
                  id="new-zip_code"
                  value={editingClient.zip_code || ""}
                  onChange={(e) => setEditingClient({ ...editingClient, zip_code: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-country">Country</Label>
              <Input
                id="new-country"
                value={editingClient.country || ""}
                onChange={(e) => setEditingClient({ ...editingClient, country: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="new-notes">Notes</Label>
              <Textarea
                id="new-notes"
                value={editingClient.notes || ""}
                onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={!editingClient.name}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedClient?.name} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
