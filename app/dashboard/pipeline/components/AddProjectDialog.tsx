"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { createPipelineProject } from "@/lib/project-pipeline"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getCompanySettings } from "@/lib/company-settings"
import type { PipelineProject } from "@/lib/types/pipeline"
import { useCanPerformAction } from "@/components/over-limit-alert"
import { useQueryClient } from "@tanstack/react-query"
import { cacheUtils } from "@/components/query-provider"

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdate: () => void
  onAddProject?: (newProject: PipelineProject) => void
  onRevertChanges?: () => void
}

interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  avatar_url?: string
}

interface NewProjectData {
  name: string
  description: string
  budget: string
  currency: string
  pipeline_notes: string
  client_id: string
}

export function AddProjectDialog({ 
  open, 
  onOpenChange, 
  onProjectUpdate, 
  onAddProject,
  onRevertChanges 
}: AddProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [displayedClientsCount, setDisplayedClientsCount] = useState(10)
  
  const [newProject, setNewProject] = useState<NewProjectData>({
    name: "",
    description: "",
    budget: "",
    currency: "USD", // Default currency, will be updated from company settings
    pipeline_notes: "",
    client_id: "",
  })

  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()
  
  // Query client for cache invalidation
  const queryClient = useQueryClient()

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
    setNewProject({ ...newProject, client_id: clientId })
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

  // Fetch clients when dialog opens and load default currency
  useEffect(() => {
    if (open) {
      fetchClients()
      loadDefaultCurrency()
    }
  }, [open])

  // Load default currency from company settings
  const loadDefaultCurrency = async () => {
    try {
      const settings = await getCompanySettings()
      if (settings?.default_currency) {
        setNewProject(prev => ({
          ...prev,
          currency: settings.default_currency
        }))
      }
    } catch (error) {
      console.error('Failed to load default currency:', error)
      // Keep USD as fallback
    }
  }

  // Reset displayed count when search query changes
  useEffect(() => {
    setDisplayedClientsCount(10)
  }, [clientSearchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name.trim()) {
      toast.error("Project name is required")
      return
    }

    // Check if user can create more projects
    if (!canCreateResource('projects')) {
      const reason = getActionBlockedReason('projects')
      toast.error("Cannot create project", {
        description: reason || "You've reached your project limit for your current plan. Please upgrade to Pro for unlimited projects."
      })
      return
    }

    setLoading(true)
    
    try {
      const projectData = {
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        currency: newProject.currency,
        pipeline_notes: newProject.pipeline_notes.trim() || undefined,
        client_id: newProject.client_id || undefined,
      }

      const result = await createPipelineProject(projectData)
      
      if (result) {
        // Add project optimistically to UI immediately
        if (onAddProject) {
          onAddProject(result)
        }
        
        toast.success(`${newProject.name} added to pipeline`)
        
        // Complete cache invalidation after successful creation
        cacheUtils.invalidateAllProjectRelatedData(queryClient)
        
        // Don't call onProjectUpdate() - optimistic update already handled UI
        onOpenChange(false)
        // Reset form
        setNewProject({
          name: "",
          description: "",
          budget: "",
          currency: "USD", // Will be updated by loadDefaultCurrency
          pipeline_notes: "",
          client_id: "",
        })
        setSelectedClient(null)
        setClientSearchQuery("")
        setDisplayedClientsCount(10)
      } else {
        toast.error("Failed to add project")
        // Revert optimistic changes if any were made
        if (onRevertChanges) {
          onRevertChanges()
        }
      }
    } catch (error) {
      console.error("Error adding project:", error)
      toast.error("Failed to add project")
      // Revert optimistic changes on error
      if (onRevertChanges) {
        onRevertChanges()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form when closing
            setNewProject({
          name: "",
          description: "",
          budget: "",
          currency: "USD", // Will be updated by loadDefaultCurrency
          pipeline_notes: "",
          client_id: "",
        })
    setSelectedClient(null)
    setClientSearchQuery("")
    setDisplayedClientsCount(10)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Add a new project to your pipeline. It'll start in the Lead stage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Project name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
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
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
                              <Check
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget / Potential Value</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <CurrencySelector
                  value={newProject.currency}
                  onValueChange={(currency) => setNewProject({ ...newProject, currency })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newProject.pipeline_notes}
                onChange={(e) => setNewProject({ ...newProject, pipeline_notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newProject.name.trim()}>
              {loading ? "Adding..." : "Add Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 