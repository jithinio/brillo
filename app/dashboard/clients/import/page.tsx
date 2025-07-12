"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const CLIENT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'zip_code', label: 'ZIP Code', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

const SAMPLE_CSV = `name,email,phone,company,address,city,state,zip_code,country,notes
John Smith,john@example.com,+1234567890,Acme Corp,123 Main St,New York,NY,10001,USA,Important client
Jane Doe,jane@company.com,+1987654321,Tech Solutions,456 Oak Ave,San Francisco,CA,94105,USA,Regular client`

export default function ClientImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload')
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ success: number; errors: number; total: number }>({ success: 0, errors: 0, total: 0 })
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
    setErrors([])

    const mappedFields = fieldMappings.filter(m => m.mapped)
    const totalRows = csvData.rows.length
    let successCount = 0
    let errorCount = 0
    const errorList: string[] = []

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      
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

        // Simulate import process (in real app, this would be a database insert)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        successCount++
      } catch (error) {
        errorCount++
        errorList.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100))
    }

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
    <>
      <PageHeader
        title="Import Clients"
        action={
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
        }
      />
      
      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : step === 'mapping' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-100 border-2 border-blue-600' : step === 'mapping' || step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
                  {step === 'mapping' || step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="font-medium">Upload</span>
              </div>
              
              <div className={`w-8 h-0.5 ${step === 'mapping' || step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-100 border-2 border-blue-600' : step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
                  {step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span className="font-medium">Map Fields</span>
              </div>
              
              <div className={`w-8 h-0.5 ${step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center gap-2 ${step === 'importing' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'importing' ? 'bg-blue-100 border-2 border-blue-600' : step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
                  {step === 'complete' ? <CheckCircle className="h-4 w-4" /> : step === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : '3'}
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
                <CardTitle>Map Fields</CardTitle>
                <CardDescription>
                  Map your CSV columns to the corresponding client fields. Required fields are marked with an asterisk.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {fieldMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{mapping.csvField}</Label>
                        <p className="text-xs text-gray-500 mt-1">
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
                              {CLIENT_FIELDS.map(field => (
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
                          <Badge variant="outline" className="text-gray-400">
                            Unmapped
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleStartOver}>
                    Start Over
                  </Button>
                  <Button onClick={handleImport}>
                    Import {csvData.rows.length} Clients
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
                  Please wait while we import your clients...
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
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Your client import has been completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{importResults.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>

                {errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Import Errors:</p>
                        {errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm">{error}</p>
                        ))}
                        {errors.length > 5 && (
                          <p className="text-sm text-gray-500">+ {errors.length - 5} more errors</p>
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
                    View Clients
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