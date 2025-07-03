"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Plus, Trash2, Send, Save, UserPlus, Building, Mail, Phone, MapPin, Receipt, Eye, Download, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, CURRENCIES, getDefaultCurrency } from "@/lib/currency"
import { PageHeader, PageContent } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useSettings } from "@/components/settings-provider"
import type { Client } from "@/components/clients/columns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generateInvoicePDF } from "@/lib/pdf-generator"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
}

// Mock clients data (same as in clients page)
const mockClients: Client[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@acmecorp.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Corporation",
    address: "123 Business Ave",
    city: "New York",
    state: "NY",
    zip_code: "10001",
    country: "United States",
    notes: "Long-term client, prefers email communication",
    avatar_url: undefined,
    created_at: "2024-01-01T00:00:00Z",
    projects: [{ id: "1", name: "Website Redesign", status: "active" }],
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@techstart.io",
    phone: "+1 (555) 234-5678",
    company: "TechStart Inc.",
    address: "456 Innovation Dr",
    city: "San Francisco",
    state: "CA",
    zip_code: "94105",
    country: "United States",
    notes: "Startup client, fast-paced projects",
    avatar_url: undefined,
    created_at: "2024-01-15T00:00:00Z",
    projects: [{ id: "2", name: "Mobile App Development", status: "active" }],
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "mbrown@globalsolutions.com",
    phone: "+1 (555) 345-6789",
    company: "Global Solutions LLC",
    address: "789 Enterprise Blvd",
    city: "Chicago",
    state: "IL",
    zip_code: "60601",
    country: "United States",
    notes: "Enterprise client, requires detailed reporting",
    avatar_url: undefined,
    created_at: "2024-01-10T00:00:00Z",
    projects: [{ id: "3", name: "Brand Identity Package", status: "completed" }],
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.davis@creativestudio.com",
    phone: "+1 (555) 456-7890",
    company: "Creative Studio",
    address: "321 Design St",
    city: "Los Angeles",
    state: "CA",
    zip_code: "90210",
    country: "United States",
    notes: "Creative agency, values innovative solutions",
    avatar_url: undefined,
    created_at: "2024-01-20T00:00:00Z",
    projects: [{ id: "4", name: "E-commerce Platform", status: "active" }],
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david@retailplus.com",
    phone: "+1 (555) 567-8901",
    company: "Retail Plus",
    address: "654 Commerce Way",
    city: "Miami",
    state: "FL",
    zip_code: "33101",
    country: "United States",
    notes: "Retail client, seasonal projects",
    avatar_url: undefined,
    created_at: "2024-02-01T00:00:00Z",
    projects: [{ id: "5", name: "Marketing Automation", status: "on_hold" }],
  },
]

