'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, Edit, Mail, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useSettings } from '@/components/settings-provider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'
import { PageHeader, PageContent, PageTitle } from '@/components/page-header'

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

// Helper function to render invoice HTML
async function renderInvoiceForPreview(invoice: Invoice, templateSettings: any, settings: any) {
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
    templateId: templateSettings.templateId || 'stripe-inspired',
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
  
  const html = await renderInvoiceHTML(formattedInvoice, fullTemplate)
  return html
}

export default function InvoicePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [invoiceHTML, setInvoiceHTML] = useState<string>('')
  
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
      

      
      // Prepare company info
      const companyInfo = {
        name: settings.companyName || 'Your Company',
        address: '123 Business St\nCity, State 12345',
        email: 'contact@yourcompany.com',
        phone: '+1 (555) 123-4567',
        logoUrl: settings.companyLogo || ''
      }
      
      // Try to load company info from localStorage
      const savedCompanyInfo = localStorage.getItem('company-info')
      if (savedCompanyInfo) {
        try {
          const parsed = JSON.parse(savedCompanyInfo)
          Object.assign(companyInfo, {
            name: parsed.companyName || companyInfo.name,
            address: parsed.companyAddress || companyInfo.address,
            email: parsed.companyEmail || companyInfo.email,
            phone: parsed.companyPhone || companyInfo.phone,
            logoUrl: parsed.logoUrl || companyInfo.logoUrl
          })
        } catch (error) {
          console.error('Error parsing company info:', error)
        }
      }
      
      // Create full template with all settings
      const fullTemplate = {
        templateId: finalTemplateSettings.templateId || 'stripe-inspired',
        logoSize: finalTemplateSettings.logoSize || [80],
        logoBorderRadius: finalTemplateSettings.logoBorderRadius || [8],
        invoicePadding: finalTemplateSettings.invoicePadding || [48],
        fontFamily: finalTemplateSettings.fontFamily || 'inter',
        fontSize: finalTemplateSettings.fontSize || [14],
        lineHeight: finalTemplateSettings.lineHeight || [1.6],
        tableHeaderSize: finalTemplateSettings.tableHeaderSize || [13],
        primaryColor: finalTemplateSettings.primaryColor || '#000000',
        secondaryColor: finalTemplateSettings.secondaryColor || '#666666',
        accentColor: finalTemplateSettings.accentColor || '#0066FF',
        backgroundColor: finalTemplateSettings.backgroundColor || '#FFFFFF',
        borderColor: finalTemplateSettings.borderColor || '#E5E5E5',
        currency: finalTemplateSettings.currency || 'USD',
        showLogo: finalTemplateSettings.showLogo !== undefined ? finalTemplateSettings.showLogo : true,
        showInvoiceNumber: finalTemplateSettings.showInvoiceNumber !== undefined ? finalTemplateSettings.showInvoiceNumber : true,
        showDates: finalTemplateSettings.showDates !== undefined ? finalTemplateSettings.showDates : true,
        showPaymentTerms: finalTemplateSettings.showPaymentTerms !== undefined ? finalTemplateSettings.showPaymentTerms : true,
        showNotes: finalTemplateSettings.showNotes !== undefined ? finalTemplateSettings.showNotes : true,
        showTaxId: finalTemplateSettings.showTaxId !== undefined ? finalTemplateSettings.showTaxId : false,
        showItemDetails: finalTemplateSettings.showItemDetails !== undefined ? finalTemplateSettings.showItemDetails : true,
        notes: finalTemplateSettings.notes || '',
        ...companyInfo
      }
      
      // Format invoice data
      const formattedInvoice = {
        ...invoice,
        currency: invoice.currency || settings.defaultCurrency || 'USD',
        items: invoice.items || []
      }
      
      // Call the PDF API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice: formattedInvoice,
          template: fullTemplate,
          companyInfo: companyInfo
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`PDF generation failed: ${errorData.details}`)
      }

      // Get the PDF blob
      const pdfBlob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number || 'preview'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

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
    if (!invoice || sendingEmail) return
    
    setSendingEmail(true)
    try {
      // TODO: Implement email sending functionality
      toast.info('Email functionality coming soon!')
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
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
      items: invoice.items || [],
      projectName: invoice.projects?.name
    }
    
    sessionStorage.setItem('edit-invoice-data', JSON.stringify(editData))
    router.push('/dashboard/invoices/generate?edit=true')
  }

  function handleBack() {
    // Navigate back based on the action
    if (action === 'created' || action === 'updated') {
      router.push('/dashboard/invoices')
    } else {
      router.back()
    }
  }

  // Get success message based on action
  function getSuccessMessage() {
    switch (action) {
      case 'created':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
            <Check className="h-5 w-5" />
            <span className="font-medium">Invoice created successfully!</span>
          </div>
        )
      case 'updated':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
            <Check className="h-5 w-5" />
            <span className="font-medium">Invoice updated successfully!</span>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Invoice Preview"
          breadcrumbs={[
            { label: "Invoices", href: "/dashboard/invoices" },
            { label: "Preview" }
          ]}
        />
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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
          breadcrumbs={[
            { label: "Invoices", href: "/dashboard/invoices" },
            { label: "Preview" }
          ]}
        />
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground">Invoice not found</p>
              <Button onClick={() => router.push('/dashboard/invoices')} className="mt-4">
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
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Preview" }
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <Button
              variant="outline"
              onClick={handleEdit}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
            
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
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
          {getSuccessMessage()}
          
          {/* Invoice Preview - Centered with top spacing */}
          <div className="flex justify-center pt-6">
            <div className="w-full max-w-4xl">
              {/* Clean container for PDF generation */}
              <div className="shadow-lg rounded-lg overflow-hidden border bg-white">
                {invoiceHTML ? (
                  <div 
                    id="invoice-preview"
                    className="print:shadow-none w-full"
                    style={{ 
                      backgroundColor: templateSettings?.backgroundColor || '#FFFFFF',
                      minHeight: '800px' // Ensure minimum height for consistent rendering
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: invoiceHTML 
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    Rendering invoice preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
} 