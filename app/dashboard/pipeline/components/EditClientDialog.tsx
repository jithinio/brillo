"use client"

import { useState, useEffect } from "react"
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
import { updatePipelineClient } from "@/lib/pipeline"
import { toast } from "sonner"
import type { PipelineClient } from "@/lib/types/pipeline"

interface EditClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdate: () => void
  client: PipelineClient | null
}

interface EditClientData {
  name: string
  company: string
  email: string
  phone: string
  potential_value: string
  pipeline_notes: string
}

export function EditClientDialog({ open, onOpenChange, onClientUpdate, client }: EditClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [editClient, setEditClient] = useState<EditClientData>({
    name: "",
    company: "",
    email: "",
    phone: "",
    potential_value: "",
    pipeline_notes: "",
  })

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setEditClient({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        potential_value: client.potential_value?.toString() || "",
        pipeline_notes: client.pipeline_notes || "",
      })
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!client || !editClient.name.trim()) {
      toast.error("Client name is required")
      return
    }

    setLoading(true)
    
    try {
      const clientData = {
        name: editClient.name.trim(),
        company: editClient.company.trim() || undefined,
        email: editClient.email.trim() || undefined,
        phone: editClient.phone.trim() || undefined,
        potential_value: editClient.potential_value ? parseFloat(editClient.potential_value) : undefined,
        pipeline_notes: editClient.pipeline_notes.trim() || undefined,
      }

      const result = await updatePipelineClient(client.id, clientData)
      
      if (result) {
        toast.success(`${editClient.name} updated successfully`)
        onClientUpdate()
        onOpenChange(false)
      } else {
        toast.error("Failed to update client")
      }
    } catch (error) {
      console.error("Error updating client:", error)
      toast.error("Failed to update client")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information in your pipeline.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editClient.name}
                onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                placeholder="Client name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editClient.company}
                onChange={(e) => setEditClient({ ...editClient, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editClient.email}
                  onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editClient.phone}
                  onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-potential_value">Potential Value</Label>
              <Input
                id="edit-potential_value"
                type="number"
                step="0.01"
                value={editClient.potential_value}
                onChange={(e) => setEditClient({ ...editClient, potential_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editClient.pipeline_notes}
                onChange={(e) => setEditClient({ ...editClient, pipeline_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !editClient.name.trim()}>
              {loading ? "Updating..." : "Update Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 