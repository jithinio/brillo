import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/invoice-pdf-renderer'

export async function GET() {
  try {
    console.log('🧪 Testing React-PDF generation...')
    
    // Create a test invoice
    const testInvoice = {
      invoice_number: 'TEST-001',
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DRAFT',
      amount: 1000,
      tax_amount: 80,
      total_amount: 1080,
      notes: 'This is a test invoice generated using React-PDF',
      clients: {
        name: 'Test Client',
        email: 'test@example.com',
        address: '123 Test St',
        city: 'Test City',
        state: 'TC',
        zip_code: '12345',
        country: 'Test Country'
      },
      items: [
        {
          description: 'Test Service',
          details: 'This is a test service item',
          quantity: 1,
          rate: 1000,
          amount: 1000
        }
      ]
    }
    
    // Create test template
    const testTemplate = {
      templateId: 'stripe-inspired',
      companyName: 'Test Company',
      companyAddress: '456 Company Ave\nBusiness City, BC 67890',
      companyEmail: 'hello@testcompany.com',
      companyPhone: '+1 (555) 123-4567',
      companyTaxId: 'TAX123456',
      logoUrl: '',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      accentColor: '#0066FF',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E5E5',
      fontFamily: 'helvetica',
      fontSize: 14,
      lineHeight: 1.6,
      currency: 'USD',
      showLogo: true,
      showInvoiceNumber: true,
      showDates: true,
      showPaymentTerms: true,
      showNotes: true,
      showTaxId: true,
      showItemDetails: true,
      notes: 'Thank you for your business!'
    }
    
    const pdfBuffer = await generateInvoicePDF(testInvoice, testTemplate)
    
    console.log('✅ React-PDF test successful!')
    console.log('📊 PDF size:', `${(pdfBuffer.length / 1024).toFixed(1)}KB`)
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('📋 Platform:', process.platform)
    console.log('🏗️ Architecture:', process.arch)
    console.log('⚡ Node Version:', process.version)
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-react-pdf.pdf"',
      },
    })
    
  } catch (error) {
    console.error('❌ React-PDF test failed:', error)
    return NextResponse.json(
      { 
        error: 'React-PDF test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 