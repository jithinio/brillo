import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'
import { validateEmail, validateName, sanitizeText } from '@/lib/input-validation'
import FeedbackEmail from '@/emails/feedback-email'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { 
      name,
      email, 
      subject,
      message,
      feedbackType
    } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    const nameValidation = validateName(name, 'Name')
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      )
    }

    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      )
    }

    const messageValidation = sanitizeText(message, 2000)
    if (!messageValidation.isValid) {
      return NextResponse.json(
        { error: messageValidation.error },
        { status: 400 }
      )
    }

    if (subject) {
      const subjectValidation = sanitizeText(subject, 200)
      if (!subjectValidation.isValid) {
        return NextResponse.json(
          { error: subjectValidation.error },
          { status: 400 }
        )
      }
    }

    // Require Resend API key from environment variables
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey)

    // Prepare email content
    const emailSubject = subject || `New ${feedbackType || 'Feedback'} from ${name}`

    // Send email using Resend with React component
    const emailResult = await resend.emails.send({
      from: 'Brillo Feedback <noreply@jithin.io>',
      to: ['dev@jithin.io'],
      subject: emailSubject,
      react: FeedbackEmail({
        name,
        email,
        feedbackType: feedbackType || 'General Feedback',
        subject,
        message
      }),
      replyTo: email // Allow replies to go back to the user
    })

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error)
      
      const errorMessage = emailResult.error.message || 'Failed to send feedback'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.data?.id,
      message: 'Feedback sent successfully'
    })

  } catch (error) {
    console.error('Error sending feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}