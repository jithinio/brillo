'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { getDefaultCurrency, getCurrencySymbol } from '@/lib/currency'
import { Save, Palette, Settings2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, PageContent } from '@/components/page-header'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/settings-provider'

interface InvoiceTemplate {
  id: string
  name: string
  description: string
  preview: string
}

const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'stripe-inspired',
    name: 'Stripe',
    description: 'Clean minimal design with perfect typography',
    preview: 'Minimal colors, clear hierarchy'
  },
  {
    id: 'contra-inspired',
    name: 'Contra',
    description: 'Modern creative design with bold elements',
    preview: 'Bold typography, creative layout'
  },
  {
    id: 'mercury-inspired',
    name: 'Mercury',
    description: 'Banking-grade professional design',
    preview: 'Corporate clean, structured'
  },
  {
    id: 'notion-inspired',
    name: 'Notion',
    description: 'Clean workspace-style design',
    preview: 'Minimal, functional, modern'
  }
]

const fontFamilies = [
  { id: 'inter', name: 'Inter', category: 'Sans-serif' },
  { id: 'helvetica', name: 'Helvetica', category: 'Sans-serif' },
  { id: 'arial', name: 'Arial', category: 'Sans-serif' },
  { id: 'roboto', name: 'Roboto', category: 'Sans-serif' },
  { id: 'opensans', name: 'Open Sans', category: 'Sans-serif' },
  { id: 'lato', name: 'Lato', category: 'Sans-serif' },
  { id: 'poppins', name: 'Poppins', category: 'Sans-serif' },
  { id: 'montserrat', name: 'Montserrat', category: 'Sans-serif' },
  { id: 'playfair', name: 'Playfair Display', category: 'Serif' },
  { id: 'merriweather', name: 'Merriweather', category: 'Serif' },
  { id: 'georgia', name: 'Georgia', category: 'Serif' },
  { id: 'times', name: 'Times New Roman', category: 'Serif' },
  { id: 'sourcecodepro', name: 'Source Code Pro', category: 'Monospace' },
  { id: 'jetbrains', name: 'JetBrains Mono', category: 'Monospace' },
  { id: 'inconsolata', name: 'Inconsolata', category: 'Monospace' }
]

const backgroundColorPresets = [
  { id: 'white', color: '#FFFFFF' },
  { id: 'cream', color: '#FEFEF3' },
  { id: 'light-gray', color: '#F9FAFB' },
  { id: 'light-blue', color: '#F0F9FF' },
  { id: 'light-green', color: '#F0FDF4' },
  { id: 'light-purple', color: '#FAF5FF' }
]

