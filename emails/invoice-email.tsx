import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import * as React from 'react'
import { CURRENCIES } from '@/lib/currency'

interface InvoiceEmailProps {
  invoiceNumber: string
  clientName: string
  companyName: string
  invoiceAmount: number
  currency: string
  dueDate: string
  customMessage: string
  invoiceHTML: string
  invoiceData?: {
    issue_date: string
    due_date: string
    amount: number
    tax_amount: number
    total_amount: number
    clients: {
      name: string
      company?: string
      email: string
    }
    items?: Array<{
      description: string
      quantity: number
      rate: number
      amount: number
    }>
    tax_rate?: number
    notes?: string
  }
}

const InvoiceEmail = ({
  invoiceNumber = 'INV-2024-001',
  clientName = 'Valued Client',
  companyName = 'Your Company',
  invoiceAmount = 1000,
  currency = 'USD',
  dueDate = '2024-12-31',
  customMessage = 'Thank you for your business!',
  invoiceHTML = '',
  invoiceData
}: InvoiceEmailProps) => {
  const getCurrencySymbol = (curr: string) => {
    const currencyConfig = CURRENCIES[curr]
    return currencyConfig?.symbol || '$'
  }

  const formatCurrency = (amount: number, curr: string) => {
    const currencyConfig = CURRENCIES[curr]
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

  const formatDate = (dateStr: string) => {
    // Use ISO date format for emails for consistency
    // This will be standardized format that works across all email clients
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const previewText = `Invoice ${invoiceNumber} from ${companyName} - ${getCurrencySymbol(currency)}${invoiceAmount.toFixed(2)}`

  // Use invoiceData if available, otherwise fall back to props
  const displayData = invoiceData || {
    issue_date: new Date().toISOString(),
    due_date: dueDate,
    amount: invoiceAmount,
    tax_amount: 0,
    total_amount: invoiceAmount,
    clients: {
      name: clientName,
      company: '',
      email: ''
    },
    items: []
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Invoice {invoiceNumber}</Heading>
            <Text style={subtitle}>From {companyName}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hello {displayData.clients.name},</Text>
            
            <Text style={paragraph}>
              {customMessage}
            </Text>

            {/* Modern Invoice Summary Card */}
            <Section style={summaryCard}>
              {/* Header without Icon */}
              <table style={summaryHeaderTable}>
                <tr>
                  <td style={summaryHeaderLeftCellNoIcon}>
                    <Text style={summaryTitle}>Invoice summary</Text>
                    <Text style={summarySubtitle}>Review the details below</Text>
                  </td>
                  <td style={summaryHeaderRightCell}>
                    <Text style={invoiceNumberLabel}>Invoice number</Text>
                    <Text style={invoiceNumberValue}>{invoiceNumber}</Text>
                  </td>
                </tr>
              </table>

              {/* Client & Date Info in One Row */}
              <table style={clientDateTable}>
                <tr>
                  <td style={clientCell}>
                    <Text style={labelText}>Bill to</Text>
                    <Text style={valueText}>{displayData.clients.name}</Text>
                    {displayData.clients.company && (
                      <Text style={companyText}>{displayData.clients.company}</Text>
                    )}
                  </td>
                  <td style={dateCell}>
                    <Text style={labelText}>Issue date</Text>
                    <Text style={valueText}>{formatDate(displayData.issue_date)}</Text>
                  </td>
                  <td style={dateCellLast}>
                    <Text style={labelText}>Due date</Text>
                    <Text style={valueText}>{formatDate(displayData.due_date)}</Text>
                  </td>
                </tr>
              </table>

              {/* Invoice Items */}
              {displayData.items && displayData.items.length > 0 && (
                <Section style={itemsSection}>
                  <div style={dividerContainer}>
                    <div style={dividerLine}></div>
                  </div>
                  <Text style={itemsTitle}>Items</Text>
                  <div style={itemsList}>
                    {displayData.items.map((item, index) => (
                      <table key={index} style={itemRowTable}>
                        <tr>
                          <td style={itemLeftCell}>
                            <Text style={itemDescription}>{item.description}</Text>
                            <Text style={itemDetails}>
                              {item.quantity} × {formatCurrency(item.rate, currency)}
                            </Text>
                          </td>
                          <td style={itemRightCell}>
                            <Text style={itemAmount}>
                              {formatCurrency(item.amount, currency)}
                            </Text>
                          </td>
                        </tr>
                      </table>
                    ))}
                  </div>
                </Section>
              )}

              {/* Amount Breakdown */}
              <Section style={amountSection}>
                <div style={dividerContainer}>
                  <div style={dividerLine}></div>
                </div>
                <table style={amountTable}>
                  <tr>
                    <td style={amountLabelCell}>
                      <Text style={amountLabel}>Subtotal</Text>
                    </td>
                    <td style={amountValueCell}>
                      <Text style={amountValue}>{formatCurrency(displayData.amount, currency)}</Text>
                    </td>
                  </tr>
                  
                  {displayData.tax_amount > 0 && (
                    <tr>
                      <td style={amountLabelCell}>
                        <Text style={amountLabel}>
                          Tax {displayData.tax_rate ? `(${displayData.tax_rate}%)` : ''}
                        </Text>
                      </td>
                      <td style={amountValueCell}>
                        <Text style={amountValue}>{formatCurrency(displayData.tax_amount, currency)}</Text>
                      </td>
                    </tr>
                  )}
                  
                                     <tr>
                     <td colSpan={2} style={totalDividerCell}>
                       <div style={totalDividerContainer}>
                         <div style={totalDividerLine}></div>
                       </div>
                     </td>
                   </tr>
                  
                  <tr>
                    <td style={totalLabelCell}>
                      <Text style={totalLabel}>Total</Text>
                    </td>
                    <td style={totalValueCell}>
                      <Text style={totalValue}>
                        {formatCurrency(displayData.total_amount, currency)}
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>
            </Section>

            <Text style={paragraph}>
              If you have any questions about this invoice, please don't hesitate to contact us.
            </Text>

            <Hr style={divider} />

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Best regards,<br />
                The {companyName} Team
              </Text>
              
              <Text style={footerSmall}>
                This is an automated email. Please do not reply to this message.
                If you need assistance, please contact us directly.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Base styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 24px',
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
}

const h1 = {
  color: '#1a202c',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 8px',
  lineHeight: '1.2',
}

const subtitle = {
  color: '#64748b',
  fontSize: '16px',
  margin: '0',
  fontWeight: '500',
}

const content = {
  padding: '24px',
}

const greeting = {
  color: '#1a202c',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

// Modern Summary Card Styles
const summaryCard = {
  backgroundColor: 'hsl(0, 0%, 98%)', // light gray background
  border: '1px solid #d4d4d8', // gray-200 equivalent
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
}

// Header table styles
const summaryHeaderTable = {
  width: '100%',
  marginBottom: '24px',
}

const summaryHeaderLeftCell = {
  verticalAlign: 'top',
  width: '60%',
}

const summaryHeaderLeftCellNoIcon = {
  verticalAlign: 'top',
  width: '60%',
}

const summaryHeaderLeftTable = {
  width: '100%',
}

const iconCell = {
  width: '48px',
  verticalAlign: 'top',
  paddingRight: '12px',
}

const iconContainer = {
  backgroundColor: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
}

const receiptIcon = {
  fontSize: '20px',
  color: '#4b5563',
  margin: '0',
  lineHeight: '1',
}

const summaryHeaderTextCell = {
  verticalAlign: 'top',
}

const summaryTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 4px',
  lineHeight: '1.2',
}

const summarySubtitle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
}

const summaryHeaderRightCell = {
  textAlign: 'right' as const,
  verticalAlign: 'top',
  width: '40%',
}

const invoiceNumberLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '400',
}

const invoiceNumberValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'monospace',
}

