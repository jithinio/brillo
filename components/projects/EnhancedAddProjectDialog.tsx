"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useEffect, useMemo } from "react"
import { Tick01Icon, ArrowDown01Icon, CalculateIcon, ClockIcon, RepeatIcon, DollarCircleIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
import { DatePicker } from "@/components/ui/date-picker"
import { CurrencySelector } from "@/components/ui/currency-selector"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getCompanySettings } from "@/lib/company-settings"
import { getDefaultCurrency } from "@/lib/currency"
import { useCanPerformAction } from "@/components/over-limit-alert"
import { useClients } from "@/hooks/use-clients"
import { calculateRecurringTotal, calculateHourlyTotal } from "@/lib/project-calculation-engine"
import { AddClientDialog } from "@/app/dashboard/pipeline/components/AddClientDialog"
import { useSettings } from "@/components/settings-provider"
import { parseFormattedDate } from "@/lib/date-format"
import { useQueryClient } from "@tanstack/react-query"
import { cacheUtils } from "@/components/query-provider"
// Define the types locally since the external types were removed
interface CreateProjectData {
  name: string
  description?: string
  client_id: string
  currency: string
  start_date?: string | null
  due_date?: string | null
  notes?: string
  status?: string
  project_type: 'fixed' | 'recurring' | 'hourly'
  total_budget?: number
  auto_calculate_total?: boolean
  recurring_frequency?: string
  recurring_amount?: number
  recurring_end_date?: string | null
  hourly_rate_new?: number
  estimated_hours?: number
  actual_hours?: number
}

interface FixedProjectFormData {
  name: string
  description: string
  client_id: string
  currency: string
  start_date: string
  due_date: string
  notes: string
  status?: string
  project_type: 'fixed'
  total_budget: number
}

interface RecurringProjectFormData {
  name: string
  description: string
  client_id: string
  currency: string
  start_date: string
  due_date: string
  notes: string
  status?: string
  project_type: 'recurring'
  recurring_frequency: string
  recurring_amount: number
}

interface HourlyProjectFormData {
  name: string
  description: string
  client_id: string
  currency: string
  start_date: string
  due_date: string
  notes: string
  status?: string
  project_type: 'hourly'
  hourly_rate_new: number
  estimated_hours: number
  actual_hours: number
}

// Types
type ProjectType = 'fixed' | 'recurring' | 'hourly'

interface EnhancedAddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdate?: () => void
  onAddProject?: (project: any) => void
  onRevertChanges?: () => void
  defaultType?: ProjectType
  context?: 'pipeline' | 'project'
  editProject?: any // Project to edit (if provided, dialog will be in edit mode)
}

// Reusable field components
const ProjectNameField = ({ data, setData }: { data: any, setData: any }) => (
  <div className="space-y-2">
    <Label htmlFor="name">Project Name *</Label>
    <Input
      id="name"
      value={data.name}
      onChange={(e) => setData((prev: any) => ({ ...prev, name: e.target.value }))}
      placeholder="Enter project name"
      required
    />
  </div>
)

const ClientField = ({ 
  clients, selectedClient, setSelectedClient, clientDropdownOpen, 
  setClientDropdownOpen, clientSearchQuery, setClientSearchQuery, data, setData,
  onClientUpdate
}: {
  clients: any[], selectedClient: any, setSelectedClient: any, clientDropdownOpen: boolean,
  setClientDropdownOpen: any, clientSearchQuery: string, setClientSearchQuery: any, data: any, setData: any,
  onClientUpdate: () => void
}) => {
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
    setData((prev: any) => ({ ...prev, client_id: clientId }));
  };

  const handleAddClientSuccess = () => {
    onClientUpdate(); // Refresh the clients list
    // The newly added client will be available after the refresh
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="client">Client *</Label>
        <div className="flex gap-2">
          <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientDropdownOpen}
                className="flex-1 justify-between"
              >
                {selectedClient ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ClientAvatar 
                      name={selectedClient.name} 
                      avatarUrl={selectedClient.avatar_url} 
                      size="sm" 
                    />
                    <span className="truncate">{selectedClient.name}</span>
                    {selectedClient.company && (
                      <span className="text-muted-foreground truncate">({selectedClient.company})</span>
                    )}
                  </div>
                ) : (
                  "Select client..."
                )}
                <HugeiconsIcon icon={ArrowDown01Icon} className="ml-2 h-4 w-4 shrink-0 opacity-50"  />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search clients..." 
                  value={clientSearchQuery}
                  onValueChange={setClientSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No clients found.</CommandEmpty>
                  <CommandGroup>
                    {filteredClients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`${client.name} ${client.company || ''} ${client.id}`}
                        onSelect={() => {
                          handleClientSelect(client.id);
                          setClientDropdownOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <ClientAvatar 
                            name={client.name} 
                            avatarUrl={client.avatar_url} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{client.name}</div>
                            {client.company && (
                              <div className="text-sm text-muted-foreground truncate">{client.company}</div>
                            )}
                          </div>
                          <HugeiconsIcon icon={Tick01Icon}
                            className={cn(
                              "h-4 w-4",
                              selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                            )}
                           />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAddClientDialogOpen(true)}
            className="shrink-0"
            title="Add New Client"
          >
                            <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4"  />
          </Button>
        </div>
      </div>

      <AddClientDialog
        open={addClientDialogOpen}
        onOpenChange={setAddClientDialogOpen}
        onClientUpdate={handleAddClientSuccess}
        context="project"
      />
    </>
  )
}