export default function CustomizeInvoicePage() {
  const { settings, isLoading, updateSetting } = useSettings()
  const [activeTab, setActiveTab] = useState('template')
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState({
    templateId: 'stripe-inspired',
    logoUrl: '',
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
    notes: ''
  })

  // Auto-fetch company info from settings
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Your Company',
    email: 'billing@company.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Street\nSan Francisco, CA 94111',
    website: 'www.company.com',
    taxId: 'TAX-123456789'
  })

  // Load saved template from settings
  useEffect(() => {
    // First try to load from settings (account-level)
    if (settings.invoiceTemplate && Object.keys(settings.invoiceTemplate).length > 0) {
      setTemplate(prev => ({
        ...prev,
        ...settings.invoiceTemplate
      }))
    } else {
      // Fallback to localStorage if no account template exists
      const savedTemplate = localStorage.getItem('invoice-template-settings')
      if (savedTemplate) {
        try {
          const parsed = JSON.parse(savedTemplate)
          setTemplate(prev => ({
            ...prev,
            ...parsed
          }))
        } catch (error) {
          console.error('Error loading saved template:', error)
        }
      }
    }
  }, [settings.invoiceTemplate])

  // Load company info from localStorage/settings
  useEffect(() => {
    // Use settings provider data
    const updatedCompanyInfo = {
      name: settings.companyName || 'Your Company',
      email: companyInfo.email,
      phone: companyInfo.phone,
      address: companyInfo.address,
      website: companyInfo.website,
      taxId: companyInfo.taxId
    }

    // Load from localStorage if available (from settings page)
    const savedCompanyInfo = localStorage.getItem('company-info')
    if (savedCompanyInfo) {
      try {
        const parsed = JSON.parse(savedCompanyInfo)
        updatedCompanyInfo.name = parsed.companyName || updatedCompanyInfo.name
        updatedCompanyInfo.email = parsed.companyEmail || updatedCompanyInfo.email
        updatedCompanyInfo.phone = parsed.companyPhone || updatedCompanyInfo.phone
        updatedCompanyInfo.address = parsed.companyAddress || updatedCompanyInfo.address
        updatedCompanyInfo.website = parsed.companyWebsite || updatedCompanyInfo.website
        updatedCompanyInfo.taxId = parsed.companyRegistration || updatedCompanyInfo.taxId
      } catch (error) {
        console.error('Error parsing company info from localStorage:', error)
      }
    }

    setCompanyInfo(updatedCompanyInfo)
  }, [settings.companyName])

  const invoiceData = {
    number: 'INV-2024-001',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'PENDING',
    client: {
      name: 'Client Company Inc.',
      email: 'accounts@clientcompany.com',
      address: '456 Client Avenue\nNew York, NY 10001',
      taxId: 'TAX-987654321'
    },
    items: [
      {
        description: 'Professional Services',
        details: 'Website development and design',
        quantity: 1,
        rate: 5000,
        amount: 5000
      },
      {
        description: 'Consulting',
        details: 'Technical architecture consultation',
        quantity: 10,
        rate: 150,
        amount: 1500
      },
      {
        description: 'Support & Maintenance',
        details: 'Monthly support package',
        quantity: 1,
        rate: 1000,
        amount: 1000
      }
    ],
    subtotal: 7500,
    tax: 750,
    total: 8250,
    paymentTerms: 'Net 30',
    notes: 'Thank you for your business. Please include the invoice number with your payment.'
  }

  // Auto-fetch logo and currency from settings
  useEffect(() => {
    if (settings.companyLogo) {
      setTemplate(prev => ({ ...prev, logoUrl: settings.companyLogo }))
    }
    const defaultCurrency = getDefaultCurrency()
    setTemplate(prev => ({ ...prev, currency: defaultCurrency }))
  }, [settings.companyLogo])

  // Update template styles based on selection
  useEffect(() => {
    const templateStyles = {
      'stripe-inspired': {
        primaryColor: '#0A2540',
        secondaryColor: '#425466',
        accentColor: '#635BFF',
        borderColor: '#E6E6E6',
        fontFamily: 'inter',
        invoicePadding: [48]
      },
      'contra-inspired': {
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#FF5A5F',
        borderColor: '#F0F0F0',
        fontFamily: 'helvetica',
        invoicePadding: [64]
      },
      'mercury-inspired': {
        primaryColor: '#1A1A1A',
        secondaryColor: '#6B7280',
        accentColor: '#8B5CF6',
        borderColor: '#E5E7EB',
        fontFamily: 'arial',
        invoicePadding: [40]
      },
      'notion-inspired': {
        primaryColor: '#191919',
        secondaryColor: '#787774',
        accentColor: '#0084FF',
        borderColor: '#EDEDEC',
        fontFamily: 'inter',
        invoicePadding: [56]
      }
    }

    const styles = templateStyles[template.templateId as keyof typeof templateStyles]
    if (styles) {
      setTemplate(prev => ({ ...prev, ...styles }))
    }
  }, [template.templateId])

  const getFontFamily = () => {
    const fontMap: { [key: string]: string } = {
      'inter': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'arial': 'Arial, Helvetica, sans-serif',
      'roboto': 'Roboto, Arial, sans-serif',
      'opensans': '"Open Sans", Arial, sans-serif',
      'lato': 'Lato, Arial, sans-serif',
      'poppins': 'Poppins, Arial, sans-serif',
      'montserrat': 'Montserrat, Arial, sans-serif',
      'playfair': '"Playfair Display", Georgia, serif',
      'merriweather': 'Merriweather, Georgia, serif',
      'georgia': 'Georgia, "Times New Roman", serif',
      'times': '"Times New Roman", Times, serif',
      'sourcecodepro': '"Source Code Pro", "Courier New", monospace',
      'jetbrains': '"JetBrains Mono", "Courier New", monospace',
      'inconsolata': 'Inconsolata, "Courier New", monospace'
    }
    return fontMap[template.fontFamily] || fontMap['inter']
  }

  const renderInvoice = () => {
    const baseStyles = {
      fontFamily: getFontFamily(),
      fontSize: `${template.fontSize[0]}px`,
      lineHeight: template.lineHeight[0],
      color: template.primaryColor,
      backgroundColor: template.backgroundColor,
      minHeight: '842px', // A4 height in pixels at 72 DPI
      padding: `${template.invoicePadding[0]}px`,
      transition: 'all 0.3s ease'
    } as React.CSSProperties

    switch (template.templateId) {
      case 'stripe-inspired':
        return <StripeInspiredInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'contra-inspired':
        return <ContraInspiredInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'mercury-inspired':
        return <MercuryInspiredInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'notion-inspired':
        return <NotionInspiredInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      default:
        return <StripeInspiredInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
    }
  }

  // Stripe-inspired Invoice Component
  const StripeInspiredInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
  return (
      <div style={baseStyles}>
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            {template.showLogo && template.logoUrl && (
              <img 
                src={template.logoUrl} 
                alt="Company Logo" 
                            style={{
                  height: `${template.logoSize[0]}px`, 
                  marginBottom: '24px',
                  borderRadius: `${template.logoBorderRadius[0]}px`
                }}
                className="object-contain"
              />
            )}
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Invoice
                            </div>
            {template.showInvoiceNumber && (
              <div style={{ color: template.secondaryColor, fontSize: '14px' }}>
                {invoiceData.number}
                            </div>
            )}
                          </div>

          <div className="text-right">
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{companyInfo.name}</div>
            <div style={{ color: template.secondaryColor, fontSize: '14px', whiteSpace: 'pre-line' }}>
              {companyInfo.address}
            </div>
            <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '8px' }}>
              {companyInfo.email}
            </div>
            {template.showTaxId && (
              <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '4px' }}>
                {companyInfo.taxId}
              </div>
                            )}
                          </div>
                        </div>

        {/* Bill To & Dates */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Bill To</div>
            <div style={{ marginBottom: '4px' }}>{invoiceData.client.name}</div>
            <div style={{ color: template.secondaryColor, fontSize: '14px', whiteSpace: 'pre-line' }}>
              {invoiceData.client.address}
                    </div>
          </div>

          {template.showDates && (
            <div className="text-right">
              <div className="space-y-2">
                <div>
                  <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Invoice Date: </span>
                  <span style={{ fontWeight: '500' }}>{invoiceData.date.toLocaleDateString()}</span>
                            </div>
                <div>
                  <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Due Date: </span>
                  <span style={{ fontWeight: '500' }}>{invoiceData.dueDate.toLocaleDateString()}</span>
                            </div>
                          </div>
            </div>
                            )}
                          </div>

        {/* Items Table */}
        <div className="mb-12">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${template.borderColor}` }}>
                <th className="text-left py-3" style={{ fontWeight: '600', fontSize: `${template.tableHeaderSize[0]}px` }}>Description</th>
                <th className="text-right py-3" style={{ fontWeight: '600', fontSize: `${template.tableHeaderSize[0]}px` }}>Qty</th>
                <th className="text-right py-3" style={{ fontWeight: '600', fontSize: `${template.tableHeaderSize[0]}px` }}>Rate</th>
                <th className="text-right py-3" style={{ fontWeight: '600', fontSize: `${template.tableHeaderSize[0]}px` }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item: any, index: number) => (
                <tr key={index} style={{ borderBottom: `1px solid ${template.borderColor}` }}>
                  <td className="py-4">
                    <div style={{ fontWeight: '500' }}>{item.description}</div>
                    {template.showItemDetails && item.details && (
                      <div style={{ color: template.secondaryColor, fontSize: '13px', marginTop: '4px' }}>
                        {item.details}
                        </div>
                    )}
                  </td>
                  <td className="text-right py-4">{item.quantity}</td>
                  <td className="text-right py-4">{getCurrencySymbol(template.currency)}{item.rate.toFixed(2)}</td>
                  <td className="text-right py-4" style={{ fontWeight: '500' }}>
                    {getCurrencySymbol(template.currency)}{item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
                    </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span style={{ color: template.secondaryColor }}>Subtotal</span>
              <span>{getCurrencySymbol(template.currency)}{invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span style={{ color: template.secondaryColor }}>Tax (10%)</span>
              <span>{getCurrencySymbol(template.currency)}{invoiceData.tax.toFixed(2)}</span>
            </div>
            <div 
              className="flex justify-between py-3 mt-2"
              style={{ borderTop: `2px solid ${template.primaryColor}` }}
                          >
              <span style={{ fontWeight: '600' }}>Total</span>
              <span style={{ fontWeight: '600', fontSize: '18px' }}>
                {getCurrencySymbol(template.currency)}{invoiceData.total.toFixed(2)}
              </span>
                                  </div>
          </div>
        </div>

        {/* Payment Terms & Notes */}
        {(template.showPaymentTerms || template.showNotes) && (
          <div className="space-y-6">
            {template.showPaymentTerms && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Payment Terms</div>
                <div style={{ color: template.secondaryColor, fontSize: '14px' }}>
                  {invoiceData.paymentTerms}
                                  </div>
                                </div>
                              )}
            {template.showNotes && invoiceData.notes && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Notes</div>
                <div style={{ color: template.secondaryColor, fontSize: '14px' }}>
                  {invoiceData.notes}
                </div>
                                </div>
                              )}
                                </div>
                              )}
                                </div>
    )
  }

  // Contra-inspired Invoice Component
  const ContraInspiredInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
    return (
      <div style={baseStyles}>
        {/* Bold Header */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            {template.showLogo && template.logoUrl && (
              <img 
                src={template.logoUrl} 
                alt="Logo" 
                style={{ 
                  height: `${template.logoSize[0]}px`,
                  borderRadius: `${template.logoBorderRadius[0]}px`
                }}
                className="object-contain"
              />
            )}
            <div 
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: template.accentColor + '20',
                color: template.accentColor
              }}
            >
              {invoiceData.status}
                            </div>
                          </div>

          <h1 style={{ fontSize: '48px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Invoice
          </h1>
          
          <div className="grid grid-cols-3 gap-4" style={{ fontSize: '14px' }}>
            {template.showInvoiceNumber && (
              <div>
                <div style={{ color: template.secondaryColor, marginBottom: '4px' }}>Invoice Number</div>
                <div style={{ fontWeight: '600' }}>{invoiceData.number}</div>
              </div>
            )}
            {template.showDates && (
              <>
                <div>
                  <div style={{ color: template.secondaryColor, marginBottom: '4px' }}>Issue Date</div>
                  <div style={{ fontWeight: '600' }}>{invoiceData.date.toLocaleDateString()}</div>
                          </div>
                <div>
                  <div style={{ color: template.secondaryColor, marginBottom: '4px' }}>Due Date</div>
                  <div style={{ fontWeight: '600' }}>{invoiceData.dueDate.toLocaleDateString()}</div>
                        </div>
              </>
            )}
                    </div>
        </div>

        {/* From/To Section */}
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div>
            <div 
              className="text-xs font-semibold mb-4"
              style={{ 
                color: template.secondaryColor,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              From
                      </div>
            <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
              {companyInfo.name}
                        </div>
            <div style={{ color: template.secondaryColor, whiteSpace: 'pre-line' }}>
              {companyInfo.address}
                      </div>
            <div style={{ color: template.secondaryColor, marginTop: '8px' }}>
              {companyInfo.email}
            </div>
            {template.showTaxId && (
              <div style={{ color: template.secondaryColor, marginTop: '4px' }}>
                {companyInfo.taxId}
                      </div>
                    )}
          </div>

          <div>
            <div 
              className="text-xs font-semibold mb-4"
              style={{ 
                color: template.secondaryColor,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              To
                      </div>
            <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
              {invoiceData.client.name}
                    </div>
            <div style={{ color: template.secondaryColor, whiteSpace: 'pre-line' }}>
              {invoiceData.client.address}
                    </div>
            <div style={{ color: template.secondaryColor, marginTop: '8px' }}>
              {invoiceData.client.email}
                    </div>
                    </div>
                    </div>

        {/* Services */}
        <div className="mb-16">
          <div 
            className="text-xs font-semibold mb-6"
            style={{ 
              color: template.secondaryColor,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: `${template.tableHeaderSize[0]}px`
            }}
          >
            Services
                    </div>

          {invoiceData.items.map((item: any, index: number) => (
            <div 
              key={index}
              className="py-6"
              style={{ borderBottom: index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                    {item.description}
                        </div>
                  {template.showItemDetails && item.details && (
                    <div style={{ color: template.secondaryColor, fontSize: '14px' }}>
                      {item.details}
                      </div>
                  )}
                  <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '8px' }}>
                    {item.quantity} × {getCurrencySymbol(template.currency)}{item.rate.toFixed(2)}
                        </div>
                      </div>
                <div style={{ fontWeight: '600', fontSize: '18px' }}>
                  {getCurrencySymbol(template.currency)}{item.amount.toFixed(2)}
                        </div>
                      </div>
                        </div>
          ))}
                      </div>

        {/* Total */}
        <div 
          className="p-8 rounded-lg mb-12"
          style={{ backgroundColor: template.primaryColor, color: template.backgroundColor }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>Total Amount</div>
              <div style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                {getCurrencySymbol(template.currency)}{invoiceData.total.toFixed(2)}
                        </div>
                      </div>
            {template.showPaymentTerms && (
              <div className="text-right">
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Payment Terms</div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>{invoiceData.paymentTerms}</div>
                    </div>
            )}
          </div>
                      </div>

        {/* Notes */}
        {template.showNotes && invoiceData.notes && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Notes</div>
            <div style={{ color: template.secondaryColor }}>
              {invoiceData.notes}
                      </div>
                    </div>
        )}
          </div>
    )
  }

  // Mercury-inspired Invoice Component
  const MercuryInspiredInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
    return (
      <div style={baseStyles}>
        {/* Professional Header */}
        <div className="mb-12">
          <div className="flex justify-between items-start mb-8">
            <div>
              {template.showLogo && template.logoUrl && (
                <img 
                  src={template.logoUrl} 
                  alt="Company Logo" 
                      style={{
                    height: `${template.logoSize[0]}px`, 
                    marginBottom: '20px',
                    borderRadius: `${template.logoBorderRadius[0]}px`
                  }}
                  className="object-contain"
                />
              )}
              <div style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-0.02em' }}>{companyInfo.name}</div>
              <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '4px', lineHeight: '1.5' }}>
                {companyInfo.address.split('\n').join(' • ')}
              </div>
              {companyInfo.email && (
                <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '2px' }}>
                  {companyInfo.email} • {companyInfo.phone}
                </div>
              )}
            </div>

            <div className="text-right">
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '800', 
                letterSpacing: '-0.03em',
                color: template.accentColor,
                marginBottom: '12px' 
              }}>
                INVOICE
              </div>
              {template.showInvoiceNumber && (
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: template.primaryColor,
                  backgroundColor: template.borderColor + '50',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  {invoiceData.number}
                </div>
                  )}
            </div>
          </div>
          <div style={{ height: '3px', backgroundColor: template.accentColor, borderRadius: '2px' }} />
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div>
            <div style={{ color: template.secondaryColor, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              From
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: '500' }}>{companyInfo.name}</div>
              <div style={{ whiteSpace: 'pre-line', color: template.secondaryColor }}>
                {companyInfo.address}
              </div>
              <div style={{ color: template.secondaryColor, marginTop: '4px' }}>
                {companyInfo.email}<br />
                {companyInfo.phone}
              </div>
            </div>
          </div>

          <div>
            <div style={{ color: template.secondaryColor, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              To
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: '500' }}>{invoiceData.client.name}</div>
              <div style={{ whiteSpace: 'pre-line', color: template.secondaryColor }}>
                {invoiceData.client.address}
              </div>
              <div style={{ color: template.secondaryColor, marginTop: '4px' }}>
                {invoiceData.client.email}
              </div>
            </div>
          </div>

          {template.showDates && (
            <div>
              <div style={{ color: template.secondaryColor, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Details
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <div>
                  <span style={{ color: template.secondaryColor }}>Date: </span>
                  <span style={{ fontWeight: '500' }}>{invoiceData.date.toLocaleDateString()}</span>
                </div>
                <div>
                  <span style={{ color: template.secondaryColor }}>Due: </span>
                  <span style={{ fontWeight: '500' }}>{invoiceData.dueDate.toLocaleDateString()}</span>
                </div>
                {template.showPaymentTerms && (
                  <div>
                    <span style={{ color: template.secondaryColor }}>Terms: </span>
                    <span style={{ fontWeight: '500' }}>{invoiceData.paymentTerms}</span>
                            </div>
                          )}
                            </div>
                          </div>
          )}
                        </div>

        {/* Items */}
        <div className="mb-12">
                        <div 
            className="rounded-xl overflow-hidden"
                          style={{ 
              backgroundColor: template.backgroundColor,
              boxShadow: `0 0 0 1px ${template.borderColor}`,
                                }}
                              >
                              <div 
              className="p-4"
                                style={{ 
                backgroundColor: template.primaryColor,
                color: template.backgroundColor
                                }}
                              >
              <div className="grid grid-cols-12 gap-4 font-semibold" style={{ fontSize: `${template.tableHeaderSize[0]}px` }}>
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
                            </div>
                          </div>
                          
            {invoiceData.items.map((item: any, index: number) => (
                            <div 
                key={index}
                className="p-4 grid grid-cols-12 gap-4 transition-colors hover:bg-opacity-50"
                style={{ 
                  borderBottom: index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none',
                  backgroundColor: index % 2 === 0 ? 'transparent' : template.borderColor + '10'
                }}
                            >
                <div className="col-span-6">
                  <div style={{ fontWeight: '600', color: template.primaryColor }}>{item.description}</div>
                  {template.showItemDetails && item.details && (
                    <div style={{ color: template.secondaryColor, fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                      {item.details}
                              </div>
                  )}
                              </div>
                <div className="col-span-2 text-right" style={{ fontWeight: '500' }}>{item.quantity}</div>
                <div className="col-span-2 text-right" style={{ fontWeight: '500' }}>{getCurrencySymbol(template.currency)}{item.rate.toFixed(2)}</div>
                <div className="col-span-2 text-right" style={{ fontWeight: '700', color: template.primaryColor }}>
                  {getCurrencySymbol(template.currency)}{item.amount.toFixed(2)}
                            </div>
              </div>
            ))}
                          </div>
                        </div>

        {/* Summary */}
        <div className="flex justify-end mb-12">
                          <div 
            className="w-96 rounded-xl overflow-hidden"
                            style={{ 
              backgroundColor: template.borderColor + '20',
              boxShadow: `0 0 0 1px ${template.borderColor}`,
                            }}
                          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Subtotal</span>
                <span style={{ fontWeight: '500', fontSize: '16px' }}>{getCurrencySymbol(template.currency)}{invoiceData.subtotal.toFixed(2)}</span>
                          </div>
              <div className="flex justify-between items-center">
                <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Tax (10%)</span>
                <span style={{ fontWeight: '500', fontSize: '16px' }}>{getCurrencySymbol(template.currency)}{invoiceData.tax.toFixed(2)}</span>
                        </div>
              <div 
                className="flex justify-between items-center pt-4"
                style={{ borderTop: `2px solid ${template.borderColor}` }}
              >
                <span style={{ fontWeight: '700', fontSize: '18px', color: template.primaryColor }}>Total Due</span>
                <span style={{ 
                  fontWeight: '800', 
                  fontSize: '24px', 
                  color: template.accentColor
                }}>
                  {getCurrencySymbol(template.currency)}{invoiceData.total.toFixed(2)}
                </span>
                            </div>
                          </div>
          </div>
        </div>

        {/* Footer */}
        {template.showNotes && invoiceData.notes && (
                          <div 
            className="p-4 rounded"
            style={{ backgroundColor: template.borderColor + '20' }}
                          >
            <div style={{ fontSize: '14px', color: template.secondaryColor }}>
              {invoiceData.notes}
                          </div>
                        </div>
        )}
      </div>
    )
  }

  // Notion-inspired Invoice Component
  const NotionInspiredInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
    return (
      <div style={baseStyles}>
        {/* Minimal Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-6">
            {template.showLogo && template.logoUrl && (
                              <img 
                                src={template.logoUrl} 
                alt="Logo" 
                              style={{ 
                  height: `${template.logoSize[0] * 0.8}px`,
                  borderRadius: `${template.logoBorderRadius[0]}px`,
                  opacity: 0.9
                }}
                className="object-contain"
              />
            )}
                            <div 
              className="text-xs font-medium px-3 py-1.5 rounded-full"
                              style={{ 
                backgroundColor: invoiceData.status === 'PAID' 
                  ? `${template.accentColor}20` 
                  : `${template.secondaryColor}20`,
                color: invoiceData.status === 'PAID' 
                  ? template.accentColor 
                  : template.secondaryColor,
                border: `1px solid ${invoiceData.status === 'PAID' ? template.accentColor : template.secondaryColor}30`
                              }}
                            >
              {invoiceData.status}
                            </div>
                            </div>

          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  marginBottom: '12px',
                  letterSpacing: '-0.02em'
                }}>
                  Invoice
                </h1>
                {template.showInvoiceNumber && (
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: template.secondaryColor,
                    backgroundColor: template.borderColor + '30',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    display: 'inline-block',
                  }}>
                    {invoiceData.number}
                          </div>
                )}
                        </div>
              {template.showDates && (
                <div className="text-right">
                  <div style={{ 
                    fontSize: '12px', 
                    color: template.secondaryColor, 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: '600'
                  }}>
                    Issue Date
                      </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: template.primaryColor }}>
                    {invoiceData.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: template.secondaryColor, 
                    marginTop: '8px',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: '600'
                  }}>
                    Due Date
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: template.primaryColor }}>
                    {invoiceData.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                            </div>
                          )}
            </div>
          </div>
        </div>

        {/* Info Blocks */}
        <div className="grid grid-cols-2 gap-4 mb-12">
                            <div 
            className="p-5 rounded-lg transition-all hover:shadow-sm"
                              style={{ 
              backgroundColor: template.backgroundColor,
              border: `1px solid ${template.borderColor}60`
            }}
          >
            <div style={{ 
              fontSize: '11px', 
              color: template.secondaryColor, 
              marginBottom: '12px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              From
                            </div>
            <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>{companyInfo.name}</div>
            <div style={{ fontSize: '14px', color: template.secondaryColor, lineHeight: '1.6' }}>
              {companyInfo.address}
                            </div>
            {companyInfo.email && (
              <div style={{ fontSize: '14px', color: template.secondaryColor, marginTop: '8px' }}>
                {companyInfo.email}<br />
                {companyInfo.phone}
                          </div>
            )}
            {template.showTaxId && companyInfo.taxId && (
              <div style={{ fontSize: '13px', color: template.secondaryColor, marginTop: '8px' }}>
                Tax ID: {companyInfo.taxId}
              </div>
            )}
                        </div>
                        
                            <div 
            className="p-5 rounded-lg transition-all hover:shadow-sm"
                              style={{ 
              backgroundColor: template.backgroundColor,
              border: `1px solid ${template.borderColor}60`
            }}
          >
            <div style={{ 
              fontSize: '11px', 
              color: template.secondaryColor, 
              marginBottom: '12px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Bill To
                            </div>
            <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>{invoiceData.client.name}</div>
            <div style={{ fontSize: '14px', color: template.secondaryColor, lineHeight: '1.6' }}>
              {invoiceData.client.address}
                          </div>
            {invoiceData.client.email && (
              <div style={{ fontSize: '14px', color: template.secondaryColor, marginTop: '8px' }}>
                {invoiceData.client.email}
                          </div>
            )}
                        </div>
                      </div>

        {/* Services Table */}
        <div className="mb-12">
          <div className="mb-6">
            <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.01em' }}>Services</h3>
                  </div>

          <div style={{ 
            border: `1px solid ${template.borderColor}`, 
            borderRadius: '12px', 
            overflow: 'hidden',
            backgroundColor: template.backgroundColor
          }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: template.borderColor + '20' }}>
                  <th className="text-left px-4 py-3" style={{ 
                    fontWeight: '600', 
                    fontSize: `${template.tableHeaderSize[0]}px`,
                    color: template.primaryColor
                  }}>Item</th>
                  <th className="text-center px-4 py-3" style={{ 
                    fontWeight: '600', 
                    fontSize: `${template.tableHeaderSize[0]}px`,
                    color: template.primaryColor
                  }}>Qty</th>
                  <th className="text-right px-4 py-3" style={{ 
                    fontWeight: '600', 
                    fontSize: `${template.tableHeaderSize[0]}px`,
                    color: template.primaryColor
                  }}>Rate</th>
                  <th className="text-right px-4 py-3" style={{ 
                    fontWeight: '600', 
                    fontSize: `${template.tableHeaderSize[0]}px`,
                    color: template.primaryColor
                  }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item: any, index: number) => (
                  <tr key={index} style={{ 
                    borderTop: index === 0 ? 'none' : `1px solid ${template.borderColor}60`,
                    transition: 'background-color 0.2s'
                  }} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div style={{ fontWeight: '500' }}>{item.description}</div>
                      {template.showItemDetails && item.details && (
                        <div style={{ color: template.secondaryColor, fontSize: '13px', marginTop: '4px', lineHeight: '1.5' }}>
                          {item.details}
                        </div>
                      )}
                    </td>
                    <td className="text-center px-4 py-4" style={{ fontWeight: '500' }}>{item.quantity}</td>
                    <td className="text-right px-4 py-4" style={{ fontWeight: '500' }}>{getCurrencySymbol(template.currency)}{item.rate.toFixed(2)}</td>
                    <td className="text-right px-4 py-4" style={{ fontWeight: '600', color: template.primaryColor }}>
                      {getCurrencySymbol(template.currency)}{item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                    </div>
        </div>

        {/* Total Section */}
        <div className="flex justify-end mb-12">
          <div className="w-72">
            <div style={{
              backgroundColor: template.borderColor + '10',
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${template.borderColor}40`
            }}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Subtotal</span>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>{getCurrencySymbol(template.currency)}{invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Tax (10%)</span>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>{getCurrencySymbol(template.currency)}{invoiceData.tax.toFixed(2)}</span>
                </div>
                      </div>
                      <div 
                className="flex justify-between items-center mt-4 pt-4"
                style={{ borderTop: `2px solid ${template.accentColor}30` }}
              >
                <span style={{ fontWeight: '700', fontSize: '16px', color: template.primaryColor }}>Total</span>
                <span style={{ fontWeight: '700', fontSize: '22px', color: template.accentColor }}>
                  {getCurrencySymbol(template.currency)}{invoiceData.total.toFixed(2)}
                </span>
                        </div>
                      </div>
                    </div>
                  </div>

        {/* Payment Info */}
        {(template.showPaymentTerms || template.showNotes) && (
                      <div 
            className="p-6 rounded-xl"
                        style={{ 
              backgroundColor: template.accentColor + '08',
              border: `1px solid ${template.accentColor}20`
                        }}
                      >
            {template.showPaymentTerms && (
              <div className="mb-4">
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '13px',
                  color: template.primaryColor,
                  marginBottom: '6px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase'
                }}>Payment Terms</div>
                <div style={{ fontSize: '14px', color: template.secondaryColor, lineHeight: '1.6' }}>
                  {invoiceData.paymentTerms}
                          </div>
                          </div>
            )}
            {template.showNotes && invoiceData.notes && (
                          <div>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '13px',
                  color: template.primaryColor,
                  marginBottom: '6px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase'
                }}>Notes</div>
                <div style={{ fontSize: '14px', color: template.secondaryColor, lineHeight: '1.6' }}>
                  {invoiceData.notes}
                          </div>
                          </div>
            )}
                        </div>
        )}
                      </div>
    )
  }

  // Reset functions for each style section
  const resetBranding = () => {
    setTemplate(prev => ({
      ...prev,
      logoUrl: settings.companyLogo || '',
      logoSize: [80],
      logoBorderRadius: [8]
    }))
  }

  const resetTypography = () => {
    setTemplate(prev => ({
      ...prev,
      fontFamily: 'inter',
      fontSize: [14],
      lineHeight: [1.6],
      tableHeaderSize: [13]
    }))
  }

  const resetLayout = () => {
    const templatePadding = {
      'stripe-inspired': [48],
      'contra-inspired': [64],
      'mercury-inspired': [40],
      'notion-inspired': [56]
    }
    
    const padding = templatePadding[template.templateId as keyof typeof templatePadding]
    if (padding) {
      setTemplate(prev => ({ ...prev, invoicePadding: padding }))
    }
  }

  const resetColors = () => {
    const templateStyles = {
      'stripe-inspired': {
        primaryColor: '#0A2540',
        secondaryColor: '#425466',
        accentColor: '#635BFF',
        borderColor: '#E6E6E6',
        backgroundColor: '#FFFFFF',
        invoicePadding: [48]
      },
      'contra-inspired': {
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#FF5A5F',
        borderColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
        invoicePadding: [64]
      },
      'mercury-inspired': {
        primaryColor: '#1A1A1A',
        secondaryColor: '#6B7280',
        accentColor: '#8B5CF6',
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        invoicePadding: [40]
      },
      'notion-inspired': {
        primaryColor: '#191919',
        secondaryColor: '#787774',
        accentColor: '#0084FF',
        borderColor: '#EDEDEC',
        backgroundColor: '#FFFFFF',
        invoicePadding: [56]
      }
    }

    const styles = templateStyles[template.templateId as keyof typeof templateStyles]
    if (styles) {
      setTemplate(prev => ({ ...prev, ...styles }))
    }
  }

  // Save template settings
  const saveTemplate = async () => {
    try {
      setSaving(true)
      
      // Save to localStorage for immediate use
      localStorage.setItem('invoice-template-settings', JSON.stringify(template))
      
      // Save to user settings for persistence across devices
      await updateSetting('invoiceTemplate', template)
      
      toast.success('Template saved successfully!', {
        description: 'Your invoice template has been saved to your account.'
      })
      
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template', {
        description: 'Please try again. Your changes were saved locally.'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Customize Invoice Template"
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Customize" }
        ]}
        action={
          <Button size="sm" onClick={saveTemplate} disabled={saving}>
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        }
      />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Template
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Style
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-6">
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Invoice Templates</CardTitle>
                    <CardDescription className="text-sm">Choose a design inspired by leading companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {invoiceTemplates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className={cn(
                            "group cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md",
                            template.templateId === tmpl.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-gray-200 hover:border-primary/50"
                          )}
                          onClick={() => setTemplate(prev => ({ ...prev, templateId: tmpl.id }))}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-sm">{tmpl.name}</h3>
                            {template.templateId === tmpl.id && (
                              <Badge variant="default" className="text-xs h-5">Active</Badge>
                      )}
                    </div>
                          <p className="text-xs text-muted-foreground mb-1">{tmpl.description}</p>
                          <div className="text-xs text-muted-foreground/70">{tmpl.preview}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Display Options</CardTitle>
                    <CardDescription className="text-sm">Choose what information to display</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-logo" className="text-sm font-normal cursor-pointer">Company Logo</Label>
                        <p className="text-xs text-muted-foreground">Display your company logo on invoices</p>
                        </div>
                      <Switch
                        id="show-logo"
                        checked={template.showLogo}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showLogo: checked }))}
                      />
                      </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-invoice-number" className="text-sm font-normal cursor-pointer">Invoice Number</Label>
                        <p className="text-xs text-muted-foreground">Show unique invoice identifier</p>
                              </div>
                      <Switch
                        id="show-invoice-number"
                        checked={template.showInvoiceNumber}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showInvoiceNumber: checked }))}
                      />
                            </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-dates" className="text-sm font-normal cursor-pointer">Invoice & Due Dates</Label>
                        <p className="text-xs text-muted-foreground">Display issue and payment due dates</p>
                          </div>
                      <Switch
                        id="show-dates"
                        checked={template.showDates}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showDates: checked }))}
                      />
                        </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-tax-id" className="text-sm font-normal cursor-pointer">Tax ID</Label>
                        <p className="text-xs text-muted-foreground">Show company tax identification number</p>
                              </div>
                      <Switch
                        id="show-tax-id"
                        checked={template.showTaxId}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showTaxId: checked }))}
                      />
                            </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-item-details" className="text-sm font-normal cursor-pointer">Item Details</Label>
                        <p className="text-xs text-muted-foreground">Show detailed descriptions for line items</p>
                          </div>
                      <Switch
                        id="show-item-details"
                        checked={template.showItemDetails}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showItemDetails: checked }))}
                      />
                        </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-payment-terms" className="text-sm font-normal cursor-pointer">Payment Terms</Label>
                        <p className="text-xs text-muted-foreground">Display payment terms and conditions</p>
                              </div>
                      <Switch
                        id="show-payment-terms"
                        checked={template.showPaymentTerms}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showPaymentTerms: checked }))}
                      />
                            </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-notes" className="text-sm font-normal cursor-pointer">Notes Section</Label>
                        <p className="text-xs text-muted-foreground">Include additional notes or messages</p>
                          </div>
                      <Switch
                        id="show-notes"
                        checked={template.showNotes}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showNotes: checked }))}
                      />
                        </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="style" className="space-y-6">
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Logo & Branding</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetBranding} className="h-8 px-2">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Logo Width</Label>
                        <span className="text-xs text-muted-foreground">{template.logoSize[0]}px</span>
                    </div>
                      <Slider
                        value={template.logoSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, logoSize: value }))}
                        min={40}
                        max={120}
                        step={10}
                        className="w-full"
                      />
                  </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Border Radius</Label>
                        <span className="text-xs text-muted-foreground">{template.logoBorderRadius[0]}px</span>
                          </div>
                      <Slider
                        value={template.logoBorderRadius}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, logoBorderRadius: value }))}
                        min={0}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                          </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Typography</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetTypography} className="h-8 px-2">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                            </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-normal">Font Family</Label>
                      <Select value={template.fontFamily} onValueChange={(value) => setTemplate(prev => ({ ...prev, fontFamily: value }))}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontFamilies.map((font) => (
                            <SelectItem key={font.id} value={font.id}>
                              <span style={{ fontFamily: font.name }}>{font.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({font.category})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                          </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Base Font Size</Label>
                        <span className="text-xs text-muted-foreground">{template.fontSize[0]}px</span>
                        </div>
                      <Slider
                        value={template.fontSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, fontSize: value }))}
                        min={12}
                        max={18}
                        step={1}
                        className="w-full"
                      />
                      </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Table Header Size</Label>
                        <span className="text-xs text-muted-foreground">{template.tableHeaderSize[0]}px</span>
                    </div>
                      <Slider
                        value={template.tableHeaderSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, tableHeaderSize: value }))}
                        min={11}
                        max={16}
                        step={1}
                        className="w-full"
                      />
                  </div>
                  
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Line Height</Label>
                        <span className="text-xs text-muted-foreground">{template.lineHeight[0]}</span>
                      </div>
                      <Slider
                        value={template.lineHeight}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, lineHeight: value }))}
                        min={1.2}
                        max={2}
                        step={0.1}
                        className="w-full"
                        />
                      </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Colors</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetColors} className="h-8 px-2">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-3">
                      <Label className="text-sm font-normal">Background Color</Label>
                      <div className="flex items-center gap-3">
                        {backgroundColorPresets.map((preset) => (
                          <div
                            key={preset.id}
                            onClick={() => setTemplate(prev => ({ ...prev, backgroundColor: preset.color }))}
                            className={cn(
                              "w-8 h-8 rounded-full cursor-pointer border-2 transition-all hover:scale-110",
                              template.backgroundColor === preset.color 
                                ? "border-primary ring-2 ring-primary/20" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            style={{ backgroundColor: preset.color }}
                            title={preset.id.charAt(0).toUpperCase() + preset.id.slice(1).replace('-', ' ')}
                          />
                        ))}
                          </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <Label className="text-xs text-muted-foreground">Custom:</Label>
                        <Input
                          type="color"
                          value={template.backgroundColor}
                          onChange={(e) => setTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <Input
                          value={template.backgroundColor}
                          onChange={(e) => setTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="h-8 font-mono text-xs"
                        />
                          </div>
                          </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-normal">Primary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.primaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-10 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={template.primaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="h-8 font-mono text-xs"
                          />
                          </div>
                        </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-normal">Secondary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.secondaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-10 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={template.secondaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="h-8 font-mono text-xs"
                          />
                      </div>
                    </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-normal">Accent Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.accentColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="w-10 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={template.accentColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="h-8 font-mono text-xs"
                        />
                      </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-normal">Border Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.borderColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, borderColor: e.target.value }))}
                            className="w-10 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={template.borderColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, borderColor: e.target.value }))}
                            className="h-8 font-mono text-xs"
                          />
                    </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Layout</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetLayout} className="h-8 px-2">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Invoice Padding</Label>
                        <span className="text-xs text-muted-foreground">{template.invoicePadding[0]}px</span>
                  </div>
                      <Slider
                        value={template.invoicePadding}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, invoicePadding: value }))}
                        min={24}
                        max={80}
                        step={4}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
                  </div>

          <div className="lg:col-span-3">
            <Card className="sticky top-6 border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                <CardDescription className="text-sm">See your invoice design in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  {renderInvoice()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  )
}