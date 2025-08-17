'use client'

import React from 'react'
import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getDefaultCurrency, getCurrencySymbol, formatPhoneNumber } from '@/lib/currency'
import { FloppyDiskIcon, ColorPickerIcon, Settings01Icon, RotateLeftIcon, WebDesign01Icon, PaintBoardIcon, LayoutGridIcon, ReloadIcon, Loading03Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { PageHeader, PageContent } from '@/components/page-header'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/settings-provider'
import { InvoiceCustomizationGate } from '@/components/gates/pro-feature-gate'

interface InvoiceTemplate {
  id: string
  name: string
  description: string
}

const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimal colors, timeless'
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Bold typo, creative layout'
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Corporate clean, structured'
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Minimal, functional, modern'
  },
  {
    id: 'edge',
    name: 'Edge',
    description: 'Ultra-modern and spacious'
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
  const { settings, isLoading, updateSetting, formatDate } = useSettings()
  const [activeTab, setActiveTab] = useState('template')
  const [saving, setSaving] = useState(false)
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false)
  const fontTriggerRef = React.useRef<HTMLButtonElement>(null)
  const [template, setTemplate] = useState({
    templateId: 'modern',
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

    // First try to load from settings (account-level)
    if (settings.invoiceTemplate && Object.keys(settings.invoiceTemplate).length > 0) {
      console.log('✅ Loading template from Supabase:', settings.invoiceTemplate.templateId)
      const migratedTemplate = {
        ...settings.invoiceTemplate,
        templateId: migrateTemplateId(settings.invoiceTemplate.templateId)
      }
      setTemplate(prev => ({
        ...prev,
        ...migratedTemplate
      }))
    } else {
      // Fallback to localStorage if no account template exists
      const savedTemplate = localStorage.getItem('invoice-template-settings')
      if (savedTemplate) {
        try {
          const parsed = JSON.parse(savedTemplate)
          console.log('✅ Loading template from localStorage:', parsed.templateId)
          const migratedTemplate = {
            ...parsed,
            templateId: migrateTemplateId(parsed.templateId)
          }
          setTemplate(prev => ({
            ...prev,
            ...migratedTemplate
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
      email: settings.companyEmail || companyInfo.email,
      phone: settings.companyPhone || companyInfo.phone,
      address: settings.companyAddress || companyInfo.address,
      website: settings.companyWebsite || companyInfo.website,
      taxId: settings.companyRegistration || settings.taxId || companyInfo.taxId
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
  }, [settings.companyName, settings.companyEmail, settings.companyPhone, settings.companyAddress, settings.companyWebsite, settings.companyRegistration, settings.taxId])

  const invoiceData = {
    number: 'INV-2024-001',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'PENDING',
    client: {
      name: 'Client Company Inc.',
      email: 'contact@company.com',
      address: '456 Client Avenue\nNew York, NY 10001',
      taxId: 'TAX-987654321'
    },
    items: [
      {
        item_name: 'Professional Services',
        item_description: 'Website development and design',
        quantity: 1,
        rate: 5000,
        amount: 5000
      },
      {
        item_name: 'Consulting',
        item_description: 'Technical architecture consultation',
        quantity: 10,
        rate: 150,
        amount: 1500
      },
      {
        item_name: 'Support & Maintenance',
        item_description: 'Monthly support package',
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

  // Function to apply default template styles when user selects a new template
  const applyDefaultTemplateStyles = (templateId: string) => {
    const templateStyles = {
      'modern': {
        primaryColor: '#0A2540',
        secondaryColor: '#425466',
        accentColor: '#635BFF',
        borderColor: '#E6E6E6',
        fontFamily: 'inter',
        invoicePadding: [48]
      },
      'bold': {
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#FF5A5F',
        borderColor: '#F0F0F0',
        fontFamily: 'helvetica',
        invoicePadding: [64]
      },
      'classic': {
        primaryColor: '#1A1A1A',
        secondaryColor: '#6B7280',
        accentColor: '#8B5CF6',
        borderColor: '#E5E7EB',
        fontFamily: 'arial',
        invoicePadding: [40]
      },
      'slate': {
        primaryColor: '#191919',
        secondaryColor: '#787774',
        accentColor: '#0084FF',
        borderColor: '#EDEDEC',
        fontFamily: 'inter',
        invoicePadding: [56]
      },
      'edge': {
        primaryColor: '#111827',
        secondaryColor: '#6B7280',
        accentColor: '#000000',
        borderColor: '#D1D5DB',
        fontFamily: 'inter',
        invoicePadding: [32]
      }
    }

    const styles = templateStyles[templateId as keyof typeof templateStyles]
    if (styles) {
      setTemplate(prev => ({ ...prev, templateId, ...styles }))
    }
  }

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
      case 'modern':
        return <ModernInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'bold':
        return <BoldInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'classic':
        return <ClassicInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'slate':
        return <SlateInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      case 'edge':
        return <EdgeInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
      default:
        return <ModernInvoice {...{ template, companyInfo, invoiceData, baseStyles }} />
    }
  }

  // Modern Invoice Component
  const ModernInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
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
                  <span style={{ fontWeight: '500' }}>{formatDate(invoiceData.date)}</span>
                            </div>
                <div>
                  <span style={{ color: template.secondaryColor, fontSize: '14px' }}>Due Date: </span>
                  <span style={{ fontWeight: '500' }}>{formatDate(invoiceData.dueDate)}</span>
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
              <span style={{ fontWeight: '600', fontSize: '18px', color: template.accentColor }}>
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

  // Bold Invoice Component
  const BoldInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
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
                  <div style={{ fontWeight: '600' }}>{formatDate(invoiceData.date)}</div>
                          </div>
                <div>
                  <div style={{ color: template.secondaryColor, marginBottom: '4px' }}>Due Date</div>
                  <div style={{ fontWeight: '600' }}>{formatDate(invoiceData.dueDate)}</div>
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

  // Classic Invoice Component
  const ClassicInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
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
                  {companyInfo.email} • {formatPhoneNumber(companyInfo.phone)}
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
                {formatPhoneNumber(companyInfo.phone)}
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
                  <span style={{ fontWeight: '500' }}>{formatDate(invoiceData.date)}</span>
                </div>
                <div>
                  <span style={{ color: template.secondaryColor }}>Due: </span>
                  <span style={{ fontWeight: '500' }}>{formatDate(invoiceData.dueDate)}</span>
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

  // Slate Invoice Component
  const SlateInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
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
                    {formatDate(invoiceData.date)}
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
                    {formatDate(invoiceData.dueDate)}
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
                {formatPhoneNumber(companyInfo.phone)}
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
                  }} className="hover:bg-muted/50">
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

  // Edge Invoice Component
  const EdgeInvoice = ({ template, companyInfo, invoiceData, baseStyles }: any) => {
    return (
      <div style={baseStyles}>
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <h1 style={{ 
            fontSize: '5rem', 
            fontWeight: '300', 
            color: template.primaryColor,
            lineHeight: '1',
            margin: '0'
          }}>Invoice</h1>
          <div className="flex items-center gap-3">
            {template.showLogo && template.logoUrl && (
              <img 
                src={template.logoUrl} 
                alt="Company Logo" 
                style={{
                  height: `${template.logoSize[0]}px`, 
                  borderRadius: `${template.logoBorderRadius[0]}px`
                }}
                className="object-contain"
              />
            )}
          </div>
        </div>

        {/* From, To, Details Section */}
        <div className="grid grid-cols-3 gap-12 mb-16">
          {/* From */}
          <div>
            <h3 style={{ 
              color: template.secondaryColor, 
              fontWeight: '500', 
              marginBottom: '24px', 
              paddingBottom: '8px', 
              borderBottom: `1px solid ${template.borderColor}`,
              fontSize: '16px'
            }}>From</h3>
            <div className="space-y-1">
              <div style={{ fontWeight: '500', color: template.primaryColor }}>{companyInfo.name}</div>
              <div style={{ color: template.secondaryColor }}>{companyInfo.email}</div>
              <div style={{ color: template.secondaryColor, marginTop: '16px', whiteSpace: 'pre-line' }}>
                {companyInfo.address}
              </div>
              {companyInfo.phone && (
                <div style={{ color: template.secondaryColor }}>{formatPhoneNumber(companyInfo.phone)}</div>
              )}
              {template.showTaxId && companyInfo.taxId && (
                <div style={{ color: template.secondaryColor, marginTop: '8px' }}>
                  Tax ID: {companyInfo.taxId}
                </div>
              )}
            </div>
          </div>

          {/* To */}
          <div>
            <h3 style={{ 
              color: template.secondaryColor, 
              fontWeight: '500', 
              marginBottom: '24px', 
              paddingBottom: '8px', 
              borderBottom: `1px solid ${template.borderColor}`,
              fontSize: '16px'
            }}>To</h3>
            <div className="space-y-1">
              <div style={{ fontWeight: '500', color: template.primaryColor }}>{invoiceData.client.name}</div>
              <div style={{ color: template.secondaryColor }}>{invoiceData.client.email}</div>
              <div style={{ color: template.secondaryColor, marginTop: '16px', whiteSpace: 'pre-line' }}>
                {invoiceData.client.address}
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <h3 style={{ 
              color: template.secondaryColor, 
              fontWeight: '500', 
              marginBottom: '24px', 
              paddingBottom: '8px', 
              borderBottom: `1px solid ${template.borderColor}`,
              fontSize: '16px'
            }}>Details</h3>
            <div className="space-y-2">
              {template.showInvoiceNumber && (
                <div className="flex justify-between">
                  <span style={{ color: template.secondaryColor }}>No:</span>
                  <span style={{ color: template.primaryColor, fontWeight: '500' }}>{invoiceData.number}</span>
                </div>
              )}
              {template.showDates && (
                <>
                  <div className="flex justify-between">
                    <span style={{ color: template.secondaryColor }}>Issue date</span>
                    <span style={{ color: template.primaryColor, fontWeight: '500' }}>{formatDate(invoiceData.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: template.secondaryColor }}>Due date</span>
                    <span style={{ color: template.primaryColor, fontWeight: '500' }}>{formatDate(invoiceData.dueDate)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-16">
          <div style={{ borderBottom: `1px solid ${template.borderColor}`, paddingBottom: '16px' }}>
            <div className="grid grid-cols-3 gap-8">
              <div style={{ color: template.secondaryColor, fontWeight: '500' }}>Line items</div>
              <div style={{ color: template.secondaryColor, fontWeight: '500', textAlign: 'center' }}>Quantity</div>
              <div style={{ color: template.secondaryColor, fontWeight: '500', textAlign: 'right' }}>Amount</div>
            </div>
          </div>
          
          <div>
            {invoiceData.items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-3 gap-8 items-center py-3" style={{ 
                borderBottom: `1px solid ${template.borderColor}40`
              }}>
                <div>
                  <div style={{ color: template.primaryColor, fontWeight: '500' }}>{item.item_name || item.description}</div>
                  {template.showItemDetails && (item.item_description || item.details) && (
                    <div style={{ color: template.secondaryColor, fontSize: '14px', marginTop: '4px' }}>
                      {item.item_description || item.details}
                    </div>
                  )}
                </div>
                <div style={{ color: template.primaryColor, textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ color: template.primaryColor, textAlign: 'right', fontWeight: '500' }}>
                  {getCurrencySymbol(template.currency)}{item.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-12 pt-6" style={{ borderTop: `1px solid ${template.borderColor}` }}>
            <div className="grid grid-cols-3 gap-8">
              <div></div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '500', 
                color: template.primaryColor, 
                textAlign: 'center' 
              }}>Total</div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: template.primaryColor, 
                textAlign: 'right' 
              }}>
                {getCurrencySymbol(template.currency)}{invoiceData.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Notes */}
        {(template.showPaymentTerms || template.showNotes) && (
          <div className="grid grid-cols-2 gap-16 pt-8" style={{ borderTop: `1px solid ${template.borderColor}` }}>
            {/* Terms */}
            {template.showPaymentTerms && (
              <div>
                <h3 style={{ 
                  color: template.secondaryColor, 
                  fontWeight: '500', 
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>Terms</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: template.secondaryColor }}>Payment Terms</span>
                    <span style={{ color: template.primaryColor }}>{invoiceData.paymentTerms}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {template.showNotes && invoiceData.notes && (
              <div>
                <h3 style={{ 
                  color: template.secondaryColor, 
                  fontWeight: '500', 
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>Notes</h3>
                <div style={{ color: template.primaryColor }}>
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
      'modern': [48],
      'bold': [64],
      'classic': [40],
      'slate': [56],
      'edge': [32]
    }
    
    const padding = templatePadding[template.templateId as keyof typeof templatePadding]
    if (padding) {
      setTemplate(prev => ({ ...prev, invoicePadding: padding }))
    }
  }

  const resetColors = () => {
    const templateStyles = {
      'modern': {
        primaryColor: '#0A2540',
        secondaryColor: '#425466',
        accentColor: '#635BFF',
        borderColor: '#E6E6E6',
        backgroundColor: '#FFFFFF',
        invoicePadding: [48]
      },
      'bold': {
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#FF5A5F',
        borderColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
        invoicePadding: [64]
      },
      'classic': {
        primaryColor: '#1A1A1A',
        secondaryColor: '#6B7280',
        accentColor: '#8B5CF6',
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        invoicePadding: [40]
      },
      'slate': {
        primaryColor: '#191919',
        secondaryColor: '#787774',
        accentColor: '#0084FF',
        borderColor: '#EDEDEC',
        backgroundColor: '#FFFFFF',
        invoicePadding: [56]
      },
      'edge': {
        primaryColor: '#111827',
        secondaryColor: '#6B7280',
        accentColor: '#000000',
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        invoicePadding: [32]
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
      console.error('❌ Error saving template:', error)
      toast.error('Failed to save template', {
        description: 'Please try again. Your changes were saved locally.'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <InvoiceCustomizationGate>
      <PageHeader
        title="Customize Invoice Template"
        action={
          <Button size="sm" onClick={saveTemplate} disabled={saving}>
            {saving ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-4 w-4"  />
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
                  <HugeiconsIcon icon={LayoutGridIcon} className="h-4 w-4"  />
                  Template
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-2">
                  <HugeiconsIcon icon={PaintBoardIcon} className="h-4 w-4"  />
                  Style
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Invoice Templates</CardTitle>
                    <CardDescription className="text-sm">Choose a design inspired by leading companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={template.templateId} 
                      onValueChange={(value) => applyDefaultTemplateStyles(value)}
                      className="grid grid-cols-2 gap-3"
                    >
                      {invoiceTemplates.map((tmpl) => (
                        <div key={tmpl.id} className="relative">
                          <RadioGroupItem
                            value={tmpl.id}
                            id={tmpl.id}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={tmpl.id}
                            className={cn(
                              "block cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md hover:border-primary/50 relative",
                              template.templateId === tmpl.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border"
                            )}
                          >
                            {/* Radio button at top-left */}
                            <div className="flex items-start gap-3">
                              <div 
                                className={cn(
                                  "h-4 w-4 rounded-full border-2 transition-all flex-shrink-0 mt-0.5",
                                  template.templateId === tmpl.id
                                    ? "border-primary bg-primary"
                                    : "border-input bg-transparent"
                                )}
                              >
                                {template.templateId === tmpl.id && (
                                  <div className="h-full w-full rounded-full bg-white scale-50 transform" />
                                )}
                              </div>
                              
                              {/* Title and description stacked vertically */}
                              <div className="flex flex-col space-y-1">
                                <h3 className="font-medium text-sm">{tmpl.name}</h3>
                                <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Display Options</CardTitle>
                    <CardDescription className="text-sm">Choose what information to display</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
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

                    <div className="flex items-center justify-between py-3 border-b border-border">
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

                    <div className="flex items-center justify-between py-3 border-b border-border">
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

                    <div className="flex items-center justify-between py-3 border-b border-border">
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

                    <div className="flex items-center justify-between py-3 border-b border-border">
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

                    <div className="flex items-center justify-between py-3 border-b border-border">
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
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Logo & Branding</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetBranding} className="h-8 px-2">
                        <HugeiconsIcon icon={ReloadIcon} className="h-3 w-3"  />
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

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Typography</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetTypography} className="h-8 px-2">
                        <HugeiconsIcon icon={ReloadIcon} className="h-3 w-3"  />
                      </Button>
                            </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-normal">Font Family</Label>
                      <Popover open={fontDropdownOpen} onOpenChange={setFontDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            ref={fontTriggerRef}
                            variant="outline"
                            role="combobox"
                            aria-expanded={fontDropdownOpen}
                            className="h-9 w-full justify-between font-normal"
                          >
                            {template.fontFamily
                              ? (() => {
                                  const selectedFont = fontFamilies.find(font => font.id === template.fontFamily)
                                  return (
                                    <span className="flex items-center">
                                      <span style={{ fontFamily: selectedFont?.name }}>{selectedFont?.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">({selectedFont?.category})</span>
                                    </span>
                                  )
                                })()
                              : "Select font..."}
                            <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="p-0" 
                          style={{ width: fontTriggerRef.current?.offsetWidth }}
                        >
                          <Command>
                            <CommandInput placeholder="Search fonts..." />
                            <CommandEmpty>No font found.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {fontFamilies.map((font) => (
                                  <CommandItem
                                    key={font.id}
                                    value={`${font.name} ${font.category}`}
                                    onSelect={() => {
                                      setTemplate(prev => ({ ...prev, fontFamily: font.id }))
                                      setFontDropdownOpen(false)
                                    }}
                                  >
                                    <svg 
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        template.fontFamily === font.id ? "opacity-100" : "opacity-0"
                                      )}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <div className="flex items-center">
                                      <span style={{ fontFamily: font.name }}>{font.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">({font.category})</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Colors</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetColors} className="h-8 px-2">
                        <HugeiconsIcon icon={ReloadIcon} className="h-3 w-3"  />
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
                                : "border-border hover:border-muted-foreground"
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

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Layout</CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetLayout} className="h-8 px-2">
                        <HugeiconsIcon icon={ReloadIcon} className="h-3 w-3"  />
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
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                <CardDescription className="text-sm">See your invoice design in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background border rounded-lg shadow-sm overflow-hidden">
                  {renderInvoice()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </InvoiceCustomizationGate>
  )
}