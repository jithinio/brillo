import { NextRequest, NextResponse } from 'next/server'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'

export async function POST(request: NextRequest) {
  try {
    const { invoice, template, companyInfo } = await request.json()
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice data is required' }, { status: 400 })
    }

    // Generate HTML for the invoice
    const invoiceHTML = await renderInvoiceHTML(invoice, template)
    
    // Return HTML that will be converted to PDF on the client side
    return NextResponse.json({ 
      html: invoiceHTML,
      success: true 
    })
    
  } catch (error) {
    console.error('❌ PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 