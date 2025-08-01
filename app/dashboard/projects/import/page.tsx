"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileText, Loader2, Users, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { parseFormattedDate, type DateFormat } from "@/lib/date-format"
import { useSettings } from "@/components/settings-provider"

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

const PROJECT_FIELDS = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'start_date', label: 'Start Date', required: false },
  { key: 'due_date', label: 'Due Date', required: false },
  { key: 'budget', label: 'Budget', required: false },
  { key: 'description', label: 'Description', required: false },
  
  // Financial tracking fields
  { key: 'expenses', label: 'Expenses', required: false },
  { key: 'revenue', label: 'Revenue', required: false },
  { key: 'profit_margin', label: 'Profit Margin %', required: false },
  { key: 'currency', label: 'Currency', required: false },
  { key: 'payment_status', label: 'Payment Status', required: false },
  { key: 'invoice_amount', label: 'Invoice Amount', required: false },
  { key: 'payment_received', label: 'Payment Received', required: false },
  { key: 'payment_pending', label: 'Payment Pending', required: false },
  
  // Time tracking fields (legacy)
  { key: 'hourly_rate', label: 'Hourly Rate', required: false },
  { key: 'estimated_hours', label: 'Estimated Hours', required: false },
  { key: 'actual_hours', label: 'Actual Hours', required: false },
  { key: 'progress', label: 'Progress %', required: false },
  { key: 'notes', label: 'Notes', required: false },
  
  // Note: created_at is automatically set to current timestamp and should not be mapped from CSV
]

// Status mapping - map various status names to standardized statuses
const STATUS_MAPPING: { [key: string]: string } = {
  // Active/In Progress variants - Map to 'active' (database value)
  'active': 'active',
  'in progress': 'active',
  'in_progress': 'active',
  'inprogress': 'active',
  'doing': 'active',
  'working': 'active',
  'ongoing': 'active',
  'current': 'active',
  'started': 'active',
  'wip': 'active',
  'work in progress': 'active',
  'development': 'active',
  'dev': 'active',
  'building': 'active',
  'executing': 'active',
  'running': 'active',
  'live': 'active',
  'underway': 'active',
  'proceeding': 'active',
  
  // Pipeline variants - Map to 'pipeline' (database value)
  'pipeline': 'pipeline',
  'lead': 'pipeline',
  'prospect': 'pipeline',
  'opportunity': 'pipeline',
  'potential': 'pipeline',
  'quoted': 'pipeline',
  'proposal': 'pipeline',
  'negotiation': 'pipeline',
  'discussion': 'pipeline',
  'review': 'pipeline',
  'pending approval': 'pipeline',
  'awaiting decision': 'pipeline',
  'in discussion': 'pipeline',
  'under review': 'pipeline',
  'being evaluated': 'pipeline',
  'consideration': 'pipeline',
  'evaluation': 'pipeline',
  'assessment': 'pipeline',
  'analysis': 'pipeline',
  'feasibility': 'pipeline',
  
  // Completed variants
  'completed': 'completed',
  'complete': 'completed',
  'done': 'completed',
  'finished': 'completed',
  'delivered': 'completed',
  'shipped': 'completed',
  'success': 'completed',
  'successful': 'completed',
  'deployed': 'completed',
  'launched': 'completed',
  'finalized': 'completed',
  'ended': 'completed',
  'concluded': 'completed',
  
  // Closed projects map to active (won deals from pipeline)
  'closed': 'active',
  
  // On Hold variants
  'on hold': 'on_hold',
  'on_hold': 'on_hold',
  'onhold': 'on_hold',
  'paused': 'on_hold',
  'pause': 'on_hold',
  'hold': 'on_hold',
  'suspended': 'on_hold',
  'waiting': 'on_hold',
  'pending': 'on_hold',
  'blocked': 'on_hold',
  'frozen': 'on_hold',
  'delayed': 'on_hold',
  'postponed': 'on_hold',
  'deferred': 'on_hold',
  'stalled': 'on_hold',
  'idle': 'on_hold',
  
  // Lost/cancelled variants - these will be filtered out from project pages
  'lost': 'cancelled',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'cancel': 'cancelled',
  'stopped': 'cancelled',
  'terminated': 'cancelled',
  'aborted': 'cancelled',
  'abandoned': 'cancelled',
  'rejected': 'cancelled',
  'discontinued': 'cancelled',
  'killed': 'cancelled',
  'scrapped': 'cancelled',
  'void': 'cancelled',
  'failed': 'cancelled',
  'unsuccessful': 'cancelled',
  
  // Planning variants - these will be mapped to 'pipeline' since they're in the sales pipeline
  'planning': 'pipeline',
  'planned': 'pipeline',
  'not started': 'pipeline',
  'not_started': 'pipeline',
  'notstarted': 'pipeline',
  'scheduled': 'pipeline',
  'upcoming': 'pipeline',
  'backlog': 'pipeline',
  'draft': 'pipeline',
  'new': 'pipeline',
  'created': 'pipeline',
  'initiated': 'pipeline',
}