export default function GenerateInvoicePage() {
  const { toast } = useToast()
  const { settings } = useSettings()
  
  // Invoice form state
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [clientCurrency, setClientCurrency] = useState(getDefaultCurrency())
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", quantity: 1, rate: 0 }])
  
  // Tax state
  const [taxEnabled, setTaxEnabled] = useState(settings.autoCalculateTax)
  const [customTaxRate, setCustomTaxRate] = useState(settings.taxRate.toString())
  
  // Clients data
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  
  // New client modal state
  const [showNewClientDialog, setShowNewClientDialog] = useState(false)
  const [newClient, setNewClient] = useState<Partial<Client>>({
    country: "United States"
  })
  
  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Auto-populate data from session storage
  const [projectData, setProjectData] = useState<any>(null)
  const [clientData, setClientData] = useState<any>(null)
  
  // Project states
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  
  // Invoice number state
  const [invoiceNumber, setInvoiceNumber] = useState<string>("")

  // Load clients on component mount
  useEffect(() => {
    fetchClients()
    
    // Set default due date to 30 days from now
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
    setDueDate(defaultDueDate)
    
    // Generate a simple sequential invoice number
    const generateInvoiceNumber = async () => {
      const now = new Date()
      const year = now.getFullYear()
      let invoiceCount = 1

      if (isSupabaseConfigured()) {
        try {
          // Get count from Supabase for the current year
          const { count, error } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .like('invoice_number', `${settings.invoicePrefix || 'INV'}-${year}-%`)

          if (!error && count !== null) {
            invoiceCount = count + 1
          }
        } catch (error) {
          console.error('Error counting invoices:', error)
          // Fallback to session storage count
          const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
          invoiceCount = existingInvoices.length + 1
        }
      } else {
        // Demo mode: count from session storage
        const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        const currentYearInvoices = existingInvoices.filter((inv: any) => 
          inv.invoice_number?.startsWith(`${settings.invoicePrefix || 'INV'}-${year}-`)
        )
        invoiceCount = currentYearInvoices.length + 1
      }
      
      // Format: INV-YYYY-001 (e.g., INV-2024-001)
      const generatedNumber = `${settings.invoicePrefix || 'INV'}-${year}-${String(invoiceCount).padStart(3, '0')}`
      setInvoiceNumber(generatedNumber)
    }

    generateInvoiceNumber()
  }, [settings.invoicePrefix])

  // Update tax settings when settings change
  useEffect(() => {
    setTaxEnabled(settings.autoCalculateTax)
    setCustomTaxRate(settings.taxRate.toString())
  }, [settings.autoCalculateTax, settings.taxRate])

  // Load project or client data from sessionStorage when component mounts
  useEffect(() => {
    const storedProjectData = sessionStorage.getItem('invoice-project-data')
    const storedClientData = sessionStorage.getItem('invoice-client-data')
    
    if (storedProjectData) {
      try {
        const projectInfo = JSON.parse(storedProjectData)
        setProjectData(projectInfo)
        
        // Find and select the client
        const matchingClient = clients.find(c => c.name === projectInfo.clientName)
        if (matchingClient) {
          setSelectedClientId(matchingClient.id)
          setSelectedClient(matchingClient)
          
          // Fetch projects for this client and then select the specific project
          fetchProjectsForClient(matchingClient.id).then(() => {
            // Set the selected project after projects are loaded
            setSelectedProject({
              id: projectInfo.projectId,
              name: projectInfo.projectName
            })
          })
        }
        
        // Calculate suggested amount from project data
        const suggestedAmount = projectInfo.projectPending || projectInfo.projectBudget || 0
        
        // Create default invoice item for the project
        setItems([{
          id: "1",
          description: `${projectInfo.projectName} - Project development and implementation`,
          quantity: 1,
          rate: suggestedAmount
        }])
        
        // Clear the session storage after loading
        sessionStorage.removeItem('invoice-project-data')
        
        // Show success notification
        toast({
          title: "Invoice Auto-Populated",
          description: `Form filled with data from "${projectInfo.projectName}". ${suggestedAmount > 0 ? `Suggested amount: ${formatCurrency(suggestedAmount)}` : 'Please set the invoice amount.'}`,
        })
      } catch (error) {
        console.error('Error parsing project data:', error)
        toast({
          title: "Error",
          description: "Could not load project data. Please fill the form manually.",
          variant: "destructive",
        })
      }
    } else if (storedClientData) {
      try {
        const clientInfo = JSON.parse(storedClientData)
        setClientData(clientInfo)
        
        // Find and select the client
        const matchingClient = clients.find(c => c.id === clientInfo.clientId)
        if (matchingClient) {
          setSelectedClientId(matchingClient.id)
          setSelectedClient(matchingClient)
        }
        
        // Clear the session storage after loading
        sessionStorage.removeItem('invoice-client-data')
        
        // Show success notification
        toast({
          title: "Invoice Auto-Populated",
          description: `Form filled with data for "${clientInfo.clientName}".`,
        })
      } catch (error) {
        console.error('Error parsing client data:', error)
        toast({
          title: "Error",
          description: "Could not load client data. Please fill the form manually.",
          variant: "destructive",
        })
      }
    }
  }, [clients, toast])

  async function fetchClients() {
    try {
      setClientsLoading(true)
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            projects (
              id,
              name,
              status
            )
          `)
          .order('name', { ascending: true })
        
        if (error) {
          console.error('Error fetching clients:', error)
          setClients(mockClients)
        } else {
          setClients(data || [])
        }
      } else {
        setClients(mockClients)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients(mockClients)
    } finally {
      setClientsLoading(false)
    }
  }

  async function fetchProjectsForClient(clientId: string) {
    try {
      setProjectsLoading(true)
      
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
        
        if (error) {
          console.error('Error fetching projects:', error)
          setProjects([])
        } else {
          setProjects(data || [])
        }
      } else {
        // Mock projects for demo mode
        const mockProjectsForClient = [
          { id: '1', name: 'Website Redesign', status: 'active' },
          { id: '2', name: 'Mobile App Development', status: 'active' },
          { id: '3', name: 'E-commerce Platform', status: 'completed' },
        ].filter(() => Math.random() > 0.5) // Randomly show some projects
        
        setProjects(mockProjectsForClient)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClientId(clientId)
    setSelectedClient(client || null)
    setClientDropdownOpen(false)
    setClientSearchQuery("")
    
    // Reset project selection and fetch projects for this client
    setSelectedProject(null)
    if (client) {
      fetchProjectsForClient(clientId)
    } else {
      setProjects([])
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  )

  const handleAddNewClient = async () => {
    if (!newClient.name) {
      toast({
        title: "Validation Error",
        description: "Client name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .insert([{
            name: newClient.name,
            email: newClient.email || '',
            phone: newClient.phone || '',
            company: newClient.company || '',
            address: newClient.address || '',
            city: newClient.city || '',
            state: newClient.state || '',
            zip_code: newClient.zip_code || '',
            country: newClient.country || 'United States',
            notes: newClient.notes || ''
          }])
          .select()
          .single()

        if (error) {
          throw error
        }

        // Refetch clients to get the updated list
        await fetchClients()
        
        // Select the new client
        if (data) {
          setSelectedClientId(data.id)
          setSelectedClient(data as Client)
        }
      } else {
        // For demo mode, create a mock client
        const mockId = `${Date.now()}`
        const mockClient: Client = {
          id: mockId,
          name: newClient.name!,
          email: newClient.email || '',
          phone: newClient.phone || '',
          company: newClient.company || '',
          address: newClient.address || '',
          city: newClient.city || '',
          state: newClient.state || '',
          zip_code: newClient.zip_code || '',
          country: newClient.country || 'United States',
          notes: newClient.notes || '',
          avatar_url: undefined,
          created_at: new Date().toISOString(),
          projects: []
        }
        
        // Add to clients list
        setClients(prev => [...prev, mockClient])
        
        // Select the new client
        setSelectedClientId(mockClient.id)
        setSelectedClient(mockClient)
      }

      // Reset form and close dialog
      setNewClient({ country: "United States" })
      setShowNewClientDialog(false)
      
      toast({
        title: "Client Added",
        description: "New client has been created and selected for this invoice.",
      })
    } catch (error) {
      console.error('Error adding client:', error)
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  }

  const calculateTax = () => {
    if (!taxEnabled) return 0
    const taxRate = Number.parseFloat(customTaxRate) || 0
    return calculateSubtotal() * (taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const isReadyToGenerate = () => {
    return selectedClient && 
           items.length > 0 && 
           items.every(item => item.description.trim() && item.rate > 0) &&
           invoiceDate &&
           dueDate
  }

  const handleGenerateInvoice = async () => {
    if (!isReadyToGenerate()) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before generating the invoice.",
        variant: "destructive",
      })
      return
    }

    // Additional validation
    if (!selectedClient) {
      toast({
        title: "Validation Error",
        description: "Please select a client before generating the invoice.",
        variant: "destructive",
      })
      return
    }

    if (!invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Please set an invoice date.",
        variant: "destructive",
      })
      return
    }

    try {
      // Use the pre-generated invoice number from state
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const total = calculateTotal()
      
      // Store invoice data for success dialog
      const invoiceData = {
        client: selectedClient,
        items,
        subtotal,
        tax,
        total,
        currency: clientCurrency,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate?.toISOString(),
        notes,
        taxEnabled,
        taxRate: customTaxRate,
        taxName: settings.taxName,
        invoiceNumber
      }

      // Save invoice to database or add to session storage for demo
      if (isSupabaseConfigured()) {
        console.log('Saving invoice to Supabase...')
        
        // Calculate tax rate as percentage
        const taxRatePercent = taxEnabled ? parseFloat(customTaxRate) : 0
        
        // Prepare invoice data matching exact database schema
        const invoiceInsertData = {
          invoice_number: invoiceNumber,
          client_id: selectedClient.id,
          project_id: selectedProject?.id || null, // Include selected project if any
          amount: subtotal,
          tax_rate: taxRatePercent,
          tax_amount: tax,
          total_amount: total,
          status: 'draft', // Start as draft, can be changed to 'sent' later
          issue_date: invoiceDate.toISOString().split('T')[0], // DATE format (YYYY-MM-DD)
          due_date: (dueDate?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()).split('T')[0], // DATE format
          notes: notes || '',
          terms: '' // Empty for now, can be added later
        }

        console.log('Invoice insert data:', invoiceInsertData)

        // Insert the main invoice record
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceInsertData])
          .select()
          .single()

        if (invoiceError) {
          console.error('Failed to insert invoice:', invoiceError)
          throw new Error(`Failed to save invoice: ${invoiceError.message}`)
        }

        console.log('Invoice saved successfully:', invoiceData)

        // Now save the invoice items
        const invoiceItemsData = items.map(item => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate
        }))

        console.log('Invoice items data:', invoiceItemsData)

        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItemsData)
          .select()

        if (itemsError) {
          console.error('Failed to insert invoice items:', itemsError)
          // Don't throw error here, invoice is already saved
          console.warn('Invoice saved but items failed to save:', itemsError.message)
        } else {
          console.log('Invoice items saved successfully:', itemsData)
        }

        toast({
          title: "Invoice Generated",
          description: `Invoice ${invoiceNumber} has been created and saved to database.`,
        })
      } else {
        console.log('Saving to session storage (demo mode)...')
        // For demo mode, store in sessionStorage to simulate database save
        const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        
        // Create a mock UUID for session storage
        const mockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const newInvoice = {
          id: mockId,
          invoice_number: invoiceNumber,
          client_id: selectedClient.id,
          project_id: selectedProject?.id || null,
          issue_date: invoiceDate.toISOString().split('T')[0],
          due_date: (dueDate?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()).split('T')[0],
          amount: subtotal,
          tax_rate: taxEnabled ? parseFloat(customTaxRate) : 0,
          tax_amount: tax,
          total_amount: total,
          status: 'draft' as const,
          notes: notes || '',
          terms: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Include client and project data for UI compatibility
          clients: {
            name: selectedClient.name,
            company: selectedClient.company
          },
          projects: selectedProject ? {
            name: selectedProject.name
          } : null,
          // Store currency separately for UI (not part of DB schema)
          _currency: clientCurrency, // Prefix with _ to indicate UI-only field
          _items: items // Store items for reference
        }
        
        console.log('Adding invoice to session storage:', newInvoice)
        existingInvoices.push(newInvoice)
        sessionStorage.setItem('demo-invoices', JSON.stringify(existingInvoices))

        toast({
          title: "Invoice Generated",
          description: `Invoice ${invoiceNumber} has been created (demo mode - saved locally).`,
        })
      }
      
      // Create invoice data for success dialog and PDF generation
      const dialogInvoiceData = {
        invoiceNumber,
        client: selectedClient,
        invoiceDate,
        dueDate,
        items,
        subtotal,
        tax,
        total,
        notes,
        currency: clientCurrency,
        taxName: settings.taxName,
        taxEnabled,
        customTaxRate,
        taxRate: taxEnabled ? customTaxRate : '0'
      }
      
      setGeneratedInvoiceData(dialogInvoiceData)
      setShowSuccessDialog(true)
                } catch (error) {
        console.warn('Error generating invoice:', 
          (error as any)?.message || (error as any)?.code || JSON.stringify(error) || 'Unknown error')
        
        let errorMessage = "Failed to generate invoice. Please try again."
        
        if (error instanceof Error && error.message) {
          errorMessage = error.message
        } else if (typeof error === 'string' && error.length > 0) {
          errorMessage = error
        } else if (error && typeof error === 'object') {
          const errorStr = JSON.stringify(error)
          if (errorStr !== '{}') {
            errorMessage = errorStr
          }
        }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDownloadPDF = async () => {
    if (!generatedInvoiceData) return

    setIsDownloading(true)
    try {
      // Create mock invoice data that matches the expected Invoice type
      const mockInvoice = {
        id: generatedInvoiceData.invoiceNumber,
        invoice_number: generatedInvoiceData.invoiceNumber,
        client_id: generatedInvoiceData.client.id,
        project_id: null,
        issue_date: generatedInvoiceData.invoiceDate,
        due_date: generatedInvoiceData.dueDate || new Date().toISOString(),
        amount: generatedInvoiceData.subtotal,
        tax_amount: generatedInvoiceData.tax,
        total_amount: generatedInvoiceData.total,
        currency: generatedInvoiceData.currency,
        status: 'pending' as const,
        notes: generatedInvoiceData.notes,
        created_at: new Date().toISOString(),
        clients: {
          ...generatedInvoiceData.client,
          email: generatedInvoiceData.client.email || 'client@email.com'
        },
        projects: undefined,
        // Add the items array for detailed PDF generation
        items: generatedInvoiceData.items
      }

      await generateInvoicePDF({ 
        invoice: mockInvoice,
        filename: `invoice-${generatedInvoiceData.invoiceNumber}.pdf`,
        template: {
          companyName: "Your Company",
          companyAddress: "123 Business St\nCity, State 12345\nUnited States",
          companyEmail: "contact@yourcompany.com", 
          companyPhone: "+1 (555) 123-4567",
          primaryColor: "#000000",
          accentColor: "#6366f1"
        }
      })
      
      toast({
        title: "PDF Downloaded",
        description: "Invoice PDF has been downloaded successfully.",
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!generatedInvoiceData) return

    setIsSending(true)
    try {
      // Simulate sending invoice
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Invoice Sent",
        description: `Invoice has been sent to ${generatedInvoiceData.client.email}`,
      })
      
      // Close the dialog after successful send
      setShowSuccessDialog(false)
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }



  return (
    <>
      <PageHeader
        title="Generate Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Generate" }
        ]}
        action={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button 
              size="sm"
              onClick={handleGenerateInvoice}
              disabled={!isReadyToGenerate()}
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        }
      />

      <PageContent>
      <div className="pt-8 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Invoice Details</CardTitle>
              <CardDescription>Basic information about this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <div className="flex space-x-2">
                  <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientDropdownOpen}
                        className="flex-1 justify-start text-left font-normal"
                      >
                        {selectedClient ? (
                          <div className="flex items-center space-x-2 text-left w-full">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={selectedClient.avatar_url || "/placeholder-user.jpg"} alt={selectedClient.name} />
                              <AvatarFallback className="text-xs">
                                {selectedClient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="font-medium truncate">{selectedClient.name}</span>
                              {selectedClient.company && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-sm text-muted-foreground truncate">{selectedClient.company}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {clientsLoading ? "Loading clients..." : "Select a client"}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
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
                                value={`${client.name} ${client.company || ''}`}
                                onSelect={() => handleClientSelect(client.id)}
                                className="flex items-center space-x-3 p-3"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={client.avatar_url || "/placeholder-user.jpg"} alt={client.name} />
                                  <AvatarFallback className="text-xs">
                                    {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{client.name}</div>
                                  {client.company && (
                                    <div className="text-xs text-muted-foreground">{client.company}</div>
                                  )}
                                  {client.email && (
                                    <div className="text-xs text-muted-foreground">{client.email}</div>
                                  )}
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
                    onClick={() => setShowNewClientDialog(true)}
                    title="Add New Client"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Project Selection */}
              {selectedClient && (
                <div className="space-y-2">
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select 
                    value={selectedProject?.id || "none"} 
                    onValueChange={(value) => {
                      if (value && value !== "none") {
                        const project = projects.find(p => p.id === value)
                        setSelectedProject(project || null)
                      } else {
                        setSelectedProject(null)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={projectsLoading ? "Loading projects..." : projects.length === 0 ? "No projects available" : "Select a project"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <span>{project.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <DatePicker
                    date={invoiceDate}
                    onSelect={(date) => date && setInvoiceDate(date)}
                    placeholder="Select invoice date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <DatePicker
                    date={dueDate}
                    onSelect={setDueDate}
                    placeholder="Select due date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientCurrency">Client Currency</Label>
                <Select value={clientCurrency} onValueChange={setClientCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCIES).map(([code, config]) => (
                      <SelectItem key={code} value={code}>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{config.symbol}</span>
                          <span>{config.name} ({code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Settings */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="tax-enabled" 
                      checked={taxEnabled}
                      onCheckedChange={setTaxEnabled}
                    />
                    <Label htmlFor="tax-enabled" className="text-sm">
                      Apply {settings.taxName}
                    </Label>
                  </div>
                  
                  {taxEnabled && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="custom-tax-rate" className="text-sm">
                        Tax Rate (%):
                      </Label>
                      <Input
                        id="custom-tax-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={customTaxRate}
                        onChange={(e) => setCustomTaxRate(e.target.value)}
                        className="w-20 h-8"
                      />
                      <span className="text-xs text-muted-foreground">
                        (Default: {settings.taxRate}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-medium">Invoice Items</CardTitle>
                  <CardDescription>Add services or products to this invoice.</CardDescription>
                </div>
                <Button onClick={addItem} variant="secondary" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 w-full">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end w-full">
                    <div className="col-span-5">
                      <Label htmlFor={`description-${item.id}`}>Description</Label>
                      <Input
                        id={`description-${item.id}`}
                        placeholder="Service or product description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`quantity-${item.id}`}>Qty</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`rate-${item.id}`}>Rate</Label>
                      <Input
                        id={`rate-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Amount</Label>
                      <div className="h-10 flex items-center font-medium w-full">
                        {formatCurrency(item.quantity * item.rate, clientCurrency)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Notes</CardTitle>
              <CardDescription>Additional notes or payment terms for this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or payment terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {/* Status Alerts - Moved outside summary card */}
          {projectData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm text-green-800">
                <span className="font-medium">✓ Auto-populated from project:</span>
                <div className="mt-1">{projectData.projectName}</div>
              </div>
            </div>
          )}
          
          {clientData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <span className="font-medium">✓ Auto-populated from client:</span>
                <div className="mt-1">{clientData.clientName}</div>
              </div>
            </div>
          )}

          {/* Stripe-Inspired Summary Card */}
          <Card className="border border-gray-200 shadow-sm bg-zinc-50">            
            <CardContent className="p-6">
              {/* Header with Icon */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-full p-2.5 w-fit shadow-sm">
                    <Receipt className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Invoice summary</h3>
                    <p className="text-sm text-gray-500 mt-1">Review the details below</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Invoice number</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{invoiceNumber || "Generating..."}</p>
                </div>
              </div>

              {/* Client & Date Info */}
              <div className="space-y-4 mb-6">
                {selectedClient && (
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Bill to</p>
                      <p className="font-medium text-gray-900">{selectedClient.name}</p>
                      {selectedClient.company && (
                        <p className="text-sm text-gray-600">{selectedClient.company}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start text-sm">
                  <div>
                    <p className="text-gray-500">Issue date</p>
                    <p className="text-gray-900 font-medium">{invoiceDate.toLocaleDateString()}</p>
                  </div>
                  {dueDate && (
                    <div>
                      <p className="text-gray-500">Due date</p>
                      <p className="text-gray-900 font-medium">{dueDate.toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Items */}
              {items.length > 0 && (
                <div className="mb-6">
                  <div className="border-t border-dotted border-gray-300 -mx-6 mb-4"></div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Items</h4>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.description || `Item ${index + 1}`}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500 flex-shrink-0">
                            {item.quantity} × {formatCurrency(item.rate, clientCurrency)}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <p className="text-sm font-medium tabular-nums text-gray-900">
                            {formatCurrency(item.quantity * item.rate, clientCurrency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount Breakdown */}
              <div>
                <div className="border-t border-dotted border-gray-300 -mx-6 mb-6"></div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(calculateSubtotal(), clientCurrency)}</span>
                  </div>
                  
                  {taxEnabled && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{settings.taxName} ({customTaxRate}%)</span>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(calculateTax(), clientCurrency)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-lg font-semibold tabular-nums text-gray-900">
                        {formatCurrency(calculateTotal(), clientCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-sm transition-all duration-300">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      isReadyToGenerate() ? 'bg-green-400' : 'bg-gray-300'
                    }`}></div>
                    <span className={`transition-colors duration-300 ${
                      isReadyToGenerate() ? 'text-green-600 font-medium' : 'text-gray-500'
                    }`}>
                      {isReadyToGenerate() ? 'Ready to generate' : 'Complete all fields to generate'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Currency Override Warning - Moved outside summary card */}
          {clientCurrency !== getDefaultCurrency() && (
            <div className="text-xs text-muted-foreground p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="font-medium">Currency Override</div>
              <div>This invoice uses {CURRENCIES[clientCurrency].name} instead of the default {CURRENCIES[getDefaultCurrency()].name}</div>
            </div>
          )}
        </div>
      </div>
      </div>
      </PageContent>

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client and automatically select them for this invoice.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-name">Name *</Label>
                <Input
                  id="new-name"
                  value={newClient.name || ""}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="new-company">Company</Label>
                <Input
                  id="new-company"
                  value={newClient.company || ""}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newClient.email || ""}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={newClient.phone || ""}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newClient.address || ""}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-city">City</Label>
                <Input
                  id="new-city"
                  value={newClient.city || ""}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="new-state">State</Label>
                <Input
                  id="new-state"
                  value={newClient.state || ""}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="new-zip_code">Zip Code</Label>
                <Input
                  id="new-zip_code"
                  value={newClient.zip_code || ""}
                  onChange={(e) => setNewClient({ ...newClient, zip_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-country">Country</Label>
              <Input
                id="new-country"
                value={newClient.country || ""}
                onChange={(e) => setNewClient({ ...newClient, country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div>
              <Label htmlFor="new-notes">Notes</Label>
              <Textarea
                id="new-notes"
                value={newClient.notes || ""}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes about the client..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewClient} disabled={!newClient.name}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-white/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <DialogHeader className="sr-only">
              <DialogTitle>Invoice Generated Successfully</DialogTitle>
            </DialogHeader>
          <div className="border border-gray-200 shadow-sm bg-white rounded-lg">            
            <div className="p-6">
              {/* Header with Success Icon */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3">
                  <div className="bg-green-100 border border-green-200 rounded-full p-2.5 w-fit shadow-sm">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Invoice Generated Successfully!</h3>
                    <p className="text-sm text-gray-500 mt-1">Your invoice is ready to download or send</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Invoice number</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{generatedInvoiceData?.invoiceNumber}</p>
                </div>
              </div>

              {generatedInvoiceData && (
                <>
                  {/* Client & Date Info */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Bill to</p>
                        <p className="font-medium text-gray-900">{generatedInvoiceData.client.name}</p>
                        {generatedInvoiceData.client.company && (
                          <p className="text-sm text-gray-600">{generatedInvoiceData.client.company}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-start text-sm">
                      <div>
                        <p className="text-gray-500">Issue date</p>
                        <p className="text-gray-900 font-medium">{new Date(generatedInvoiceData.invoiceDate).toLocaleDateString()}</p>
                      </div>
                      {generatedInvoiceData.dueDate && (
                        <div>
                          <p className="text-gray-500">Due date</p>
                          <p className="text-gray-900 font-medium">{new Date(generatedInvoiceData.dueDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Items */}
                  {generatedInvoiceData.items.length > 0 && (
                    <div className="mb-6">
                      <div className="border-t border-dotted border-gray-300 -mx-6 mb-4"></div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Items</h4>
                      <div className="space-y-3">
                        {generatedInvoiceData.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.description || `Item ${index + 1}`}
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500 flex-shrink-0">
                                {item.quantity} × {formatCurrency(item.rate, generatedInvoiceData.currency)}
                              </p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <p className="text-sm font-medium tabular-nums text-gray-900">
                                {formatCurrency(item.quantity * item.rate, generatedInvoiceData.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amount Breakdown */}
                  <div>
                    <div className="border-t border-dotted border-gray-300 -mx-6 mb-6"></div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(generatedInvoiceData.subtotal, generatedInvoiceData.currency)}</span>
                      </div>
                      
                      {generatedInvoiceData.taxEnabled && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{generatedInvoiceData.taxName} ({generatedInvoiceData.taxRate}%)</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(generatedInvoiceData.tax, generatedInvoiceData.currency)}</span>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-medium text-gray-900">Total</span>
                          <span className="text-lg font-semibold tabular-nums text-gray-900">
                            {formatCurrency(generatedInvoiceData.total, generatedInvoiceData.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Horizontally Stacked */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={handleSendInvoice}
                        disabled={isSending || !generatedInvoiceData.client.email}
                        className="flex-1"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isSending ? 'Sending...' : 'Send Invoice'}
                      </Button>

                      <Button 
                        variant="outline"
                        onClick={() => setShowSuccessDialog(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>

                    {!generatedInvoiceData.client.email && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Client email not provided - cannot send invoice directly
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        </DialogPortal>
      </Dialog>
    </>
  )
}

