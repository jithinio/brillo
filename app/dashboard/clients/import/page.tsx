"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileText } from "lucide-react"
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
import { PageHeader, PageContent } from "@/components/page-header"
import { validateCSVFile } from "@/lib/input-validation"
import { toast } from "sonner"
import { useSubscription } from "@/components/providers/subscription-provider"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface CsvData {
  headers: string[]
  rows: string[][]
}

interface FieldMapping {
  csvField: string
  dbField: string
  mapped: boolean
}

const CLIENT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'zip_code', label: 'Zip Code', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

const SAMPLE_CSV = `name,email,phone,company,address,city,state,zip_code,country,notes
John Smith,john@example.com,+1 (555) 123-4567,Acme Corp,123 Main St,New York,NY,10001,United States,Long-term client
Jane Doe,jane@example.com,+1 (555) 987-6543,Tech Inc,456 Oak Ave,San Francisco,CA,94105,United States,Startup client`

export default function ClientImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { usage, canCreate, getOverLimitStatus } = useSubscription()
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload')
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [progress, setProgress] = useState(0)
  const [currentOperation, setCurrentOperation] = useState<string>('')
  const [importResults, setImportResults] = useState<{ success: number; errors: number; total: number }>({ success: 0, errors: 0, total: 0 })
  const [errors, setErrors] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file using security validation
    const fileValidation = validateCSVFile(file)
    if (!fileValidation.isValid) {
      toast.error(fileValidation.error || 'Invalid file')
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
    // Validate CSV content length
    if (csvText.length > 10 * 1024 * 1024) { // 10MB limit
      toast.error('CSV file is too large. Maximum size is 10MB.')
      return
    }

    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      toast.error('CSV file must contain at least a header row and one data row')
      return
    }

    // Limit number of rows for security
    if (lines.length > 10000) {
      toast.error('CSV file contains too many rows. Maximum is 10,000 rows.')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    )

    // Check subscription limits before importing
    const importCount = rows.length
    const currentCount = usage.clients.current
    const limit = usage.clients.limit
    
    if (limit !== 'unlimited') {
      const totalAfterImport = currentCount + importCount
      if (totalAfterImport > limit) {
        const overAmount = totalAfterImport - limit
        toast.error(
          `Import would exceed your client limit. You have ${currentCount}/${limit} clients. ` +
          `This import would add ${importCount} clients (${overAmount} over limit). ` +
          `Please upgrade to Pro for unlimited clients or reduce the import size.`
        )
        return
      }
      
      // Warn if getting close to limit
      const remainingSlots = limit - currentCount
      if (importCount > remainingSlots * 0.8) {
        toast.warning(
          `This import will use ${importCount} of your remaining ${remainingSlots} client slots. ` +
          `Consider upgrading to Pro for unlimited clients.`
        )
      }
    }

    setCsvData({ headers, rows })
    
    // Auto-map fields
    const mappings: FieldMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      let dbField = ''
      let mapped = false

      // Try to find matching field
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

    setFieldMappings(mappings)
    setStep('mapping')
    toast.success(`CSV parsed successfully! Found ${rows.length} records`)
  }

  const handleFieldMapping = (csvField: string, dbField: string) => {
    setFieldMappings(prev => prev.map(mapping => 
      mapping.csvField === csvField 
        ? { ...mapping, dbField: dbField === 'none' ? '' : dbField, mapped: dbField !== 'none' && dbField !== '' }
        : mapping
    ))
  }

  const validateMappings = () => {
    const nameField = fieldMappings.find(m => m.dbField === 'name')
    if (!nameField || !nameField.mapped) {
      toast.error('Name field must be mapped')
      return false
    }
    return true
  }

  const handleImport = async () => {
    if (!validateMappings() || !csvData) return

    setStep('importing')
    setProgress(0)
    setCurrentOperation('Preparing import...')
    setErrors([])

    const mappedFields = fieldMappings.filter(m => m.mapped)
    const totalRows = csvData.rows.length
    let successCount = 0
    let errorCount = 0
    const errorList: string[] = []

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      setCurrentOperation(`Processing client ${i + 1} of ${totalRows}: ${row[csvData.headers.indexOf(mappedFields.find(m => m.dbField === 'name')?.csvField || '')] || 'Unknown Client'}`)
      
      try {
        // Create client object from mapped fields
        const clientData: any = {}
        
        mappedFields.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvField)
          if (csvIndex !== -1) {
            clientData[mapping.dbField] = row[csvIndex] || null
          }
        })

        // Validate required fields
        if (!clientData.name) {
          throw new Error('Name is required')
        }

        if (isSupabaseConfigured()) {
          // Real database import with duplicate checking
          // Enhanced duplicate detection - check by name, email, or both
          let existingClient = null
          
          if (clientData.email) {
            // Check by both name and email
            const { data, error } = await supabase
              .from('clients')
              .select('id, name, email')
              .or(`name.eq.${clientData.name},email.eq.${clientData.email}`)

            if (error) throw error
            existingClient = data && data.length > 0 ? data[0] : null
          } else {
            // Check by name only
            const { data, error } = await supabase
              .from('clients')
              .select('id, name')
              .eq('name', clientData.name)

            if (error) throw error
            existingClient = data && data.length > 0 ? data[0] : null
          }

          if (existingClient) {
            console.log(`Client "${clientData.name}" already exists, skipping...`)
            // Count as success but don't insert (duplicate skipped)
            successCount++
          } else {
            // Insert new client
            const { error: insertError } = await supabase
              .from('clients')
              .insert([{
                name: clientData.name,
                email: clientData.email || null,
                phone: clientData.phone || null,
                company: clientData.company || null,
                address: clientData.address || null,
                city: clientData.city || null,
                state: clientData.state || null,
                zip_code: clientData.zip_code || null,
                country: clientData.country || 'United States',
                notes: clientData.notes || null
              }])

            if (insertError) throw insertError
            
            console.log(`New client "${clientData.name}" created successfully`)
            successCount++
          }
        } else {
          // Demo mode - simulate import process
          await new Promise(resolve => setTimeout(resolve, 100))
          successCount++
        }
      } catch (error) {
        errorCount++
        
        // Enhanced error handling with detailed information
        let errorMessage = `Row ${i + 1}: `
        
        if (error instanceof Error) {
          errorMessage += error.message
          console.error('Client import error details:', {
            row: i + 1,
            error: error.message,
            stack: error.stack,
            rowData: row
          })
        } else if (typeof error === 'string') {
          errorMessage += error
          console.error('Client import string error:', { row: i + 1, error, rowData: row })
        } else if (error && typeof error === 'object') {
          // Handle Supabase/database errors
          const dbError = error as any
          if (dbError.message) {
            errorMessage += `Database error: ${dbError.message}`
            if (dbError.details) errorMessage += ` - ${dbError.details}`
            if (dbError.hint) errorMessage += ` (Hint: ${dbError.hint})`
          } else {
            errorMessage += `Object error: ${JSON.stringify(error)}`
          }
          console.error('Client import object error:', { row: i + 1, error, rowData: row })
        } else {
          errorMessage += `Unknown error type: ${typeof error} - ${String(error)}`
          console.error('Client import unknown error:', { row: i + 1, error, errorType: typeof error, rowData: row })
        }
        
        errorList.push(errorMessage)
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100))
    }

    setCurrentOperation('Import completed!')
    setProgress(100)
    setImportResults({ success: successCount, errors: errorCount, total: totalRows })
    setErrors(errorList)
    setStep('complete')
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push('/dashboard/clients')
  }

  const handleStartOver = () => {
    setStep('upload')
    setCsvData(null)
    setFieldMappings([])
    setProgress(0)
    setImportResults({ success: 0, errors: 0, total: 0 })
    setErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Import Clients" 
        description="Upload a CSV file to import multiple clients at once"
        action={
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        }
      />

      <PageContent>
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                1
              </div>
              <span>Upload</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span>Map Fields</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 'importing' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'importing' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                3
              </div>
              <span>Import</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                4
              </div>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file containing your client data. The first row should contain column headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
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
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Need a sample file?</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadSample}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Sample
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && csvData && (
          <Card>
            <CardHeader>
              <CardTitle>Map CSV Fields</CardTitle>
              <CardDescription>
                Match your CSV columns to the appropriate client fields. Required fields are marked with an asterisk (*).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">CSV Column: {mapping.csvField}</Label>
                      <p className="text-xs text-muted-foreground">
                        Sample: "{csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvField)] || 'N/A'}"
                      </p>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={mapping.dbField || 'none'}
                        onValueChange={(value) => handleFieldMapping(mapping.csvField, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Don't import</SelectItem>
                          {CLIENT_FIELDS.map(field => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label} {field.required && '*'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handleImport}>
                  Start Import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <Card>
            <CardHeader>
              <CardTitle>Importing Clients</CardTitle>
              <CardDescription>
                Please wait while we import your client data...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                {currentOperation && (
                  <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                    <Loader size="sm" variant="primary" />
                    {currentOperation}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
              <CardDescription>
                Your client import has been processed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                  <div className="text-sm text-muted-foreground">Successfully imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{importResults.total}</div>
                  <div className="text-sm text-muted-foreground">Total records</div>
                </div>
              </div>

              {errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Import Errors:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">{error}</p>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Import Another File
                </Button>
                <Button onClick={handleBack}>
                  Back to Clients
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </div>
  )
} 