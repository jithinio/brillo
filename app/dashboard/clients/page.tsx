"use client"

import { useState, useRef } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { GenericTableWrapper } from "@/components/table/GenericTableWrapper"
import { createClientColumns } from "@/components/clients/generic-columns"
import { useClients } from "@/hooks/use-clients"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Upload, User } from "lucide-react"
import { ClientMetrics } from "@/components/clients/ClientMetrics"
import { DataHookReturn, EntityActions } from "@/components/table/types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PhoneInput } from "@/components/ui/phone-input"
import { CountrySelect } from "@/components/ui/country-select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { countries } from "@/lib/countries"

interface ClientFormData {
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  notes: string
  avatar_url?: string
  status: string
  client_since?: Date
}

export default function ClientsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // State for filters
  const [filters, setFilters] = useState({})
  const clientsData = useClients(filters)

  // Form data state
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    notes: "",
    status: "active",
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")

  // Entity actions for generic table  
  const entityActions: EntityActions<any> = {
    onCreate: () => {
      resetForm()
      setIsAddDialogOpen(true)
    },
    onEdit: (client: any) => {
      setSelectedClient(client)
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company: client.company || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip_code: client.zip_code || "",
        country: client.country || "US",
        notes: client.notes || "",
        avatar_url: client.avatar_url || "",
        status: client.status || "active",
        client_since: client.client_since ? new Date(client.client_since) : undefined,
      })
      setAvatarPreview(client.avatar_url || "")
      setIsEditDialogOpen(true)
    },
    onDelete: async (client: any) => {
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', client.id)

        if (error) throw error

        toast.success('Client deleted')
        clientsData.refetch()
      } catch (error) {
        console.error('Error deleting client:', error)
        toast.error('Failed to delete client')
      }
    },
    onBatchDelete: async (clients: any[]) => {
      try {
        const ids = clients.map(client => client.id)
        const { error } = await supabase
          .from('clients')
          .delete()
          .in('id', ids)

        if (error) throw error

        toast.success(`Deleted ${ids.length} client${ids.length > 1 ? 's' : ''}`)
        clientsData.refetch()
      } catch (error) {
        console.error('Error deleting clients:', error)
        toast.error('Failed to delete clients')
      }
    },
    onExport: () => {
      toast.info('Export feature coming soon')
    },
    // Context menu specific actions
    customActions: {
      'Create Invoice': (client: any) => {
        // Store client data for invoice creation
        const clientData = {
          clientId: client.id,
          clientName: client.name,
          clientCompany: client.company
        }
        
        sessionStorage.setItem('invoice-client-data', JSON.stringify(clientData))
        router.push('/dashboard/invoices/generate')
      },
      'New Project': (client: any) => {
        // Store client data for project creation
        const clientData = {
          clientId: client.id,
          clientName: client.name,
          clientCompany: client.company
        }
        
        sessionStorage.setItem('project-client-data', JSON.stringify(clientData))
        router.push('/dashboard/projects') // Navigate to projects page with client data
        toast.info('New project feature will be available soon')
      }
    }
  }

  // Calculate metrics from data
  const metrics = React.useMemo(() => {
    if (!clientsData.data || clientsData.isLoading) return null
    
    const activeClients = clientsData.data.filter(c => c.status === 'active').length
    const totalProjects = clientsData.data.reduce((sum, c) => sum + (c.projects?.length || 0), 0)
    const totalRevenue = clientsData.data.reduce((sum, c) => {
      const clientProjects = c.projects || []
      return sum + clientProjects.reduce((projSum: number, proj: any) => 
        projSum + (proj.payment_received || 0), 0
      )
    }, 0)
    
    return {
      totalClients: clientsData.data.length,
      activeClients,
      totalProjects,
      totalRevenue
    }
  }, [clientsData.data, clientsData.isLoading])

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      notes: "",
      status: "active",
    })
    setAvatarFile(null)
    setAvatarPreview("")
    setSelectedClient(null)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar image must be less than 5MB")
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('company')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      return null
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsLoading(true)
    try {
      let avatarUrl = formData.avatar_url

      // Upload avatar if new file selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      const clientData = {
        ...formData,
        avatar_url: avatarUrl,
        client_since: formData.client_since || new Date(),
      }

      if (selectedClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', selectedClient.id)

        if (error) throw error
        toast.success('Client updated successfully')
        setIsEditDialogOpen(false)
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert([clientData])

        if (error) throw error
        toast.success('Client created successfully')
        setIsAddDialogOpen(false)
      }

      clientsData.refetch()
      resetForm()
    } catch (error: any) {
      console.error('Error saving client:', error)
      toast.error(error.message || 'Failed to save client')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    const words = name.trim().split(" ")
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }
    return (words[0]?.[0] || "") + (words[words.length - 1]?.[0] || "")
  }

  const DialogForm = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <Avatar className="h-24 w-24">
          {avatarPreview ? (
            <AvatarImage src={avatarPreview} alt={formData.name} />
          ) : (
            <AvatarFallback className="text-lg">
              {formData.name ? getInitials(formData.name) : <User className="h-10 w-10 text-muted-foreground" />}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-2">Profile Picture</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {avatarPreview ? "Change Photo" : "Upload Photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-1">Maximum 5MB • JPG, PNG</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium">
              Company
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Acme Inc."
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Street Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">
                City
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New York"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">
                State/Province
              </Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NY"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code" className="text-sm font-medium">
                Zip/Postal Code
              </Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="10001"
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium">
                Country
              </Label>
              <CountrySelect
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
                placeholder="Select country"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about the client..."
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <GenericTableWrapper
        entityType="clients"
        pageTitle="Clients"
        dataHook={() => clientsData as DataHookReturn<any>}
        createColumns={(actions: any) => createClientColumns({
          onStatusChange: clientsData.updateStatus,
          onEditClient: entityActions.onEdit,
        })}
        features={{
          search: true,
          batchOperations: true,
          contextMenu: true,
          infiniteScroll: false,
          footerAggregations: true,
          columnResizing: true,
        }}
        actions={entityActions}
        defaultColumnWidths={{
          select: 50,
          name: 250,
          company: 200,
          email: 250,
          phone: 150,
          location: 200,
          projects: 120,
          status: 120,
          client_since: 140,
        }}
        metricsComponent={<ClientMetrics metrics={metrics} />}
        addButton={
          <Button
            onClick={() => {
              resetForm()
              setIsAddDialogOpen(true)
            }}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Client
          </Button>
        }
      />

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">Add New Client</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Fill in the information below to create a new client profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <DialogForm />
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading || !formData.name.trim()}
                className="min-w-[100px]"
              >
                {isLoading ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">Edit Client</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the client information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <DialogForm />
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading || !formData.name.trim()}
                className="min-w-[100px]"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
