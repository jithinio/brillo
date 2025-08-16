"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useEffect } from "react"
import { Tick01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { CurrencySelector } from "@/components/ui/currency-selector"
import { updatePipelineProject } from "@/lib/project-pipeline"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { PipelineProject } from "@/lib/types/pipeline"
import { useQueryClient } from "@tanstack/react-query"
import { cacheUtils } from "@/components/query-provider"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdate: () => void
  project: PipelineProject | null
}

interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  avatar_url?: string
}

interface EditProjectData {
  name: string
  description: string
  budget: string
  currency: string
  pipeline_stage: string
  pipeline_notes: string
  client_id: string
}

export function EditProjectDialog({ open, onOpenChange, onProjectUpdate, project }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [displayedClientsCount, setDisplayedClientsCount] = useState(10)
  
  // Query client for cache invalidation
  const queryClient = useQueryClient()
  
  const [editProject, setEditProject] = useState<EditProjectData>({
    name: "",
    description: "",
    budget: "",
    currency: "USD",
    pipeline_stage: "lead",
    pipeline_notes: "",
    client_id: "",
  })

  // Filter and limit clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  )

  const displayedClients = filteredClients.slice(0, displayedClientsCount)

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setEditProject({ ...editProject, client_id: clientId })
    setClientDropdownOpen(false)
    setClientSearchQuery("")
  }

  const loadMoreClients = () => {
    setDisplayedClientsCount(prev => Math.min(prev + 10, filteredClients.length))
  }

  // Fetch clients from Supabase
  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching clients:', error)
          throw error
        }

        setClients(data || [])
      } else {
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to fetch clients')
    } finally {
      setClientsLoading(false)
    }
  }

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open) {
      fetchClients()
    }
  }, [open])

  // Reset displayed count when search query changes
  useEffect(() => {
    setDisplayedClientsCount(10)
  }, [clientSearchQuery])

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setEditProject({
        name: project.name || "",
        description: project.description || "",
        budget: project.budget?.toString() || "",
        currency: project.currency || "USD",
        pipeline_stage: project.pipeline_stage || "lead",
        pipeline_notes: project.pipeline_notes || "",
        client_id: project.client_id || "",
      })
      
      // Set selected client if project has one
      if (project.clients) {
        const client = clients.find(c => c.name === project.clients?.name)
        setSelectedClient(client || null)
      } else {
        setSelectedClient(null)
      }
    }
  }, [project, clients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!project || !editProject.name.trim()) {
      toast.error("Project name is required")
      return
    }

    setLoading(true)
    
    try {
      const projectData = {
        name: editProject.name.trim(),
        description: editProject.description.trim() || undefined,
        budget: editProject.budget ? parseFloat(editProject.budget) : undefined,
        currency: editProject.currency,
        pipeline_stage: editProject.pipeline_stage,
        pipeline_notes: editProject.pipeline_notes.trim() || undefined,
        client_id: editProject.client_id || undefined,
      }

      const result = await updatePipelineProject(project.id, projectData)
      
      if (result) {
        toast.success(`${editProject.name} updated successfully`)
        
        // Complete cache invalidation after successful update
        cacheUtils.invalidateAllProjectRelatedData(queryClient)
        
        onProjectUpdate()
        onOpenChange(false)
      } else {
        toast.error("Failed to update project")
      }
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error("Failed to update project")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setClientSearchQuery("")
    setDisplayedClientsCount(10)
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project information in your pipeline.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                placeholder="Project name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-client">Client</Label>
              <Popover modal={true} open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientDropdownOpen}
                    className="w-full justify-between h-9 px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm text-left"
                    disabled={clientsLoading}
                  >
                    {selectedClient ? (
                      <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                        <ClientAvatar 
                          name={selectedClient.name} 
                          avatarUrl={selectedClient.avatar_url}
                          size="xs"
                        />
                        <span className="truncate">{selectedClient.name} - {selectedClient.company}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground flex-1 mr-2">
                        {clientsLoading ? "Loading..." : "Select client"}
                      </span>
                    )}
                    <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4 shrink-0 opacity-50"  />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search clients..." 
                      value={clientSearchQuery}
                      onValueChange={setClientSearchQuery}
                    />
                    <div className="max-h-60 overflow-y-auto">
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          {displayedClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={`${client.name} ${client.company || ''} ${client.id}`}
                              onSelect={() => handleClientSelect(client.id)}
                              className="flex items-center space-x-3 p-3"
                            >
                              <ClientAvatar 
                                name={client.name} 
                                avatarUrl={client.avatar_url}
                                size="lg"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{client.name}</div>
                                {client.company && (
                                  <div className="text-sm text-muted-foreground">{client.company}</div>
                                )}
                                {client.email && (
                                  <div className="text-xs text-muted-foreground">{client.email}</div>
                                )}
                              </div>
                              <HugeiconsIcon icon={Tick01Icon}
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                                )}
                               />
                            </CommandItem>
                          ))}
                          {displayedClients.length < filteredClients.length && (
                            <CommandItem
                              onSelect={loadMoreClients}
                              className="text-center text-sm text-muted-foreground p-2 cursor-pointer hover:bg-accent"
                            >
                              Load more clients... ({filteredClients.length - displayedClients.length} remaining)
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editProject.description}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                placeholder="Project description"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Budget / Potential Value</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  step="0.01"
                  value={editProject.budget}
                  onChange={(e) => setEditProject({ ...editProject, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <CurrencySelector
                  value={editProject.currency}
                  onValueChange={(currency) => setEditProject({ ...editProject, currency })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-stage">Pipeline Stage</Label>
              <Select 
                value={editProject.pipeline_stage} 
                onValueChange={(value) => setEditProject({ ...editProject, pipeline_stage: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="pitched">Pitched</SelectItem>
                  <SelectItem value="in discussion">In Discussion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editProject.pipeline_notes}
                onChange={(e) => setEditProject({ ...editProject, pipeline_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !editProject.name.trim()}>
              {loading ? "Updating..." : "Update Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 