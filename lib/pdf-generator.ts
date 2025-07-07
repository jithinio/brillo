import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function generatePDFFromElement(element: HTMLElement, fileName: string) {
  try {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement
    
    // Create a temporary container
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '794px' // A4 width in pixels at 96 DPI
    container.style.backgroundColor = 'white'
    
    // Append cloned element to container
    container.appendChild(clonedElement)
    document.body.appendChild(container)
    
    // Set the element to exact A4 dimensions
    clonedElement.style.width = '794px'
    clonedElement.style.minHeight = '1123px'
    clonedElement.style.maxWidth = '794px'
    clonedElement.style.margin = '0'
    clonedElement.style.boxSizing = 'border-box'
    
    // Wait for images to load
    await waitForImagesToLoad(container)
    
    // Wait a bit for layout to stabilize
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Force all computed styles to be inline
    await inlineAllStyles(clonedElement)
    
    // Generate canvas with better options
    const canvas = await html2canvas(clonedElement, {
      scale: 3, // Even higher quality
      useCORS: true,
      logging: false,
      backgroundColor: null,
      width: 794,
      height: Math.max(1123, clonedElement.scrollHeight),
      windowWidth: 794,
      windowHeight: 1123,
      x: 0,
      y: 0
    })
    
    // Remove temporary container
    document.body.removeChild(container)
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123], // A4 in pixels
      compress: true
    })
    
    // Calculate dimensions to fit page
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    // Add pages if needed
    let yPosition = 0
    const pageCount = Math.ceil(imgHeight / pageHeight)
    
    for (let i = 0; i < pageCount; i++) {
      if (i > 0) {
        pdf.addPage()
      }
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      pdf.addImage(
        imgData, 
        'PNG', 
        0, 
        -yPosition, 
        imgWidth, 
        imgHeight,
        undefined,
        'FAST'
      )
      
      yPosition += pageHeight
    }
    
    // Save PDF
    pdf.save(fileName)
    
    return true
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}

// Helper function to wait for all images to load
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img')
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve()
    return new Promise((resolve) => {
      img.addEventListener('load', resolve)
      img.addEventListener('error', resolve)
    })
  })
  await Promise.all(promises)
}

// Helper function to inline all computed styles
async function inlineAllStyles(element: HTMLElement): Promise<void> {
  const allElements = element.querySelectorAll('*')
  const elements = [element, ...Array.from(allElements)]
  
  elements.forEach((el) => {
    if (el instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(el)
      const importantProperties = [
        'color',
        'background-color',
        'background',
        'border',
        'border-color',
        'border-width',
        'border-style',
        'border-radius',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-top-width',
        'border-bottom-width',
        'border-top-color',
        'border-bottom-color',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'line-height',
        'letter-spacing',
        'text-align',
        'text-transform',
        'text-decoration',
        'white-space',
        'display',
        'flex',
        'flex-direction',
        'justify-content',
        'align-items',
        'flex-wrap',
        'flex-grow',
        'flex-shrink',
        'flex-basis',
        'gap',
        'width',
        'height',
        'min-width',
        'min-height',
        'max-width',
        'max-height',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'transform',
        'opacity',
        'overflow',
        'box-shadow',
        'text-shadow',
        'vertical-align',
        'box-sizing'
      ]
      
      importantProperties.forEach((property) => {
        const value = computedStyle.getPropertyValue(property)
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== 'initial' && value !== 'inherit') {
          // Skip 0px values for non-essential properties
          if (value === '0px' && ['margin', 'padding', 'border-width'].some(p => property.includes(p))) {
            return
          }
          el.style.setProperty(property, value, 'important')
        }
      })
    }
  })
}

