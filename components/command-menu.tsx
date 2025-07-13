"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  User,
  Plus,
  Users,
  FolderPlus,
  FileText,
  Search,
  Home,
  BarChart3,
  Receipt,
  Building,
  Palette,
  Bell,
  Shield,
  LogOut,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { toast } from "sonner"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"

// Mock data for search results (fallback when database is not available)
const mockSearchResults = [
  { id: "1", type: "client", name: "John Smith", company: "Acme Corporation" },
  { id: "2", type: "client", name: "Sarah Johnson", company: "TechStart Inc." },
  { id: "3", type: "project", name: "Website Redesign", client: "John Smith" },
  { id: "4", type: "project", name: "Mobile App Development", client: "Sarah Johnson" },
  { id: "5", type: "invoice", name: "INV-2024-001", client: "John Smith", amount: "$5,000" },
  { id: "6", type: "invoice", name: "INV-2024-002", client: "Sarah Johnson", amount: "$3,200" },
]

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Fetch search results from database
  const fetchSearchResults = React.useCallback(async (query: string) => {
    console.log('fetchSearchResults called with query:', query)
    
    if (!query || query.length < 2) {
      console.log('Query too short, clearing results')
      setSearchResults([])
      return
    }

    console.log('Starting search...')
    setIsSearching(true)
    try {
      const results: any[] = []

      if (isSupabaseConfigured()) {
        console.log('Supabase is configured, searching database...')
        // Search clients
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, company, email')
          .or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)

        if (clients) {
          results.push(...clients.map(client => ({
            id: client.id,
            type: 'client',
            name: client.name,
            company: client.company,
            email: client.email
          })))
        }

        // Search projects
        const { data: projects } = await supabase
          .from('projects')
          .select(`
            id, 
            name, 
            clients!inner (name, company)
          `)
          .ilike('name', `%${query}%`)
          .limit(5)

        if (projects) {
          results.push(...projects.map((project: any) => ({
            id: project.id,
            type: 'project',
            name: project.name,
            client: project.clients?.name || 'Unknown Client'
          })))
        }

        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select(`
            id, 
            invoice_number, 
            total_amount,
            clients!inner (name, company)
          `)
          .ilike('invoice_number', `%${query}%`)
          .limit(5)

        if (invoices) {
          results.push(...invoices.map((invoice: any) => ({
            id: invoice.id,
            type: 'invoice',
            name: invoice.invoice_number,
            client: invoice.clients?.name || 'Unknown Client',
            amount: formatCurrency(invoice.total_amount)
          })))
        }
        console.log('Database search results:', results)
      } else {
        console.log('Supabase not configured, using mock data...')
        // Fallback to mock data
        const filtered = mockSearchResults.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.company && item.company.toLowerCase().includes(query.toLowerCase())) ||
          (item.client && item.client.toLowerCase().includes(query.toLowerCase()))
        )
        results.push(...filtered)
        console.log('Using mock data, filtered results:', filtered)
      }

      console.log('Final search results:', results)
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSearchResults(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, fetchSearchResults])

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setSearchResults([])
    }
  }, [open])

  const handleAction = (action: string) => {
    setOpen(false)
    setSearchQuery("")
    setSearchResults([])
    
    switch (action) {
      case "add-client":
        router.push("/dashboard/clients")
        setTimeout(() => {
          // Trigger add client dialog via custom event
          window.dispatchEvent(new CustomEvent('trigger-add-client'))
          toast.success("Opening Add Client dialog...")
        }, 100)
        break
      case "add-project":
        router.push("/dashboard/projects")
        setTimeout(() => {
          // Trigger add project dialog via custom event
          window.dispatchEvent(new CustomEvent('trigger-add-project'))
          toast.success("Opening Add Project dialog...")
        }, 100)
        break
      case "create-invoice":
        router.push("/dashboard/invoices/generate")
        toast.success("Opening Create Invoice page...")
        break
      case "dashboard":
        router.push("/dashboard")
        break
      case "clients":
        router.push("/dashboard/clients")
        break
      case "projects":
        router.push("/dashboard/projects")
        break
      case "invoices":
        router.push("/dashboard/invoices")
        break
      case "analytics":
        router.push("/dashboard/analytics")
        break
      case "settings":
        router.push("/dashboard/settings")
        break
      case "profile":
        router.push("/dashboard/profile")
        break
      default:
        break
    }
  }

  const handleSearchResult = (result: any) => {
    setOpen(false)
    setSearchQuery("")
    setSearchResults([])
    
    switch (result.type) {
      case "client":
        router.push("/dashboard/clients")
        toast.success(`Found client: ${result.name}`)
        break
      case "project":
        router.push("/dashboard/projects")
        toast.success(`Found project: ${result.name}`)
        break
      case "invoice":
        router.push("/dashboard/invoices")
        toast.success(`Found invoice: ${result.name}`)
        break
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>
        
        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleAction("add-client")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Add Client</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("add-project")}>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Add Project</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("create-invoice")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Create Invoice</span>
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleAction("dashboard")}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("clients")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("projects")}>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("invoices")}>
            <Receipt className="mr-2 h-4 w-4" />
            <span>Invoices</span>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => handleAction("profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⌘⇧P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleAction("settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Search Results">
              {searchResults.map((result: any) => (
                <CommandItem 
                  key={result.id}
                  value={`${result.name} ${result.company || ''} ${result.client || ''} ${result.email || ''}`}
                  onSelect={() => handleSearchResult(result)}
                >
                  {result.type === "client" && <Users className="mr-2 h-4 w-4" />}
                  {result.type === "project" && <FolderPlus className="mr-2 h-4 w-4" />}
                  {result.type === "invoice" && <Receipt className="mr-2 h-4 w-4" />}
                  <div className="flex flex-col">
                    <span>{result.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.type === "client" && result.company}
                      {result.type === "project" && `Client: ${result.client}`}
                      {result.type === "invoice" && `${result.client} • ${result.amount}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
} 