const StatusField = ({ data, setData }: { data: any, setData: any }) => (
  <div className="space-y-2">
    <Label htmlFor="status">Status</Label>
    <Select
      value={data.status || "active"}
      onValueChange={(value) => setData((prev: any) => ({ ...prev, status: value }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="pipeline">Pipeline</SelectItem>
        <SelectItem value="on_hold">On Hold</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
        <SelectItem value="due">Due</SelectItem>
      </SelectContent>
    </Select>
  </div>
)

const ExpensesField = ({ data, setData }: { data: any, setData: any }) => (
  <div className="space-y-2">
    <Label htmlFor="expenses">Expenses</Label>
    <Input
      id="expenses"
      type="number"
      step="0.01"
      min="0"
      value={data.expenses || ""}
      onChange={(e) => setData((prev: any) => ({ ...prev, expenses: parseFloat(e.target.value) || 0 }))}
      placeholder="0.00"
    />
  </div>
)

const ReceivedFields = ({ data, setData, recentlyReceived, setRecentlyReceived }: {
  data: any, setData: any, recentlyReceived: string, setRecentlyReceived: any
}) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="received">Received</Label>
      <Input
        id="received"
        type="number"
        step="0.01"
        min="0"
        value={data.payment_received || data.received || ""}
        onChange={(e) => setData((prev: any) => ({ ...prev, payment_received: parseFloat(e.target.value) || 0 }))}
        placeholder="0.00"
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="recently_received">Recently Received</Label>
      <div className="flex gap-2">
        <Input
          id="recently_received"
          type="number"
          step="0.01"
          min="0"
          value={recentlyReceived}
          onChange={(e) => setRecentlyReceived(e.target.value)}
          placeholder="Enter amount"
          className="flex-1"
        />
        <Button 
          type="button"
          variant="outline"
          onClick={() => {
            if (recentlyReceived && !isNaN(parseFloat(recentlyReceived))) {
              const currentReceived = data.payment_received || data.received || 0;
              const newReceived = currentReceived + parseFloat(recentlyReceived);
              setData((prev: any) => ({ ...prev, payment_received: newReceived }));
              setRecentlyReceived("");
            }
          }}
          disabled={!recentlyReceived || isNaN(parseFloat(recentlyReceived))}
          className="shrink-0"
        >
          Add
        </Button>
      </div>
    </div>
  </>
)

const CurrencyField = ({ data, setData, context }: { data: any, setData: any, context: string }) => {
  // Only show currency field for pipeline projects
  if (context !== 'pipeline') return null;
  
  return (
    <div className="space-y-2">
      <Label htmlFor="currency">Currency</Label>
      <CurrencySelector
        value={data.currency}
        onValueChange={(currency) => setData((prev: any) => ({ ...prev, currency }))}
        placeholder="Select currency"
      />
    </div>
  )
}

// Convert string dates to Date objects for the DatePicker with error handling
const parseDate = (dateString: string, userDateFormat?: string) => {
  if (!dateString || dateString.trim() === '') return undefined
  
  // If we have a user format, try parsing with that first
  if (userDateFormat) {
    const parsed = parseFormattedDate(dateString, userDateFormat as any)
    if (parsed) return parsed
  }
  
  // Handle different date formats as fallback
  let date: Date
  
  // If it's already an ISO date string (YYYY-MM-DD)
  if (dateString.includes('-') && dateString.length === 10) {
    // Create date in local timezone to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    date = new Date(year, month - 1, day, 12, 0, 0, 0) // month is 0-indexed, set to noon to avoid DST issues
  } else {
    // Parse other date formats
    date = new Date(dateString)
  }
  
  return isNaN(date.getTime()) ? undefined : date
}

// Convert Date to local YYYY-MM-DD string (timezone-safe)
// We keep ISO format for internal storage as it's database-friendly
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DateFields = ({ data, setData, showEndDate = false }: { 
  data: any, setData: any, showEndDate?: boolean 
}) => {
  const { settings } = useSettings()
  const startDate = parseDate(data.start_date, settings.dateFormat)
  const dueDate = parseDate(data.due_date, settings.dateFormat)
  const endDate = parseDate(data.recurring_end_date || data.end_date, settings.dateFormat)

  return (
    <div className={`grid ${showEndDate ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
      <div className="space-y-2">
        <Label htmlFor="start_date">Start Date</Label>
        <DatePicker
          date={startDate}
          onSelect={(date) => setData((prev: any) => ({ 
            ...prev, 
            start_date: date ? formatDateForInput(date) : ""
          }))}
          placeholder="Select start date"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="due_date">Due Date</Label>
        <DatePicker
          date={dueDate}
          onSelect={(date) => setData((prev: any) => ({ 
            ...prev, 
            due_date: date ? formatDateForInput(date) : ""
          }))}
          placeholder="Select due date"
        />
      </div>

      {showEndDate && (
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <DatePicker
            date={endDate}
            onSelect={(date) => setData((prev: any) => ({ 
              ...prev, 
              recurring_end_date: date ? formatDateForInput(date) : "",
              end_date: date ? formatDateForInput(date) : ""
            }))}
            placeholder="Select end date"
          />
        </div>
      )}
    </div>
  )
}

const DescriptionField = ({ data, setData }: { data: any, setData: any }) => (
  <div className="space-y-2">
    <Label htmlFor="description">Description</Label>
    <Textarea
      id="description"
      value={data.description}
      onChange={(e) => setData((prev: any) => ({ ...prev, description: e.target.value }))}
      placeholder="Project description (optional)"
      rows={2}
    />
  </div>
)

export function EnhancedAddProjectDialog({
  open,
  onOpenChange,
  onProjectUpdate,
  onAddProject,
  onRevertChanges,
  defaultType = "fixed",
  context = "project",
  editProject
}: EnhancedAddProjectDialogProps) {
  // Determine if we're in edit mode
  const isEditMode = !!editProject
  const [activeTab, setActiveTab] = useState<ProjectType>(editProject?.project_type || defaultType)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [recentlyReceived, setRecentlyReceived] = useState("")

  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()

  // Query client for cache invalidation
  const queryClient = useQueryClient()

  // Fetch clients
  const { data: clients = [], refetch: refetchClients } = useClients()

  // Get settings for currency and date format
  const { settings } = useSettings()
  const defaultCurrency = settings.defaultCurrency || getDefaultCurrency()

  // Form data for different project types
  const [fixedData, setFixedData] = useState<FixedProjectFormData>({
    name: "",
    description: "",
    client_id: "",
    currency: defaultCurrency,
    start_date: "",
    due_date: "",
    notes: "",
    status: "active",
    project_type: 'fixed',
    total_budget: 0
  })

  const [recurringData, setRecurringData] = useState<RecurringProjectFormData>({
    name: "",
    description: "",
    client_id: "",
    currency: defaultCurrency,
    start_date: "",
    due_date: "",
    notes: "",
    status: "active",
    project_type: 'recurring',
    recurring_frequency: 'monthly',
    recurring_amount: 0
  })

  const [hourlyData, setHourlyData] = useState<HourlyProjectFormData>({
    name: "",
    description: "",
    client_id: "",
    currency: defaultCurrency,
    start_date: "",
    due_date: "",
    notes: "",
    status: "active",
    project_type: 'hourly',
    hourly_rate_new: 0,
    estimated_hours: 0,
    actual_hours: 0
  })

  // Effect to populate form data when editing
  useEffect(() => {
    if (editProject && open) {
      // Set the active tab based on project type
      setActiveTab(editProject.project_type || 'fixed')
      
      // Find and set the client
      if (editProject.clients || editProject.client_id) {
        // If clients data is embedded, use it
        if (editProject.clients) {
          setSelectedClient(editProject.clients)
        }
        // Otherwise we'll need to find it by client_id when clients load
      }
      
      // Prepare common data
      const commonData = {
        name: editProject.name || "",
        description: editProject.description || "",
        client_id: editProject.client_id || "",
        currency: editProject.currency || defaultCurrency,
        start_date: editProject.start_date || "",
        due_date: editProject.due_date || "",
        notes: editProject.notes || "",
        status: editProject.status || "active",
        // Add financial fields that were missing
        expenses: editProject.expenses || 0,
        payment_received: editProject.payment_received || editProject.received || 0,
      }
      
      // Set type-specific data
      if (editProject.project_type === 'fixed') {
        setFixedData({
          ...commonData,
          project_type: 'fixed',
          total_budget: editProject.total_budget || editProject.budget || 0
        })
      } else if (editProject.project_type === 'recurring') {
        setRecurringData({
          ...commonData,
          project_type: 'recurring',
          recurring_frequency: editProject.recurring_frequency || 'monthly',
          recurring_amount: editProject.recurring_amount || 0,
          recurring_end_date: editProject.recurring_end_date || editProject.due_date || ""
        })
      } else if (editProject.project_type === 'hourly') {
        setHourlyData({
          ...commonData,
          project_type: 'hourly',
          hourly_rate_new: editProject.hourly_rate_new || editProject.hourly_rate || 0,
          estimated_hours: editProject.estimated_hours || 0,
          actual_hours: editProject.actual_hours || 0
        })
      }
    }
  }, [editProject, open, defaultCurrency])

  // Computed values
  const recurringTotal = useMemo(() => {
    if (!recurringData.recurring_amount || !recurringData.recurring_frequency || !recurringData.start_date) {
      return 0;
    }
    
    const startDate = new Date(recurringData.start_date);
    const endDate = recurringData.due_date ? new Date(recurringData.due_date) : undefined;
    
    return calculateRecurringTotal(
      recurringData.recurring_amount, 
      recurringData.recurring_frequency, 
      startDate,
      endDate
    );
  }, [recurringData.recurring_amount, recurringData.recurring_frequency, recurringData.start_date, recurringData.due_date])

  const hourlyTotal = useMemo(() => {
    if (!hourlyData.hourly_rate_new) {
      return 0;
    }
    
    // Use actual hours if available, otherwise fall back to estimated hours
    const hoursToUse = (hourlyData.actual_hours && hourlyData.actual_hours > 0) 
      ? hourlyData.actual_hours 
      : hourlyData.estimated_hours;
    
    if (!hoursToUse || hoursToUse <= 0) {
      return 0;
    }
    
    return calculateHourlyTotal(
      hourlyData.hourly_rate_new, 
      hoursToUse
    );
  }, [hourlyData.hourly_rate_new, hourlyData.estimated_hours, hourlyData.actual_hours])

  // Update total budget when calculated values change
  useEffect(() => {
    if (recurringTotal > 0) {
      setRecurringData(prev => ({ ...prev, total_budget: recurringTotal }))
    }
  }, [recurringTotal])

  useEffect(() => {
    if (hourlyTotal > 0) {
      setHourlyData(prev => ({ ...prev, total_budget: hourlyTotal }))
    }
  }, [hourlyTotal])

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client)
    
    // Update the active tab's data
    switch (activeTab) {
      case 'fixed':
        setFixedData(prev => ({ ...prev, client_id: clientId }))
        break
      case 'recurring':
        setRecurringData(prev => ({ ...prev, client_id: clientId }))
        break
      case 'hourly':
        setHourlyData(prev => ({ ...prev, client_id: clientId }))
        break
    }
  }

  // Get current form data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'fixed': return fixedData
      case 'recurring': return recurringData
      case 'hourly': return hourlyData
      default: return fixedData
    }
  }

  // Reset form
  const resetForm = () => {
    setFixedData({
      name: "",
      description: "",
      client_id: "",
      currency: defaultCurrency,
      start_date: "",
      due_date: "",
      notes: "",
      status: "active",
      project_type: 'fixed',
      total_budget: 0
    })
    
    setRecurringData({
      name: "",
      description: "",
      client_id: "",
      currency: defaultCurrency,
      start_date: "",
      due_date: "",
      notes: "",
      status: "active",
      project_type: 'recurring',
      recurring_frequency: 'monthly',
      recurring_amount: 0
    })
    
    setHourlyData({
      name: "",
      description: "",
      client_id: "",
      currency: defaultCurrency,
      start_date: "",
      due_date: "",
      notes: "",
      status: "active",
      project_type: 'hourly',
      hourly_rate_new: 0,
      estimated_hours: 0,
      actual_hours: 0
    })
    
    setSelectedClient(null)
    setClientSearchQuery("")
    setActiveTab(defaultType)
    setRecentlyReceived("")
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields based on project type
      const currentData = getCurrentData()
      
      // Basic validation for all types
      if (!currentData.name || !currentData.client_id) {
        toast.error("Please fill in all required fields")
        return
      }

      // Type-specific validation
      if (activeTab === 'recurring') {
        const recurringDataCast = currentData as RecurringProjectFormData
        if (!recurringDataCast.recurring_frequency || !recurringDataCast.recurring_amount || recurringDataCast.recurring_amount <= 0) {
          toast.error("Please fill in frequency and recurring amount")
          return
        }
      } else if (activeTab === 'hourly') {
        const hourlyDataCast = currentData as HourlyProjectFormData
        if (!hourlyDataCast.hourly_rate_new || hourlyDataCast.hourly_rate_new <= 0) {
          toast.error("Please fill in hourly rate")
          return
        }
      }

      // Check limits (only for new projects)
      if (!isEditMode && !canCreateResource("projects")) {
        const reason = getActionBlockedReason("projects")
        toast.error(reason || "You have reached your project limit")
        return
      }

      if (!isSupabaseConfigured()) {
        toast.error("Database is not configured. Please check your environment variables.")
        return
      }

      // Get company settings for defaults
      const companySettings = await getCompanySettings()

      // Calculate total budget based on project type
      let calculatedTotal = 0
      if (activeTab === 'recurring') {
        calculatedTotal = recurringTotal
      } else if (activeTab === 'hourly') {
        calculatedTotal = hourlyTotal
      } else {
        // For fixed projects, use the total_budget field
        calculatedTotal = (currentData as FixedProjectFormData).total_budget || 0
      }

      // Prepare project data with proper date handling
      const projectData: CreateProjectData = {
        ...currentData,
        currency: currentData.currency || defaultCurrency,
        project_type: activeTab,
        total_budget: calculatedTotal,
        auto_calculate_total: activeTab !== 'fixed',
        // Convert empty date strings to null for PostgreSQL
        start_date: currentData.start_date || null,
        due_date: currentData.due_date || null,
        recurring_end_date: (currentData as any).recurring_end_date || null
      }

      let project: any
      let error: any

      if (isEditMode) {
        // Update existing project
        const result = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editProject.id)
          .select()
          .single()
        
        project = result.data
        error = result.error
      } else {
        // Insert new project
        const result = await supabase
          .from('projects')
          .insert([projectData])
          .select()
          .single()
        
        project = result.data
        error = result.error
      }

      if (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, JSON.stringify(error, null, 2))
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} project: ` + (error.message || error.details || 'Unknown error'))
        return
      }

      // For auto-calculated projects, trigger calculation engine to ensure database is updated
      if (activeTab !== 'fixed' && project.id) {
        try {
          const { projectCalculationEngine } = await import('@/lib/project-calculation-engine')
          await projectCalculationEngine.updateProjectTotal(project.id)
        } catch (calcError) {
          console.warn('Failed to run calculation engine after project creation:', calcError)
          // Don't fail the entire creation process if calculation fails
        }
      }

      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} project ${isEditMode ? 'updated' : 'created'} successfully!`)
      
      // Complete cache invalidation after successful creation/update
      cacheUtils.invalidateAllProjectRelatedData(queryClient)
      
      // Callbacks
      onProjectUpdate?.()
      onAddProject?.(project)
      
      // Reset and close
      resetForm()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating project:', JSON.stringify(error, null, 2))
      toast.error("An unexpected error occurred: " + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle close
  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" id="project-dialog">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription>
            Choose the project type and fill in the details. All calculations are automatic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <form onSubmit={handleSubmit} id="project-form">
            <div className="my-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProjectType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fixed" className="flex items-center gap-2">
                  <HugeiconsIcon icon={DollarCircleIcon} className="h-4 w-4"  />
                  Fixed
                </TabsTrigger>
                                  <TabsTrigger value="recurring" className="flex items-center gap-2">
                    <HugeiconsIcon icon={RepeatIcon} className="h-4 w-4"  />
                    Recurring
                  </TabsTrigger>
                                  <TabsTrigger value="hourly" className="flex items-center gap-2">
                                         <HugeiconsIcon icon={ClockIcon} className="h-4 w-4"  />
                    Hourly
                  </TabsTrigger>
              </TabsList>

              {/* Fixed Project Tab */}
              <TabsContent value="fixed" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {/* 1st row: Project name, Client */}
                  <div className="grid grid-cols-2 gap-4">
                    <ProjectNameField data={fixedData} setData={setFixedData} />
                    <ClientField 
                      clients={clients}
                      selectedClient={selectedClient}
                      setSelectedClient={setSelectedClient}
                      clientDropdownOpen={clientDropdownOpen}
                      setClientDropdownOpen={setClientDropdownOpen}
                      clientSearchQuery={clientSearchQuery}
                      setClientSearchQuery={setClientSearchQuery}
                      data={fixedData}
                      setData={setFixedData}
                      onClientUpdate={refetchClients}
                    />
                  </div>

                  {/* Currency row (if pipeline) */}
                  <CurrencyField data={fixedData} setData={setFixedData} context={context} />

                  {/* 2nd Row: Status, Total budget, Expenses */}
                  <div className="grid grid-cols-3 gap-4">
                    <StatusField data={fixedData} setData={setFixedData} />
                    <div className="space-y-2">
                      <Label htmlFor="total_budget">Total Budget *</Label>
                      <Input
                        id="total_budget"
                        type="number"
                        step="0.01"
                        min="0"
                        value={fixedData.total_budget || ""}
                        onChange={(e) => setFixedData(prev => ({ 
                          ...prev, 
                          total_budget: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <ExpensesField data={fixedData} setData={setFixedData} />
                  </div>

                  {/* 3rd: Received, Recently received */}
                  <div className="grid grid-cols-2 gap-4">
                    <ReceivedFields 
                      data={fixedData} 
                      setData={setFixedData}
                      recentlyReceived={recentlyReceived}
                      setRecentlyReceived={setRecentlyReceived}
                    />
                  </div>

                  {/* Rest: Start, Due dates */}
                  <DateFields data={fixedData} setData={setFixedData} />

                  {/* Description */}
                  <DescriptionField data={fixedData} setData={setFixedData} />
                </div>
              </TabsContent>

              {/* Recurring Project Tab */}
              <TabsContent value="recurring" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {/* 1st row: Project name, Client */}
                  <div className="grid grid-cols-2 gap-4">
                    <ProjectNameField data={recurringData} setData={setRecurringData} />
                    <ClientField 
                      clients={clients}
                      selectedClient={selectedClient}
                      setSelectedClient={setSelectedClient}
                      clientDropdownOpen={clientDropdownOpen}
                      setClientDropdownOpen={setClientDropdownOpen}
                      clientSearchQuery={clientSearchQuery}
                      setClientSearchQuery={setClientSearchQuery}
                      data={recurringData}
                      setData={setRecurringData}
                      onClientUpdate={refetchClients}
                    />
                  </div>

                  {/* Currency row (if pipeline) */}
                  <CurrencyField data={recurringData} setData={setRecurringData} context={context} />

                  {/* 2nd: Status, Frequency */}
                  <div className="grid grid-cols-2 gap-4">
                    <StatusField data={recurringData} setData={setRecurringData} />
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency *</Label>
                      <Select
                        value={recurringData.recurring_frequency}
                        onValueChange={(value) => setRecurringData(prev => ({ 
                          ...prev, 
                          recurring_frequency: value as any 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 3rd: Recurring Amount, Expenses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recurring_amount">Recurring Amount *</Label>
                      <Input
                        id="recurring_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={recurringData.recurring_amount}
                        onChange={(e) => setRecurringData(prev => ({ 
                          ...prev, 
                          recurring_amount: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <ExpensesField data={recurringData} setData={setRecurringData} />
                  </div>

                  {/* 4th: Received, Recently received */}
                  <div className="grid grid-cols-2 gap-4">
                    <ReceivedFields 
                      data={recurringData} 
                      setData={setRecurringData}
                      recentlyReceived={recentlyReceived}
                      setRecentlyReceived={setRecentlyReceived}
                    />
                  </div>

                  {/* 5th: Start, Due dates */}
                  <DateFields data={recurringData} setData={setRecurringData} showEndDate={false} />

                  {/* Calculated Total Budget */}
                  {recurringTotal > 0 && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={CalculateIcon} className="h-4 w-4"  />
                        <span className="font-medium">Calculated Total Budget:</span>
                        <Badge variant="secondary" className="text-lg">
                          {recurringData.currency || defaultCurrency} {recurringTotal.toLocaleString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {recurringData.due_date 
                          ? `Based on ${recurringData.recurring_frequency} payments from start date to due date`
                          : `Based on ${recurringData.recurring_frequency} payments for 1 year (default period)`
                        }
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <DescriptionField data={recurringData} setData={setRecurringData} />
                </div>
              </TabsContent>

              {/* Hourly Project Tab */}
              <TabsContent value="hourly" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {/* 1st row: Project name, Client */}
                  <div className="grid grid-cols-2 gap-4">
                    <ProjectNameField data={hourlyData} setData={setHourlyData} />
                    <ClientField 
                      clients={clients}
                      selectedClient={selectedClient}
                      setSelectedClient={setSelectedClient}
                      clientDropdownOpen={clientDropdownOpen}
                      setClientDropdownOpen={setClientDropdownOpen}
                      clientSearchQuery={clientSearchQuery}
                      setClientSearchQuery={setClientSearchQuery}
                      data={hourlyData}
                      setData={setHourlyData}
                      onClientUpdate={refetchClients}
                    />
                  </div>

                  {/* Currency row (if pipeline) */}
                  <CurrencyField data={hourlyData} setData={setHourlyData} context={context} />

                  {/* 2nd: Status, Hourly Rate, Hours */}
                  <div className="grid grid-cols-3 gap-4">
                    <StatusField data={hourlyData} setData={setHourlyData} />
                    <div className="space-y-2">
                      <Label htmlFor="hourly_rate">Hourly Rate *</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={hourlyData.hourly_rate_new}
                        onChange={(e) => setHourlyData(prev => ({ 
                          ...prev, 
                          hourly_rate_new: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="actual_hours">Hours Logged</Label>
                      <Input
                        id="actual_hours"
                        type="number"
                        step="0.1"
                        min="0"
                        value={hourlyData.actual_hours || 0}
                        onChange={(e) => setHourlyData(prev => ({ 
                          ...prev, 
                          actual_hours: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* 3rd: Estimated, Expenses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimated_hours">Estimated</Label>
                      <Input
                        id="estimated_hours"
                        type="number"
                        step="0.1"
                        min="0"
                        value={hourlyData.estimated_hours}
                        onChange={(e) => setHourlyData(prev => ({ 
                          ...prev, 
                          estimated_hours: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <ExpensesField data={hourlyData} setData={setHourlyData} />
                  </div>

                  {/* 4th: Received, Recently received */}
                  <div className="grid grid-cols-2 gap-4">
                    <ReceivedFields 
                      data={hourlyData} 
                      setData={setHourlyData}
                      recentlyReceived={recentlyReceived}
                      setRecentlyReceived={setRecentlyReceived}
                    />
                  </div>

                  {/* 5th: Start, Due dates */}
                  <DateFields data={hourlyData} setData={setHourlyData} showEndDate={false} />

                  {/* Calculated Total */}
                  {hourlyTotal > 0 && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={CalculateIcon} className="h-4 w-4"  />
                        <span className="font-medium">Initial Estimated Total:</span>
                        <Badge variant="secondary" className="text-lg">
                          {hourlyData.currency || defaultCurrency} {hourlyTotal.toLocaleString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Total will update automatically as you log hours
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <DescriptionField data={hourlyData} setData={setHourlyData} />
                </div>
              </TabsContent>
            </Tabs>
            </div>
          </form>
        </div>
        
        <DialogFooter className="flex-shrink-0 border-t border-border pt-4 mt-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader size="sm" variant="default" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                {isEditMode ? (
                  <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4"  />
                ) : (
                  <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4"  />
                )}
                {isEditMode ? 'Update Project' : 'Create Project'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}