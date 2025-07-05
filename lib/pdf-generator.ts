import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Invoice } from '@/components/invoices/columns'

interface GeneratePDFOptions {
  invoice: Invoice
  template?: {
    companyName: string
    companyAddress: string
    companyEmail: string
    companyPhone: string
    logoUrl?: string
    primaryColor: string
    accentColor: string
  }
  filename?: string
}

export async function generateInvoicePDF({ 
  invoice, 
  template, 
  filename 
}: GeneratePDFOptions): Promise<void> {
  try {
    // Create a temporary container
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = '794px' // A4 width in pixels at 96 DPI
    container.style.backgroundColor = 'white'
    document.body.appendChild(container)

    // Create a wrapper div for the invoice
    const wrapper = document.createElement('div')
    wrapper.style.width = '100%'
    wrapper.style.padding = '20px'
    wrapper.style.backgroundColor = 'white'
    wrapper.style.fontFamily = 'Arial, sans-serif'
    container.appendChild(wrapper)

    // Render the invoice content as HTML
    wrapper.innerHTML = await renderInvoiceToHTML(invoice, template)

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 500))

    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: container.scrollHeight,
      scrollX: 0,
      scrollY: 0
    })

    // Calculate dimensions for PDF
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Clean up
    document.body.removeChild(container)

    // Download the PDF
    const pdfFilename = filename || `${invoice.invoice_number}.pdf`
    pdf.save(pdfFilename)

  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

async function renderInvoiceToHTML(invoice: Invoice, template?: any): Promise<string> {
  const defaultTemplate = {
    companyName: "Your Company",
    companyAddress: "123 Business St\nCity, State 12345\nUnited States",
    companyEmail: "contact@yourcompany.com",
    companyPhone: "+1 (555) 123-4567",
    logoUrl: "",
    primaryColor: "#000000",
    accentColor: "#6366f1"
  }

  const currentTemplate = { ...defaultTemplate, ...template }

  // Format currency manually since we can't import the function here easily
  const formatAmount = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  return `
    <div style="
      background: white;
      color: black;
      padding: 32px;
      min-height: 700px;
      max-width: 794px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    ">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          ${currentTemplate.logoUrl ? `
            <img 
              src="${currentTemplate.logoUrl}" 
              alt="Company Logo" 
              style="width: 60px; height: 60px; object-fit: contain;"
            />
          ` : ''}
          <div>
            <h1 style="
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 12px;
              color: ${currentTemplate.primaryColor};
              margin: 0 0 12px 0;
            ">
              ${currentTemplate.companyName}
            </h1>
            <div style="font-size: 12px; color: #666; white-space: pre-line;">
              ${currentTemplate.companyAddress}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 8px;">
              ${currentTemplate.companyEmail} • ${currentTemplate.companyPhone}
            </div>
          </div>
        </div>
        
        <div style="text-align: right;">
          <h2 style="
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 12px;
            color: ${currentTemplate.accentColor};
            margin: 0 0 12px 0;
          ">
            INVOICE
          </h2>
          <div style="font-size: 12px; color: #666;">
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 500;">Invoice #:</span> ${invoice.invoice_number}
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: 500;">Date:</span> ${new Date(invoice.issue_date).toLocaleDateString()}
            </div>
            <div>
              <span style="font-weight: 500;">Due:</span> ${new Date(invoice.due_date).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <!-- Bill To Section -->
      <div style="margin-bottom: 32px;">
        <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 12px; margin: 0 0 12px 0;">Bill To:</h3>
        <div style="font-size: 12px; color: #374151;">
          <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">
            ${invoice.clients?.name || 'Client Name'}
          </div>
          ${invoice.clients?.company ? `<div style="margin-bottom: 4px;">${invoice.clients.company}</div>` : ''}
          ${(invoice.clients as any)?.email ? `<div>${(invoice.clients as any).email}</div>` : ''}
          ${(invoice.clients as any)?.phone ? `<div style="margin-top: 4px;">${(invoice.clients as any).phone}</div>` : ''}
          ${(invoice.clients as any)?.address ? `
            <div style="margin-top: 8px; font-size: 11px;">
              ${(invoice.clients as any).address}
              ${(invoice.clients as any).city && (invoice.clients as any).state ? `<br/>${(invoice.clients as any).city}, ${(invoice.clients as any).state} ${(invoice.clients as any).zip_code || ''}` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Project Info -->
      ${invoice.projects?.name ? `
        <div style="margin-bottom: 32px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          <div style="font-size: 12px;">
            <span style="font-weight: 500;">Project:</span> ${invoice.projects.name}
          </div>
          ${invoice.notes ? `
            <div style="font-size: 12px; margin-top: 8px;">
              <span style="font-weight: 500;">Description:</span> ${invoice.notes}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Services Table -->
      <div style="margin-bottom: 32px;">
        <div style="border-top: 2px solid #d1d5db; border-bottom: 2px solid #d1d5db; padding: 12px 0; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; font-weight: 600; font-size: 12px;">
            <div>Description</div>
            <div style="text-align: center;">Quantity</div>
            <div style="text-align: center;">Rate</div>
            <div style="text-align: right;">Amount</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          ${(invoice as any).items && (invoice as any).items.length > 0 ? 
            (invoice as any).items.map((item: any, index: number) => `
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; font-size: 12px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <div>
                  ${item.description || `Item ${index + 1}`}
                </div>
                <div style="text-align: center;">${item.quantity || 1}</div>
                <div style="text-align: center;">${formatAmount(item.rate || 0, invoice.currency)}</div>
                <div style="text-align: right; font-weight: 500;">${formatAmount((item.quantity || 1) * (item.rate || 0), invoice.currency)}</div>
              </div>
            `).join('')
            : `
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; font-size: 12px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <div>
                  ${invoice.projects?.name || 'Professional Services'}
                  ${invoice.notes ? `<div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${invoice.notes}</div>` : ''}
                </div>
                <div style="text-align: center;">1</div>
                <div style="text-align: center;">${formatAmount(invoice.amount, invoice.currency)}</div>
                <div style="text-align: right; font-weight: 500;">${formatAmount(invoice.amount, invoice.currency)}</div>
              </div>
            `
          }
        </div>
      </div>

      <!-- Totals Section -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
        <div style="width: 320px;">
          <div style="font-size: 12px;">
                         <div style="display: flex; justify-content: space-between; padding: 8px 0;">
               <span>Subtotal:</span>
               <span>${formatAmount(invoice.amount, invoice.currency)}</span>
             </div>
             
             ${invoice.tax_amount > 0 ? `
               <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                 <span>Tax:</span>
                 <span>${formatAmount(invoice.tax_amount, invoice.currency)}</span>
               </div>
             ` : ''}
             
             <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #d1d5db; font-weight: bold; font-size: 14px;">
               <span>Total:</span>
               <span style="color: ${currentTemplate.accentColor};">
                 ${formatAmount(invoice.total_amount, invoice.currency)}
               </span>
             </div>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div style="margin-bottom: 32px;">
        <div style="display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 10px; font-weight: 500;">
          <span style="color: #666;">Status: </span>
          <span style="
            font-weight: 600;
            color: ${
              invoice.status === 'paid' ? '#059669' :
              invoice.status === 'sent' ? '#2563eb' :
              invoice.status === 'overdue' ? '#dc2626' :
              '#666'
            };
          ">
            ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #d1d5db; font-size: 10px; color: #6b7280; text-align: center;">
        <div>Thank you for your business!</div>
        <div style="margin-top: 8px;">
          Please remit payment within 30 days of the due date.
        </div>
      </div>
    </div>
  `
} 