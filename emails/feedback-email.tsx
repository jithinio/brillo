import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface FeedbackEmailProps {
  name: string
  email: string
  feedbackType: string
  subject?: string
  message: string
}

const FeedbackEmail = ({
  name = 'Anonymous User',
  email = 'user@example.com',
  feedbackType = 'General Feedback',
  subject = '',
  message = 'No message provided'
}: FeedbackEmailProps) => {
  const previewText = `New ${feedbackType} from ${name} - ${subject || 'Feedback for Brillo'}`

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bug':
        return '#ef4444' // red
      case 'feature':
      case 'feature request':
        return '#3b82f6' // blue
      case 'improvement':
      case 'improvement suggestion':
        return '#8b5cf6' // purple
      case 'question':
        return '#f59e0b' // amber
      default:
        return '#10b981' // green for general
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bug':
        return '🐛'
      case 'feature':
      case 'feature request':
        return '✨'
      case 'improvement':
      case 'improvement suggestion':
        return '🚀'
      case 'question':
        return '❓'
      default:
        return '💬'
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>
              {getTypeIcon(feedbackType)} New Feedback Received
            </Heading>
            <Text style={subtitle}>From the Brillo application</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hello Dev Team,</Text>
            
            <Text style={paragraph}>
              You've received new feedback from a user on the Brillo platform. Here are the details:
            </Text>

            {/* Feedback Summary Card */}
            <Section style={feedbackCard}>
              {/* Header */}
              <table style={cardHeaderTable}>
                <tr>
                  <td style={cardHeaderLeftCell}>
                    <Text style={cardTitle}>Feedback Details</Text>
                    <Text style={cardSubtitle}>User submission from the app</Text>
                  </td>
                  <td style={cardHeaderRightCell}>
                    <div style={typeTag(getTypeColor(feedbackType))}>
                      <Text style={typeTagText}>{feedbackType}</Text>
                    </div>
                  </td>
                </tr>
              </table>

              {/* User Info */}
              <table style={userInfoTable}>
                <tr>
                  <td style={userInfoCell}>
                    <Text style={labelText}>From</Text>
                    <Text style={valueText}>{name}</Text>
                  </td>
                  <td style={userInfoCell}>
                    <Text style={labelText}>Email</Text>
                    <Text style={valueText}>
                      <Link href={`mailto:${email}`} style={emailLink}>
                        {email}
                      </Link>
                    </Text>
                  </td>
                  <td style={userInfoCellLast}>
                    <Text style={labelText}>Date</Text>
                    <Text style={valueText}>{new Date().toLocaleDateString()}</Text>
                  </td>
                </tr>
              </table>

              {/* Subject */}
              {subject && (
                <Section style={subjectSection}>
                  <div style={dividerContainer}>
                    <div style={dividerLine}></div>
                  </div>
                  <Text style={labelText}>Subject</Text>
                  <Text style={subjectText}>{subject}</Text>
                </Section>
              )}

              {/* Message */}
              <Section style={messageSection}>
                <div style={dividerContainer}>
                  <div style={dividerLine}></div>
                </div>
                <Text style={labelText}>Message</Text>
                <div style={messageBox}>
                  <Text style={messageText}>{message}</Text>
                </div>
              </Section>
            </Section>

            <Text style={paragraph}>
              You can reply directly to this email to respond to the user, or reach out to them at{' '}
              <Link href={`mailto:${email}`} style={emailLink}>
                {email}
              </Link>.
            </Text>

            <Hr style={divider} />

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Best regards,<br />
                Brillo Feedback System
              </Text>
              
              <Text style={footerSmall}>
                This email was automatically generated from the feedback form in your Brillo application.
                The user's email has been set as the reply-to address for easy responses.
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
  maxWidth: '580px',
}

const header = {
  padding: '32px 24px',
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
}

const h1 = {
  color: '#1a202c',
  fontSize: '28px',
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

// Feedback Card Styles
const feedbackCard = {
  backgroundColor: 'hsl(0, 0%, 98%)',
  border: '1px solid #d4d4d8',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
}

// Card Header
const cardHeaderTable = {
  width: '100%',
  marginBottom: '20px',
}

const cardHeaderLeftCell = {
  verticalAlign: 'top',
  width: '70%',
}

const cardHeaderRightCell = {
  textAlign: 'right' as const,
  verticalAlign: 'top',
  width: '30%',
}

const cardTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 4px',
  lineHeight: '1.2',
}

const cardSubtitle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
}

const typeTag = (color: string) => ({
  backgroundColor: color,
  borderRadius: '16px',
  padding: '4px 12px',
  display: 'inline-block',
})

const typeTagText = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

// User Info Table
const userInfoTable = {
  width: '100%',
  marginBottom: '20px',
  borderCollapse: 'collapse' as const,
}

const userInfoCell = {
  width: '33%',
  verticalAlign: 'top',
  paddingRight: '16px',
  padding: '0 16px 0 0',
}

const userInfoCellLast = {
  width: '33%',
  verticalAlign: 'top',
  padding: '0',
}

const labelText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const valueText = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '1.4',
}

const emailLink = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: '600',
}

// Subject Section
const subjectSection = {
  marginBottom: '20px',
}

const subjectText = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '1.4',
}

// Message Section
const messageSection = {
  marginBottom: '0',
}

const messageBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
  margin: '8px 0 0',
}

const messageText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
}

// Divider
const dividerContainer = {
  width: '100%',
  marginBottom: '16px',
  marginTop: '20px',
}

const dividerLine = {
  height: '0px',
  borderTop: '1px dotted #d1d5db',
  width: '100%',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
}

// Footer
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

export default FeedbackEmail