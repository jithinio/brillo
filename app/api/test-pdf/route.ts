import { NextRequest, NextResponse } from 'next/server'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'

export async function GET() {
  try {
    console.log('🧪 Testing PDF generation with html2canvas + jsPDF...')
    
    // Sample invoice data
    const testInvoice = {
      invoice_number: 'INV-2024-001',
      issue_date: '2024-01-15',
      due_date: '2024-02-14',
      status: 'PENDING',
      amount: 1200.00,
      tax_amount: 120.00,
      total_amount: 1320.00,
      currency: 'USD',
      notes: 'Thank you for your business!',
      clients: {
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        address: '123 Business Ave',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        country: 'United States'
      },
      items: [
        {
          description: 'Web Development Services',
          details: 'Frontend and backend development',
          quantity: 40,
          rate: 25.00,
          amount: 1000.00
        },
        {
          description: 'Project Management',
          details: 'Coordination and planning',
          quantity: 8,
          rate: 25.00,
          amount: 200.00
        }
      ],
      projects: {
        name: 'Website Redesign Project'
      }
    }

    // Sample template settings
    const testTemplate = {
      templateId: 'modern',
      companyName: 'Your Company',
      companyAddress: '456 Company St\nBusiness City, BC 12345',
      companyEmail: 'hello@yourcompany.com',
      companyPhone: '+1 (555) 123-4567',
      companyTaxId: 'TAX-123456',
      logoUrl: '',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      accentColor: '#0066FF',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E5E5',
      fontFamily: 'inter',
      fontSize: [14],
      lineHeight: [1.6],
      currency: 'USD',
      showLogo: true,
      showInvoiceNumber: true,
      showDates: true,
      showPaymentTerms: true,
      showNotes: true,
      showTaxId: true,
      showItemDetails: true,
      notes: 'Payment terms: Net 30 days',
    }

    // Generate HTML for the invoice
    const invoiceHTML = await renderInvoiceHTML(testInvoice, testTemplate)
    
    // Return HTML that will be converted to PDF on the client side
    return NextResponse.json({ 
      html: invoiceHTML,
      success: true,
      message: 'Test HTML generated successfully! Convert to PDF on client side using html2canvas + jsPDF.'
    })
    
  } catch (error) {
    console.error('❌ Test PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate test PDF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 