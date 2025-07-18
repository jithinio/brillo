"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createPipelineClient } from "@/lib/pipeline"
import { toast } from "sonner"

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdate: () => void
}

interface NewClientData {
  name: string
  company: string
  email: string
  phone: string
  potential_value: string
  pipeline_notes: string
}

export function AddClientDialog({ open, onOpenChange, onClientUpdate }: AddClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [newClient, setNewClient] = useState<NewClientData>({
    name: "",
    company: "",
    email: "",
    phone: "",
    potential_value: "",
    pipeline_notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newClient.name.trim()) {
      toast.error("Client name is required")
      return
    }

    setLoading(true)
    
    try {
      const clientData = {
        name: newClient.name.trim(),
        company: newClient.company.trim() || undefined,
        email: newClient.email.trim() || undefined,
        phone: newClient.phone.trim() || undefined,
        potential_value: newClient.potential_value ? parseFloat(newClient.potential_value) : undefined,
        pipeline_notes: newClient.pipeline_notes.trim() || undefined,
      }

      const result = await createPipelineClient(clientData)
      
      if (result) {
        toast.success(`${newClient.name} added to pipeline`)
        onClientUpdate()
        onOpenChange(false)
        // Reset form
        setNewClient({
          name: "",
          company: "",
          email: "",
          phone: "",
          potential_value: "",
          pipeline_notes: "",
        })
      } else {
        toast.error("Failed to add client")
      }
    } catch (error) {
      console.error("Error adding client:", error)
      toast.error("Failed to add client")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form when closing
    setNewClient({
      name: "",
      company: "",
      email: "",
      phone: "",
      potential_value: "",
      pipeline_notes: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Add a new client to your pipeline. They'll start in the Lead stage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Client name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={newClient.company}
                onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="potential_value">Potential Value</Label>
              <Input
                id="potential_value"
                type="number"
                step="0.01"
                value={newClient.potential_value}
                onChange={(e) => setNewClient({ ...newClient, potential_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newClient.pipeline_notes}
                onChange={(e) => setNewClient({ ...newClient, pipeline_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newClient.name.trim()}>
              {loading ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 