export async function generatePDFFromHTML(invoice: any, template: any, container: HTMLElement) {
  try {
    // Get currency symbol
    const getCurrencySymbol = (currency: string) => {
      const symbols: { [key: string]: string } = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        AUD: 'A$',
        CAD: 'C$',
        CHF: 'Fr',
        CNY: '¥',
        INR: '₹',
      }
      return symbols[currency] || '$'
    }

    // Format currency
    const formatCurrency = (amount: number, currency: string = 'USD') => {
      return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
    }

    // Get font family
    const getFontFamily = () => {
      const fontMap: { [key: string]: string } = {
        'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        'helvetica': "'Helvetica Neue', Helvetica, Arial, sans-serif",
        'arial': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
        'roboto': "'Roboto', Arial, sans-serif",
        'opensans': "'Open Sans', Arial, sans-serif",
        'lato': "'Lato', Arial, sans-serif",
        'poppins': "'Poppins', Arial, sans-serif",
        'montserrat': "'Montserrat', Arial, sans-serif",
        'playfair': "'Playfair Display', Georgia, serif",
        'merriweather': "'Merriweather', Georgia, serif",
        'georgia': "Georgia, 'Times New Roman', serif",
        'times': "'Times New Roman', Times, serif",
        'sourcecodepro': "'Source Code Pro', 'Courier New', monospace",
        'jetbrains': "'JetBrains Mono', 'Courier New', monospace",
        'inconsolata': "'Inconsolata', 'Courier New', monospace"
      }
      return fontMap[template.fontFamily] || "'Inter', sans-serif"
    }

    // Extract values from arrays
    const fontSize = Array.isArray(template.fontSize) ? template.fontSize[0] : template.fontSize
    const padding = Array.isArray(template.invoicePadding) ? template.invoicePadding[0] : template.invoicePadding
    const lineHeight = Array.isArray(template.lineHeight) ? template.lineHeight[0] : template.lineHeight
    const logoSize = Array.isArray(template.logoSize) ? template.logoSize[0] : template.logoSize
    const logoBorderRadius = Array.isArray(template.logoBorderRadius) ? template.logoBorderRadius[0] : template.logoBorderRadius
    const tableHeaderSize = Array.isArray(template.tableHeaderSize) ? template.tableHeaderSize[0] : template.tableHeaderSize

    // Base styles
    const baseStyles = {
      fontFamily: getFontFamily(),
      fontSize: `${fontSize}px`,
      lineHeight: lineHeight,
      color: template.primaryColor,
      backgroundColor: template.backgroundColor,
      minHeight: '1123px',
      padding: `${padding}px`,
      width: '794px',
      boxSizing: 'border-box' as const
    }

    // Company info
    const companyInfo = {
      name: template.companyName || 'Your Company',
      address: template.companyAddress || '123 Business St\nCity, State 12345',
      email: template.companyEmail || 'contact@yourcompany.com',
      phone: template.companyPhone || '+1 (555) 123-4567',
      taxId: template.companyTaxId || template.taxId || '',
      logoUrl: template.logoUrl || ''
    }

    // Invoice data
    const invoiceData = {
      number: invoice.invoice_number,
      date: new Date(invoice.issue_date),
      dueDate: new Date(invoice.due_date),
      status: invoice.status || 'PENDING',
      client: {
        name: invoice.clients?.name || 'Client Name',
        address: formatClientAddress(invoice.clients),
        email: invoice.clients?.email || 'client@email.com'
      },
      items: invoice.items?.length > 0 ? invoice.items : [{
        description: invoice.projects?.name || 'Professional Services',
        details: invoice.notes,
        quantity: 1,
        rate: invoice.amount || 0,
        amount: invoice.amount || 0
      }],
      subtotal: invoice.amount || 0,
      tax: invoice.tax_amount || 0,
      total: invoice.total_amount || 0,
      paymentTerms: 'Net 30',
      notes: invoice.notes || template.notes || ''
    }

    // Format client address
    function formatClientAddress(client: any): string {
      if (!client) return ''
      const parts = []
      if (client.address) parts.push(client.address)
      if (client.city || client.state || client.zip_code) {
        const cityStateZip = [client.city, client.state, client.zip_code].filter(Boolean).join(' ')
        if (cityStateZip) parts.push(cityStateZip)
      }
      if (client.country) parts.push(client.country)
      return parts.join('\n')
    }

    // Generate HTML based on template
    let html = ''
    
    switch (template.templateId) {
      case 'contra-inspired':
        html = generateContraHTML()
        break
      case 'mercury-inspired':
        html = generateMercuryHTML()
        break
      case 'notion-inspired':
        html = generateNotionHTML()
        break
      default:
        html = generateStripeHTML()
    }

    // Helper function to generate Stripe template HTML
    function generateStripeHTML() {
      return `
        <div style="${styleToString(baseStyles)}">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px;">
            <div>
              ${template.showLogo && companyInfo.logoUrl ? `
                <img src="${companyInfo.logoUrl}" alt="Company Logo" style="height: ${logoSize}px; margin-bottom: 24px; border-radius: ${logoBorderRadius}px; object-fit: contain;">
              ` : ''}
              <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Invoice</div>
              ${template.showInvoiceNumber ? `
                <div style="color: ${template.secondaryColor}; font-size: 14px;">${invoiceData.number}</div>
              ` : ''}
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; margin-bottom: 4px;">${companyInfo.name}</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line;">${companyInfo.address}</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 8px;">${companyInfo.email}</div>
              ${template.showTaxId && companyInfo.taxId ? `
                <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 4px;">${companyInfo.taxId}</div>
              ` : ''}
            </div>
          </div>

          <!-- Bill To & Dates -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 48px;">
            <div>
              <div style="font-weight: 600; margin-bottom: 8px;">Bill To</div>
              <div style="margin-bottom: 4px;">${invoiceData.client.name}</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line;">${invoiceData.client.address}</div>
            </div>
            ${template.showDates ? `
              <div style="text-align: right;">
                <div style="margin-bottom: 8px;">
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Invoice Date: </span>
                  <span style="font-weight: 500;">${invoiceData.date.toLocaleDateString()}</span>
                </div>
                <div>
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Due Date: </span>
                  <span style="font-weight: 500;">${invoiceData.dueDate.toLocaleDateString()}</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 48px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid ${template.borderColor};">
                  <th style="text-align: left; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px;">Description</th>
                  <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px;">Qty</th>
                  <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px;">Rate</th>
                  <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map((item: any) => `
                  <tr style="border-bottom: 1px solid ${template.borderColor};">
                    <td style="padding: 16px 0;">
                      <div style="font-weight: 500;">${item.description}</div>
                      ${template.showItemDetails && item.details ? `
                        <div style="color: ${template.secondaryColor}; font-size: 13px; margin-top: 4px;">${item.details}</div>
                      ` : ''}
                    </td>
                    <td style="text-align: right; padding: 16px 0;">${item.quantity}</td>
                    <td style="text-align: right; padding: 16px 0;">${formatCurrency(item.rate, template.currency)}</td>
                    <td style="text-align: right; padding: 16px 0; font-weight: 500;">${formatCurrency(item.amount, template.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
            <div style="width: 256px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: ${template.secondaryColor};">Subtotal</span>
                <span>${formatCurrency(invoiceData.subtotal, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: ${template.secondaryColor};">Tax</span>
                <span>${formatCurrency(invoiceData.tax, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; border-top: 2px solid ${template.primaryColor};">
                <span style="font-weight: 600;">Total</span>
                <span style="font-weight: 600; font-size: 18px; color: ${template.accentColor};">${formatCurrency(invoiceData.total, template.currency)}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${template.showNotes && invoiceData.notes ? `
            <div>
              <div style="font-weight: 600; margin-bottom: 8px;">Notes</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px;">${invoiceData.notes}</div>
            </div>
          ` : ''}
        </div>
      `
    }

    // Generate other template HTML functions...
    function generateContraHTML() {
      return `
        <div style="${styleToString(baseStyles)}">
          <!-- Bold Header -->
          <div style="margin-bottom: 64px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
              ${template.showLogo && companyInfo.logoUrl ? `
                <img src="${companyInfo.logoUrl}" alt="Logo" style="height: ${logoSize}px; border-radius: ${logoBorderRadius}px;">
              ` : ''}
              <div style="padding: 8px 16px; border-radius: 999px; background-color: ${template.accentColor}20; color: ${template.accentColor}; font-size: 14px; font-weight: 500;">
                ${invoiceData.status.toUpperCase()}
              </div>
            </div>

            <h1 style="font-size: 48px; font-weight: 700; letter-spacing: -0.8px; margin: 0 0 16px 0; color: ${template.primaryColor};">
              Invoice
            </h1>
            
            <div style="display: flex; gap: 16px; font-size: 14px;">
              ${template.showInvoiceNumber ? `
                <div>
                  <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Invoice Number</div>
                  <div style="font-weight: 600; color: ${template.primaryColor};">${invoiceData.number}</div>
                </div>
              ` : ''}
              ${template.showDates ? `
                <div style="margin-left: 16px;">
                  <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Issue Date</div>
                  <div style="font-weight: 600; color: ${template.primaryColor};">${invoiceData.date.toLocaleDateString()}</div>
                </div>
                <div style="margin-left: 16px;">
                  <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Due Date</div>
                  <div style="font-weight: 600; color: ${template.primaryColor};">${invoiceData.dueDate.toLocaleDateString()}</div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- From/To Section -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 64px;">
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${template.accentColor}; margin-bottom: 16px;">
                FROM
              </div>
              <div style="font-weight: 600; font-size: 20px; margin-bottom: 8px; color: ${template.primaryColor};">
                ${companyInfo.name}
              </div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; line-height: 1.6; white-space: pre-line;">
                ${companyInfo.address}
              </div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 8px;">
                ${companyInfo.email}<br>${companyInfo.phone}
              </div>
            </div>

            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${template.accentColor}; margin-bottom: 16px;">
                BILL TO
              </div>
              <div style="font-weight: 600; font-size: 20px; margin-bottom: 8px; color: ${template.primaryColor};">
                ${invoiceData.client.name}
              </div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; line-height: 1.6; white-space: pre-line;">
                ${invoiceData.client.address}
              </div>
              ${invoiceData.client.email ? `
                <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 8px;">
                  ${invoiceData.client.email}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Services -->
          <div style="margin-bottom: 64px;">
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 24px; color: ${template.primaryColor};">
              Services
            </div>
            
            <div style="border-top: 2px solid ${template.borderColor};">
              <!-- Table Header -->
              <div style="display: flex; padding: 12px 0; border-bottom: 2px solid ${template.borderColor};">
                <div style="flex: 3; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Item</div>
                <div style="flex: 1; text-align: center; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Qty</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Rate</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Total</div>
              </div>

              <!-- Items -->
              ${invoiceData.items.map((item: any, index: number) => `
                <div style="display: flex; padding: 24px 0; ${index < invoiceData.items.length - 1 ? `border-bottom: 1px solid ${template.borderColor};` : ''}">
                  <div style="flex: 3;">
                    <div style="font-weight: 600; font-size: 16px; color: ${template.primaryColor};">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 4px;">${item.details}</div>
                    ` : ''}
                  </div>
                  <div style="flex: 1; text-align: center; font-weight: 600; color: ${template.primaryColor};">${item.quantity}</div>
                  <div style="flex: 1; text-align: right; font-weight: 600; color: ${template.primaryColor};">${formatCurrency(item.rate, template.currency)}</div>
                  <div style="flex: 1; text-align: right; font-weight: 600; font-size: 16px; color: ${template.primaryColor};">${formatCurrency(item.amount, template.currency)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Total -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 64px;">
            <div style="width: 320px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                <span style="color: ${template.secondaryColor};">Subtotal</span>
                <span style="font-weight: 600; color: ${template.primaryColor};">${formatCurrency(invoiceData.subtotal, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                <span style="color: ${template.secondaryColor};">Tax</span>
                <span style="font-weight: 600; color: ${template.primaryColor};">${formatCurrency(invoiceData.tax, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; margin-top: 8px; border-top: 3px solid ${template.accentColor};">
                <span style="font-weight: 700; font-size: 20px; color: ${template.primaryColor};">Total</span>
                <span style="font-weight: 700; font-size: 28px; color: ${template.accentColor};">${formatCurrency(invoiceData.total, template.currency)}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${template.showNotes && invoiceData.notes ? `
            <div style="background-color: ${template.borderColor}40; padding: 24px; border-radius: 8px;">
              <div style="font-weight: 700; margin-bottom: 8px; color: ${template.primaryColor};">Notes</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px;">${invoiceData.notes}</div>
            </div>
          ` : ''}
        </div>
      `
    }

    function generateMercuryHTML() {
      return `
        <div style="${styleToString(baseStyles)}">
          <!-- Header -->
          <div style="margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                ${template.showLogo && companyInfo.logoUrl ? `
                  <img src="${companyInfo.logoUrl}" alt="Company Logo" style="height: ${logoSize}px; margin-bottom: 12px; border-radius: ${logoBorderRadius}px;">
                ` : ''}
                <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px; color: ${template.primaryColor};">
                  ${companyInfo.name}
                </div>
                <div style="color: ${template.secondaryColor}; font-size: 12px; line-height: 1.4;">
                  ${companyInfo.address.split('\n').join(' • ')}
                </div>
                <div style="color: ${template.secondaryColor}; font-size: 12px;">
                  ${companyInfo.email}
                </div>
              </div>
              
              <div style="text-align: right;">
                <div style="font-size: 32px; font-weight: 800; color: ${template.accentColor}; margin-bottom: 8px;">
                  INVOICE
                </div>
                ${template.showInvoiceNumber ? `
                  <div style="font-size: 14px; font-weight: 600; color: ${template.primaryColor};">
                    ${invoiceData.number}
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="height: 3px; background-color: ${template.accentColor}; border-radius: 2px;"></div>
          </div>

          <!-- Company Details Grid -->
          <div style="display: flex; gap: 32px; margin-bottom: 48px;">
            <div style="flex: 1;">
              <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                From
              </div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 600; color: ${template.primaryColor};">${companyInfo.name}</div>
                <div style="color: ${template.secondaryColor}; white-space: pre-line;">
                  ${companyInfo.address}
                </div>
                <div style="color: ${template.secondaryColor}; margin-top: 4px;">
                  ${companyInfo.email}<br/>${companyInfo.phone}
                </div>
              </div>
            </div>

            <div style="flex: 1;">
              <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                To
              </div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px; color: ${template.primaryColor};">
                  ${invoiceData.client.name}
                </div>
                <div style="color: ${template.secondaryColor}; white-space: pre-line;">
                  ${invoiceData.client.address}
                </div>
              </div>
            </div>

            ${template.showDates ? `
              <div style="flex: 1;">
                <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Details
                </div>
                <div style="font-size: 14px; line-height: 1.8;">
                  <div>
                    <span style="color: ${template.secondaryColor};">Date: </span>
                    <span style="font-weight: 600; color: ${template.primaryColor};">${invoiceData.date.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span style="color: ${template.secondaryColor};">Due: </span>
                    <span style="font-weight: 600; color: ${template.primaryColor};">${invoiceData.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 48px;">
            <div style="border-radius: 12px; overflow: hidden; border: 1px solid ${template.borderColor};">
              <!-- Table Header -->
              <div style="background-color: ${template.primaryColor}; color: ${template.backgroundColor}; padding: 16px; display: flex;">
                <div style="flex: 6; font-weight: 700; font-size: ${tableHeaderSize}px;">Description</div>
                <div style="flex: 1; text-align: center; font-weight: 700; font-size: ${tableHeaderSize}px;">Quantity</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px;">Rate</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px;">Amount</div>
              </div>

              <!-- Table Body -->
              ${invoiceData.items.map((item: any, idx: number) => `
                <div style="padding: 16px; display: flex; ${idx < invoiceData.items.length - 1 ? `border-bottom: 1px solid ${template.borderColor};` : ''} ${idx % 2 === 1 ? `background-color: ${template.borderColor}10;` : ''}">
                  <div style="flex: 6;">
                    <div style="font-weight: 600; color: ${template.primaryColor};">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 13px; margin-top: 4px; line-height: 1.5;">${item.details}</div>
                    ` : ''}
                  </div>
                  <div style="flex: 1; text-align: center; font-weight: 600; color: ${template.primaryColor};">${item.quantity}</div>
                  <div style="flex: 1; text-align: right; font-weight: 600; color: ${template.primaryColor};">${formatCurrency(item.rate, template.currency)}</div>
                  <div style="flex: 1; text-align: right; font-weight: 600; font-size: 16px; color: ${template.primaryColor};">${formatCurrency(item.amount, template.currency)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Summary -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
            <div style="width: 384px; border-radius: 12px; background-color: ${template.borderColor}20; border: 1px solid ${template.borderColor}; padding: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <span style="color: ${template.secondaryColor}; font-size: 14px;">Subtotal</span>
                <span style="font-weight: 600; font-size: 16px; color: ${template.primaryColor};">${formatCurrency(invoiceData.subtotal, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <span style="color: ${template.secondaryColor}; font-size: 14px;">Tax (10%)</span>
                <span style="font-weight: 600; font-size: 16px; color: ${template.primaryColor};">${formatCurrency(invoiceData.tax, template.currency)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid ${template.accentColor};">
                <span style="font-weight: 700; font-size: 18px; color: ${template.primaryColor};">Total Due</span>
                <span style="font-weight: 700; font-size: 24px; color: ${template.accentColor};">${formatCurrency(invoiceData.total, template.currency)}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${(template.showPaymentTerms || (template.showNotes && invoiceData.notes)) ? `
            <div style="padding: 24px; border-radius: 12px; background-color: ${template.accentColor}08; border: 1px solid ${template.accentColor}20;">
              ${template.showPaymentTerms ? `
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 700; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.3px; text-transform: uppercase;">
                    Payment Terms
                  </div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    Net 30
                  </div>
                </div>
              ` : ''}
              ${template.showNotes && invoiceData.notes ? `
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.3px; text-transform: uppercase;">
                    Notes
                  </div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    ${invoiceData.notes}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `
    }

    function generateNotionHTML() {
      return `
        <div style="${styleToString(baseStyles)}">
          <!-- Header -->
          <div style="border-bottom: 2px solid ${template.borderColor}; padding-bottom: 16px; margin-bottom: 36px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                ${template.showLogo && companyInfo.logoUrl ? `
                  <img src="${companyInfo.logoUrl}" alt="Company Logo" style="height: ${logoSize}px; margin-bottom: 12px; border-radius: ${logoBorderRadius}px;">
                ` : ''}
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px; color: ${template.primaryColor};">
                  Invoice
                </div>
                ${template.showInvoiceNumber ? `
                  <div style="color: ${template.secondaryColor}; font-size: 12px;">${invoiceData.number}</div>
                ` : ''}
              </div>
              
              <div style="text-align: right;">
                <div style="font-weight: 700; color: ${template.primaryColor};">${companyInfo.name}</div>
                <div style="color: ${template.secondaryColor}; font-size: 12px; line-height: 1.4; white-space: pre-line;">
                  ${companyInfo.address}
                </div>
                <div style="color: ${template.secondaryColor}; font-size: 12px;">${companyInfo.email}</div>
                ${template.showTaxId && companyInfo.taxId ? `
                  <div style="color: ${template.secondaryColor}; font-size: 12px;">${companyInfo.taxId}</div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Info Blocks -->
          <div style="display: flex; gap: 16px; margin-bottom: 48px;">
            <div style="flex: 1; padding: 20px; border-radius: 8px; background-color: ${template.backgroundColor}; border: 1px solid ${template.borderColor}60;">
              <div style="font-size: 11px; color: ${template.secondaryColor}; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                FROM
              </div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 700; margin-bottom: 6px; font-size: 16px; color: ${template.primaryColor};">
                  ${companyInfo.name}
                </div>
                <div style="color: ${template.secondaryColor}; line-height: 1.6; white-space: pre-line;">
                  ${companyInfo.address}
                </div>
              </div>
            </div>

            <div style="flex: 1; padding: 20px; border-radius: 8px; background-color: ${template.backgroundColor}; border: 1px solid ${template.borderColor}60;">
              <div style="font-size: 11px; color: ${template.secondaryColor}; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                TO
              </div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 700; margin-bottom: 6px; font-size: 16px; color: ${template.primaryColor};">
                  ${invoiceData.client.name}
                </div>
                <div style="color: ${template.secondaryColor}; line-height: 1.6; white-space: pre-line;">
                  ${invoiceData.client.address}
                </div>
              </div>
            </div>

            ${template.showDates ? `
              <div style="flex: 1; padding: 20px; border-radius: 8px; background-color: ${template.backgroundColor}; border: 1px solid ${template.borderColor}60;">
                <div style="font-size: 11px; color: ${template.secondaryColor}; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                  DETAILS
                </div>
                <div style="font-size: 14px; line-height: 1.8;">
                  <div>
                    <span style="color: ${template.secondaryColor};">Date: </span>
                    <span style="font-weight: 700; color: ${template.primaryColor};">${invoiceData.date.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span style="color: ${template.secondaryColor};">Due: </span>
                    <span style="font-weight: 700; color: ${template.primaryColor};">${invoiceData.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 48px;">
            <div style="border: 1px solid ${template.borderColor}; border-radius: 8px; overflow: hidden;">
              <div style="display: flex; border-bottom: 1px solid ${template.borderColor}; background-color: ${template.accentColor}08; padding: 12px 16px;">
                <div style="flex: 4; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Description</div>
                <div style="flex: 1; text-align: center; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Qty</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Rate</div>
                <div style="flex: 1; text-align: right; font-weight: 700; font-size: ${tableHeaderSize}px; color: ${template.primaryColor};">Amount</div>
              </div>

              ${invoiceData.items.map((item: any, idx: number) => `
                <div style="display: flex; padding: 16px; ${idx < invoiceData.items.length - 1 ? `border-bottom: 1px solid ${template.borderColor};` : ''}">
                  <div style="flex: 4;">
                    <div style="font-weight: 700; color: ${template.primaryColor};">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 13px; margin-top: 4px; line-height: 1.5;">${item.details}</div>
                    ` : ''}
                  </div>
                  <div style="flex: 1; text-align: center; color: ${template.primaryColor};">${item.quantity}</div>
                  <div style="flex: 1; text-align: right; color: ${template.primaryColor};">${formatCurrency(item.rate, template.currency)}</div>
                  <div style="flex: 1; text-align: right; font-weight: 700; color: ${template.primaryColor};">${formatCurrency(item.amount, template.currency)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
            <div style="width: 288px;">
              <div style="background-color: ${template.borderColor}10; padding: 20px; border-radius: 12px; border: 1px solid ${template.borderColor}40;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Subtotal</span>
                  <span style="font-size: 15px; font-weight: 700; color: ${template.primaryColor};">${formatCurrency(invoiceData.subtotal, template.currency)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Tax (10%)</span>
                  <span style="font-size: 15px; font-weight: 700; color: ${template.primaryColor};">${formatCurrency(invoiceData.tax, template.currency)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid ${template.accentColor}30;">
                  <span style="font-weight: 700; font-size: 16px; color: ${template.primaryColor};">Total</span>
                  <span style="font-weight: 700; font-size: 22px; color: ${template.accentColor};">${formatCurrency(invoiceData.total, template.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${(template.showPaymentTerms || (template.showNotes && invoiceData.notes)) ? `
            <div style="padding: 24px; border-radius: 12px; background-color: ${template.accentColor}08; border: 1px solid ${template.accentColor}20;">
              ${template.showPaymentTerms ? `
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 700; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.3px; text-transform: uppercase;">
                    Payment Terms
                  </div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    Net 30
                  </div>
                </div>
              ` : ''}
              ${template.showNotes && invoiceData.notes ? `
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.3px; text-transform: uppercase;">
                    Notes
                  </div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    ${invoiceData.notes}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `
    }

    // Helper to convert style object to string
    function styleToString(styles: any): string {
      return Object.entries(styles)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ')
    }

    // Set the HTML content
    container.innerHTML = html

    // Wait for images to load
    await waitForImagesToLoad(container)

    // Generate PDF
    await generatePDFFromElement(container.firstElementChild as HTMLElement, `${invoice.invoice_number}.pdf`)

  } catch (error) {
    console.error('Error generating PDF from HTML:', error)
    throw error
  }
}

export async function generatePDFFromPreview(invoice: any, template: any): Promise<void> {
  try {
    // Create a virtual container for rendering
    const virtualContainer = document.createElement('div')
    virtualContainer.style.position = 'fixed'
    virtualContainer.style.top = '0'
    virtualContainer.style.left = '0'
    virtualContainer.style.width = '100vw'
    virtualContainer.style.height = '100vh'
    virtualContainer.style.backgroundColor = 'rgba(0,0,0,0.9)'
    virtualContainer.style.zIndex = '99999'
    virtualContainer.style.display = 'flex'
    virtualContainer.style.alignItems = 'center'
    virtualContainer.style.justifyContent = 'center'
    
    // Create the invoice container
    const invoiceContainer = document.createElement('div')
    invoiceContainer.style.width = '210mm'
    invoiceContainer.style.minHeight = '297mm'
    invoiceContainer.style.backgroundColor = template.backgroundColor || '#FFFFFF'
    invoiceContainer.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)'
    invoiceContainer.style.position = 'relative'
    invoiceContainer.id = 'pdf-invoice-preview'
    
    // Import the invoice renderer
    const { renderInvoiceHTML } = await import('@/lib/invoice-renderer')
    
    // Render the invoice HTML
    invoiceContainer.innerHTML = await renderInvoiceHTML(invoice, template)
    
    // Add to virtual container
    virtualContainer.appendChild(invoiceContainer)
    document.body.appendChild(virtualContainer)
    
    // Show loading indicator
    const loadingDiv = document.createElement('div')
    loadingDiv.style.position = 'absolute'
    loadingDiv.style.top = '20px'
    loadingDiv.style.right = '20px'
    loadingDiv.style.padding = '10px 20px'
    loadingDiv.style.backgroundColor = 'white'
    loadingDiv.style.borderRadius = '8px'
    loadingDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'
    loadingDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 10px;"><div class="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div><span>Generating PDF...</span></div>'
    virtualContainer.appendChild(loadingDiv)
    
    // Wait for any images to load
    await waitForImagesToLoad(invoiceContainer)
    
    // Wait a bit for styles to settle
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Remove loading indicator
    loadingDiv.remove()
    
    // Capture the invoice as canvas
    const canvas = await html2canvas(invoiceContainer, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: template.backgroundColor || '#FFFFFF',
      width: invoiceContainer.offsetWidth,
      height: invoiceContainer.offsetHeight,
      windowWidth: invoiceContainer.offsetWidth,
      windowHeight: invoiceContainer.offsetHeight,
    })
    
    // Remove virtual container
    document.body.removeChild(virtualContainer)
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })
    
    // Calculate dimensions
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // Convert canvas to image
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    
    // Calculate image dimensions to fit A4
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width
    
    // Check if we need multiple pages
    if (imgHeight > pdfHeight) {
      // Multi-page PDF
      let position = 0
      let pageCount = Math.ceil(imgHeight / pdfHeight)
      
      for (let i = 0; i < pageCount; i++) {
        if (i > 0) {
          pdf.addPage()
        }
        
        pdf.addImage(imgData, 'JPEG', 0, -position, imgWidth, imgHeight, undefined, 'FAST')
        position += pdfHeight
      }
    } else {
      // Single page PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
    }
    
    // Save the PDF
    pdf.save(`${invoice.invoice_number}.pdf`)
    
  } catch (error) {
    console.error('Error generating PDF from preview:', error)
    throw error
  }
} 