'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, Edit, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useSettings } from '@/components/settings-provider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { PageHeader, PageContent, PageTitle } from '@/components/page-header'
import { Loader } from '@/components/ui/loader'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'
import { useQueryClient } from '@tanstack/react-query'
import { CURRENCIES } from '@/lib/currency'

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  amount: number
  tax_amount: number
  total_amount: number
  notes: string | null
  terms?: string | null
  client_id: string
  project_id: string | null
  created_at: string
  updated_at: string
  currency?: string
  items?: any[]
  clients?: {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    country: string | null
    company?: string
  }
  projects?: {
    id: string
    name: string
    description: string | null
  }
}

export default function InvoicePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const queryClient = useQueryClient()
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [invoiceHTML, setInvoiceHTML] = useState<string>('')
  const [isDemoInvoice, setIsDemoInvoice] = useState(false)
  
  // Send email dialog state
  const [sendEmailOpen, setSendEmailOpen] = useState(false)
  const [sendForm, setSendForm] = useState({
    to: "",
    subject: "",
    message: ""
  })
  
  // Get the action from query params (created, updated, or view)
  const action = searchParams.get('action') || 'view'
  
  // Get template settings - provider now handles sync automatically
  const templateSettings = settings.invoiceTemplate || {}
  
  // Also try to load from localStorage if settings are empty (fallback)
  const [localTemplateSettings, setLocalTemplateSettings] = useState<any>({})
  
  useEffect(() => {
    // If settings.invoiceTemplate is empty, try to load from localStorage
    if (!settings.invoiceTemplate || Object.keys(settings.invoiceTemplate).length === 0) {
      const savedTemplate = localStorage.getItem('invoice-template-settings')
      if (savedTemplate) {
        try {
          const parsed = JSON.parse(savedTemplate)
          setLocalTemplateSettings(parsed)
        } catch (error) {
          console.error('Error parsing localStorage template:', error)
        }
      }
    }
  }, [settings.invoiceTemplate])
  
  // Use database template if available, otherwise use localStorage fallback
  const finalTemplateSettings = Object.keys(templateSettings).length > 0 ? templateSettings : localTemplateSettings

  // Currency formatting helper function
  const formatCurrency = (amount: number, currencyCode: string) => {
    const currencyConfig = CURRENCIES[currencyCode]
    if (!currencyConfig) {
      return `$${amount.toFixed(2)}` // Fallback to USD
    }
    
    const decimals = currencyConfig.decimals
    const symbol = currencyConfig.symbol
    const formattedAmount = amount.toFixed(decimals)
    
    // Handle position (before/after)
    return currencyConfig.position === 'before' 
      ? `${symbol}${formattedAmount}`
      : `${formattedAmount}${symbol}`
  }

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  useEffect(() => {
    async function renderInvoice() {
      if (invoice) {
        try {
          const html = await renderInvoiceForPreview(invoice, finalTemplateSettings, settings)
          setInvoiceHTML(html)
        } catch (error) {
          console.error('Error rendering invoice HTML:', error)
          toast.error('Failed to render invoice preview')
        }
      }
    }
    renderInvoice()
  }, [invoice, finalTemplateSettings, settings])

  // Helper function to render invoice HTML
  async function renderInvoiceForPreview(invoice: Invoice, templateSettings: any, settings: any) {
    // Template ID migration mapping
    const migrateTemplateId = (templateId: string) => {
      if (!templateId) return 'modern'
      const migrationMap: { [key: string]: string } = {
        'stripe-inspired': 'modern',
        'contra-inspired': 'bold',
        'mercury-inspired': 'classic',
        'notion-inspired': 'slate'
      }
      return migrationMap[templateId] || templateId
    }
    
    // Get company info from settings or localStorage
    let companyInfo = {
      companyName: settings.companyName || 'Your Company',
      companyAddress: '123 Business St\nCity, State 12345',
      companyEmail: 'contact@yourcompany.com',
      companyPhone: '+1 (555) 123-4567',
      companyTaxId: '',
      logoUrl: settings.companyLogo || ''
    }
    
    // Try to load company info from localStorage
    const savedCompanyInfo = localStorage.getItem('company-info')
    if (savedCompanyInfo) {
      try {
        const parsed = JSON.parse(savedCompanyInfo)
        companyInfo = {
          companyName: parsed.companyName || settings.companyName || companyInfo.companyName,
          companyAddress: parsed.companyAddress || companyInfo.companyAddress,
          companyEmail: parsed.companyEmail || companyInfo.companyEmail,
          companyPhone: parsed.companyPhone || companyInfo.companyPhone,
          companyTaxId: parsed.companyTaxId || '',
          logoUrl: parsed.logoUrl || settings.companyLogo || companyInfo.logoUrl
        }
      } catch (error) {
        console.error('Error parsing company info:', error)
      }
    }
    
    // Create full template with all settings - use saved templateId if available
    const fullTemplate = {
      templateId: migrateTemplateId(templateSettings.templateId) || 'modern',
      logoSize: templateSettings.logoSize || [80],
      logoBorderRadius: templateSettings.logoBorderRadius || [8],
      invoicePadding: templateSettings.invoicePadding || [48],
      fontFamily: templateSettings.fontFamily || 'inter',
      fontSize: templateSettings.fontSize || [14],
      lineHeight: templateSettings.lineHeight || [1.6],
      tableHeaderSize: templateSettings.tableHeaderSize || [13],
      primaryColor: templateSettings.primaryColor || '#000000',
      secondaryColor: templateSettings.secondaryColor || '#666666',
      accentColor: templateSettings.accentColor || '#0066FF',
      backgroundColor: templateSettings.backgroundColor || '#FFFFFF',
      borderColor: templateSettings.borderColor || '#E5E5E5',
      currency: templateSettings.currency || 'USD',
      showLogo: templateSettings.showLogo !== undefined ? templateSettings.showLogo : true,
      showInvoiceNumber: templateSettings.showInvoiceNumber !== undefined ? templateSettings.showInvoiceNumber : true,
      showDates: templateSettings.showDates !== undefined ? templateSettings.showDates : true,
      showPaymentTerms: templateSettings.showPaymentTerms !== undefined ? templateSettings.showPaymentTerms : true,
      showNotes: templateSettings.showNotes !== undefined ? templateSettings.showNotes : true,
      showTaxId: templateSettings.showTaxId !== undefined ? templateSettings.showTaxId : false,
      showItemDetails: templateSettings.showItemDetails !== undefined ? templateSettings.showItemDetails : true,
      notes: templateSettings.notes || '',
      ...companyInfo
    }
    
    // Format invoice data for renderer
    const formattedInvoice = {
      ...invoice,
      currency: invoice.currency || settings.defaultCurrency || 'USD',
      items: invoice.items || []
    }
    
    const html = await renderInvoiceHTML(formattedInvoice, fullTemplate, settings.dateFormat)
    return html
  }

  async function loadInvoice() {
    try {
      setLoading(true)
      

      
      if (isSupabaseConfigured()) {
        // Load from Supabase
        const { data: invoiceData, error } = await supabase
          .from('invoices')
          .select(`
            *,
            clients (
              id,
              name,
              email,
              phone,
              address,
              city,
              state,
              zip_code,
              country,
              company
            ),
            projects (
              id,
              name,
              description
            )
          `)
          .eq('id', params.id)
          .single()

        if (error) throw error
        
        // Load invoice items if any
        const { data: items } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', params.id)
          .order('created_at', { ascending: true })
        
        const invoiceWithItems = {
          ...invoiceData,
          items: items || []
        }
        console.log('Loaded invoice from Supabase:', invoiceWithItems)
        setInvoice(invoiceWithItems)
        setIsDemoInvoice(false)
      } else {
        // Load from sessionStorage for demo mode
        const demoInvoices = JSON.parse(sessionStorage.getItem('demo-invoices') || '[]')
        console.log('Demo invoices in storage:', demoInvoices)
        const demoInvoice = demoInvoices.find((inv: any) => inv.id === params.id)
        
        if (!demoInvoice) {
          throw new Error('Invoice not found')
        }
        
        // Format demo invoice to match expected structure
        const formattedInvoice = {
          ...demoInvoice,
          items: demoInvoice._items || demoInvoice.items || [],
          currency: demoInvoice._currency || demoInvoice.currency || 'USD'
        }
        console.log('Loaded invoice from demo:', formattedInvoice)
        setInvoice(formattedInvoice)
        setIsDemoInvoice(true)
      }
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast.error('Failed to load invoice')
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    if (!invoice || downloadingPDF || !invoiceHTML) return
    
    setDownloadingPDF(true)
    try {
      // Update toast to show generation
      toast.loading('Generating PDF...', {
        id: 'pdf-download'
      })

      // Dynamically import html2canvas-pro and jsPDF
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf')
      ])

      // Get the invoice preview element
      const element = document.getElementById('invoice-preview')
      if (!element) {
        throw new Error('Invoice preview element not found')
      }

      // Generate canvas from HTML
      const canvas = await html2canvas.default(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: finalTemplateSettings?.backgroundColor || '#FFFFFF',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      })

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      // Calculate dimensions for A4
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Add image to PDF
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      )

      // Save PDF
      pdf.save(`invoice-${invoice.invoice_number || 'preview'}.pdf`)

      toast.success('PDF downloaded successfully!', {
        id: 'pdf-download'
      })
      
    } catch (error) {
      console.error('❌ PDF generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF', {
        id: 'pdf-download'
      })
    } finally {
      setDownloadingPDF(false)
    }
  }

  async function handleSendEmail() {
    if (!invoice) return
    
    // Check if this is a demo invoice
    if (isDemoInvoice) {
      toast.error('Cannot send demo invoice', {
        description: 'Demo invoices cannot be emailed. Please save the invoice to the database first by creating it through the invoice generation process.'
      })
      return
    }
    
    // Check if client has email
    if (!invoice.clients?.email) {
      toast.error('Client email not found', {
        description: 'Please add an email address for this client before sending.'
      })
      return
    }
    
    // Use the client's actual email address since domain is verified
    const emailToUse = invoice.clients.email
    
    // Get the correct currency for this invoice
    const invoiceCurrency = invoice.currency || settings.defaultCurrency || 'USD'
    const formattedAmount = invoice.total_amount ? formatCurrency(invoice.total_amount, invoiceCurrency) : 'the requested amount'
    
    // Set up the form and open dialog
    setSendForm({
      to: emailToUse,
      subject: `Invoice ${invoice.invoice_number} from ${settings.companyName || 'Your Company'}`,
      message: `Dear ${invoice.clients.name || 'Client'},\n\nPlease find attached your invoice ${invoice.invoice_number} for ${formattedAmount}.\n\nDue date: ${settings.formatDate ? settings.formatDate(new Date(invoice.due_date)) : new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!\n\nBest regards,\n${settings.companyName || 'Your Company'}`
    })
    setSendEmailOpen(true)
  }

  async function handleSendEmailSubmit() {
    if (!invoice || sendingEmail) return
    
    setSendingEmail(true)
    try {
      console.log('Sending email for invoice:', {
        invoiceId: invoice.id,
        isDemoInvoice,
        clientEmail: sendForm.to,
        invoiceNumber: invoice.invoice_number
      })
      
      // Get the current session token for API authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in and try again.')
      }
      
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          clientEmail: sendForm.to,
          clientName: invoice.clients?.name || 'Client',
          senderName: settings.companyName || 'Your Company',
          senderEmail: 'noreply@resend.dev', // Use Resend's default domain
          customMessage: sendForm.message,
          subject: sendForm.subject
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Invoice sent successfully!', {
        description: `Email sent to ${sendForm.to}`
      })
      
      // Close dialog
      setSendEmailOpen(false)
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send invoice', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setSendingEmail(false)
    }
  }

  function handleEdit() {
    if (!invoice) return
    
    // Store invoice data for editing
    const editData = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.clients?.id || null,
      clientName: invoice.clients?.name,
      clientCompany: invoice.clients?.company || undefined,
      amount: invoice.amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      paymentTerms: invoice.terms,
      items: invoice.items || [],
      projectName: invoice.projects?.name
    }
    
    sessionStorage.setItem('edit-invoice-data', JSON.stringify(editData))
    router.push('/dashboard/invoices/generate?edit=true')
  }

  function handleBack() {
    // Invalidate invoice cache to ensure fresh data when navigating back
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    
    // Navigate back based on the action
    if (action === 'created' || action === 'updated') {
      router.push('/dashboard/invoices')
    } else {
      router.back()
    }
  }

  // Show success toast based on action
  useEffect(() => {
    if (action === 'created') {
      toast.success('Invoice created successfully!', {
        description: 'Your invoice has been created and is ready to download or send.'
      })
    } else if (action === 'updated') {
      toast.success('Invoice updated successfully!', {
        description: 'Your invoice has been updated and saved.'
      })
    }
  }, [action])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Invoice Preview"
        />
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader size="xl" variant="primary" className="mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading invoice...</p>
            </div>
          </div>
        </PageContent>
      </>
    )
  }

  if (!invoice) {
    return (
      <>
        <PageHeader
          title="Invoice Preview"
        />
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground">Invoice not found</p>
              <Button onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['invoices'] })
                router.push('/dashboard/invoices')
              }} className="mt-4">
                Back to Invoices
              </Button>
            </div>
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={sendingEmail || isDemoInvoice}
              className="gap-2"
              title={isDemoInvoice ? 'Demo invoices cannot be emailed' : ''}
            >
              <Mail className="h-4 w-4" />
              {sendingEmail ? 'Sending...' : isDemoInvoice ? 'Demo Mode' : 'Send Email'}
            </Button>
            
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {downloadingPDF ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Invoice Preview - Centered and responsive */}
          <div className="flex justify-center px-4">
            {/* Container that adapts to invoice width + padding */}
            <div 
              className="w-full mx-auto min-w-0"
              style={{
                // A4 width (210mm) - padding is now internal
                maxWidth: '210mm'
              }}
            >
              {/* Clean container for PDF generation */}
              {invoiceHTML ? (
                <div 
                  id="invoice-preview"
                  className="print:shadow-none w-full"
                  style={{ 
                    backgroundColor: finalTemplateSettings?.backgroundColor || '#FFFFFF',
                    minHeight: '297mm', // A4 height
                    isolation: 'isolate', // Create stacking context to prevent style bleed
                    position: 'relative'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: invoiceHTML 
                  }}
                />
              ) : (
                <div className="shadow-lg rounded-lg overflow-hidden border bg-white">
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader size="xl" variant="primary" className="mx-auto mb-4" />
                    Rendering invoice preview...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>

      {/* Send Email Dialog */}
      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Send Invoice</span>
            </DialogTitle>
            <DialogDescription>
              Send {invoice?.invoice_number} via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="email-to">To</Label>
               <Input
                 id="email-to"
                 value={sendForm.to}
                 onChange={(e) => setSendForm({...sendForm, to: e.target.value})}
                 placeholder="client@example.com"
               />
             </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={sendForm.subject}
                onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                rows={6}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSendEmailOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmailSubmit} disabled={sendingEmail}>
                <Mail className="mr-2 h-4 w-4" />
                {sendingEmail ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 