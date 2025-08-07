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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateForDatabase } from "@/lib/date-format"
import { Plus, Trash2, Send, Save, UserPlus, Building, Mail, Phone, MapPin, Receipt, Download, CheckCircle, CalendarDays, Plus as PlusIcon, RefreshCw, Loader2, Check, Users, Calendar, DollarSign, FileText, AlertTriangle, X, ChevronDown, ChevronsUpDown, User, Edit3, Copy, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, CURRENCIES, getDefaultCurrency } from "@/lib/currency"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useSettings } from "@/components/settings-provider"
import type { Client } from "@/components/clients/columns"
import { useQueryClient } from "@tanstack/react-query"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { InvoicingGate } from "@/components/gates/pro-feature-gate"


interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
}

// Mock data removed - clients will be loaded from database

export default function GenerateInvoicePage() {
  const router = useRouter()
  const { settings, isLoading: settingsLoading, formatDate } = useSettings()
  const queryClient = useQueryClient()
  
  // Check if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Invoice form state
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [clientCurrency, setClientCurrency] = useState(settings.defaultCurrency)
  const [notes, setNotes] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
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
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  
  // Auto-populate data from session storage
  const [projectData, setProjectData] = useState<any>(null)
  const [clientData, setClientData] = useState<any>(null)
  
  // Project states
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  
  // Invoice number state
  const [invoiceNumber, setInvoiceNumber] = useState<string>("")
  const [isPreviewNumber, setIsPreviewNumber] = useState(true)
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null)
  


  // Load clients on component mount
  useEffect(() => {
    fetchClients()
    
    // Set default due date to 30 days from now
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
    setDueDate(defaultDueDate)
    
    // Preview the next invoice number without actually generating it
    const previewInvoiceNumber = async () => {
      // Don't generate new numbers if we're in edit mode or if edit data is available
      if (isEditMode) return
      
      // Check if there's edit data waiting to be loaded
      const storedEditData = sessionStorage.getItem('edit-invoice-data')
      if (storedEditData) return
      
      const now = new Date()
      const year = now.getFullYear()
      const prefix = settings.invoicePrefix || 'INV'

      if (isSupabaseConfigured()) {
        try {
          const { data: userData } = await supabase.auth.getUser()
          
          // First, check what actual invoices exist for this user and year
          const { data: existingInvoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('user_id', userData.user?.id)
            .like('invoice_number', `${prefix}-${year}-%`)
            .order('invoice_number', { ascending: false })

          if (invoicesError) {
            console.error('Error checking existing invoices:', invoicesError)
            setInvoiceNumber(`${prefix}-${year}-001`)
            setIsPreviewNumber(true)
            return
          }

          // Find the highest number from actual invoices
          let maxInvoiceNumber = 0
          if (existingInvoices && existingInvoices.length > 0) {
            existingInvoices.forEach(invoice => {
              if (invoice.invoice_number) {
                // Extract number from format like "INV-2024-003"
                const match = invoice.invoice_number.match(/-(\d+)$/)
                if (match) {
                  const num = parseInt(match[1], 10)
                  if (num > maxInvoiceNumber) {
                    maxInvoiceNumber = num
                  }
                }
              }
            })
          }

          // The next number should be maxInvoiceNumber + 1
          const nextNumber = maxInvoiceNumber + 1
          const previewNumber = `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`
          setInvoiceNumber(previewNumber)
          setIsPreviewNumber(true)
          
        } catch (error) {
          console.error('Error previewing invoice number:', error)
          setInvoiceNumber(`${prefix}-${year}-001`)
          setIsPreviewNumber(true)
        }
      } else {
        // Demo mode: preview based on existing invoices
        const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        const currentYearInvoices = existingInvoices.filter((inv: any) => 
          inv.invoice_number?.startsWith(`${prefix}-${year}-`)
        )
        const nextNumber = currentYearInvoices.length + 1
        const previewNumber = `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`
        setInvoiceNumber(previewNumber)
        setIsPreviewNumber(true)
      }
    }
    
    previewInvoiceNumber()
  }, [isEditMode, settings.invoicePrefix])

  // Update tax and currency settings when settings change (but not in edit mode)
  useEffect(() => {
    // Only apply global settings when not editing an invoice
    if (!isEditMode && !editInvoiceId) {
      setTaxEnabled(settings.autoCalculateTax)
      setCustomTaxRate(settings.taxRate.toString())
      setClientCurrency(settings.defaultCurrency)
    }
  }, [settings.autoCalculateTax, settings.taxRate, settings.defaultCurrency, isEditMode, editInvoiceId])

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
        toast.success(`Invoice auto-populated from "${projectInfo.projectName}"`, {
          description: `${suggestedAmount > 0 ? `Suggested amount: ${formatCurrency(suggestedAmount)}` : 'Please set the invoice amount.'}`
        })
      } catch (error) {
        console.error('Error parsing project data:', error)
        toast.error("Could not load project data. Please fill the form manually.")
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
        toast.success(`Invoice auto-populated for "${clientInfo.clientName}"`)
      } catch (error) {
        console.error('Error parsing client data:', error)
                  toast.error("Could not load client data. Please fill the form manually.")
      }
    }
  }, [clients, toast])

  // Fallback invoice number generation that maintains sequence
  const generateFallbackInvoiceNumber = async (prefix: string, year: number, userId?: string) => {
    try {
      if (!userId) {
        console.error('No user ID for fallback number generation')
        return `${prefix}-${year}-001`
      }

      // Query existing invoices to find the highest number
      const { data: existingInvoices, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .like('invoice_number', `${prefix}-${year}-%`)
        .order('invoice_number', { ascending: false })

      if (error) {
        console.error('Error querying existing invoices for fallback:', error)
        return `${prefix}-${year}-001`
      }

      // Find the highest number from actual invoices
      let maxInvoiceNumber = 0
      if (existingInvoices && existingInvoices.length > 0) {
        existingInvoices.forEach(invoice => {
          if (invoice.invoice_number) {
            // Extract number from format like "INV-2024-003"
            const match = invoice.invoice_number.match(/-(\d+)$/)
            if (match) {
              const num = parseInt(match[1], 10)
              if (num > maxInvoiceNumber) {
                maxInvoiceNumber = num
              }
            }
          }
        })
      }

      // The next number should be maxInvoiceNumber + 1
      const nextNumber = maxInvoiceNumber + 1
      const fallbackNumber = `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`
      
      console.log(`Generated fallback invoice number: ${fallbackNumber} (max was ${maxInvoiceNumber})`)
      return fallbackNumber
      
    } catch (error) {
      console.error('Error in fallback number generation:', error)
      return `${prefix}-${year}-001`
    }
  }

  // Handle edit mode data loading when clients are available
  useEffect(() => {
    const storedEditData = sessionStorage.getItem('edit-invoice-data')
    
    // Only process edit data if we have clients loaded and edit data exists
    if (storedEditData && clients.length > 0) {
      try {
        const editInfo = JSON.parse(storedEditData)
        
        // Set invoice ID for updating and enable edit mode
        if (editInfo.invoiceId) {
          setEditInvoiceId(editInfo.invoiceId)
          setIsEditMode(true)
        }
        
        // Set invoice number (don't auto-generate for editing)
        setInvoiceNumber(editInfo.invoiceNumber)
        setIsPreviewNumber(false)
        
        // Set dates
        if (editInfo.issueDate) {
          setInvoiceDate(new Date(editInfo.issueDate))
        }
        if (editInfo.dueDate) {
          setDueDate(new Date(editInfo.dueDate))
        }
        
        // Set currency
        if (editInfo.currency) {
          setClientCurrency(editInfo.currency)
        }
        
        // Set notes
        if (editInfo.notes) {
          setNotes(editInfo.notes)
        }
        
        // Set payment terms
        if (editInfo.paymentTerms) {
          setPaymentTerms(editInfo.paymentTerms)
        }
        
        // Set items
        if (editInfo.items && editInfo.items.length > 0) {
          setItems(editInfo.items.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            description: item.description || '',
            quantity: item.quantity || 1,
            rate: item.rate || 0
          })))
        }
        
        // Set tax information
        if (editInfo.taxRate !== undefined) {
          // Use the stored tax rate directly if available
          setTaxEnabled(editInfo.taxRate > 0)
          setCustomTaxRate(editInfo.taxRate.toString())
        } else if (editInfo.taxAmount !== undefined && editInfo.amount > 0) {
          // Fallback: calculate tax rate from amounts
          const taxRate = editInfo.taxAmount > 0 ? (editInfo.taxAmount / editInfo.amount) * 100 : 0
          setTaxEnabled(editInfo.taxAmount > 0)
          setCustomTaxRate(taxRate.toFixed(2))
        } else {
          // If no tax information available, check if tax amount exists
          setTaxEnabled(editInfo.taxAmount > 0)
          if (editInfo.taxAmount > 0 && editInfo.amount > 0) {
            const taxRate = (editInfo.taxAmount / editInfo.amount) * 100
            setCustomTaxRate(taxRate.toFixed(2))
          }
        }
        
        // Find and select the client if we have client data
        if (editInfo.clientId || editInfo.clientName) {
          let matchingClient = null
          
          // First try to find by ID if available
          if (editInfo.clientId) {
            matchingClient = clients.find(c => c.id === editInfo.clientId)
          }
          
          // If not found by ID, try by name/company
          if (!matchingClient && editInfo.clientName) {
            matchingClient = clients.find(c => 
              c.name === editInfo.clientName || 
              (editInfo.clientCompany && c.company === editInfo.clientCompany)
            )
          }
          
          if (matchingClient) {
            setSelectedClientId(matchingClient.id)
            setSelectedClient(matchingClient)
            
            // Fetch projects for this client
            fetchProjectsForClient(matchingClient.id).then(() => {
              // Try to select the project if we have project data
              if (editInfo.projectName) {
                const matchingProject = projects.find(p => p.name === editInfo.projectName)
                if (matchingProject) {
                  setSelectedProject(matchingProject)
                }
              }
            })
          } else {
            // If no client found, show a warning
            toast.error(`Could not find client "${editInfo.clientName}". Please select a client manually.`)
          }
        }
        
        // Clear the session storage after loading
        sessionStorage.removeItem('edit-invoice-data')
        
        // Clear any loading toasts
        toast.dismiss(`edit-${editInfo.invoiceId}`)
        
        // Show success notification
        toast.success(`Invoice ${editInfo.invoiceNumber} loaded for editing`)
      } catch (error) {
        console.error('Error parsing edit invoice data:', error)
        toast.error("Could not load invoice data for editing. Please try again.")
      }
    }
  }, [clients, toast])

  // Check for edit mode from URL parameters and session data early
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const editParam = urlParams.get('edit')
    const storedEditData = sessionStorage.getItem('edit-invoice-data')
    
    if (editParam === 'true' || storedEditData) {
      setIsEditMode(true)
    }
  }, [])

  async function fetchClients() {
    try {
      setClientsLoading(true)
      
      if (isSupabaseConfigured()) {
        // Data is automatically filtered by RLS policies for the current user
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
          setClients([])
        } else {
          setClients(data || [])
        }
      } else {
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    } finally {
      setClientsLoading(false)
    }
  }

  async function fetchProjectsForClient(clientId: string) {
    try {
      setProjectsLoading(true)
      
      if (isSupabaseConfigured()) {
        // Data is automatically filtered by RLS policies for the current user
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
        // No projects available when database is not configured
        setProjects([])
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
      toast.error("Client name is required")
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
      
      toast.success("New client has been created and selected for this invoice")
    } catch (error) {
      console.error('Error adding client:', error)
      toast.error("Failed to add client. Please try again.")
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

  const handleSaveDraft = async () => {
    if (!selectedClient) {
      toast.error("Please select a client before saving the draft")
      return
    }

    if (!invoiceDate) {
      toast.error("Please set an invoice date")
      return
    }

    setIsSavingDraft(true)
    
    try {
      // Generate invoice number if not already generated
      let finalInvoiceNumber = invoiceNumber
      
      if (!isEditMode) {
        const now = new Date()
        const year = now.getFullYear()
        const prefix = settings.invoicePrefix || 'INV'

        if (isSupabaseConfigured()) {
          try {
            const { data: userData } = await supabase.auth.getUser()
            const { data, error } = await supabase
              .rpc('get_next_invoice_number', {
                p_user_id: userData.user?.id,
                p_prefix: prefix,
                p_year: year
              })

            if (error) {
              console.error('Error generating invoice number:', error)
              finalInvoiceNumber = await generateFallbackInvoiceNumber(prefix, year, userData.user?.id)
            } else {
              finalInvoiceNumber = data
              setIsPreviewNumber(false)
            }
          } catch (error) {
            console.error('Error generating invoice number:', error)
            finalInvoiceNumber = await generateFallbackInvoiceNumber(prefix, year, userData.user?.id)
          }
        } else {
          const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
          const currentYearInvoices = existingInvoices.filter((inv: any) => 
            inv.invoice_number?.startsWith(`${prefix}-${year}-`)
          )
          const invoiceCount = currentYearInvoices.length + 1
          finalInvoiceNumber = `${prefix}-${year}-${String(invoiceCount).padStart(3, '0')}`
        }
      }
      
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const total = calculateTotal()
      
      // Save invoice to database or add to session storage for demo
      if (isSupabaseConfigured()) {
        console.log('Saving draft to Supabase...')
        
        // Get current user for user_id
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          throw new Error('User authentication required to save drafts')
        }
        
        // Calculate tax rate as percentage
        const taxRatePercent = taxEnabled ? parseFloat(customTaxRate) : 0
        
        // Prepare invoice data matching exact database schema
        const invoiceInsertData = {
          invoice_number: finalInvoiceNumber,
          client_id: selectedClient.id,
          project_id: selectedProject?.id || null,
          user_id: userData.user.id, // Required for user-specific invoice numbering
          amount: subtotal,
          tax_rate: taxRatePercent,
          tax_amount: tax,
          total_amount: total,
          currency: clientCurrency, // Include the selected currency for this invoice
          status: 'draft', // Save as draft
          issue_date: formatDateForDatabase(invoiceDate),
          due_date: formatDateForDatabase(dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          notes: notes || '',
          terms: paymentTerms || ''
        }

        console.log('Draft invoice insert data:', invoiceInsertData)

        // Insert the main invoice record
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert([invoiceInsertData])
          .select()
          .single()

        if (invoiceError) {
          console.error('Failed to insert draft invoice:', invoiceError)
          console.error('Error details:', {
            message: invoiceError.message,
            details: invoiceError.details,
            hint: invoiceError.hint,
            code: invoiceError.code
          })
          
          // Handle specific database constraint errors
          let errorMessage = 'Failed to save draft'
          
          if (invoiceError.code === '23505') {
            if (invoiceError.message?.includes('invoice_number')) {
              errorMessage = 'Invoice number already exists. Please use a different invoice number.'
            } else {
              errorMessage = 'Duplicate entry detected. Please check your invoice data.'
            }
          } else if (invoiceError.code === '23503') {
            if (invoiceError.message?.includes('client_id')) {
              errorMessage = 'Selected client not found. Please select a valid client.'
            } else if (invoiceError.message?.includes('project_id')) {
              errorMessage = 'Selected project not found. Please select a valid project.'
            } else {
              errorMessage = 'Invalid reference in invoice data. Please check all selections.'
            }
          } else if (invoiceError.code === '23514') {
            errorMessage = 'Invoice data validation failed. Please check all field values.'
          } else if (invoiceError.message) {
            errorMessage += `: ${invoiceError.message}`
          }
          
          throw new Error(errorMessage)
        }

        console.log('Draft invoice saved successfully:', invoiceData)

        // Now save the invoice items
        const invoiceItemsData = items.map(item => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItemsData)

        if (itemsError) {
          console.error('Failed to insert invoice items:', itemsError)
          throw new Error(`Failed to save draft items: ${itemsError.message}`)
        }

        toast.success("Draft saved successfully")
        
        // Invalidate invoice cache to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      } else {
        // For demo mode, store in sessionStorage
        const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        
        const mockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const draftInvoice = {
          id: mockId,
          invoice_number: finalInvoiceNumber,
          client_id: selectedClient.id,
          project_id: selectedProject?.id || null,
          issue_date: formatDateForDatabase(invoiceDate),
          due_date: formatDateForDatabase(dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          amount: subtotal,
          tax_rate: taxEnabled ? parseFloat(customTaxRate) : 0,
          tax_amount: tax,
          total_amount: total,
          status: 'draft' as const,
          notes: notes || '',
          terms: paymentTerms || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          clients: {
            name: selectedClient.name,
            company: selectedClient.company
          },
          projects: selectedProject ? {
            name: selectedProject.name
          } : null,
          _currency: clientCurrency,
          _items: items
        }
        
        existingInvoices.push(draftInvoice)
        sessionStorage.setItem('demo-invoices', JSON.stringify(existingInvoices))

        toast.success("Draft saved successfully (demo mode)")
        
        // Invalidate invoice cache to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      }
      
      // No redirect for draft save - user stays on the page
      // They can continue editing or generate the invoice
      
    } catch (error: any) {
      console.warn('Error saving draft:', 
        (error as any)?.message || (error as any)?.code || JSON.stringify(error) || 'Unknown error')
      
      let errorMessage = "Failed to save draft. Please try again."
      
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
      
      toast.error(errorMessage)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!isReadyToGenerate()) {
      toast.error("Please complete all required fields before generating the invoice")
      return
    }

    // Additional validation
    if (!selectedClient) {
      toast.error("Please select a client before generating the invoice")
      return
    }

    if (!invoiceDate) {
      toast.error("Please set an invoice date")
      return
    }

    try {
      // Generate invoice number only when actually creating the invoice
      let finalInvoiceNumber = invoiceNumber
      
      if (!isEditMode) {
        const now = new Date()
        const year = now.getFullYear()
        const prefix = settings.invoicePrefix || 'INV'

        if (isSupabaseConfigured()) {
          try {
            // Use the database function to get the next invoice number for this user
            const { data: userData } = await supabase.auth.getUser()
            const { data, error } = await supabase
              .rpc('get_next_invoice_number', {
                p_user_id: userData.user?.id,
                p_prefix: prefix,
                p_year: year
              })

            if (error) {
              console.error('Error generating invoice number:', error)
              // Fallback to manual sequence generation
              finalInvoiceNumber = await generateFallbackInvoiceNumber(prefix, year, userData.user?.id)
            } else {
              console.log(`Generated invoice number: ${data}`)
              finalInvoiceNumber = data
              setIsPreviewNumber(false)
            }
          } catch (error) {
            console.error('Error generating invoice number:', error)
            // Ultimate fallback - use manual sequence generation
            finalInvoiceNumber = await generateFallbackInvoiceNumber(prefix, year, userData.user?.id)
          }
        } else {
          // Demo mode: count from session storage per user
          const existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
          const currentYearInvoices = existingInvoices.filter((inv: any) => 
            inv.invoice_number?.startsWith(`${prefix}-${year}-`)
          )
          const invoiceCount = currentYearInvoices.length + 1
          finalInvoiceNumber = `${prefix}-${year}-${String(invoiceCount).padStart(3, '0')}`
        }
      }

      // Use the generated invoice number from here on
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
        invoiceNumber: finalInvoiceNumber
      }

      // Save invoice to database or add to session storage for demo
      if (isSupabaseConfigured()) {
        console.log('Saving invoice to Supabase...')
        
        // Validation checks
        if (!selectedClient) {
          throw new Error('Please select a client before generating the invoice')
        }
        if (!selectedClient.id) {
          throw new Error('Selected client does not have a valid ID')
        }
        if (!finalInvoiceNumber) {
          throw new Error('Invoice number is required')
        }
        if (items.length === 0) {
          throw new Error('Please add at least one item to the invoice')
        }
        if (subtotal <= 0) {
          throw new Error('Invoice amount must be greater than zero')
        }
        
        // Get current user for user_id
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          throw new Error('User authentication required to create invoices')
        }
        
        // Calculate tax rate as percentage
        const taxRatePercent = taxEnabled ? parseFloat(customTaxRate) : 0
        
        // Prepare invoice data matching exact database schema
        const invoiceInsertData = {
          invoice_number: finalInvoiceNumber,
          client_id: selectedClient.id,
          project_id: selectedProject?.id || null, // Include selected project if any
          user_id: userData.user.id, // Required for user-specific invoice numbering
          amount: subtotal,
          tax_rate: taxRatePercent,
          tax_amount: tax,
          total_amount: total,
          currency: clientCurrency, // Include the selected currency for this invoice
          status: 'sent', // Start as sent, can be changed to 'draft' later
          issue_date: formatDateForDatabase(invoiceDate), // DATE format (YYYY-MM-DD)
          due_date: formatDateForDatabase(dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // DATE format
          notes: notes || '',
          terms: paymentTerms || ''
        }

        console.log('Invoice insert data:', invoiceInsertData)
        console.log('Selected client:', selectedClient)
        console.log('Selected project:', selectedProject)
        console.log('Items:', items)

        // Insert or update the main invoice record
        let invoiceData
        let invoiceError
        
        if (isEditMode && editInvoiceId) {
          // Update existing invoice
          const { data, error } = await supabase
            .from('invoices')
            .update(invoiceInsertData)
            .eq('id', editInvoiceId)
            .select()
            .single()
          
          invoiceData = data
          invoiceError = error
        } else {
          // Insert new invoice
          const { data, error } = await supabase
            .from('invoices')
            .insert([invoiceInsertData])
            .select()
            .single()
          
          invoiceData = data
          invoiceError = error
        }

        if (invoiceError) {
          console.error(isEditMode ? 'Failed to update invoice:' : 'Failed to insert invoice:', invoiceError)
          console.error('Error details:', {
            message: invoiceError.message,
            details: invoiceError.details,
            hint: invoiceError.hint,
            code: invoiceError.code
          })
          
          // Handle specific database constraint errors
          let errorMessage = `Failed to ${isEditMode ? 'update' : 'save'} invoice`
          
          if (invoiceError.code === '23505') {
            if (invoiceError.message?.includes('invoice_number')) {
              errorMessage = 'Invoice number already exists. Please use a different invoice number.'
            } else {
              errorMessage = 'Duplicate entry detected. Please check your invoice data.'
            }
          } else if (invoiceError.code === '23503') {
            if (invoiceError.message?.includes('client_id')) {
              errorMessage = 'Selected client not found. Please select a valid client.'
            } else if (invoiceError.message?.includes('project_id')) {
              errorMessage = 'Selected project not found. Please select a valid project.'
            } else {
              errorMessage = 'Invalid reference in invoice data. Please check all selections.'
            }
          } else if (invoiceError.code === '23514') {
            errorMessage = 'Invoice data validation failed. Please check all field values.'
          } else {
            if (invoiceError.message) {
              errorMessage += `: ${invoiceError.message}`
            }
            if (invoiceError.details) {
              errorMessage += ` (${invoiceError.details})`
            }
            if (invoiceError.hint) {
              errorMessage += ` - ${invoiceError.hint}`
            }
          }
          
          throw new Error(errorMessage)
        }

        console.log(isEditMode ? 'Invoice updated successfully:' : 'Invoice saved successfully:', invoiceData)

        // Now save the invoice items
        if (isEditMode && editInvoiceId) {
          // Delete existing items first
          const { error: deleteError } = await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', editInvoiceId)
          
          if (deleteError) {
            console.error('Failed to delete existing invoice items:', deleteError)
          }
        }
        
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

        if (itemsError) {
          console.error('Failed to insert invoice items:', itemsError)
          // Don't throw error here, invoice is already saved
          console.warn(`Invoice ${isEditMode ? 'updated' : 'saved'} but items failed to save:`, itemsError.message)
        } else {
          console.log('Invoice items saved successfully:', itemsData)
        }

        // Don't show toast here - preview page will show it
        // toast.success(isEditMode ? "Invoice updated successfully" : "Invoice generated successfully")
        
        // Invalidate invoice cache to ensure fresh data when navigating back
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        
        // Redirect to preview page with appropriate action
        router.push(`/dashboard/invoices/${invoiceData.id}/preview?action=${isEditMode ? 'updated' : 'created'}`)
        
      } else {
        console.log('Saving to session storage (demo mode)...')
        // For demo mode, store in sessionStorage to simulate database save
        let existingInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        
        let invoiceId: string
        
        if (isEditMode && editInvoiceId) {
          // Update existing invoice
          invoiceId = editInvoiceId
          existingInvoices = existingInvoices.map((inv: any) => {
            if (inv.id === editInvoiceId) {
              return {
                ...inv,
                invoice_number: finalInvoiceNumber,
                client_id: selectedClient.id,
                project_id: selectedProject?.id || null,
                issue_date: formatDateForDatabase(invoiceDate),
                due_date: formatDateForDatabase(dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                amount: subtotal,
                tax_rate: taxEnabled ? parseFloat(customTaxRate) : 0,
                tax_amount: tax,
                total_amount: total,
                notes: notes || '',
                terms: paymentTerms || '',
                updated_at: new Date().toISOString(),
                clients: {
                  name: selectedClient.name,
                  company: selectedClient.company
                },
                projects: selectedProject ? {
                  name: selectedProject.name
                } : null,
                _currency: clientCurrency,
                _items: items
              }
            }
            return inv
          })
        } else {
          // Create new invoice
          const mockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          invoiceId = mockId
          
          const newInvoice = {
            id: mockId,
            invoice_number: finalInvoiceNumber,
            client_id: selectedClient.id,
            project_id: selectedProject?.id || null,
            issue_date: formatDateForDatabase(invoiceDate),
            due_date: formatDateForDatabase(dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            amount: subtotal,
            tax_rate: taxEnabled ? parseFloat(customTaxRate) : 0,
            tax_amount: tax,
            total_amount: total,
            status: 'sent' as const,
            notes: notes || '',
            terms: paymentTerms || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            clients: {
              name: selectedClient.name,
              company: selectedClient.company
            },
            projects: selectedProject ? {
              name: selectedProject.name
            } : null,
            _currency: clientCurrency,
            _items: items
          }
          
          existingInvoices.push(newInvoice)
        }
        
        sessionStorage.setItem('demo-invoices', JSON.stringify(existingInvoices))

        // Don't show toast here - preview page will show it
        // toast.success(isEditMode ? "Invoice updated successfully (demo mode)" : "Invoice generated successfully (demo mode)")
        
        // Invalidate invoice cache to ensure fresh data when navigating back
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        
        // Redirect to preview page with appropriate action
        router.push(`/dashboard/invoices/${invoiceId}/preview?action=${isEditMode ? 'updated' : 'created'}`)
      }
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

      toast.error(errorMessage)
    }
  }

  const handleDownloadPDF = async () => {
    if (!generatedInvoiceData) return

    setIsDownloading(true)
    try {
      console.log('📥 Generate PDF - Starting download for generated invoice')
      
      // Get saved template settings from Supabase settings
      let templateSettings = null
      
      // Template ID migration mapping
      const migrateTemplateId = (templateId: string) => {
        const migrationMap: { [key: string]: string } = {
          'stripe-inspired': 'modern',
          'contra-inspired': 'bold',
          'mercury-inspired': 'classic',
          'notion-inspired': 'slate'
        }
        return migrationMap[templateId] || templateId
      }
      
      // First try to get from settings (Supabase)
      if (settings.invoiceTemplate && Object.keys(settings.invoiceTemplate).length > 0) {
        templateSettings = {
          ...settings.invoiceTemplate,
          templateId: migrateTemplateId(settings.invoiceTemplate.templateId)
        }
        console.log('✅ Generate PDF - Template settings loaded from Supabase')
      } else {
        console.log('❌ Generate PDF - No Supabase template found, checking localStorage')
        // Fallback to localStorage if no Supabase template exists
        const savedTemplate = localStorage.getItem('invoice-template-settings')
        if (savedTemplate) {
          try {
            const parsed = JSON.parse(savedTemplate)
            templateSettings = {
              ...parsed,
              templateId: migrateTemplateId(parsed.templateId)
            }
            console.log('✅ Generate PDF - Template settings loaded from localStorage')
          } catch (error) {
            console.error('❌ Generate PDF - Error parsing saved template:', error)
          }
        } else {
          console.log('❌ Generate PDF - No template found in localStorage either')
        }
      }
      
      // Get company information from settings
      let companyInfo = {
        companyName: settings.companyName || "Your Company",
        companyAddress: "123 Business St\nCity, State 12345\nUnited States",
        companyEmail: "contact@yourcompany.com", 
        companyPhone: "+1 (555) 123-4567",
      }

      // Load company info from settings
      const savedCompanyInfo = localStorage.getItem('company-info')
      if (savedCompanyInfo) {
        try {
          const parsed = JSON.parse(savedCompanyInfo)
          companyInfo = {
            companyName: parsed.companyName || settings.companyName || companyInfo.companyName,
            companyAddress: parsed.companyAddress || companyInfo.companyAddress,
            companyEmail: parsed.companyEmail || companyInfo.companyEmail,
            companyPhone: parsed.companyPhone || companyInfo.companyPhone,
          }
        } catch (error) {
          console.error('Error parsing company info:', error)
        }
      }

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
        items: generatedInvoiceData.items
      }

      // Merge all template settings with company info
      const defaultTemplate = {
        templateId: 'modern',
        logoSize: [80],
        logoBorderRadius: [8],
        invoicePadding: [48],
        fontFamily: 'inter',
        fontSize: [14],
        lineHeight: [1.6],
        tableHeaderSize: [13],
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#0066FF',
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E5E5',
        currency: 'USD',
        showLogo: true,
        showInvoiceNumber: true,
        showDates: true,
        showPaymentTerms: true,
        showNotes: true,
        showTaxId: false,
        showItemDetails: true,
        notes: '',
      }
      
      const fullTemplate = {
        ...defaultTemplate,
        // Override with saved template settings from Supabase
        ...templateSettings,
        // Override with company info
        companyName: companyInfo.companyName,
        companyAddress: companyInfo.companyAddress,
        companyEmail: companyInfo.companyEmail,
        companyPhone: companyInfo.companyPhone,
        logoUrl: templateSettings?.logoUrl || settings.companyLogo || ""
      }
      
      console.log('🔧 Generate PDF - Using template:', fullTemplate.templateId)
      
      // Generate PDF using the Puppeteer API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice: mockInvoice,
          template: fullTemplate,
          companyInfo: companyInfo
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`PDF generation failed: ${errorData.details}`)
      }

      // Download the PDF
      const pdfBlob = await response.blob()
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${mockInvoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Invoice PDF downloaded successfully")
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!generatedInvoiceData) return

    // Check if client has email
    if (!generatedInvoiceData.client.email) {
      toast.error('Client email not found', {
        description: 'Please add an email address for this client before sending.'
      })
      return
    }

    setIsSending(true)
    try {
      // We need to create a temporary invoice ID for the API
      // In a real app, this would be saved to the database first
      const tempInvoiceId = `temp-${Date.now()}`
      
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: tempInvoiceId,
          clientEmail: generatedInvoiceData.client.email,
          clientName: generatedInvoiceData.client.name,
          senderName: settings.companyName || 'Your Company',
          senderEmail: 'invoices@yourcompany.com', // You can make this configurable
          customMessage: `Thank you for your business! Please find your invoice ${generatedInvoiceData.invoiceNumber} attached.`
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Invoice sent successfully!', {
        description: `Email sent to ${generatedInvoiceData.client.email}`
      })
      
      // Close the dialog after successful send
      setShowSuccessDialog(false)
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setIsSending(false)
    }
  }



  return (
    <InvoicingGate>
      <PageHeader
        title={isEditMode ? "Edit Invoice" : "Generate Invoice"}
        action={
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !selectedClient || !invoiceDate}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </Button>

            <Button 
              size="sm"
              onClick={handleGenerateInvoice}
              disabled={!isReadyToGenerate()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {isEditMode ? "Update Invoice" : "Generate Invoice"}
            </Button>
          </div>
        }
      />

      <PageContent>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-background">
            <CardHeader>
              <CardTitle className="text-xl font-medium">
                {isEditMode ? "Edit Invoice Details" : "Invoice Details"}
              </CardTitle>
              <CardDescription>
                {isEditMode 
                  ? "Update the information for this invoice." 
                  : "Basic information about this invoice."
                }
              </CardDescription>
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
                            <ClientAvatar 
                              name={selectedClient.name} 
                              avatarUrl={selectedClient.avatar_url}
                              size="sm"
                            />
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
                                <ClientAvatar 
                                  name={client.name} 
                                  avatarUrl={client.avatar_url}
                                  size="md"
                                />
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

          <Card className="bg-background">
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

          <Card className="bg-background">
            <CardHeader>
              <CardTitle className="text-xl font-medium">Notes & Terms</CardTitle>
              <CardDescription>Additional notes and payment terms for this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                      <SelectItem value="Net 7">Net 7 days</SelectItem>
                      <SelectItem value="Net 15">Net 15 days</SelectItem>
                      <SelectItem value="Net 30">Net 30 days</SelectItem>
                      <SelectItem value="Net 60">Net 60 days</SelectItem>
                      <SelectItem value="Net 90">Net 90 days</SelectItem>
                      <SelectItem value="2/10 Net 30">2/10 Net 30</SelectItem>
                      <SelectItem value="1/10 Net 30">1/10 Net 30</SelectItem>
                      <SelectItem value="EOM">End of month</SelectItem>
                      <SelectItem value="COD">Cash on delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                    placeholder="Additional notes for this invoice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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

          {/* Modern Summary Card */}
          <Card className="border border-gray-200 shadow-sm bg-background">            
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
                  <p className="text-sm font-medium text-gray-900 font-mono">{invoiceNumber || "Will be generated"}</p>
                  {!isEditMode && isPreviewNumber && invoiceNumber && (
                    <p className="text-xs text-gray-500 mt-0.5">(Preview)</p>
                  )}
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
                    <p className="text-gray-900 font-medium">{formatDate(invoiceDate)}</p>
                  </div>
                  {dueDate && (
                    <div>
                      <p className="text-gray-500">Due date</p>
                      <p className="text-gray-900 font-medium">{formatDate(dueDate)}</p>
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
                          <p className="text-xs text-gray-500 shrink-0">
                            {item.quantity} × {formatCurrency(item.rate, clientCurrency)}
                          </p>
                        </div>
                        <div className="ml-4 shrink-0">
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
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Currency Override</AlertTitle>
              <AlertDescription>
                This invoice uses {CURRENCIES[clientCurrency].name} instead of the default {CURRENCIES[getDefaultCurrency()].name}
              </AlertDescription>
            </Alert>
          )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Invoice Updated Successfully" : "Invoice Generated Successfully"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Header with Success Icon */}
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="bg-green-100 border border-green-200 rounded-full p-2.5 w-fit shadow-sm">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {isEditMode ? "Invoice Updated Successfully!" : "Invoice Generated Successfully!"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {isEditMode 
                      ? "Your invoice has been updated and is ready to download or send" 
                      : "Your invoice is ready to download or send"
                    }
                  </p>
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
                <div className="space-y-4">
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
                      <p className="text-gray-900 font-medium">{formatDate(new Date(generatedInvoiceData.invoiceDate))}</p>
                    </div>
                    {generatedInvoiceData.dueDate && (
                      <div>
                        <p className="text-gray-500">Due date</p>
                        <p className="text-gray-900 font-medium">{formatDate(new Date(generatedInvoiceData.dueDate))}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Items */}
                {generatedInvoiceData.items.length > 0 && (
                  <div>
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
                            <p className="text-xs text-gray-500 shrink-0">
                              {item.quantity} × {formatCurrency(item.rate, generatedInvoiceData.currency)}
                            </p>
                          </div>
                          <div className="ml-4 shrink-0">
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

                {/* Action Buttons - Only Download and Send */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleSendInvoice}
                    disabled={isSending || !generatedInvoiceData.client.email}
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send Invoice'}
                  </Button>
                </div>

                {!generatedInvoiceData.client.email && (
                  <p className="text-xs text-muted-foreground text-center">
                    Client email not provided - cannot send invoice directly
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>


    </InvoicingGate>
  )
}

