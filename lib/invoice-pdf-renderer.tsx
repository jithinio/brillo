import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer'

interface InvoiceData {
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  amount: number
  tax_amount: number
  total_amount: number
  notes?: string
  clients?: {
    name: string
    email: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
  }
  items?: Array<{
    description: string
    details?: string
    quantity: number
    rate: number
    amount: number
  }>
  projects?: {
    name: string
  }
}

interface TemplateSettings {
  templateId: string
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  companyTaxId?: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  borderColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  currency: string
  showLogo: boolean
  showInvoiceNumber: boolean
  showDates: boolean
  showPaymentTerms: boolean
  showNotes: boolean
  showTaxId: boolean
  showItemDetails: boolean
  notes?: string
}

// Helper function to get currency symbol
const getCurrencySymbol = (currency: string) => {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    CNY: '¥',
    INR: '₹',
  }
  return symbols[currency] || '$'
}

// Helper function to format client address
const formatClientAddress = (client: any): string => {
  if (!client) return ''
  const parts = []
  if (client.address) parts.push(client.address)
  if (client.city || client.state || client.zip_code) {
    const cityStateZip = [client.city, client.state, client.zip_code].filter(Boolean).join(' ')
    if (cityStateZip) parts.push(cityStateZip)
  }
  if (client.country) parts.push(client.country)
  return parts.join('\n')
}

// Helper function to format date
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Stripe Template Component
const StripeTemplate: React.FC<{ invoice: InvoiceData; template: TemplateSettings }> = ({ invoice, template }) => {
  const currencySymbol = getCurrencySymbol(template.currency)
  
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: template.backgroundColor,
      padding: 48,
      fontFamily: 'Helvetica',
      fontSize: template.fontSize,
      lineHeight: template.lineHeight,
      color: template.primaryColor,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
    },
    logo: {
      width: 80,
      height: 80,
    },
    companyInfo: {
      textAlign: 'right',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    invoiceDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 40,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: template.secondaryColor,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    clientInfo: {
      fontSize: 14,
      lineHeight: 1.4,
    },
    table: {
      marginBottom: 30,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: template.borderColor + '20',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: template.borderColor,
    },
    tableRow: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: template.borderColor,
    },
    tableCell: {
      flex: 1,
      fontSize: 12,
    },
    tableCellHeader: {
      flex: 1,
      fontSize: 12,
      fontWeight: 'bold',
      color: template.primaryColor,
    },
    tableCellRight: {
      flex: 1,
      fontSize: 12,
      textAlign: 'right',
    },
    tableCellHeaderRight: {
      flex: 1,
      fontSize: 12,
      fontWeight: 'bold',
      color: template.primaryColor,
      textAlign: 'right',
    },
    totals: {
      marginTop: 20,
      alignItems: 'flex-end',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 200,
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 14,
      color: template.secondaryColor,
    },
    totalAmount: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    finalTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 200,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: template.primaryColor,
    },
    finalTotalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: template.primaryColor,
    },
    finalTotalAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: template.primaryColor,
    },
    statusBadge: {
      backgroundColor: template.accentColor + '20',
      color: template.accentColor,
      padding: '8 16',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    notes: {
      marginTop: 40,
      fontSize: 12,
      color: template.secondaryColor,
      lineHeight: 1.6,
    },
  })

  const invoiceItems = invoice.items && invoice.items.length > 0 ? invoice.items : [{
    description: invoice.projects?.name || 'Professional Services',
    details: invoice.notes,
    quantity: 1,
    rate: invoice.amount || 0,
    amount: invoice.amount || 0
  }]

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Invoice</Text>
          {template.showInvoiceNumber && (
            <Text style={styles.statusBadge}>#{invoice.invoice_number}</Text>
          )}
        </View>
        <View style={styles.companyInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
            {template.companyName}
          </Text>
          <Text style={{ fontSize: 12, color: template.secondaryColor }}>
            {template.companyAddress}
          </Text>
          <Text style={{ fontSize: 12, color: template.secondaryColor }}>
            {template.companyEmail}
          </Text>
          <Text style={{ fontSize: 12, color: template.secondaryColor }}>
            {template.companyPhone}
          </Text>
        </View>
      </View>

      {/* Invoice Details */}
      <View style={styles.invoiceDetails}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.clientInfo}>{invoice.clients?.name || 'Client Name'}</Text>
          <Text style={styles.clientInfo}>{formatClientAddress(invoice.clients)}</Text>
          {invoice.clients?.email && (
            <Text style={styles.clientInfo}>{invoice.clients.email}</Text>
          )}
        </View>
        
        {template.showDates && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: template.secondaryColor }}>Issue Date:</Text>
              <Text style={{ fontSize: 12 }}>{formatDate(invoice.issue_date)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: template.secondaryColor }}>Due Date:</Text>
              <Text style={{ fontSize: 12 }}>{formatDate(invoice.due_date)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: template.secondaryColor }}>Status:</Text>
              <Text style={styles.statusBadge}>{invoice.status}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Description</Text>
          <Text style={styles.tableCellHeaderRight}>Qty</Text>
          <Text style={styles.tableCellHeaderRight}>Rate</Text>
          <Text style={styles.tableCellHeaderRight}>Amount</Text>
        </View>
        
        {invoiceItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>
              {item.description}
              {item.details && (
                <Text style={{ fontSize: 10, color: template.secondaryColor }}>
                  {'\n' + item.details}
                </Text>
              )}
            </Text>
            <Text style={styles.tableCellRight}>{item.quantity}</Text>
            <Text style={styles.tableCellRight}>{currencySymbol}{item.rate.toFixed(2)}</Text>
            <Text style={styles.tableCellRight}>{currencySymbol}{item.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalAmount}>{currencySymbol}{invoice.amount?.toFixed(2) || '0.00'}</Text>
        </View>
        
        {invoice.tax_amount && invoice.tax_amount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalAmount}>{currencySymbol}{invoice.tax_amount.toFixed(2)}</Text>
          </View>
        )}
        
        <View style={styles.finalTotal}>
          <Text style={styles.finalTotalLabel}>Total:</Text>
          <Text style={styles.finalTotalAmount}>
            {currencySymbol}{invoice.total_amount?.toFixed(2) || invoice.amount?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {template.showNotes && (invoice.notes || template.notes) && (
        <View style={styles.notes}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text>{invoice.notes || template.notes}</Text>
        </View>
      )}

      {/* Payment Terms */}
      {template.showPaymentTerms && (
        <View style={styles.notes}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          <Text>Net 30 - Payment is due within 30 days of invoice date.</Text>
        </View>
      )}
    </Page>
  )
}

// Main Invoice Document Component
const InvoicePDF: React.FC<{ invoice: InvoiceData; template: TemplateSettings }> = ({ invoice, template }) => {
  return (
    <Document>
      <StripeTemplate invoice={invoice} template={template} />
    </Document>
  )
}

// Export function to generate PDF buffer
export const generateInvoicePDF = async (invoice: InvoiceData, template: TemplateSettings): Promise<Uint8Array> => {
  const doc = <InvoicePDF invoice={invoice} template={template} />
  const stream = await pdf(doc).toBlob()
  const arrayBuffer = await stream.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

// Export React component for download links
export { InvoicePDF }
export default InvoicePDF 