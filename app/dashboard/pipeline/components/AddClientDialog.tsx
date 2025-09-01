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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SourceSelector } from "@/components/ui/source-selector"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdate: () => void
  context?: 'pipeline' | 'project'
}

interface NewClientData {
  name: string
  company: string
  email: string
  phone: string
  notes: string
  source: string
}

export function AddClientDialog({ open, onOpenChange, onClientUpdate, context = 'pipeline' }: AddClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [newClient, setNewClient] = useState<NewClientData>({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    source: "",
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
        notes: newClient.notes.trim() || undefined,
        source: newClient.source.trim() || undefined,
        status: context === 'pipeline' ? 'pipeline' : 'active',
        ...(context === 'pipeline' && {
          pipeline_stage: 'Lead',
          deal_probability: 10
        })
      }

      const { data: result, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single()

      if (error) throw error
      
      const successMessage = context === 'pipeline' 
        ? `${newClient.name} added to pipeline`
        : `${newClient.name} added successfully`
      toast.success(successMessage)
      onClientUpdate()
      onOpenChange(false)
      // Reset form
      setNewClient({
        name: "",
        company: "",
        email: "",
        phone: "",
        notes: "",
      })
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
      notes: "",
      source: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {context === 'pipeline' ? 'Add New Lead' : 'Add Quick Client'}
            </DialogTitle>
            <DialogDescription>
              {context === 'pipeline' 
                ? "Add a new client to your pipeline. They'll start in the Lead stage."
                : "Quickly add a new client to your database."
              }
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
            
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <SourceSelector
                value={newClient.source}
                onValueChange={(value) => setNewClient({ ...newClient, source: value })}
                placeholder="How did they find you?"
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
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
              {loading ? "Adding..." : (context === 'pipeline' ? 'Add Lead' : 'Add Quick Client')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 