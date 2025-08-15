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
  Button,
} from '@react-email/components'
import * as React from 'react'

interface RecurringProjectReminderProps {
  projectName: string
  clientName: string
  companyName: string
  dueDate: string
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  projectAmount: number
  currency: string
  projectUrl?: string
}

const RecurringProjectReminder = ({
  projectName = 'Web Maintenance',
  clientName = 'Valued Client',
  companyName = 'Your Company',
  dueDate = '2024-12-31',
  period = 'monthly',
  projectAmount = 1000,
  currency = 'USD',
  projectUrl
}: RecurringProjectReminderProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPeriodText = (p: string) => {
    const periodMap = {
      'weekly': 'week',
      'monthly': 'month',
      'quarterly': 'quarter',
      'yearly': 'year'
    }
    return periodMap[p] || p
  }

  const getNextPeriodText = (p: string) => {
    const periodMap = {
      'weekly': 'next week',
      'monthly': 'next month',
      'quarterly': 'next quarter',
      'yearly': 'next year'
    }
    return periodMap[p] || `next ${p}`
  }

  const previewText = `Invoice reminder: ${projectName} due on ${formatDate(dueDate)}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with subtle branding */}
          <Section style={header}>
            <Text style={brandText}>{companyName}</Text>
          </Section>

          {/* Main Card */}
          <Section style={card}>
            {/* Icon and Title */}
            <table style={iconTitleTable}>
              <tr>
                <td style={iconCell}>
                  <div style={iconWrapper}>
                    <Text style={iconText}>🔔</Text>
                  </div>
                </td>
                <td style={titleCell}>
                  <Heading style={h1}>Invoice Reminder</Heading>
                  <Text style={subtitle}>Recurring project payment due soon</Text>
                </td>
              </tr>
            </table>

            {/* Project Info Card */}
            <Section style={infoCard}>
              <Text style={projectTitle}>{projectName}</Text>
              <Text style={clientText}>For {clientName}</Text>
              
              <Hr style={divider} />
              
              {/* Key Details */}
              <table style={detailsTable}>
                <tr>
                  <td style={detailCell}>
                    <Text style={detailLabel}>Due Date</Text>
                    <Text style={detailValue}>{formatDate(dueDate)}</Text>
                  </td>
                  <td style={detailCell}>
                    <Text style={detailLabel}>Billing Period</Text>
                    <Text style={detailValue}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={detailCell}>
                    <Text style={detailLabel}>Amount</Text>
                    <Text style={detailValueLarge}>
                      {currency} {projectAmount.toLocaleString()}
                    </Text>
                  </td>
                  <td style={detailCell}>
                    <Text style={detailLabel}>Next Period</Text>
                    <Text style={detailValue}>{getNextPeriodText(period)}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Reminder Message */}
            <Section style={messageSection}>
              <Text style={messageText}>
                Your recurring project <strong>{projectName}</strong> will be due on{' '}
                <strong>{formatDate(dueDate)}</strong>. This is a friendly reminder to{' '}
                raise an invoice for the {getNextPeriodText(period)}.
              </Text>
            </Section>

            {/* Action Button */}
            <Section style={buttonSection}>
              <Button
                href={projectUrl || '#'}
                style={primaryButton}
              >
                Create Invoice
              </Button>
            </Section>

            {/* Additional Notes */}
            <Section style={notesSection}>
              <Text style={noteTitle}>Important Notes:</Text>
              <ul style={notesList}>
                <li style={noteItem}>
                  <Text style={noteText}>
                    If this project is no longer recurring, please update the project status in your dashboard
                  </Text>
                </li>
                <li style={noteItem}>
                  <Text style={noteText}>
                    To stop receiving these reminders, change the project status from Active/Due to Completed or Cancelled
                  </Text>
                </li>
                <li style={noteItem}>
                  <Text style={noteText}>
                    Updating the project due date will automatically adjust future reminder schedules
                  </Text>
                </li>
              </ul>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated reminder from {companyName}.
            </Text>
            <Text style={footerSmall}>
              If you have any questions about this project or need to make changes,{' '}
              please log in to your dashboard or contact support.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles - Clean, minimal, professional (inspired by Stripe)
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const brandText = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  padding: '32px',
}

const iconTitleTable = {
  width: '100%',
  marginBottom: '24px',
}

const iconCell = {
  width: '56px',
  verticalAlign: 'top',
}

const iconWrapper = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  backgroundColor: '#fef3c7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const iconText = {
  fontSize: '24px',
  margin: '0',
  lineHeight: '1',
}

const titleCell = {
  verticalAlign: 'middle',
  paddingLeft: '16px',
}

const h1 = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 4px',
  lineHeight: '1.2',
}

const subtitle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
}

const infoCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
}

const projectTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const clientText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 16px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const detailsTable = {
  width: '100%',
  borderCollapse: 'separate' as const,
  borderSpacing: '0 12px',
}

const detailCell = {
  width: '50%',
  verticalAlign: 'top',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const detailValue = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const detailValueLarge = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
}

const messageSection = {
  marginBottom: '24px',
}

const messageText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
}

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const primaryButton = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  transition: 'background-color 0.2s',
}

const notesSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  padding: '16px',
  marginBottom: '0',
}

const noteTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const notesList = {
  margin: '0',
  paddingLeft: '20px',
}

const noteItem = {
  marginBottom: '8px',
}

const noteText = {
  color: '#92400e',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.5',
}

const footer = {
  marginTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
}

export default RecurringProjectReminder
