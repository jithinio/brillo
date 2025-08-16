"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft01Icon, Upload03Icon, FileDownloadIcon, Tick01Icon, AlertCircleIcon, DocumentAttachmentIcon, Group01Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PageHeader, PageContent } from "@/components/page-header"
import { toast } from "sonner"

interface CsvData {
  headers: string[]
  rows: string[][]
}

interface FieldMapping {
  csvField: string
  dbField: string
  mapped: boolean
}

interface ClientData {
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
}

const INVOICE_FIELDS = [
  { key: 'invoice_number', label: 'Invoice Number', required: false },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'tax_amount', label: 'Tax Amount', required: false },
  { key: 'total_amount', label: 'Total Amount', required: false },
  { key: 'currency', label: 'Currency', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'issue_date', label: 'Issue Date', required: false },
  { key: 'due_date', label: 'Due Date', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'terms', label: 'Payment Terms', required: false },
]

const CLIENT_FIELDS = [
  { key: 'client_name', label: 'Client Name', required: false },
  { key: 'client_company', label: 'Client Company', required: false },
  { key: 'client_email', label: 'Client Email', required: false },
  { key: 'client_phone', label: 'Client Phone', required: false },
  { key: 'client_address', label: 'Client Address', required: false },
  { key: 'client_city', label: 'Client City', required: false },
  { key: 'client_state', label: 'Client State', required: false },
  { key: 'client_zip_code', label: 'Client ZIP Code', required: false },
  { key: 'client_country', label: 'Client Country', required: false },
]

const SAMPLE_CSV = `invoice_number,amount,tax_amount,total_amount,currency,status,issue_date,due_date,client_name,client_company,client_email,client_phone,notes,terms
INV-2024-001,2500,250,2750,USD,paid,2024-01-15,2024-02-15,John Smith,Acme Corp,john@acme.com,+1234567890,Thank you for your business,Net 30
INV-2024-002,1500,150,1650,EUR,sent,2024-01-20,2024-02-20,Sarah Johnson,Tech Solutions,sarah@tech.com,+1987654321,Monthly retainer,Net 15
INV-2024-003,3200,320,3520,USD,draft,2024-02-01,2024-03-01,Mike Brown,Global LLC,mike@global.com,+1555666777,Website development,Net 30`

