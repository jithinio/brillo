import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/invoice-pdf-renderer'

export async function POST(request: NextRequest) {
  try {
    const { invoice, template, companyInfo } = await request.json()
    
    console.log('🚀 Starting PDF generation for invoice:', invoice?.invoice_number)
    console.log('📄 Using React-PDF renderer - serverless optimized')

    // Ensure template values are properly formatted (handle arrays)
    const normalizedTemplate = {
      templateId: template.templateId || 'stripe-inspired',
      companyName: companyInfo?.name || companyInfo?.companyName || template.companyName || 'Your Company',
      companyAddress: companyInfo?.address || companyInfo?.companyAddress || template.companyAddress || '123 Business St\nCity, State 12345',
      companyEmail: companyInfo?.email || companyInfo?.companyEmail || template.companyEmail || 'contact@yourcompany.com',
      companyPhone: companyInfo?.phone || companyInfo?.companyPhone || template.companyPhone || '+1 (555) 123-4567',
      companyTaxId: companyInfo?.taxId || companyInfo?.companyTaxId || template.companyTaxId || '',
      logoUrl: companyInfo?.logoUrl || template.logoUrl || '',
      primaryColor: template.primaryColor || '#000000',
      secondaryColor: template.secondaryColor || '#666666',
      accentColor: template.accentColor || '#0066FF',
      backgroundColor: template.backgroundColor || '#FFFFFF',
      borderColor: template.borderColor || '#E5E5E5',
      fontFamily: template.fontFamily || 'helvetica',
      fontSize: Array.isArray(template.fontSize) ? template.fontSize[0] : (template.fontSize || 14),
      lineHeight: Array.isArray(template.lineHeight) ? template.lineHeight[0] : (template.lineHeight || 1.6),
      currency: template.currency || 'USD',
      showLogo: template.showLogo !== undefined ? template.showLogo : true,
      showInvoiceNumber: template.showInvoiceNumber !== undefined ? template.showInvoiceNumber : true,
      showDates: template.showDates !== undefined ? template.showDates : true,
      showPaymentTerms: template.showPaymentTerms !== undefined ? template.showPaymentTerms : true,
      showNotes: template.showNotes !== undefined ? template.showNotes : true,
      showTaxId: template.showTaxId !== undefined ? template.showTaxId : false,
      showItemDetails: template.showItemDetails !== undefined ? template.showItemDetails : true,
      notes: template.notes || '',
    }

    // Generate PDF using React-PDF
    const pdfBuffer = await generateInvoicePDF(invoice, normalizedTemplate)
    
    console.log('✅ PDF generated successfully -', `${(pdfBuffer.length / 1024).toFixed(1)}KB`)

    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || 'preview'}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('❌ PDF generation failed:', error)
    
    // Log additional debugging information
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: 'PDF generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 