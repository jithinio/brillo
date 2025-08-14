import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'
import { validateEmail, validateName, sanitizeText } from '@/lib/input-validation'
import InvoiceEmail from '@/emails/invoice-email'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { 
      invoiceId, 
      clientEmail, 
      clientName, 
      customMessage,
      senderName,
      senderEmail,
      subject
    } = body

    // Validate required fields
    if (!invoiceId || !clientEmail) {
      return NextResponse.json(
        { error: 'Invoice ID and client email are required' },
        { status: 400 }
      )
    }

    // Validate and sanitize inputs
    const emailValidation = validateEmail(clientEmail)
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      )
    }

    if (clientName) {
      const nameValidation = validateName(clientName, 'Client name')
      if (!nameValidation.isValid) {
        return NextResponse.json(
          { error: nameValidation.error },
          { status: 400 }
        )
      }
    }

    if (customMessage) {
      const messageValidation = sanitizeText(customMessage, 1000)
      if (!messageValidation.isValid) {
        return NextResponse.json(
          { error: messageValidation.error },
          { status: 400 }
        )
      }
    }

    if (senderName) {
      const senderNameValidation = validateName(senderName, 'Sender name')
      if (!senderNameValidation.isValid) {
        return NextResponse.json(
          { error: senderNameValidation.error },
          { status: 400 }
        )
      }
    }

    if (senderEmail) {
      const senderEmailValidation = validateEmail(senderEmail)
      if (!senderEmailValidation.isValid) {
        return NextResponse.json(
          { error: senderEmailValidation.error },
          { status: 400 }
        )
      }
    }

    // Require Resend API key from environment variables for security
    const resendApiKey = process.env.RESEND_API_KEY
    
    // Validate Resend API key
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey)

    // Create server-side Supabase client with authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Database not configured. Email sending requires a database connection.' },
        { status: 500 }
      )
    }
    
    // Create supabase client with request context for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      },
    })
    
    // Fetch invoice data from database with items
    let invoiceData = null
    
    // Get current user for debugging
    const { data: userData, error: authError } = await supabase.auth.getUser()
    console.log('Send-invoice API - User authentication:', { 
      userId: userData?.user?.id,
      authError: authError?.message,
      invoiceId,
      hasAuthHeader: !!request.headers.get('Authorization')
    })
    
    // Invoice data is automatically filtered by RLS policies for the current user
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          country,
          company
        ),
        projects (
          id,
          name,
          description
        )
      `)
      .eq('id', invoiceId)
      .single()

      console.log('Send-invoice API - Database query result:', { 
        found: !!data, 
        error: error?.message,
        errorCode: error?.code,
        invoiceId
      })

      if (error) {
        console.error('Error fetching invoice:', error)
        
        // Check if this might be a demo/temporary invoice
        // Demo invoices have timestamp-based IDs like "1704396000000-abc123def"
        // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 parts, specific lengths)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isUuid = uuidPattern.test(invoiceId)
        
        const isDemoId = !isUuid && (
          invoiceId.startsWith('temp-') || 
          invoiceId.startsWith('demo-') ||
          /^\d{13}-/.test(invoiceId) // Starts with timestamp (13 digits)
        )
        
        if (isDemoId) {
          return NextResponse.json(
            { error: 'Demo invoices cannot be emailed. Please save the invoice to the database first.' },
            { status: 400 }
          )
        }
        
        // Check if it's an authentication issue
        if (authError || !userData?.user) {
          return NextResponse.json(
            { error: 'Authentication required to send invoices. Please log in and try again.' },
            { status: 401 }
          )
        }
        
        // Check for RLS policy issues
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          return NextResponse.json(
            { error: 'Invoice not found or access denied. This invoice may belong to a different user.' },
            { status: 403 }
          )
        }
        
        return NextResponse.json(
          { error: 'Invoice not found in database. Make sure the invoice is saved before sending.' },
          { status: 404 }
        )
      }

    invoiceData = data

    // Items are now stored as JSON in the invoice record itself
    // No need to fetch from separate invoice_items table

    // Get user's company settings for currency fallback
    let defaultCurrency = 'USD'
    if (userData.user?.id) {
      try {
        const { data: companySettings } = await supabase
          .from('company_settings')
          .select('default_currency, date_format')
          .eq('user_id', userData.user.id)
          .single()
        
        if (companySettings?.default_currency) {
          defaultCurrency = companySettings.default_currency
        }
      } catch (error) {
        console.warn('Could not fetch company settings for currency, using USD as fallback')
      }
    }

    // Determine final currency: invoice currency > user's default > system default (USD)
    const finalCurrency = invoiceData.currency || defaultCurrency || 'USD'
    console.log('Currency resolution:', {
      invoiceCurrency: invoiceData.currency,
      userDefaultCurrency: defaultCurrency,
      finalCurrency
    })

    // Get template settings (try both sources)
    const templateSettings = {
      templateId: 'modern',
      logoSize: [80],
      logoBorderRadius: [8],
      invoicePadding: [48],
      fontFamily: 'inter',
      fontSize: [14],
      lineHeight: [1.6],
      tableHeaderSize: [13],
      primaryColor: '#000000',
      secondaryColor: '#666666',
      accentColor: '#0066FF',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E5E5',
      currency: finalCurrency,
      showLogo: true,
      showInvoiceNumber: true,
      showDates: true,
      showPaymentTerms: true,
      showNotes: true,
      showTaxId: false,
      showItemDetails: true,
      companyName: senderName || 'Your Company',
      companyAddress: '123 Business St\nCity, State 12345',
      companyEmail: senderEmail || 'contact@yourcompany.com',
      companyPhone: '+1 (555) 123-4567',
      logoUrl: ''
    }

    // Generate invoice HTML for PDF (use user's date format from company settings)
    let userDateFormat = 'MM/DD/YYYY'
    if (userData.user?.id) {
      try {
        const { data: settingsForDate } = await supabase
          .from('company_settings')
          .select('date_format')
          .eq('user_id', userData.user.id)
          .single()
        
        if (settingsForDate?.date_format) {
          userDateFormat = settingsForDate.date_format
        }
      } catch (error) {
        console.warn('Could not fetch date format, using default')
      }
    }
    const invoiceHTML = await renderInvoiceHTML(invoiceData, templateSettings, userDateFormat)

    // Prepare email data with full invoice details
    const emailData = {
      invoiceNumber: invoiceData.invoice_number,
      clientName: clientName || invoiceData.clients?.name || 'Valued Client',
      companyName: templateSettings.companyName,
      invoiceAmount: invoiceData.total_amount,
      currency: finalCurrency, // Use the resolved currency
      dueDate: new Date(invoiceData.due_date).toLocaleDateString(),
      customMessage: customMessage || `Thank you for your business! Please find your invoice ${invoiceData.invoice_number} attached.`,
      invoiceHTML: invoiceHTML,
      invoiceData: {
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        amount: invoiceData.amount,
        tax_amount: invoiceData.tax_amount || 0,
        total_amount: invoiceData.total_amount,
        tax_rate: invoiceData.tax_rate || 0,
        clients: {
          name: invoiceData.clients?.name || clientName || 'Valued Client',
          company: invoiceData.clients?.company || '',
          email: invoiceData.clients?.email || clientEmail
        },
        items: invoiceData.items || [],
        notes: invoiceData.notes || ''
      }
    }

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: `${senderName || 'Your Company'} <noreply@jithin.io>`, // Use verified domain
      to: [clientEmail],
      subject: subject || `Invoice ${emailData.invoiceNumber} from ${emailData.companyName}`,
      react: InvoiceEmail(emailData),
      // TODO: Add PDF attachment here
      // attachments: [
      //   {
      //     filename: `invoice-${emailData.invoiceNumber}.pdf`,
      //     content: pdfBuffer
      //   }
      // ]
    })

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error)
      
      // Provide helpful error message
      const errorMessage = emailResult.error.message || 'Failed to send email'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Update invoice status to indicate it was sent
    await supabase
      .from('invoices')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    return NextResponse.json({
      success: true,
      messageId: emailResult.data?.id,
      message: 'Invoice sent successfully'
    })

  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 