export default function InvoiceImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'client-confirm' | 'importing' | 'complete'>('upload')
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [clientMappings, setClientMappings] = useState<FieldMapping[]>([])
  const [hasClientData, setHasClientData] = useState(false)
  const [importClients, setImportClients] = useState(false)
  const [detectedClients, setDetectedClients] = useState<ClientData[]>([])
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ 
    invoices: { success: number; errors: number; total: number }
    clients: { success: number; errors: number; total: number }
  }>({ 
    invoices: { success: 0, errors: 0, total: 0 },
    clients: { success: 0, errors: 0, total: 0 }
  })
  const [errors, setErrors] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCsv(text)
    }
    reader.readAsText(file)
  }

  const parseCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      toast.error('CSV file must contain at least a header row and one data row')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    )

    setCsvData({ headers, rows })
    
    // Auto-map invoice fields
    const invoiceMappings: FieldMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      let dbField = ''
      let mapped = false

      // Try to find matching invoice field
      for (const field of INVOICE_FIELDS) {
        const normalizedField = field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        if (normalizedHeader === normalizedField || 
            normalizedHeader === normalizedLabel ||
            normalizedHeader.includes(normalizedField) ||
            normalizedField.includes(normalizedHeader)) {
          dbField = field.key
          mapped = true
          break
        }
      }

      return {
        csvField: header,
        dbField,
        mapped
      }
    })

    // Auto-map client fields
    const clientMappingResults: FieldMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      let dbField = ''
      let mapped = false

      // Try to find matching client field
      for (const field of CLIENT_FIELDS) {
        const normalizedField = field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        if (normalizedHeader === normalizedField || 
            normalizedHeader === normalizedLabel ||
            normalizedHeader.includes(normalizedField) ||
            normalizedField.includes(normalizedHeader)) {
          dbField = field.key
          mapped = true
          break
        }
      }

      return {
        csvField: header,
        dbField,
        mapped
      }
    })

    // Check if we have client data
    const hasClientFields = clientMappingResults.some(m => m.mapped)
    setHasClientData(hasClientFields)
    
    setFieldMappings(invoiceMappings)
    setClientMappings(clientMappingResults)
    setStep('mapping')
    toast.success(`CSV parsed successfully! Found ${rows.length} records${hasClientFields ? ' with client data' : ''}`)
  }

  const handleFieldMapping = (csvField: string, dbField: string, isClient: boolean = false) => {
    if (isClient) {
      setClientMappings(prev => prev.map(mapping => 
        mapping.csvField === csvField 
          ? { ...mapping, dbField: dbField === 'none' ? '' : dbField, mapped: dbField !== 'none' && dbField !== '' }
          : mapping
      ))
    } else {
      setFieldMappings(prev => prev.map(mapping => 
        mapping.csvField === csvField 
          ? { ...mapping, dbField: dbField === 'none' ? '' : dbField, mapped: dbField !== 'none' && dbField !== '' }
          : mapping
      ))
    }
  }

  const validateMappings = () => {
    const amountField = fieldMappings.find(m => m.dbField === 'amount')
    if (!amountField || !amountField.mapped) {
      toast.error('Amount field must be mapped')
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateMappings() || !csvData) return

    if (hasClientData) {
      // Extract client data for preview
      const mappedClientFields = clientMappings.filter(m => m.mapped)
      const clients: ClientData[] = []
      
      csvData.rows.forEach(row => {
        const client: ClientData = { name: '' }
        
        mappedClientFields.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvField)
          if (csvIndex !== -1) {
            const value = row[csvIndex] || ''
            if (mapping.dbField === 'client_name') {
              client.name = value
            } else if (mapping.dbField === 'client_company') {
              client.company = value
            } else if (mapping.dbField === 'client_email') {
              client.email = value
            } else if (mapping.dbField === 'client_phone') {
              client.phone = value
            } else if (mapping.dbField === 'client_address') {
              client.address = value
            } else if (mapping.dbField === 'client_city') {
              client.city = value
            } else if (mapping.dbField === 'client_state') {
              client.state = value
            } else if (mapping.dbField === 'client_zip_code') {
              client.zip_code = value
            } else if (mapping.dbField === 'client_country') {
              client.country = value
            }
          }
        })
        
        if (client.name) {
          clients.push(client)
        }
      })
      
      setDetectedClients(clients)
      setStep('client-confirm')
    } else {
      handleImport()
    }
  }

  const handleImport = async () => {
    if (!validateMappings() || !csvData) return

    setStep('importing')
    setProgress(0)
    setErrors([])

    const mappedInvoiceFields = fieldMappings.filter(m => m.mapped)
    const mappedClientFields = clientMappings.filter(m => m.mapped)
    const totalRows = csvData.rows.length
    
    let invoiceSuccess = 0
    let invoiceErrors = 0
    let clientSuccess = 0
    let clientErrors = 0
    const errorList: string[] = []

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      
      try {
        // Import client first if needed
        if (importClients && hasClientData) {
          const clientData: any = {}
          
          mappedClientFields.forEach(mapping => {
            const csvIndex = csvData.headers.indexOf(mapping.csvField)
            if (csvIndex !== -1) {
              const value = row[csvIndex] || null
              if (mapping.dbField === 'client_name') {
                clientData.name = value
              } else if (mapping.dbField === 'client_company') {
                clientData.company = value
              } else if (mapping.dbField === 'client_email') {
                clientData.email = value
              } else if (mapping.dbField === 'client_phone') {
                clientData.phone = value
              } else if (mapping.dbField === 'client_address') {
                clientData.address = value
              } else if (mapping.dbField === 'client_city') {
                clientData.city = value
              } else if (mapping.dbField === 'client_state') {
                clientData.state = value
              } else if (mapping.dbField === 'client_zip_code') {
                clientData.zip_code = value
              } else if (mapping.dbField === 'client_country') {
                clientData.country = value
              }
            }
          })

          if (clientData.name) {
            // Simulate client import
            await new Promise(resolve => setTimeout(resolve, 50))
            clientSuccess++
          }
        }

        // Import invoice
        const invoiceData: any = {}
        
        mappedInvoiceFields.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvField)
          if (csvIndex !== -1) {
            let value = row[csvIndex] || null
            
            // Handle special field types
            if (mapping.dbField === 'amount' || mapping.dbField === 'tax_amount' || mapping.dbField === 'total_amount') {
              value = value ? parseFloat(value) : 0
            } else if (mapping.dbField === 'issue_date' || mapping.dbField === 'due_date') {
              // Keep as string, real app would parse date
              value = value || null
            } else if (mapping.dbField === 'status') {
              // Validate status values
              const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
              if (value && !validStatuses.includes(value.toLowerCase())) {
                value = 'draft' // Default to draft if invalid status
              }
            }
            
            invoiceData[mapping.dbField] = value
          }
        })

        // Validate required fields
        if (!invoiceData.amount || invoiceData.amount <= 0) {
          throw new Error('Amount must be greater than 0')
        }

        // Auto-generate invoice number if not provided
        if (!invoiceData.invoice_number) {
          invoiceData.invoice_number = `INV-${Date.now()}-${i + 1}`
        }

        // Calculate total amount if not provided
        if (!invoiceData.total_amount) {
          invoiceData.total_amount = (invoiceData.amount || 0) + (invoiceData.tax_amount || 0)
        }

        // Set default currency if not provided
        if (!invoiceData.currency) {
          invoiceData.currency = 'USD'
        }

        // Set default status if not provided
        if (!invoiceData.status) {
          invoiceData.status = 'draft'
        }

        // Simulate invoice import
        await new Promise(resolve => setTimeout(resolve, 100))
        invoiceSuccess++
        
      } catch (error) {
        invoiceErrors++
        errorList.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100))
    }

    setImportResults({
      invoices: { success: invoiceSuccess, errors: invoiceErrors, total: totalRows },
      clients: { success: clientSuccess, errors: clientErrors, total: importClients ? detectedClients.length : 0 }
    })
    setErrors(errorList)
    setStep('complete')
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoice-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push('/dashboard/invoices')
  }

  const handleStartOver = () => {
    setStep('upload')
    setCsvData(null)
    setFieldMappings([])
    setClientMappings([])
    setHasClientData(false)
    setImportClients(false)
    setDetectedClients([])
    setProgress(0)
    setImportResults({ 
      invoices: { success: 0, errors: 0, total: 0 },
      clients: { success: 0, errors: 0, total: 0 }
    })
    setErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <PageHeader
        title="Import Invoices"
        action={
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4"  />
            Back to Invoices
          </Button>
        }
      />
      
      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-muted border-2 border-border'}`}>
                  {step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4"  /> : '1'}
                </div>
                <span className="font-medium">Upload</span>
              </div>
              
              <div className={`w-8 h-0.5 ${step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-border'}`} />
              
              <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-100 border-2 border-blue-600' : step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-muted border-2 border-border'}`}>
                  {step === 'client-confirm' || step === 'importing' || step === 'complete' ? <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4"  /> : '2'}
                </div>
                <span className="font-medium">Map Fields</span>
              </div>
              
              <div className={`w-8 h-0.5 ${step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-border'}`} />
              
              <div className={`flex items-center gap-2 ${step === 'importing' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'importing' ? 'bg-blue-100 border-2 border-blue-600' : step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-muted border-2 border-border'}`}>
                  {step === 'complete' ? <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4"  /> : step === 'importing' ? <Loader size="sm" variant="primary" /> : '3'}
                </div>
                <span className="font-medium">Import</span>
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {step === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file containing your invoice data. Include client information if you want to import clients as well.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <HugeiconsIcon icon={Upload03Icon} className="mx-auto h-12 w-12 text-muted-foreground mb-4"  />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Click to select a CSV file or drag and drop
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={DocumentAttachmentIcon} className="h-4 w-4 text-muted-foreground"  />
                    <span className="text-sm text-muted-foreground">Need a sample file?</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadSample}>
                    <HugeiconsIcon icon={FileDownloadIcon} className="mr-2 h-4 w-4"  />
                    Download Sample
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && csvData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HugeiconsIcon icon={Document01Icon} className="h-5 w-5"  />
                    Map Invoice Fields
                  </CardTitle>
                  <CardDescription>
                    Map your CSV columns to the corresponding invoice fields. Required fields are marked with an asterisk.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {fieldMappings.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">{mapping.csvField}</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sample: {csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvField)] || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <Select
                            value={mapping.dbField}
                            onValueChange={(value) => handleFieldMapping(mapping.csvField, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Don't import</SelectItem>
                              {INVOICE_FIELDS.map(field => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label} {field.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-20">
                          {mapping.mapped ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Unmapped
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {hasClientData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HugeiconsIcon icon={Group01Icon} className="h-5 w-5"  />
                      Client Fields (Optional)
                    </CardTitle>
                    <CardDescription>
                      We detected client information in your CSV. Map these fields if you want to import clients as well.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      {clientMappings.filter(m => m.mapped || clientMappings.some(cm => cm.csvField === m.csvField)).map((mapping, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">{mapping.csvField}</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Sample: {csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvField)] || 'N/A'}
                            </p>
                          </div>
                          <div className="flex-1">
                            <Select
                              value={mapping.dbField}
                              onValueChange={(value) => handleFieldMapping(mapping.csvField, value, true)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Don't import</SelectItem>
                                {CLIENT_FIELDS.map(field => (
                                  <SelectItem key={field.key} value={field.key}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20">
                            {mapping.mapped ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                Mapped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unmapped
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleStartOver}>
                  Start Over
                </Button>
                <Button onClick={handleNext}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Client Confirmation Step */}
          {step === 'client-confirm' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={Group01Icon} className="h-5 w-5"  />
                  Import Clients?
                </CardTitle>
                <CardDescription>
                  We found {detectedClients.length} client records in your CSV. Would you like to import them as well?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-clients"
                    checked={importClients}
                    onCheckedChange={(checked) => setImportClients(checked === true)}
                  />
                  <Label htmlFor="import-clients" className="text-sm font-medium">
                    Yes, import client information to the clients database
                  </Label>
                </div>

                {detectedClients.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Client Preview:</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                      {detectedClients.slice(0, 5).map((client, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm">{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.company}</span>
                        </div>
                      ))}
                      {detectedClients.length > 5 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          + {detectedClients.length - 5} more clients
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    Back
                  </Button>
                  <Button onClick={handleImport}>
                    Import Invoices {importClients && `& ${detectedClients.length} Clients`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <Card>
              <CardHeader>
                <CardTitle>Importing Invoices</CardTitle>
                <CardDescription>
                  Please wait while we import your invoices{importClients ? ' and clients' : ''}...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={Tick01Icon} className="h-5 w-5 text-green-600"  />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Your import has been completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Invoices</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{importResults.invoices.success}</div>
                        <div className="text-sm text-green-600">Successful</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{importResults.invoices.errors}</div>
                        <div className="text-sm text-red-600">Errors</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-muted-foreground">{importResults.invoices.total}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </div>

                  {importClients && (
                    <div>
                      <h4 className="font-medium mb-2">Clients</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{importResults.clients.success}</div>
                          <div className="text-sm text-green-600">Successful</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{importResults.clients.errors}</div>
                          <div className="text-sm text-red-600">Errors</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-muted-foreground">{importResults.clients.total}</div>
                          <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {errors.length > 0 && (
                  <Alert>
                    <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4"  />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Import Errors:</p>
                        {errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm">{error}</p>
                        ))}
                        {errors.length > 5 && (
                          <p className="text-sm text-muted-foreground">+ {errors.length - 5} more errors</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleStartOver}>
                    Import More
                  </Button>
                  <Button onClick={handleBack}>
                    View Invoices
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </>
  )
} 