"use client"

import { useState, useEffect } from "react"
// Plus icon removed - no longer needed
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
import { PhoneInput } from "@/components/ui/phone-input"
import { CountrySelect } from "@/components/ui/country-select"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { PageActionsMenu } from "@/components/page-actions-menu"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { toast } from "sonner"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2, AlertTriangle } from "lucide-react"
import { DataTable } from "@/components/clients/data-table"
import { createColumns, type Client } from "@/components/clients/columns"

// Mock data removed - clients will be loaded from database

const statusConfig = {
  active: {
    label: "Active",
    variant: "outline" as const,
    iconClassName: "text-green-500",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    iconClassName: "text-blue-500",
  },
  on_hold: {
    label: "On Hold",
    variant: "outline" as const,
    iconClassName: "text-yellow-500",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline" as const,
    iconClassName: "text-gray-400",
  },
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Partial<Client>>({})
  const [undoData, setUndoData] = useState<{ items: Client[], timeout: NodeJS.Timeout } | null>(null)



  useEffect(() => {
    fetchClients()
  }, [])

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoData) {
        clearTimeout(undoData.timeout)
      }
    }
  }, [undoData])

  // Listen for command menu events
  useEffect(() => {
    const handleCommandMenuAddClient = () => {
      handleAddClient()
    }

    window.addEventListener('trigger-add-client', handleCommandMenuAddClient)
    return () => {
      window.removeEventListener('trigger-add-client', handleCommandMenuAddClient)
    }
  }, [])

  async function fetchClients() {
    try {
      setError(null)

      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured")
        setClients([])
        setError("Database not configured - please set up Supabase")
        return
      }

      // Data is automatically filtered by RLS policies for the current user
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
        setClients([])
        setError("Database connection failed")
      } else {
        // Use database data directly (includes avatar_url)
        setClients(data || [])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setClients([])
      setError("Connection error")
    } finally {
      setLoading(false)
    }
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
    // Store client data for invoice creation
    sessionStorage.setItem('invoice-client-data', JSON.stringify({
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address,
      clientCity: client.city,
      clientState: client.state,
      clientZipCode: client.zip_code,
      clientCountry: client.country,
    }))
    
    toast.success(`Creating invoice for ${client.name}`, {
      description: "Redirecting to generate invoice..."
    })
    
    // Navigate to invoices page
    setTimeout(() => {
      window.location.href = '/dashboard/invoices/generate'
    }, 1000)
  }

  const handleNewProject = (client: Client) => {
    // Store client data for project creation
    sessionStorage.setItem('project-client-data', JSON.stringify({
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
    }))
    
    toast.success(`Creating project for ${client.name}`, {
      description: "Opening project form..."
    })
    
    // Navigate to projects page with action parameter
    setTimeout(() => {
      window.location.href = '/dashboard/projects?action=add-project'
    }, 500)
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setShowDeleteDialog(true)
  }

  const handleDateChange = async (client: Client, field: 'created_at', date: Date | undefined) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('clients')
          .update({ [field]: date ? date.toISOString().split('T')[0] : null })
          .eq('id', client.id)

        if (error) {
          console.error('Error updating client date:', error)
          throw new Error(error.message)
        }
      }

      // Update local state
      setClients(clients.map(c => 
        c.id === client.id ? { ...c, [field]: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] } : c
      ))

      const fieldLabel = field === 'created_at' ? 'client since date' : field
      toast.success(`Client "${client.name}" ${fieldLabel} updated`)
    } catch (error) {
      console.error('Error updating client date:', error)
      toast.error(`Failed to update client date: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStatusChange = async (client: Client, newStatus: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('clients')
          .update({ status: newStatus })
          .eq('id', client.id)

        if (error) {
          console.error('Error updating client status:', error)
          throw new Error(error.message)
        }
      }

      // Update local state
      setClients(clients.map(c => 
        c.id === client.id ? { ...c, status: newStatus } : c
      ))

      toast.success(`Client "${client.name}" status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating client status:', error)
      toast.error(`Failed to update client status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleBatchDelete = (clients: Client[], onUndo: (items: Client[]) => void) => {
    if (clients.length === 0) return
    confirmBatchDelete(clients, onUndo)
  }

  const handleUndo = (deletedClients: Client[]) => {
    // Clear any existing undo timeout
    if (undoData) {
      clearTimeout(undoData.timeout)
    }
    
    // Restore the deleted clients
    setClients(prev => [...deletedClients, ...prev])
    setUndoData(null)
    
    toast.success(`${deletedClients.length} client${deletedClients.length > 1 ? 's' : ''} restored successfully`)
  }

  const confirmBatchDelete = async (clientsToDelete: Client[], onUndo: (items: Client[]) => void) => {
    if (clientsToDelete.length === 0) return

    // Show progress toast for operations with 3+ items or after 1 second delay
    const showProgress = clientsToDelete.length >= 3
    let progressToastId: string | number | undefined
    let progressTimeout: NodeJS.Timeout | undefined

    try {
      // Set up progress notification for longer operations
      if (showProgress) {
        progressToastId = toast.loading(`Deleting ${clientsToDelete.length} client${clientsToDelete.length > 1 ? 's' : ''}...`, {
          description: "Please wait while we process your request."
        })
      } else {
        // For smaller operations, show progress toast after 1 second delay
        progressTimeout = setTimeout(() => {
          progressToastId = toast.loading(`Deleting ${clientsToDelete.length} client${clientsToDelete.length > 1 ? 's' : ''}...`, {
            description: "Please wait while we process your request."
          })
        }, 1000)
      }

      const deletedIds: string[] = []
      
      for (let i = 0; i < clientsToDelete.length; i++) {
        const client = clientsToDelete[i]
        try {
          if (isSupabaseConfigured()) {
            const { error } = await supabase.from("clients").delete().eq("id", client.id)
            if (error) throw error
          }
          
          deletedIds.push(client.id)

          // Update progress for larger operations
          if (progressToastId) {
            const progress = Math.round(((i + 1) / clientsToDelete.length) * 100)
            toast.loading(`Deleting clients... ${i + 1}/${clientsToDelete.length} (${progress}%)`, {
              id: progressToastId,
              description: `Processing "${client.name}"`
            })
          }
        } catch (error) {
          console.error(`Error deleting client ${client.name}:`, error)
        }
      }

      // Clear progress notifications
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      // Get the successfully deleted clients
      const deletedClients = clientsToDelete.filter(client => deletedIds.includes(client.id))
      
      // Remove successfully deleted clients from local state
      setClients(prev => prev.filter(client => !deletedIds.includes(client.id)))
      
      if (deletedIds.length === clientsToDelete.length) {
        // Clear any existing undo timeout
        if (undoData) {
          clearTimeout(undoData.timeout)
        }
        
        // Set up new undo timeout (30 seconds)
        const timeout = setTimeout(() => {
          setUndoData(null)
        }, 30000)
        
        setUndoData({ items: deletedClients, timeout })
        
        // Show toast with undo action
        toast.success(`${deletedIds.length} client${deletedIds.length > 1 ? 's' : ''} deleted successfully`, {
          action: {
            label: "Undo",
            onClick: () => handleUndo(deletedClients),
          },
        })
      } else {
        toast.success(`${deletedIds.length} of ${clientsToDelete.length} clients deleted successfully`)
        if (deletedIds.length < clientsToDelete.length) {
          toast.error(`${clientsToDelete.length - deletedIds.length} client${clientsToDelete.length - deletedIds.length > 1 ? 's' : ''} failed to delete`)
        }
      }
    } catch (error) {
      console.error('Error during batch delete:', error)
      
      // Clear progress notifications on error
      if (progressTimeout) {
        clearTimeout(progressTimeout)
      }
      if (progressToastId) {
        toast.dismiss(progressToastId)
      }
      
      toast.error("Failed to delete clients. Please try again.")
    }
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

      toast.success(`${selectedClient.name} has been deleted successfully`)
    } catch (error) {
      toast.error("Failed to delete client. Please try again.")
    } finally {
      setShowDeleteDialog(false)
      setSelectedClient(null)
    }
  }

  const handleSaveClient = async () => {
    try {
      // Validate required fields
      if (!editingClient.name?.trim()) {
        toast.error("Client name is required")
        return
      }

      if (isSupabaseConfigured()) {
        // Prepare database fields including avatar_url
        const dbClientData: {
          name: string
          email: string | null
          phone: string | null
          company: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string
          notes: string | null
          avatar_url: string | null
        } = {
          name: editingClient.name.trim(),
          email: editingClient.email?.trim() || null,
          phone: editingClient.phone?.trim() || null,
          company: editingClient.company?.trim() || null,
          address: editingClient.address?.trim() || null,
          city: editingClient.city?.trim() || null,
          state: editingClient.state?.trim() || null,
          zip_code: editingClient.zip_code?.trim() || null,
          country: editingClient.country?.trim() || 'United States',
          notes: editingClient.notes?.trim() || null,
          avatar_url: editingClient.avatar_url || null,
        }

        // Clean up empty strings to null (except for country which always has a default)
        Object.keys(dbClientData).forEach(key => {
          if (key === 'country' || key === 'name') return // Skip required fields
          const value = dbClientData[key as keyof typeof dbClientData]
          if (value === '' || value === undefined) {
            (dbClientData as any)[key] = null
          }
        })

        // Ensure name is not null (database constraint)
        if (!dbClientData.name) {
          throw new Error('Client name is required')
        }

        console.log("Sending to Supabase:", dbClientData)
        
        if (selectedClient) {
          // Update existing client
          const { data, error } = await supabase
            .from("clients")
            .update(dbClientData)
            .eq("id", selectedClient.id)
            .select()

          if (error) {
            console.error("Supabase update error:", error)
            console.error("Error details:", JSON.stringify(error, null, 2))
            throw new Error(error.message || error.details || 'Database update failed')
          }

          if (!data || data.length === 0) {
            throw new Error('No data returned from update')
          }

          // Update local state with database data (including avatar_url)
          setClients(clients.map((c) => (c.id === selectedClient.id ? data[0] : c)))
        } else {
          // Add new client
          const { data, error } = await supabase
            .from("clients")
            .insert([dbClientData])
            .select()

          if (error) {
            console.error("Supabase insert error:", error)
            console.error("Error details:", JSON.stringify(error, null, 2))
            throw new Error(error.message || error.details || 'Database insert failed')
          }

          if (!data || data.length === 0) {
            throw new Error('No data returned from insert')
          }

          // Add to local state with database data (including avatar_url)
          setClients([data[0], ...clients])
        }
      } else {
        // Mock data handling
        if (selectedClient) {
          const updatedClient = { ...selectedClient, ...editingClient }
          setClients(clients.map((c) => (c.id === selectedClient.id ? updatedClient : c)))
        } else {
          const newClient = {
            ...editingClient,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
          } as Client
          setClients([newClient, ...clients])
        }
      }

      toast.success(`${editingClient.name} has been ${selectedClient ? "updated" : "added"} successfully`)

      setShowEditDialog(false)
      setShowAddDialog(false)
      setSelectedClient(null)
      setEditingClient({})
    } catch (error) {
      console.error("Error saving client:", error)
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }
      
      toast.error(`Failed to ${selectedClient ? "update" : "add"} client: ${errorMessage}`)
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Address', 'City', 'State', 'ZIP Code', 'Country', 'Notes']
    const csvContent = [
      headers.join(','),
      ...clients.map(client => [
        client.name,
        client.email || '',
        client.phone || '',
        client.company || '',
        client.address || '',
        client.city || '',
        client.state || '',
        client.zip_code || '',
        client.country || '',
        client.notes || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Exported ${clients.length} clients to CSV`)
  }


  const columns = createColumns({
    onEditClient: handleEditClient,
    onCreateInvoice: handleCreateInvoice,
    onNewProject: handleNewProject,
    onDeleteClient: handleDeleteClient,
    onStatusChange: handleStatusChange,
    onDateChange: handleDateChange,
  })

  if (loading) {
    return (
      <>
        <PageHeader
          title="Clients"
        />
        <PageContent>
          <div className="flex items-center justify-center h-[calc(100vh-300px)]">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-600">Loading clients</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Please wait a moment...</p>
              </div>
            </div>
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Clients"
        action={<PageActionsMenu entityType="clients" onExport={handleExport} />}
      />
      <PageContent>
        {error && (
          <Alert className="border-yellow-200 bg-yellow-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <DataTable 
          columns={columns} 
          data={clients} 
          onAddClient={handleAddClient} 
          onBatchDelete={handleBatchDelete}
          contextActions={{
            onEditClient: handleEditClient,
            onCreateInvoice: handleCreateInvoice,
            onNewProject: handleNewProject,
            onDeleteClient: handleDeleteClient,
          }}
        />
      </PageContent>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Avatar Upload */}
            <div className="flex items-center space-x-4">
              <ClientAvatar 
                name={editingClient.name || ""} 
                avatarUrl={editingClient.avatar_url}
                size="xl"
              />
              <div className="flex-1">
                <Label htmlFor="edit-avatar-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-1.5 h-4 w-4" />
                      Upload Avatar
                    </span>
                  </Button>
                </Label>
                <Input
                  id="edit-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        setEditingClient({ ...editingClient, avatar_url: e.target?.result as string })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, max 2MB
                </p>
              </div>
            </div>
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
                <PhoneInput
                  id="phone"
                  value={editingClient.phone || ""}
                  onChange={(value) => setEditingClient({ ...editingClient, phone: value })}
                  placeholder="Enter phone number"
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
              <CountrySelect
                value={editingClient.country || ""}
                onValueChange={(value) => setEditingClient({ ...editingClient, country: value })}
                placeholder="Select country"
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
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveClient} disabled={!editingClient.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl add-client-dialog" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client record</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Avatar Upload */}
            <div className="flex items-center space-x-4">
              <ClientAvatar 
                name={editingClient.name || ""} 
                avatarUrl={editingClient.avatar_url}
                size="xl"
              />
              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-1.5 h-4 w-4" />
                      Upload Avatar
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        setEditingClient({ ...editingClient, avatar_url: e.target?.result as string })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, max 2MB
                </p>
              </div>
            </div>
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
                <PhoneInput
                  id="new-phone"
                  value={editingClient.phone || ""}
                  onChange={(value) => setEditingClient({ ...editingClient, phone: value })}
                  placeholder="Enter phone number"
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
              <CountrySelect
                value={editingClient.country || ""}
                onValueChange={(value) => setEditingClient({ ...editingClient, country: value })}
                placeholder="Select country"
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
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveClient} disabled={!editingClient.name}>
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
