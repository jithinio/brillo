"use client"

import * as React from "react"
import { Filter, X, ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import { useProjectFilters } from "@/hooks/use-project-filters"
import { cn } from "@/lib/utils"

interface Client {
  id: string
  name: string
  company?: string
}

interface ProjectFiltersProps {
  clients: Client[]
  showStatusFilter?: boolean
  className?: string
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pipeline", label: "Pipeline" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export function ProjectFilters({ 
  clients = [], 
  showStatusFilter = false,
  className 
}: ProjectFiltersProps) {
  const {
    filters,
    loading,
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
    toggleStatus,
    removeStatus,
    toggleClient,
    removeClient,
    updateFilter,
    updateFilters,
  } = useProjectFilters()

  const [isOpen, setIsOpen] = React.useState(false)
  const [clientSearchOpen, setClientSearchOpen] = React.useState(false)
  const [clientSearch, setClientSearch] = React.useState("")
  
  // Local draft state for the sheet
  const [draftFilters, setDraftFilters] = React.useState(filters)

  // Update draft when filters change from outside
  React.useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  // Filter clients based on search
  const filteredClients = React.useMemo(() => {
    if (!clientSearch) return clients
    
    return clients.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(clientSearch.toLowerCase()))
    )
  }, [clients, clientSearch])

  // Handle draft status toggle
  const handleDraftStatusToggle = React.useCallback((status: string) => {
    setDraftFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }))
  }, [])

  // Handle draft client toggle
  const handleDraftClientToggle = React.useCallback((clientId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      client: prev.client.includes(clientId)
        ? prev.client.filter(c => c !== clientId)
        : [...prev.client, clientId]
    }))
  }, [])

  // Handle draft date range changes
  const handleDraftDateChange = React.useCallback((field: 'start' | 'end', date: Date | undefined) => {
    setDraftFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date ? date.toISOString() : null
      }
    }))
  }, [])

  // Handle draft budget changes
  const handleDraftBudgetChange = React.useCallback((field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setDraftFilters(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        [field]: numValue
      }
    }))
  }, [])

  // Apply filters
  const handleApplyFilters = React.useCallback(() => {
    updateFilters(draftFilters)
    setIsOpen(false)
  }, [draftFilters, updateFilters])

  // Reset filters
  const handleResetFilters = React.useCallback(() => {
    const defaultFilters = {
      status: [],
      client: [],
      dateRange: { start: null, end: null },
      budget: { min: null, max: null }
    }
    setDraftFilters(defaultFilters)
    updateFilters(defaultFilters)
    setIsOpen(false)
  }, [updateFilters])

  // Count draft active filters
  const draftActiveCount = React.useMemo(() => {
    let count = 0
    count += draftFilters.status.length
    count += draftFilters.client.length
    if (draftFilters.dateRange.start) count++
    if (draftFilters.dateRange.end) count++
    if (draftFilters.budget.min !== null) count++
    if (draftFilters.budget.max !== null) count++
    return count
  }, [draftFilters])

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Filter Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-dashed",
              hasActiveFilters && "border-primary bg-primary/5"
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Filter Projects</SheetTitle>
            <SheetDescription>
              Configure filters to find specific projects. Changes will be applied when you click "Apply Filters".
            </SheetDescription>
          </SheetHeader>

          <div className="grid flex-1 auto-rows-min gap-6 py-6">
            {/* Status Filter Section */}
            {showStatusFilter && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Project Status</Label>
                  <p className="text-sm text-muted-foreground">Filter by project status</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {STATUS_OPTIONS.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={draftFilters.status.includes(status.value)}
                        onCheckedChange={() => handleDraftStatusToggle(status.value)}
                      />
                      <Label
                        htmlFor={`status-${status.value}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Client Filter Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Clients</Label>
                <p className="text-sm text-muted-foreground">Select specific clients to filter by</p>
              </div>
              <div className="space-y-3">
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <Search className="mr-2 h-4 w-4" />
                        {draftFilters.client.length === 0
                          ? "Search and select clients..."
                          : draftFilters.client.length === 1
                          ? clients.find(c => c.id === draftFilters.client[0])?.name || "Selected"
                          : `${draftFilters.client.length} clients selected`}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search clients..." 
                        value={clientSearch}
                        onValueChange={setClientSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              onSelect={() => handleDraftClientToggle(client.id)}
                              className="flex items-center space-x-3 p-3"
                            >
                              <Checkbox
                                checked={draftFilters.client.includes(client.id)}
                                className="mr-2"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{client.name}</span>
                                {client.company && (
                                  <span className="text-xs text-muted-foreground">{client.company}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected Clients */}
                {draftFilters.client.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                    {draftFilters.client.map((clientId) => {
                      const client = clients.find(c => c.id === clientId)
                      return client ? (
                        <Badge key={clientId} variant="secondary" className="px-2 py-1">
                          {client.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => handleDraftClientToggle(clientId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <Separator />
            </div>

            {/* Date Range Filter Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Date Range</Label>
                <p className="text-sm text-muted-foreground">Filter by project creation date</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <DatePicker
                    date={draftFilters.dateRange.start ? new Date(draftFilters.dateRange.start) : undefined}
                    onSelect={(date) => handleDraftDateChange('start', date)}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date</Label>
                  <DatePicker
                    date={draftFilters.dateRange.end ? new Date(draftFilters.dateRange.end) : undefined}
                    onSelect={(date) => handleDraftDateChange('end', date)}
                    placeholder="Select end date"
                  />
                </div>
              </div>
              <Separator />
            </div>

            {/* Budget Range Filter Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Budget Range</Label>
                <p className="text-sm text-muted-foreground">Filter by project budget amount</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Minimum Budget</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={draftFilters.budget.min?.toString() || ''}
                    onChange={(e) => handleDraftBudgetChange('min', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Maximum Budget</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={draftFilters.budget.max?.toString() || ''}
                    onChange={(e) => handleDraftBudgetChange('max', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleResetFilters}
              className="flex-1"
            >
              Reset Filters
            </Button>
            <Button 
              onClick={handleApplyFilters}
              className="flex-1"
              disabled={JSON.stringify(draftFilters) === JSON.stringify(filters)}
            >
              Apply Filters
              {draftActiveCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-white text-primary">
                  {draftActiveCount}
                </Badge>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {/* Status Badges */}
          {showStatusFilter && filters.status.map((status) => {
            const statusOption = STATUS_OPTIONS.find(s => s.value === status)
            return statusOption ? (
              <Badge key={status} variant="secondary" className="h-6 px-2 text-xs">
                {statusOption.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                  onClick={() => removeStatus(status)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ) : null
          })}

          {/* Client Badges */}
          {filters.client.map((clientId) => {
            const client = clients.find(c => c.id === clientId)
            return client ? (
              <Badge key={clientId} variant="secondary" className="h-6 px-2 text-xs">
                {client.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                  onClick={() => removeClient(clientId)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ) : null
          })}
        </div>
      )}
    </div>
  )
} 