// Client and Date table styles
const clientDateTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const clientCell = {
  width: '40%',
  verticalAlign: 'top',
  paddingRight: '16px',
  padding: '0',
}

const dateCell = {
  width: '30%',
  verticalAlign: 'top',
  paddingRight: '16px',
  padding: '0 16px 0 0',
}

const dateCellLast = {
  width: '30%',
  verticalAlign: 'top',
  padding: '0',
}

const labelText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '400',
}

const valueText = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const companyText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '4px 0 0',
  fontWeight: '400',
}

const itemsSection = {
  marginBottom: '24px',
}

const fullWidthTable = {
  width: 'calc(100% + 48px)',
  marginLeft: '-24px',
  marginRight: '-24px',
}

const dividerContainer = {
  width: '100%',
  marginLeft: '-24px',
  marginRight: '-24px',
  marginBottom: '16px',
  paddingLeft: '24px',
  paddingRight: '24px',
}

const dividerLine = {
  height: '0px',
  borderTop: '1px dotted #d1d5db',
  width: '100%',
}

const dividerTable = {
  width: '100%',
  marginLeft: '-24px',
  marginRight: '-24px',
  marginBottom: '16px',
  borderCollapse: 'collapse' as const,
  tableLayout: 'fixed' as const,
}

const dividerCell = {
  height: '1px',
  borderTop: '1px dotted #d1d5db',
  padding: '0',
  margin: '0',
  fontSize: '1px',
  lineHeight: '1px',
  width: '100%',
}

const dottedDivider = {
  borderStyle: 'dotted',
  borderColor: '#d1d5db',
  borderWidth: '1px 0 0 0',
  margin: '0 0 16px 0',
}

const itemsTitle = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const itemsList = {
  display: 'block',
}

const itemRowTable = {
  width: '100%',
  marginBottom: '12px',
}

const itemLeftCell = {
  width: '70%',
  verticalAlign: 'top',
}

const itemDescription = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const itemDetails = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
}

const itemRightCell = {
  width: '30%',
  textAlign: 'right' as const,
  verticalAlign: 'top',
}

const itemAmount = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'monospace',
}

const amountSection = {
  marginBottom: '0',
}

const amountTable = {
  width: '100%',
}

const amountLabelCell = {
  width: '70%',
  paddingBottom: '12px',
}

const amountValueCell = {
  width: '30%',
  textAlign: 'right' as const,
  paddingBottom: '12px',
}

const amountLabel = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
}

const amountValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'monospace',
}

const totalDividerCell = {
  padding: '12px 0',
}

const totalDividerContainer = {
  width: '100%',
  margin: '0',
}

const totalDividerLine = {
  height: '0px',
  borderTop: '1px solid #f3f4f6',
  width: '100%',
}

const totalDividerTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const totalDividerTableCell = {
  height: '1px',
  borderTop: '1px solid #f3f4f6',
  padding: '0',
  fontSize: '1px',
  lineHeight: '1px',
}

const totalDivider = {
  borderColor: '#f3f4f6',
  margin: '0',
}

const totalLabelCell = {
  width: '70%',
  paddingTop: '12px',
}

const totalValueCell = {
  width: '30%',
  textAlign: 'right' as const,
  paddingTop: '12px',
}

const totalLabel = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const totalValue = {
  color: '#059669', // Green color for total
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
  fontFamily: 'monospace',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
}

const footer = {
  marginTop: '32px',
}

const footerText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0',
}

export default InvoiceEmail 