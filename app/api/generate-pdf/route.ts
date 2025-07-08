import { NextRequest, NextResponse } from 'next/server'
import { renderInvoiceHTML } from '@/lib/invoice-renderer'
import { createBrowser } from '@/lib/pdf-browser'

export async function POST(request: NextRequest) {
  try {
    const { invoice, template, companyInfo } = await request.json()
    
    console.log('🚀 Starting PDF generation for invoice:', invoice?.invoice_number)

    // Ensure template values are properly formatted (handle arrays)
    const normalizedTemplate = {
      ...template,
      logoSize: Array.isArray(template.logoSize) ? template.logoSize[0] : template.logoSize || 80,
      logoBorderRadius: Array.isArray(template.logoBorderRadius) ? template.logoBorderRadius[0] : template.logoBorderRadius || 8,
      invoicePadding: Array.isArray(template.invoicePadding) ? template.invoicePadding[0] : template.invoicePadding || 48,
      fontSize: Array.isArray(template.fontSize) ? template.fontSize[0] : template.fontSize || 14,
      lineHeight: Array.isArray(template.lineHeight) ? template.lineHeight[0] : template.lineHeight || 1.6,
      tableHeaderSize: Array.isArray(template.tableHeaderSize) ? template.tableHeaderSize[0] : template.tableHeaderSize || 13,
      // Include company information in the template
      companyName: companyInfo?.name || companyInfo?.companyName || template.companyName || 'Your Company',
      companyAddress: companyInfo?.address || companyInfo?.companyAddress || template.companyAddress || '123 Business St\nCity, State 12345',
      companyEmail: companyInfo?.email || companyInfo?.companyEmail || template.companyEmail || 'contact@yourcompany.com',
      companyPhone: companyInfo?.phone || companyInfo?.companyPhone || template.companyPhone || '+1 (555) 123-4567',
      companyTaxId: companyInfo?.taxId || companyInfo?.companyTaxId || template.companyTaxId || '',
      logoUrl: companyInfo?.logoUrl || template.logoUrl || ''
    }

    // Generate the complete HTML
    const invoiceHTML = await renderInvoiceHTML(invoice, normalizedTemplate)
    
    // Create complete HTML document with all necessary styles
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: ${normalizedTemplate.backgroundColor || '#FFFFFF'};
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .pdf-container {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background-color: ${normalizedTemplate.backgroundColor || '#FFFFFF'};
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Status badge specific styling for PDF */
    .status-badge {
      display: inline-block !important;
      padding: 8px 16px !important;
      border-radius: 9999px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      background-color: ${normalizedTemplate.accentColor}33 !important;
      color: ${normalizedTemplate.accentColor} !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Total amount cards specific styling for PDF */
    [style*="background-color: ${normalizedTemplate.primaryColor}"] {
      background-color: ${normalizedTemplate.primaryColor} !important;
      color: ${normalizedTemplate.backgroundColor}
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    [style*="background-color: ${normalizedTemplate.borderColor}20"] {
      background-color: ${normalizedTemplate.borderColor}20 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Ensure all colors are preserved */
    [style*="background-color"], [style*="color"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Table specific styling for PDF */
    table {
      border-collapse: collapse !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    th, td {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    [style*="border"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Grid system for proper layout */
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .gap-4 { gap: 1rem; }
    .gap-8 { gap: 2rem; }
    .gap-12 { gap: 3rem; }
    
    /* Spacing utilities */
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mb-16 { margin-bottom: 4rem; }
    
    /* Flexbox utilities */
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    
    /* Typography */
    .text-xs { font-size: 0.75rem; }
    .font-semibold { font-weight: 600; }
    .object-contain { object-fit: contain; }
    
    /* Ensure padding and margins are preserved */
    .p-8 { padding: 2rem !important; }
    .py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
    .rounded-lg { border-radius: 0.5rem !important; }
    

  </style>
</head>
<body>
  <div class="pdf-container">
    ${invoiceHTML}
  </div>
</body>
</html>`

    // Launch browser using the utility function
    let browser
    try {
      browser = await createBrowser()
    } catch (browserError) {
      console.error('❌ Failed to launch browser:', browserError)
      throw new Error(`Browser launch failed: ${browserError instanceof Error ? browserError.message : 'Unknown browser error'}`)
    }

    const page = await browser.newPage()
    
    // Set viewport to match A4 dimensions
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1
    })

    try {
      // Load the HTML content
      await page.setContent(fullHTML, {
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000
      })

      // Generate PDF with high quality settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        width: '794px',
        height: '1123px',
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '0',
          bottom: '0',
          left: '0',
          right: '0'
        }
      })
      
      console.log('✅ PDF generated successfully -', `${(pdfBuffer.length / 1024).toFixed(1)}KB`)

      await browser.close()

      // Return the PDF
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || 'preview'}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })

    } catch (pageError) {
      console.error('❌ Page operation failed:', pageError)
      await browser.close()
      throw new Error(`Page operation failed: ${pageError instanceof Error ? pageError.message : 'Unknown page error'}`)
    }

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