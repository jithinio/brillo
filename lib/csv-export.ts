// CSV Export Utilities
import { formatCurrency } from './currency'
import { format } from 'date-fns'

export interface ExportColumn {
  key: string
  header: string
  format?: (value: any, row: any) => string
}

export interface ExportOptions {
  filename: string
  columns: ExportColumn[]
  data: any[]
  includeHeaders?: boolean
}

// Helper function to escape CSV values
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const stringValue = String(value)
  
  // If the value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

// Format date values for CSV
export function formatDateForCSV(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    return format(dateObj, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

// Format currency values for CSV (remove currency symbols for clean numeric data)
export function formatCurrencyForCSV(amount: number | null | undefined, currency?: string): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0'
  return amount.toString()
}

// Main export function
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data, includeHeaders = true } = options
  
  let csvContent = ''
  
  // Add headers if requested
  if (includeHeaders) {
    const headers = columns.map(col => escapeCSVValue(col.header))
    csvContent += headers.join(',') + '\n'
  }
  
  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      const value = getNestedValue(row, col.key)
      
      if (col.format) {
        return escapeCSVValue(col.format(value, row))
      }
      
      return escapeCSVValue(value)
    })
    
    csvContent += values.join(',') + '\n'
  })
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Helper function to get nested object values (e.g., "client.name")
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}

// Invoice-specific export columns
export const invoiceExportColumns: ExportColumn[] = [
  { key: 'invoice_number', header: 'Invoice Number' },
  { 
    key: 'clients.name', 
    header: 'Client Name',
    format: (value) => value || 'No client'
  },
  { 
    key: 'clients.company', 
    header: 'Client Company',
    format: (value) => value || ''
  },
  { 
    key: 'clients.email', 
    header: 'Client Email',
    format: (value) => value || ''
  },
  { 
    key: 'projects.name', 
    header: 'Project Name',
    format: (value) => value || ''
  },
  { key: 'status', header: 'Status' },
  { 
    key: 'total_amount', 
    header: 'Total Amount',
    format: (value, row) => formatCurrencyForCSV(value, row.currency)
  },
  { 
    key: 'payment_received', 
    header: 'Payment Received',
    format: (value, row) => formatCurrencyForCSV(value, row.currency)
  },
  { 
    key: 'balance_due', 
    header: 'Balance Due',
    format: (value, row) => {
      const balanceDue = value || ((row.total_amount || 0) - (row.payment_received || 0))
      return formatCurrencyForCSV(balanceDue, row.currency)
    }
  },
  { 
    key: 'amount', 
    header: 'Subtotal',
    format: (value, row) => formatCurrencyForCSV(value, row.currency)
  },
  { 
    key: 'tax_amount', 
    header: 'Tax Amount',
    format: (value, row) => formatCurrencyForCSV(value, row.currency)
  },
  { key: 'currency', header: 'Currency' },
  { 
    key: 'issue_date', 
    header: 'Issue Date',
    format: (value) => formatDateForCSV(value)
  },
  { 
    key: 'due_date', 
    header: 'Due Date',
    format: (value) => formatDateForCSV(value)
  },
  { 
    key: 'created_at', 
    header: 'Created At',
    format: (value) => formatDateForCSV(value)
  },
  { key: 'notes', header: 'Notes' },
  { key: 'terms', header: 'Terms' }
]

// Project-specific export columns
export const projectExportColumns: ExportColumn[] = [
  { key: 'name', header: 'Project Name' },
  { 
    key: 'clients.name', 
    header: 'Client Name',
    format: (value) => value || 'No client'
  },
  { 
    key: 'clients.company', 
    header: 'Client Company',
    format: (value) => value || ''
  },
  { key: 'status', header: 'Status' },
  { 
    key: 'project_type', 
    header: 'Project Type',
    format: (value) => value || 'fixed'
  },
  { 
    key: 'total_budget', 
    header: 'Total Budget',
    format: (value) => formatCurrencyForCSV(value || 0)
  },
  { 
    key: 'expenses', 
    header: 'Expenses',
    format: (value) => formatCurrencyForCSV(value || 0)
  },
  { 
    key: 'received', 
    header: 'Received',
    format: (value) => formatCurrencyForCSV(value || 0)
  },
  { 
    key: 'pending', 
    header: 'Pending',
    format: (value, row) => {
      const pending = value ?? Math.max(0, (row.total_budget || row.budget || 0) - (row.payment_received || row.received || 0))
      return formatCurrencyForCSV(pending)
    }
  },
  { 
    key: 'recurring_amount', 
    header: 'Recurring Amount',
    format: (value) => formatCurrencyForCSV(value || 0)
  },
  { 
    key: 'hourly_rate_new', 
    header: 'Hourly Rate',
    format: (value, row) => formatCurrencyForCSV(value || row.hourly_rate || 0)
  },
  { 
    key: 'actual_hours', 
    header: 'Actual Hours',
    format: (value, row) => String(value || row.total_hours_logged || 0)
  },
  { 
    key: 'estimated_hours', 
    header: 'Estimated Hours',
    format: (value) => String(value || 0)
  },
  { 
    key: 'start_date', 
    header: 'Start Date',
    format: (value) => formatDateForCSV(value)
  },
  { 
    key: 'due_date', 
    header: 'Due Date',
    format: (value) => formatDateForCSV(value)
  },
  { 
    key: 'created_at', 
    header: 'Created At',
    format: (value) => formatDateForCSV(value)
  }
]

// Client-specific export columns
export const clientExportColumns: ExportColumn[] = [
  { key: 'name', header: 'Client Name' },
  { key: 'company', header: 'Company' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
  { key: 'city', header: 'City' },
  { key: 'state', header: 'State' },
  { key: 'zip_code', header: 'Zip Code' },
  { key: 'country', header: 'Country' },
  { 
    key: 'status', 
    header: 'Status',
    format: (value) => value || 'active'
  },
  { 
    key: 'relationship', 
    header: 'Relationship',
    format: (value) => value || 'regular'
  },
  { 
    key: 'projects', 
    header: 'Active Projects',
    format: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return '0'
      return String(value.length)
    }
  },
  { 
    key: 'created_at', 
    header: 'Client Since',
    format: (value) => formatDateForCSV(value)
  },
  { key: 'notes', header: 'Notes' }
]

// Export functions for each entity type
export function exportInvoices(invoices: any[], filename?: string) {
  exportToCSV({
    filename: filename || `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    columns: invoiceExportColumns,
    data: invoices
  })
}

export function exportProjects(projects: any[], filename?: string) {
  exportToCSV({
    filename: filename || `projects-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    columns: projectExportColumns,
    data: projects
  })
}

export function exportClients(clients: any[], filename?: string) {
  exportToCSV({
    filename: filename || `clients-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    columns: clientExportColumns,
    data: clients
  })
}