const STANDARD_STATUSES = [
  { value: 'active', label: 'Active / In Progress' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Payment status mapping
const PAYMENT_STATUS_MAPPING: { [key: string]: string } = {
  'pending': 'pending',
  'paid': 'paid',
  'overdue': 'overdue',
  'partial': 'partial',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'complete': 'paid',
  'completed': 'paid',
  'finished': 'paid',
  'done': 'paid',
  'outstanding': 'overdue',
  'late': 'overdue',
  'unpaid': 'pending',
  'invoiced': 'pending',
  'billed': 'pending',
  'sent': 'pending',
  'received': 'paid',
  'collected': 'paid',
  'partial payment': 'partial',
  'partly paid': 'partial',
  'in progress': 'partial',
  'progress': 'partial',
  'void': 'cancelled',
  'voided': 'cancelled',
  'refunded': 'cancelled',
  'disputed': 'overdue',
}

const STANDARD_PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STANDARD_CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'INR', label: 'INR - Indian Rupee' },
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

export default function ProjectImportPage() {
  const router = useRouter()
  const { settings } = useSettings()
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
    projects: { success: number; errors: number; total: number }
    clients: { success: number; errors: number; total: number }
  }>({ 
    projects: { success: 0, errors: 0, total: 0 },
    clients: { success: 0, errors: 0, total: 0 }
  })
  const [errors, setErrors] = useState<string[]>([])

  // Helper function to parse various date formats
  const parseFlexibleDate = (dateString: string): string | null => {
    if (!dateString || dateString === 'null' || dateString === 'N/A') {
      return null
    }

    const cleanDate = dateString.trim()
    
    // Try parsing with user's preferred format first
    const userFormat = settings.dateFormat as DateFormat
    const parsedWithUserFormat = parseFormattedDate(cleanDate, userFormat)
    if (parsedWithUserFormat) {
      const year = parsedWithUserFormat.getFullYear()
      const month = (parsedWithUserFormat.getMonth() + 1).toString().padStart(2, '0')
      const day = parsedWithUserFormat.getDate().toString().padStart(2, '0')
      console.log(`✅ Parsed "${dateString}" using user format "${userFormat}" as "${year}-${month}-${day}"`)
      return `${year}-${month}-${day}`
    }
    
    // Try different date parsing approaches as fallback
    const attempts = [
      // ISO format (YYYY-MM-DD)
      () => {
        const isoMatch = cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)
        if (isoMatch) {
          const [year, month, day] = cleanDate.split('-').map(Number)
          // Validate the date
          const date = new Date(year, month - 1, day)
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          }
        }
        return null
      },
      
      // MM/DD/YYYY or DD/MM/YYYY
      () => {
        const slashMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (slashMatch) {
          const [, part1, part2, year] = slashMatch
          const month1 = parseInt(part1, 10)
          const day1 = parseInt(part2, 10)
          const month2 = parseInt(part2, 10)
          const day2 = parseInt(part1, 10)
          
          // Try MM/DD/YYYY first (US format)
          if (month1 >= 1 && month1 <= 12 && day1 >= 1 && day1 <= 31) {
            const date = new Date(parseInt(year), month1 - 1, day1)
            if (date.getFullYear() === parseInt(year) && date.getMonth() === month1 - 1 && date.getDate() === day1) {
              return `${year}-${month1.toString().padStart(2, '0')}-${day1.toString().padStart(2, '0')}`
            }
          }
          
          // Try DD/MM/YYYY (international format)
          if (month2 >= 1 && month2 <= 12 && day2 >= 1 && day2 <= 31) {
            const date = new Date(parseInt(year), month2 - 1, day2)
            if (date.getFullYear() === parseInt(year) && date.getMonth() === month2 - 1 && date.getDate() === day2) {
              return `${year}-${month2.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`
            }
          }
        }
        return null
      },
      
      // Month DD, YYYY (e.g., "June 12, 2024")
      () => {
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ]
        const monthAbbr = [
          'jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ]
        
        const lowerDate = cleanDate.toLowerCase()
        
        // Try different patterns for month names
        const patterns = [
          /([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/,  // "June 25, 2025" or "June 25 2025"
          /([a-z]+)\s+(\d{1,2})\s*,\s*(\d{4})/, // "June 25, 2025" with flexible spacing
          /(\d{1,2})\s+([a-z]+)\s+(\d{4})/,     // "25 June 2025"
        ]
        
        for (const pattern of patterns) {
          const monthMatch = lowerDate.match(pattern)
          if (monthMatch) {
            let monthStr, dayStr, yearStr
            
            if (pattern.source.includes('([a-z]+)\\s+(\\d{1,2})')) {
              // Month first format: "June 25, 2025"
              [, monthStr, dayStr, yearStr] = monthMatch
            } else {
              // Day first format: "25 June 2025"
              [, dayStr, monthStr, yearStr] = monthMatch
            }
            
            const monthIndex = monthNames.indexOf(monthStr) !== -1 
              ? monthNames.indexOf(monthStr)
              : monthAbbr.indexOf(monthStr)
            
            if (monthIndex !== -1) {
              const day = parseInt(dayStr)
              const year = parseInt(yearStr)
              const date = new Date(year, monthIndex, day)
              if (date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
                return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
              }
            }
          }
        }
        return null
      },
      
      // DD-MM-YYYY or MM-DD-YYYY
      () => {
        const dashMatch = cleanDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
        if (dashMatch) {
          const [, part1, part2, year] = dashMatch
          const month1 = parseInt(part1, 10)
          const day1 = parseInt(part2, 10)
          const month2 = parseInt(part2, 10)
          const day2 = parseInt(part1, 10)
          
          // Try MM-DD-YYYY first
          if (month1 >= 1 && month1 <= 12 && day1 >= 1 && day1 <= 31) {
            const date = new Date(parseInt(year), month1 - 1, day1)
            if (date.getFullYear() === parseInt(year) && date.getMonth() === month1 - 1 && date.getDate() === day1) {
              return `${year}-${month1.toString().padStart(2, '0')}-${day1.toString().padStart(2, '0')}`
            }
          }
          
          // Try DD-MM-YYYY
          if (month2 >= 1 && month2 <= 12 && day2 >= 1 && day2 <= 31) {
            const date = new Date(parseInt(year), month2 - 1, day2)
            if (date.getFullYear() === parseInt(year) && date.getMonth() === month2 - 1 && date.getDate() === day2) {
              return `${year}-${month2.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`
            }
          }
        }
        return null
      },
      
      // Last resort - try native Date parsing but validate the result
      () => {
        const date = new Date(cleanDate)
        if (!isNaN(date.getTime())) {
          // Extract the date parts to avoid timezone issues
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        }
        return null
      }
    ]

    // Try each parsing method
    for (const attempt of attempts) {
      const result = attempt()
      if (result) {
        console.log(`✅ Successfully parsed "${dateString}" as "${result}"`)
        return result
      }
    }

    console.warn(`❌ Could not parse date: "${dateString}"`)
    return null
  }

  // Helper function to normalize status values
  const normalizeStatus = (statusValue: string): string => {
    if (!statusValue) return 'active'
    
    const normalizedInput = statusValue.toLowerCase().trim()
    const mappedStatus = STATUS_MAPPING[normalizedInput]
    
    if (mappedStatus) {
      console.log(`✅ Status "${statusValue}" mapped to "${mappedStatus}"`)
      return mappedStatus
    }
    
    // If no mapping found, return original value cleaned up
    const cleanStatus = normalizedInput.replace(/\s+/g, '_')
    console.log(`⚠️ Status "${statusValue}" not recognized, using "${cleanStatus}"`)
    return cleanStatus
  }

  // Helper function to normalize payment status values
  const normalizePaymentStatus = (statusValue: string): string => {
    if (!statusValue) return 'pending'
    
    const normalizedInput = statusValue.toLowerCase().trim()
    const mappedStatus = PAYMENT_STATUS_MAPPING[normalizedInput]
    
    if (mappedStatus) {
      console.log(`✅ Payment status "${statusValue}" mapped to "${mappedStatus}"`)
      return mappedStatus
    }
    
    // If no mapping found, return original value cleaned up
    const cleanStatus = normalizedInput.replace(/\s+/g, '_')
    console.log(`⚠️ Payment status "${statusValue}" not recognized, using "${cleanStatus}"`)
    return cleanStatus
  }

  // Helper function to normalize currency values
  const normalizeCurrency = (currencyValue: string): string => {
    if (!currencyValue) return 'USD'
    
    const normalizedInput = currencyValue.toUpperCase().trim()
    
    // Remove common currency symbols and normalize
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      'USD': 'USD',
      'DOLLAR': 'USD',
      'DOLLARS': 'USD',
      'US': 'USD',
      'USDOLLAR': 'USD',
      '€': 'EUR',
      'EUR': 'EUR',
      'EURO': 'EUR',
      'EUROS': 'EUR',
      '£': 'GBP',
      'GBP': 'GBP',
      'POUND': 'GBP',
      'POUNDS': 'GBP',
      'STERLING': 'GBP',
      '¥': 'JPY',
      'JPY': 'JPY',
      'YEN': 'JPY',
      'JAPANESE': 'JPY',
      'CAD': 'CAD',
      'CANADIAN': 'CAD',
      'AUD': 'AUD',
      'AUSTRALIAN': 'AUD',
      'CHF': 'CHF',
      'SWISS': 'CHF',
      'CNY': 'CNY',
      'CHINESE': 'CNY',
      'YUAN': 'CNY',
      'INR': 'INR',
      'INDIAN': 'INR',
      'RUPEE': 'INR',
      'RUPEES': 'INR',
    }
    
    const mappedCurrency = currencyMap[normalizedInput]
    
    if (mappedCurrency) {
      console.log(`✅ Currency "${currencyValue}" mapped to "${mappedCurrency}"`)
      return mappedCurrency
    }
    
    // If no mapping found, return USD as default
    console.log(`⚠️ Currency "${currencyValue}" not recognized, using "USD"`)
    return 'USD'
  }

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
    console.log('Raw CSV text received:', csvText.substring(0, 500) + '...')
    
    const lines = csvText.trim().split('\n')
    console.log('Number of lines found:', lines.length)
    console.log('First line (headers):', lines[0])
    console.log('Second line (first data row):', lines[1])
    
    if (lines.length < 2) {
      toast.error('CSV file must contain at least a header row and one data row')
      return
    }

    // Try different parsing approaches to handle complex CSV
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      let i = 0
      
      while (i < line.length) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes
            current += '"'
            i += 2
          } else {
            // Toggle quote state
            inQuotes = !inQuotes
            i++
          }
        } else if (char === ',' && !inQuotes) {
          // Found delimiter outside quotes
          result.push(current.trim())
          current = ''
          i++
        } else {
          current += char
          i++
        }
      }
      
      // Add the last field
      result.push(current.trim())
      
      return result
    }

    const headers = parseCSVLine(lines[0])
    console.log('Parsed headers:', headers)
    console.log('Number of header columns:', headers.length)
    
    const rows = lines.slice(1).map((line, index) => {
      const parsedRow = parseCSVLine(line)
      console.log(`Row ${index + 1} parsed (${parsedRow.length} columns):`, parsedRow)
      return parsedRow
    })
    
    // Log the first few rows with column mapping
    console.log('\n=== CSV COLUMN MAPPING DEBUG ===')
    headers.forEach((header, index) => {
      console.log(`Column ${index}: "${header}" = "${rows[0]?.[index] || 'N/A'}"`)
    })
    console.log('=== END DEBUG ===\n')

    setCsvData({ headers, rows })
    
    // Auto-map project fields - more conservative approach
    const projectMappings: FieldMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      let dbField = ''
      let mapped = false

      // Only auto-map if there's a very clear field name match
      for (const field of PROJECT_FIELDS) {
        const normalizedField = field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        // Very strict matching - only exact matches or very clear patterns
        if (normalizedHeader === normalizedField || 
            normalizedHeader === normalizedLabel ||
            // Only match if field name clearly indicates the purpose
            (normalizedHeader === 'projectname' && field.key === 'name') ||
            (normalizedHeader === 'name' && field.key === 'name') ||
            (normalizedHeader === 'title' && field.key === 'name') ||
            (normalizedHeader === 'projectstatus' && field.key === 'status') ||
            (normalizedHeader === 'status' && field.key === 'status') ||
            (normalizedHeader === 'startdate' && field.key === 'start_date') ||
            (normalizedHeader === 'enddate' && field.key === 'due_date') ||
            (normalizedHeader === 'budget' && field.key === 'budget') ||
            (normalizedHeader === 'amount' && field.key === 'budget') ||
            (normalizedHeader === 'cost' && field.key === 'budget') ||
            
            // Financial tracking fields
            (normalizedHeader === 'expenses' && field.key === 'expenses') ||
            (normalizedHeader === 'expense' && field.key === 'expenses') ||
            (normalizedHeader === 'costs' && field.key === 'expenses') ||
            (normalizedHeader === 'spent' && field.key === 'expenses') ||
            (normalizedHeader === 'revenue' && field.key === 'revenue') ||
            (normalizedHeader === 'income' && field.key === 'revenue') ||
            (normalizedHeader === 'earned' && field.key === 'revenue') ||
            (normalizedHeader === 'sales' && field.key === 'revenue') ||
            (normalizedHeader === 'profitmargin' && field.key === 'profit_margin') ||
            (normalizedHeader === 'profit' && field.key === 'profit_margin') ||
            (normalizedHeader === 'margin' && field.key === 'profit_margin') ||
            (normalizedHeader === 'currency' && field.key === 'currency') ||
            (normalizedHeader === 'curr' && field.key === 'currency') ||
            (normalizedHeader === 'paymentstatus' && field.key === 'payment_status') ||
            (normalizedHeader === 'paymentstate' && field.key === 'payment_status') ||
            (normalizedHeader === 'billingstatus' && field.key === 'payment_status') ||
            (normalizedHeader === 'invoiceamount' && field.key === 'invoice_amount') ||
            (normalizedHeader === 'invoiced' && field.key === 'invoice_amount') ||
            (normalizedHeader === 'billed' && field.key === 'invoice_amount') ||
            (normalizedHeader === 'paymentreceived' && field.key === 'payment_received') ||
            (normalizedHeader === 'received' && field.key === 'payment_received') ||
            (normalizedHeader === 'paid' && field.key === 'payment_received') ||
            (normalizedHeader === 'collected' && field.key === 'payment_received') ||
            (normalizedHeader === 'paymentpending' && field.key === 'payment_pending') ||
            (normalizedHeader === 'pending' && field.key === 'payment_pending') ||
            (normalizedHeader === 'outstanding' && field.key === 'payment_pending') ||
            (normalizedHeader === 'unpaid' && field.key === 'payment_pending') ||
            
            // Time tracking fields (legacy)
            (normalizedHeader === 'hourlyrate' && field.key === 'hourly_rate') ||
            (normalizedHeader === 'rate' && field.key === 'hourly_rate') ||
            (normalizedHeader === 'estimatedhours' && field.key === 'estimated_hours') ||
            (normalizedHeader === 'hours' && field.key === 'estimated_hours') ||
            (normalizedHeader === 'actualhours' && field.key === 'actual_hours') ||
            (normalizedHeader === 'timespent' && field.key === 'actual_hours') ||
            (normalizedHeader === 'progress' && field.key === 'progress') ||
            (normalizedHeader === 'completion' && field.key === 'progress') ||
            (normalizedHeader === 'projectdescription' && field.key === 'description') ||
            (normalizedHeader === 'description' && field.key === 'description') ||
            (normalizedHeader === 'notes' && field.key === 'notes') ||
            (normalizedHeader === 'comment' && field.key === 'notes') ||
            (normalizedHeader === 'date' && field.key === 'start_date')) {
          dbField = field.key
          mapped = true
          console.log(`Auto-mapped "${header}" to "${field.key}"`)
          break
        }
      }

      if (!mapped) {
        console.log(`No auto-mapping for "${header}" - defaulting to Don't import`)
      }

      return {
        csvField: header,
        dbField, // This will be empty string if not mapped
        mapped
      }
    })

    // Auto-map client fields - more conservative approach
    const clientMappingResults: FieldMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      let dbField = ''
      let mapped = false

      // Only auto-map if there's a very clear field name match
      for (const field of CLIENT_FIELDS) {
        const normalizedField = field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        // Very strict matching - only exact matches or very clear patterns
        if (normalizedHeader === normalizedField || 
            normalizedHeader === normalizedLabel ||
            // Only match if field name clearly indicates client information
            (normalizedHeader === 'clientname' && field.key === 'client_name') ||
            (normalizedHeader === 'client' && field.key === 'client_name') ||
            (normalizedHeader === 'customername' && field.key === 'client_name') ||
            (normalizedHeader === 'customer' && field.key === 'client_name') ||
            (normalizedHeader === 'vendor' && field.key === 'client_name') ||
            (normalizedHeader === 'vender' && field.key === 'client_name') ||
            (normalizedHeader === 'supplier' && field.key === 'client_name') ||
            (normalizedHeader === 'clientcompany' && field.key === 'client_company') ||
            (normalizedHeader === 'company' && field.key === 'client_company') ||
            (normalizedHeader === 'organization' && field.key === 'client_company') ||
            (normalizedHeader === 'clientemail' && field.key === 'client_email') ||
            (normalizedHeader === 'email' && field.key === 'client_email') ||
            (normalizedHeader === 'clientphone' && field.key === 'client_phone') ||
            (normalizedHeader === 'phone' && field.key === 'client_phone') ||
            (normalizedHeader === 'telephone' && field.key === 'client_phone')) {
          dbField = field.key
          mapped = true
          console.log(`Auto-mapped "${header}" to "${field.key}"`)
          break
        }
      }

      return {
        csvField: header,
        dbField, // This will be empty string if not mapped
        mapped
      }
    })

    // Check if we have client data
    const hasClientFields = clientMappingResults.some(m => m.mapped)
    setHasClientData(hasClientFields)
    
    setFieldMappings(projectMappings)
    setClientMappings(clientMappingResults)
    setStep('mapping')
    toast.success(`CSV parsed successfully! Found ${rows.length} records${hasClientFields ? ' with client data' : ''}`)
  }

  const handleFieldMapping = (csvField: string, dbField: string, isClient: boolean = false) => {
    if (isClient) {
      setClientMappings(prev => {
        const existing = prev.find(m => m.csvField === csvField)
        if (existing) {
          return prev.map(mapping => 
            mapping.csvField === csvField 
              ? { ...mapping, dbField: dbField === 'none' ? '' : dbField, mapped: dbField !== 'none' && dbField !== '' }
              : mapping
          )
        } else {
          return [...prev, {
            csvField,
            dbField: dbField === 'none' ? '' : dbField,
            mapped: dbField !== 'none' && dbField !== ''
          }]
        }
      })
      
      // Update hasClientData based on the new mappings
      setTimeout(() => {
        setClientMappings(current => {
          const hasAnyMapped = current.some(m => m.mapped)
          setHasClientData(hasAnyMapped)
          return current
        })
      }, 0)
    } else {
      setFieldMappings(prev => prev.map(mapping => 
        mapping.csvField === csvField 
          ? { ...mapping, dbField: dbField === 'none' ? '' : dbField, mapped: dbField !== 'none' && dbField !== '' }
          : mapping
      ))
    }
  }

  const validateMappings = () => {
    const nameField = fieldMappings.find(m => m.dbField === 'name' && m.mapped)
    if (!nameField) {
      toast.error('Project name field must be mapped')
      return false
    }
    
    // Additional validation to detect potentially incorrect mappings
    const warnings: string[] = []
    
    if (csvData) {
      fieldMappings.forEach(mapping => {
        if (mapping.mapped && mapping.dbField) {
          const csvIndex = csvData.headers.indexOf(mapping.csvField)
          const sampleValue = csvData.rows[0]?.[csvIndex] || ''
          
          // Check for potentially incorrect mappings
          if (mapping.dbField === 'created_at') {
            warnings.push(`"${mapping.csvField}" should not be mapped to "Created At". This field is automatically set to the current timestamp. Consider mapping to "Start Date" or "Due Date" instead.`)
          } else if (mapping.dbField === 'status') {
            const normalizedValue = sampleValue.toString().toLowerCase().trim()
            const canBeMapped = STATUS_MAPPING[normalizedValue] !== undefined
            const isNumeric = /^\d+$/.test(sampleValue.toString())
            
            if (isNumeric && !canBeMapped) {
              warnings.push(`"${mapping.csvField}" mapped to Status contains numbers (${sampleValue}). Status should be text like "active", "completed", "active".`)
            } else if (!canBeMapped && sampleValue && sampleValue !== 'N/A') {
              warnings.push(`Status values detected. Expected format: Should be text like "active", "completed", "active".`)
            }
          } else if (mapping.dbField === 'start_date' || mapping.dbField === 'due_date') {
            const parsedDate = parseFlexibleDate(sampleValue.toString())
            if (!parsedDate && sampleValue && sampleValue !== 'N/A') {
              warnings.push(`"${mapping.csvField}" mapped to Date contains unrecognized format (${sampleValue}). Supported formats: YYYY-MM-DD, MM/DD/YYYY, "June 12, 2024".`)
            }
          } else if (mapping.dbField === 'budget' || mapping.dbField === 'hourly_rate' || mapping.dbField === 'estimated_hours' || mapping.dbField === 'progress') {
            // Numeric fields should be numbers
            const cleanValue = sampleValue.toString().replace(/[₹$,]/g, '')
            if (cleanValue && isNaN(parseFloat(cleanValue))) {
              warnings.push(`"${mapping.csvField}" mapped to ${mapping.dbField} contains non-numeric value (${sampleValue}). Expected number.`)
            }
          }
        }
      })
    }
    
    if (warnings.length > 0) {
      console.warn('Field mapping warnings:', warnings)
      warnings.forEach(warning => console.warn('⚠️ ' + warning))
      
      // Show warning toast for created_at mapping
      const createdAtWarning = warnings.find(w => w.includes('Created At'))
      if (createdAtWarning) {
        toast.error('Date fields should be mapped to "Start Date" or "Due Date", not "Created At"')
        return false
      }
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

    const mappedProjectFields = fieldMappings.filter(m => m.mapped)
    const mappedClientFields = clientMappings.filter(m => m.mapped)
    const totalRows = csvData.rows.length
    
    console.log('Starting import with mappings:')
    console.log('Project fields:', mappedProjectFields)
    console.log('Client fields:', mappedClientFields)
    console.log('CSV headers:', csvData.headers)
    console.log('Total rows to import:', totalRows)
    
    // Debug: Show first row of data to understand the structure
    console.log('First row of CSV data:', csvData.rows[0])
    console.log('CSV headers with indices:')
    csvData.headers.forEach((header, index) => {
      console.log(`  [${index}] "${header}" = "${csvData.rows[0]?.[index] || 'N/A'}"`)
    })
    
    // Debug: Show what each field mapping will extract
    console.log('Field mappings will extract:')
    mappedProjectFields.forEach(mapping => {
      const csvIndex = csvData.headers.indexOf(mapping.csvField)
      const sampleValue = csvData.rows[0]?.[csvIndex] || 'N/A'
      console.log(`  "${mapping.csvField}" -> ${mapping.dbField} = "${sampleValue}"`)
    })
    
    if (mappedClientFields.length > 0) {
      console.log('Client mappings will extract:')
      mappedClientFields.forEach(mapping => {
        const csvIndex = csvData.headers.indexOf(mapping.csvField)
        const sampleValue = csvData.rows[0]?.[csvIndex] || 'N/A'
        console.log(`  "${mapping.csvField}" -> ${mapping.dbField} = "${sampleValue}"`)
      })
    }
    
    let projectSuccess = 0
    let projectErrors = 0
    let clientSuccess = 0
    let clientErrors = 0
    const errorList: string[] = []
    const demoClientsMap = new Map<string, string>() // Track demo clients by name to avoid duplicates

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i]
      console.log(`Processing row ${i + 1}:`, row)
      
      try {
        let clientId: string | null = null

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

          console.log('Client data to import:', clientData)

          if (clientData.name) {
            if (isSupabaseConfigured()) {
              try {
                const { data: clientResult, error: clientError } = await supabase
                  .from('clients')
                  .select('id, name') // Select existing clients to check for duplicates
                  .eq('name', clientData.name)

                if (clientError) throw clientError
                
                if (clientResult && clientResult.length > 0) {
                  // If client already exists, use its ID
                  clientId = String(clientResult[0].id)
                  clientSuccess++
                  console.log(`Client "${clientData.name}" already exists with ID: ${clientId}`)
                } else {
                  // If client does not exist, insert new client
                  const { data: newClientResult, error: newClientError } = await supabase
                    .from('clients')
                    .insert([{
                      name: clientData.name,
                      company: clientData.company || null,
                      email: clientData.email || null,
                      phone: clientData.phone || null,
                      address: clientData.address || null,
                      city: clientData.city || null,
                      state: clientData.state || null,
                      zip_code: clientData.zip_code || null,
                      country: clientData.country || 'United States'
                    }])
                    .select()

                  if (newClientError) throw newClientError
                  
                  if (newClientResult && newClientResult.length > 0) {
                    clientId = String(newClientResult[0].id)
                    clientSuccess++
                    console.log('New client created with ID:', clientId)
                  }
                }
              } catch (error) {
                console.error('Client import error:', error)
                // Continue with project import even if client fails
              }
            } else {
              // Demo mode - simulate client creation with duplicate checking
              if (demoClientsMap.has(clientData.name)) {
                // Client already exists in demo mode
                clientId = demoClientsMap.get(clientData.name)!
                console.log(`Demo client "${clientData.name}" already exists with ID: ${clientId}`)
              } else {
                // Create new demo client
                clientId = `demo-client-${Date.now()}-${i}`
                demoClientsMap.set(clientData.name, clientId)
                clientSuccess++
                console.log('Demo client created with ID:', clientId)
              }
            }
          }
        }

        // Import project
        const projectData: any = {}
        
        mappedProjectFields.forEach(mapping => {
          const csvIndex = csvData.headers.indexOf(mapping.csvField)
          if (csvIndex !== -1) {
            let value: string | number | null = row[csvIndex] || null
            
            console.log(`Mapping "${mapping.csvField}" (${mapping.dbField}) = "${value}"`)
            
            // Prevent mapping to created_at - it should always be current timestamp
            if (mapping.dbField === 'created_at') {
              console.warn(`⚠️ Skipping mapping to created_at - this field is automatically set to current timestamp`)
              return
            }
            
            // Handle special field types
            if (mapping.dbField === 'budget' || mapping.dbField === 'hourly_rate' || 
                mapping.dbField === 'expenses' || mapping.dbField === 'revenue' || 
                mapping.dbField === 'invoice_amount' || mapping.dbField === 'payment_received' || 
                mapping.dbField === 'payment_pending') {
              if (value) {
                // Remove currency symbols and commas
                const cleanValue = value.toString().replace(/[₹$€£¥,]/g, '')
                const numValue = parseFloat(cleanValue)
                if (isNaN(numValue)) {
                  console.warn(`Invalid numeric value for ${mapping.dbField}: "${value}" -> "${cleanValue}"`)
                  value = 0
                } else {
                  value = numValue
                }
              } else {
                value = 0
              }
            } else if (mapping.dbField === 'estimated_hours' || mapping.dbField === 'actual_hours' || 
                       mapping.dbField === 'progress' || mapping.dbField === 'profit_margin') {
              if (value) {
                const numValue = parseFloat(value.toString())
                if (isNaN(numValue)) {
                  console.warn(`Invalid numeric value for ${mapping.dbField}: "${value}"`)
                  value = 0
                } else {
                  value = numValue
                }
              } else {
                value = 0
              }
            } else if (mapping.dbField === 'start_date' || mapping.dbField === 'due_date') {
              // Use flexible date parsing
              value = parseFlexibleDate(value as string)
            } else if (mapping.dbField === 'status') {
              // Use dynamic status normalization
              value = normalizeStatus(value as string)
            } else if (mapping.dbField === 'payment_status') {
              // Use payment status normalization
              value = normalizePaymentStatus(value as string)
            } else if (mapping.dbField === 'currency') {
              // Use currency normalization
              value = normalizeCurrency(value as string)
            }
            
            projectData[mapping.dbField] = value
          }
        })

        console.log('Project data to import:', projectData)

        // Validate required fields
        if (!projectData.name) {
          throw new Error('Project name is required')
        }

        // Auto-calculate pending amount: budget - received = pending
        const budget = projectData.budget || 0
        const received = projectData.payment_received || 0
        const autoPending = Math.max(0, budget - received) // Ensure it's not negative
        
        // Use auto-calculated pending if not explicitly set in CSV
        if (projectData.payment_pending === undefined || projectData.payment_pending === null) {
          projectData.payment_pending = autoPending
          console.log(`✅ Auto-calculated pending amount: ${budget} - ${received} = ${autoPending}`)
        } else {
          console.log(`⚠️ Using CSV pending amount: ${projectData.payment_pending} (auto-calculated would be: ${autoPending})`)
        }

        if (isSupabaseConfigured()) {
          // Real database import
          const projectInsertData = {
            name: projectData.name,
            status: projectData.status || 'active',
            start_date: projectData.start_date,
            due_date: projectData.due_date,
            budget: budget,
            description: projectData.description || null,
            client_id: clientId || null,
            
            // Financial tracking fields
            expenses: projectData.expenses || 0,
            revenue: projectData.revenue || 0,
            profit_margin: projectData.profit_margin || 0,
            currency: projectData.currency || 'USD',
            payment_status: projectData.payment_status || 'pending',
            invoice_amount: projectData.invoice_amount || 0,
            payment_received: projectData.payment_received || 0,
            payment_pending: projectData.payment_pending || 0,
            
            // Time tracking fields (legacy)
            progress: projectData.progress || 0,
            actual_hours: projectData.actual_hours || 0,
            estimated_hours: projectData.estimated_hours || null,
            hourly_rate: projectData.hourly_rate || null,
            notes: projectData.notes || null
          }

          console.log('Inserting project into database:', projectInsertData)

          const { error: projectError } = await supabase
            .from('projects')
            .insert([projectInsertData])

          if (projectError) {
            console.error('Database insertion error:', projectError)
            throw new Error(`Database error: ${projectError.message}${projectError.details ? ` - ${projectError.details}` : ''}`)
          }
          
          projectSuccess++
          console.log('Project imported successfully to database')
        } else {
          // Demo mode - add to mock data (this won't persist page refresh)
          const newProject = {
            id: `demo-project-${Date.now()}-${i}`,
            name: projectData.name,
            status: projectData.status || 'active',
            start_date: projectData.start_date,
            due_date: projectData.due_date,
            budget: budget,
            description: projectData.description || null,
            
            // Financial tracking fields
            expenses: projectData.expenses || 0,
            revenue: projectData.revenue || 0,
            profit_margin: projectData.profit_margin || 0,
            currency: projectData.currency || 'USD',
            payment_status: projectData.payment_status || 'pending',
            invoice_amount: projectData.invoice_amount || 0,
            payment_received: projectData.payment_received || 0,
            payment_pending: projectData.payment_pending || 0,
            
            // Time tracking fields (legacy)
            progress: projectData.progress || 0,
            actual_hours: projectData.actual_hours || 0,
            estimated_hours: projectData.estimated_hours || null,
            hourly_rate: projectData.hourly_rate || null,
            notes: projectData.notes || null,
            
            created_at: new Date().toISOString(),
            clients: clientId ? { name: `Client ${i + 1}`, company: 'Imported Company' } : null
          }
          
          console.log('Adding project to demo storage:', newProject)
          
          // Store in sessionStorage for demo
          const existingProjects = JSON.parse(sessionStorage.getItem('demo-projects') || '[]')
          existingProjects.push(newProject)
          sessionStorage.setItem('demo-projects', JSON.stringify(existingProjects))
          
          projectSuccess++
          console.log('Project imported successfully to demo storage')
        }
        
      } catch (error) {
        projectErrors++
        const errorMessage = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errorList.push(errorMessage)
        console.error('Import error:', errorMessage)
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100))
    }

    console.log('Import completed. Results:', {
      projectSuccess,
      projectErrors,
      clientSuccess,
      clientErrors,
      errorList
    })

    setImportResults({
      projects: { success: projectSuccess, errors: projectErrors, total: totalRows },
      clients: { success: clientSuccess, errors: clientErrors, total: importClients ? detectedClients.length : 0 }
    })
    setErrors(errorList)
    setStep('complete')
  }

  const downloadSample = () => {
    const SAMPLE_CSV = `name,status,start_date,due_date,budget,expenses,revenue,currency,payment_status,invoice_amount,payment_received,payment_pending,client_name,client_company,client_email,client_phone,description
Website Redesign,active,2024-01-15,2024-03-15,15000,2500,12000,USD,partial,12000,7500,4500,John Smith,Acme Corp,john@acme.com,+1234567890,Complete website redesign with modern UI/UX
Mobile App Development,completed,2023-10-01,2024-01-31,45000,8500,45000,USD,paid,45000,45000,0,Sarah Johnson,Tech Solutions,sarah@tech.com,+1987654321,Native mobile app for iOS and Android
E-commerce Platform,pipeline,2024-02-01,2024-06-30,32000,1200,25000,EUR,pending,25000,10000,15000,Mike Brown,Global LLC,mike@global.com,+1555666777,Custom e-commerce solution with payment integration
Marketing Campaign,active,2024-03-01,2024-05-31,8000,1500,7500,GBP,overdue,7500,4000,3500,Emily Davis,Creative Agency,emily@creative.com,+1444555666,Digital marketing campaign for product launch
CRM Implementation,pipeline,2024-04-01,2024-07-31,25000,0,0,USD,pending,0,0,0,Alex Wilson,Enterprise Inc,alex@enterprise.com,+1333444555,Customer relationship management system implementation
Data Analytics Platform,on_hold,2024-02-15,2024-05-15,18000,3000,15000,USD,partial,15000,8000,7000,David Chen,Data Corp,david@data.com,+1222333444,Advanced analytics and reporting platform`
    
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push('/dashboard/projects')
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
      projects: { success: 0, errors: 0, total: 0 },
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
        title="Import Projects"
        action={
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        }
      />
      
      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
                  {step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="font-medium">Upload</span>
              </div>
              
              <div className={`w-8 h-0.5 ${step === 'mapping' || step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-blue-600' : step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-100 border-2 border-blue-600' : step === 'client-confirm' || step === 'importing' || step === 'complete' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100 border-2 border-gray-300'}`}>
                  {step === 'client-confirm' || step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '2'}
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
                  Upload a CSV file containing your project data. Include client information if you want to import clients as well.
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Map Project Fields</CardTitle>
                  <CardDescription>
                    Map your CSV columns to the appropriate project fields. Required fields are marked with an asterisk (*).
                    <br />
                    <span className="text-sm text-blue-600 mt-2 block">
                      💡 Date fields from your CSV should be mapped to "Start Date" or "Due Date". The "Created At" field is automatically set to the current timestamp.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {fieldMappings.map((mapping, index) => {
                      const sampleValue = csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvField)] || 'N/A'
                      
                      // Check for potential mapping issues
                      let hasWarning = false
                      let warningMessage = ''
                      
                      if (mapping.mapped && mapping.dbField) {
                        if (mapping.dbField === 'status') {
                          const normalizedValue = sampleValue.toString().toLowerCase().trim()
                          const canBeMapped = STATUS_MAPPING[normalizedValue] !== undefined
                          const isNumeric = /^\d+$/.test(sampleValue.toString())
                          
                          if (isNumeric && !canBeMapped) {
                            hasWarning = true
                            warningMessage = 'Status appears to be numeric. Expected text like "active", "active", "completed"'
                          } else if (!canBeMapped && sampleValue && sampleValue !== 'N/A') {
                            hasWarning = true
                            warningMessage = `Status "${sampleValue}" will be used as-is. Common statuses: active, active, completed`
                          }
                        } else if (mapping.dbField === 'start_date' || mapping.dbField === 'due_date') {
                          const parsedDate = parseFlexibleDate(sampleValue.toString())
                          if (!parsedDate && sampleValue && sampleValue !== 'N/A') {
                            hasWarning = true
                            warningMessage = 'Date format not recognized. Supported: YYYY-MM-DD, MM/DD/YYYY, "June 12, 2024"'
                          }
                        } else if (mapping.dbField === 'budget' || mapping.dbField === 'hourly_rate' || 
                                   mapping.dbField === 'estimated_hours' || mapping.dbField === 'actual_hours' || 
                                   mapping.dbField === 'progress' || mapping.dbField === 'expenses' || 
                                   mapping.dbField === 'revenue' || mapping.dbField === 'profit_margin' || 
                                   mapping.dbField === 'invoice_amount' || mapping.dbField === 'payment_received' || 
                                   mapping.dbField === 'payment_pending') {
                          const cleanValue = sampleValue.toString().replace(/[₹$€£¥,]/g, '')
                          if (cleanValue && isNaN(parseFloat(cleanValue))) {
                            hasWarning = true
                            warningMessage = 'Should be a number or currency amount'
                          }
                        } else if (mapping.dbField === 'payment_status') {
                          const normalizedValue = sampleValue.toString().toLowerCase().trim()
                          const canBeMapped = PAYMENT_STATUS_MAPPING[normalizedValue] !== undefined
                          if (!canBeMapped && sampleValue && sampleValue !== 'N/A') {
                            hasWarning = true
                            warningMessage = `Payment status "${sampleValue}" will be used as-is. Common statuses: pending, paid, overdue, partial`
                          }
                        } else if (mapping.dbField === 'currency') {
                          const normalizedValue = sampleValue.toString().toUpperCase().trim()
                          const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
                          if (!supportedCurrencies.includes(normalizedValue) && sampleValue && sampleValue !== 'N/A') {
                            hasWarning = true
                            warningMessage = `Currency "${sampleValue}" will be mapped to USD. Supported: ${supportedCurrencies.join(', ')}`
                          }
                        }
                      }
                      
                      return (
                        <div key={index} className={`flex items-center gap-4 p-4 border rounded-lg ${hasWarning ? 'border-orange-200 bg-orange-50' : ''}`}>
                          <div className="flex-1">
                            <Label className="text-sm font-medium">{mapping.csvField}</Label>
                            <p className="text-xs text-gray-500 mt-1">
                              Sample: {sampleValue}
                            </p>
                            {hasWarning && (
                              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warningMessage}
                              </p>
                            )}
                          </div>
                          <div className="flex-1">
                            <Select
                              value={mapping.dbField || 'none'}
                              onValueChange={(value) => handleFieldMapping(mapping.csvField, value)}
                            >
                              <SelectTrigger className={hasWarning ? 'border-orange-300' : ''}>
                                <SelectValue placeholder="Don't import" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Don't import</SelectItem>
                                {PROJECT_FIELDS.map(field => (
                                  <SelectItem key={field.key} value={field.key}>
                                    {field.label} {field.required && '*'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20">
                            {mapping.mapped && mapping.dbField ? (
                              <Badge variant="outline" className={hasWarning ? "text-orange-600 border-orange-600" : "text-blue-600 border-blue-600"}>
                                {hasWarning ? 'Check' : 'Mapped'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400">
                                Unmapped
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Show client mapping for ALL CSV fields, not just auto-mapped ones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client Fields (Optional)
                  </CardTitle>
                  <CardDescription>
                    Map CSV fields to client information if you want to import client data as well.
                    <br />
                    <span className="text-sm text-blue-600 mt-2 block">
                      💡 All fields default to "Don't import". Select client fields only if your CSV contains client information.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {csvData.headers.map((header, index) => {
                      const mapping = clientMappings.find(m => m.csvField === header) || { csvField: header, dbField: '', mapped: false }
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">{header}</Label>
                            <p className="text-xs text-gray-500 mt-1">
                              Sample: {csvData.rows[0]?.[index] || 'N/A'}
                            </p>
                          </div>
                          <div className="flex-1">
                            <Select
                              value={mapping.dbField || 'none'}
                              onValueChange={(value) => handleFieldMapping(header, value, true)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Don't import" />
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
                            {mapping.mapped && mapping.dbField ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                Mapped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400">
                                Unmapped
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

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
                  <Users className="h-5 w-5" />
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
                          <span className="text-xs text-gray-500">{client.company}</span>
                        </div>
                      ))}
                      {detectedClients.length > 5 && (
                        <div className="text-xs text-gray-500 mt-2">
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
                    Import Projects {importClients && `& ${detectedClients.length} Clients`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <Card>
              <CardHeader>
                <CardTitle>Importing Projects</CardTitle>
                <CardDescription>
                  Please wait while we import your projects{importClients ? ' and clients' : ''}...
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
                  Your import has been completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Projects</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{importResults.projects.success}</div>
                        <div className="text-sm text-green-600">Successful</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{importResults.projects.errors}</div>
                        <div className="text-sm text-red-600">Errors</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{importResults.projects.total}</div>
                        <div className="text-sm text-gray-600">Total</div>
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
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">{importResults.clients.total}</div>
                          <div className="text-sm text-gray-600">Total</div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <Button onClick={() => {
                    // Refresh the projects page to show new data
                    window.location.href = '/dashboard/projects'
                  }}>
                    View Projects
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