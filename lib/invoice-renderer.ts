export async function renderInvoiceHTML(invoice: any, template: any): Promise<string> {
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

  // Extract values from arrays - optimized for A4
  const fontSize = Array.isArray(template.fontSize) ? template.fontSize[0] : (template.fontSize || 13)
  const padding = Array.isArray(template.invoicePadding) ? template.invoicePadding[0] : (template.invoicePadding || 40)
  const lineHeight = Array.isArray(template.lineHeight) ? template.lineHeight[0] : (template.lineHeight || 1.5)
  const logoSize = Array.isArray(template.logoSize) ? template.logoSize[0] : (template.logoSize || 60)
  const logoBorderRadius = Array.isArray(template.logoBorderRadius) ? template.logoBorderRadius[0] : (template.logoBorderRadius || 8)
  const tableHeaderSize = Array.isArray(template.tableHeaderSize) ? template.tableHeaderSize[0] : (template.tableHeaderSize || 12)

  // Base styles for PDF rendering (moved padding to wrapper)
  const baseStyles = {
    fontFamily: getFontFamily(),
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    color: template.primaryColor || '#000000',
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
    paymentTerms: invoice.terms || 'Net 30',
    notes: invoice.notes || template.notes || '',
    currency: template.currency || 'USD'
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

  // Enhanced styles for A4 PDF rendering (scoped to invoice preview only)
  const tailwindStyles = `
    <style>
      /* Scoped reset and styles - only apply within invoice preview */
      #invoice-preview * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      #invoice-preview {
        font-family: ${getFontFamily()}, system-ui, -apple-system, sans-serif;
        font-size: ${template.fontSize}px;
        line-height: ${template.lineHeight};
        color: ${template.primaryColor};
        background-color: ${template.backgroundColor};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      #invoice-preview .a4-container {
        width: 210mm;
        max-width: 100%;
        min-height: 297mm;
        margin: 0 auto;
        background-color: ${template.backgroundColor};
        padding: 0;
        position: relative;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        /* Add shadow and border styling */
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }
      
      #invoice-preview .invoice-content {
        width: 100%;
        height: 100%;
        padding: ${padding}px;
        box-sizing: border-box;
      }
      
      /* Remove shadow and border for print/PDF */
      @media print {
        #invoice-preview .a4-container {
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }
      }
      
      /* Responsive adjustments for smaller screens */
      @media (max-width: 210mm) {
        #invoice-preview .a4-container {
          width: 100%;
          margin: 0;
          /* Maintain styling on smaller screens */
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        
        #invoice-preview .invoice-content {
          padding: ${Math.max(padding * 0.5, 12)}px;
        }
      }
      
      .invoice-wrapper {
        width: 100%;
        height: 100%;
        background-color: ${template.backgroundColor};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      /* PDF-specific styles for Status badge - scoped to invoice preview */
      #invoice-preview .status-badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 500;
        background-color: ${template.accentColor}20;
        color: ${template.accentColor};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      /* Scoped utility classes - only apply within invoice preview */
      #invoice-preview .grid {
        display: grid;
      }
      
      #invoice-preview .grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      
      #invoice-preview .grid-cols-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      
      #invoice-preview .gap-3 {
        gap: 0.75rem;
      }
      
      #invoice-preview .gap-4 {
        gap: 1rem;
      }
      
      #invoice-preview .gap-8 {
        gap: 2rem;
      }
      
      #invoice-preview .gap-12 {
        gap: 3rem;
      }
      
      #invoice-preview .mb-2 {
        margin-bottom: 0.5rem;
      }
      
      #invoice-preview .mb-4 {
        margin-bottom: 1rem;
      }
      
      #invoice-preview .mb-6 {
        margin-bottom: 1.5rem;
      }
      
      #invoice-preview .mb-8 {
        margin-bottom: 2rem;
      }
      
      #invoice-preview .mb-12 {
        margin-bottom: 3rem;
      }
      
      #invoice-preview .mb-16 {
        margin-bottom: 4rem;
      }
      
      #invoice-preview .p-6 {
        padding: 1.5rem;
      }
      
      #invoice-preview .flex {
        display: flex;
      }
      
      #invoice-preview .flex-1 {
        flex: 1 1 0%;
      }
      
      #invoice-preview .items-start {
        align-items: flex-start;
      }
      
      #invoice-preview .items-center {
        align-items: center;
      }
      
      #invoice-preview .items-baseline {
        align-items: baseline;
      }
      
      #invoice-preview .justify-between {
        justify-content: space-between;
      }
      
      #invoice-preview .justify-end {
        justify-content: flex-end;
      }
      
      #invoice-preview .text-right {
        text-align: right;
      }
      
      #invoice-preview .text-xs {
        font-size: 0.75rem;
      }
      
      #invoice-preview .font-semibold {
        font-weight: 600;
      }
      
      #invoice-preview .object-contain {
        object-fit: contain;
      }
      
      #invoice-preview .rounded-lg {
        border-radius: 0.5rem;
      }
      
      #invoice-preview .space-y-2 > * + * {
        margin-top: 0.5rem;
      }
      
      #invoice-preview .space-y-16 > * + * {
        margin-top: 4rem;
      }
      
      /* Table-specific styling for PDF - scoped to invoice preview */
      #invoice-preview table {
        border-collapse: collapse !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      #invoice-preview th, 
      #invoice-preview td {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      #invoice-preview [style*="border"] {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style>
  `

  // Template rendering functions will be defined below

  function renderModernTemplate() {
    return `
      ${tailwindStyles}
      <div class="a4-container">
        <div class="invoice-content">
          <div class="invoice-wrapper" style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
            <!-- Header -->
        <div class="flex justify-between items-start mb-12">
          <div>
            ${template.showLogo && companyInfo.logoUrl ? `
              <img src="${companyInfo.logoUrl}" alt="Company Logo" style="height: ${logoSize}px; margin-bottom: 24px; border-radius: ${logoBorderRadius}px;" class="object-contain">
            ` : ''}
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Invoice</div>
            ${template.showInvoiceNumber ? `
              <div style="color: ${template.secondaryColor}; font-size: 14px;">${invoiceData.number}</div>
            ` : ''}
          </div>
          <div class="text-right">
            <div style="font-weight: 600; margin-bottom: 4px;">${companyInfo.name}</div>
            <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line;">${companyInfo.address}</div>
            <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 8px;">${companyInfo.email}</div>
            ${template.showTaxId && companyInfo.taxId ? `
              <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 4px;">${companyInfo.taxId}</div>
            ` : ''}
          </div>
        </div>

        <!-- Bill To & Dates -->
        <div class="grid grid-cols-2 gap-8 mb-12">
          <div>
            <div style="font-weight: 600; margin-bottom: 8px;">Bill To</div>
            <div style="margin-bottom: 4px;">${invoiceData.client.name}</div>
            <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line;">${invoiceData.client.address}</div>
          </div>
          ${template.showDates ? `
            <div class="text-right">
              <div class="space-y-2">
                <div>
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Invoice Date: </span>
                  <span style="font-weight: 500;">${invoiceData.date.toLocaleDateString()}</span>
                </div>
                <div>
                  <span style="color: ${template.secondaryColor}; font-size: 14px;">Due Date: </span>
                  <span style="font-weight: 500;">${invoiceData.dueDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Items Table -->
        <div class="mb-12">
          <table style="width: 100%; border-collapse: collapse; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <thead>
              <tr style="border-bottom: 2px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <th style="text-align: left; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px; border-bottom: 2px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Description</th>
                <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px; border-bottom: 2px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Qty</th>
                <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px; border-bottom: 2px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Rate</th>
                <th style="text-align: right; padding: 12px 0; font-weight: 600; font-size: ${tableHeaderSize}px; border-bottom: 2px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item: any, index: number) => `
                <tr style="border-bottom: 1px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                  <td style="padding: 16px 0; border-bottom: 1px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <div style="font-weight: 500;">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 13px; margin-top: 4px;">${item.details}</div>
                    ` : ''}
                  </td>
                  <td style="text-align: right; padding: 16px 0; border-bottom: 1px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${item.quantity}</td>
                  <td style="text-align: right; padding: 16px 0; border-bottom: 1px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</td>
                  <td style="text-align: right; padding: 16px 0; font-weight: 500; border-bottom: 1px solid ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                  </td>
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
              <span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: ${template.secondaryColor};">Tax</span>
              <span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.tax.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; border-top: 2px solid ${template.primaryColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <span style="font-weight: 600;">Total</span>
              <span style="font-weight: 600; font-size: 18px; color: ${template.accentColor};">
                ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

          <!-- Notes -->
          ${template.showNotes && invoiceData.notes ? `
            <div>
              <div style="font-weight: 600; margin-bottom: 8px;">Notes</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; line-height: 1.6;">${invoiceData.notes}</div>
            </div>
          ` : ''}
        </div>
        </div>
      </div>
    `
  }

  function renderBoldTemplate() {
    return `
      ${tailwindStyles}
      <div class="a4-container">
        <div class="invoice-content">
          <div class="invoice-wrapper" style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
            <!-- Bold Header -->
                  <div class="mb-16">
          <div class="flex items-center justify-between mb-8">
            ${template.showLogo && companyInfo.logoUrl ? `
              <img src="${companyInfo.logoUrl}" alt="Logo" style="height: ${logoSize}px; border-radius: ${logoBorderRadius}px;" class="object-contain">
            ` : ''}
            <div style="display: inline-block; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 500; background-color: ${template.accentColor}33; color: ${template.accentColor}; text-transform: uppercase; letter-spacing: 0.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              ${invoiceData.status.toUpperCase()}
            </div>
          </div>

          <h1 style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px;">
            Invoice
          </h1>
          
          <div class="grid grid-cols-3 gap-4" style="font-size: 14px;">
            ${template.showInvoiceNumber ? `
              <div>
                <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Invoice Number</div>
                <div style="font-weight: 600;">${invoiceData.number}</div>
              </div>
            ` : ''}
            ${template.showDates ? `
              <div>
                <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Issue Date</div>
                <div style="font-weight: 600;">${invoiceData.date.toLocaleDateString()}</div>
              </div>
              <div>
                <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">Due Date</div>
                <div style="font-weight: 600;">${invoiceData.dueDate.toLocaleDateString()}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- From/To Section -->
        <div class="grid grid-cols-2 gap-12 mb-16">
          <div>
            <div class="text-xs font-semibold mb-4" style="color: ${template.secondaryColor}; letter-spacing: 0.05em; text-transform: uppercase;">
              FROM
            </div>
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">
              ${companyInfo.name}
            </div>
            <div style="color: ${template.secondaryColor}; white-space: pre-line; line-height: 1.5;">
              ${companyInfo.address}
            </div>
            <div style="color: ${template.secondaryColor}; margin-top: 8px;">
              ${companyInfo.email}
            </div>
          </div>

          <div>
            <div class="text-xs font-semibold mb-4" style="color: ${template.secondaryColor}; letter-spacing: 0.05em; text-transform: uppercase;">
              TO
            </div>
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">
              ${invoiceData.client.name}
            </div>
            <div style="color: ${template.secondaryColor}; white-space: pre-line; line-height: 1.5;">
              ${invoiceData.client.address}
            </div>
            <div style="color: ${template.secondaryColor}; margin-top: 8px;">
              ${invoiceData.client.email}
            </div>
          </div>
        </div>

        <!-- Services -->
        <div class="mb-16">
          <div class="text-xs font-semibold mb-6" style="color: ${template.secondaryColor}; letter-spacing: 0.05em; text-transform: uppercase; font-size: ${tableHeaderSize}px;">
            Services
          </div>

          ${invoiceData.items.map((item: any, index: number) => `
            <div style="padding: 24px 0; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: ${template.primaryColor};">
                    ${item.description}
                  </div>
                  ${template.showItemDetails && item.details ? `
                    <div style="color: ${template.secondaryColor}; font-size: 14px; margin-bottom: 8px;">
                      ${item.details}
                    </div>
                  ` : ''}
                  <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 8px;">
                    ${item.quantity} × ${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}
                  </div>
                </div>
                <div style="font-weight: 600; font-size: 18px; color: ${template.primaryColor};">
                  ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Total -->
        <div style="padding: 32px; border-radius: 8px; margin-bottom: 48px; background-color: ${template.primaryColor}; color: ${template.backgroundColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Total Amount</div>
              <div style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em;">
                ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
              </div>
            </div>
            ${template.showPaymentTerms ? `
              <div style="text-align: right;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 4px;">Payment Terms</div>
                <div style="font-size: 16px; font-weight: 500;">${invoiceData.paymentTerms}</div>
              </div>
            ` : ''}
          </div>
        </div>

          <!-- Notes -->
          ${template.showNotes && invoiceData.notes ? `
            <div>
              <div style="font-weight: 600; margin-bottom: 8px;">Notes</div>
              <div style="color: ${template.secondaryColor}; line-height: 1.6;">
                ${invoiceData.notes}
              </div>
            </div>
          ` : ''}
        </div>
        </div>
      </div>
    `
  }

  function renderClassicTemplate() {
    return `
      ${tailwindStyles}
      <div class="a4-container">
        <div class="invoice-content">
          <div class="invoice-wrapper" style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
            <!-- Professional Header -->
        <div class="mb-12">
          <div class="flex justify-between items-start mb-8">
            <div>
              ${template.showLogo && companyInfo.logoUrl ? `
                <img src="${companyInfo.logoUrl}" alt="Company Logo" style="height: ${logoSize}px; margin-bottom: 20px; border-radius: ${logoBorderRadius}px;" class="object-contain">
              ` : ''}
              <div style="font-weight: 700; font-size: 20px; letter-spacing: -0.02em;">${companyInfo.name}</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 4px; line-height: 1.5;">
                ${companyInfo.address.split('\n').join(' • ')}
              </div>
              ${companyInfo.email ? `
                <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 2px;">
                  ${companyInfo.email} • ${companyInfo.phone || ''}
                </div>
              ` : ''}
            </div>

            <div class="text-right">
              <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: ${template.accentColor}; margin-bottom: 12px;">
                INVOICE
              </div>
              ${template.showInvoiceNumber ? `
                <div style="font-size: 16px; font-weight: 600; color: ${template.primaryColor}; background-color: ${template.borderColor}50; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${invoiceData.number}
                </div>
              ` : ''}
            </div>
          </div>
          <div style="height: 3px; background-color: ${template.accentColor}; border-radius: 2px;"></div>
        </div>

        <!-- Company Details -->
        <div class="grid grid-cols-3 gap-8 mb-12">
          <div>
            <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              From
            </div>
            <div style="font-size: 14px; line-height: 1.6;">
              <div style="font-weight: 500;">${companyInfo.name}</div>
              <div style="white-space: pre-line; color: ${template.secondaryColor};">
                ${companyInfo.address}
              </div>
              <div style="color: ${template.secondaryColor}; margin-top: 4px;">
                ${companyInfo.email}<br />
                ${companyInfo.phone || ''}
              </div>
            </div>
          </div>

          <div>
            <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              To
            </div>
            <div style="font-size: 14px; line-height: 1.6;">
              <div style="font-weight: 500;">${invoiceData.client.name}</div>
              <div style="white-space: pre-line; color: ${template.secondaryColor};">
                ${invoiceData.client.address}
              </div>
              <div style="color: ${template.secondaryColor}; margin-top: 4px;">
                ${invoiceData.client.email}
              </div>
            </div>
          </div>

          ${template.showDates ? `
            <div>
              <div style="color: ${template.secondaryColor}; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                Details
              </div>
              <div style="font-size: 14px; line-height: 1.8;">
                <div>
                  <span style="color: ${template.secondaryColor};">Date: </span>
                  <span style="font-weight: 500;">${invoiceData.date.toLocaleDateString()}</span>
                </div>
                <div>
                  <span style="color: ${template.secondaryColor};">Due: </span>
                  <span style="font-weight: 500;">${invoiceData.dueDate.toLocaleDateString()}</span>
                </div>
                ${template.showPaymentTerms ? `
                  <div>
                    <span style="color: ${template.secondaryColor};">Terms: </span>
                    <span style="font-weight: 500;">${invoiceData.paymentTerms}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div style="margin-bottom: 48px;">
          <div style="border-radius: 12px; overflow: hidden; background-color: ${template.backgroundColor}; box-shadow: 0 0 0 1px ${template.borderColor};">
            <div style="padding: 16px; background-color: ${template.primaryColor}; color: ${template.backgroundColor};">
              <div style="display: grid; grid-template-columns: 6fr 2fr 2fr 2fr; gap: 16px; font-weight: 600; font-size: ${tableHeaderSize}px;">
                <div>Description</div>
                <div style="text-align: right;">Quantity</div>
                <div style="text-align: right;">Rate</div>
                <div style="text-align: right;">Amount</div>
              </div>
            </div>
            
            ${invoiceData.items.map((item: any, index: number) => `
              <div style="padding: 16px; display: grid; grid-template-columns: 6fr 2fr 2fr 2fr; gap: 16px; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; background-color: ${index % 2 === 0 ? 'transparent' : template.borderColor + '10'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <div>
                  <div style="font-weight: 600; color: ${template.primaryColor};">${item.description}</div>
                  ${template.showItemDetails && item.details ? `
                    <div style="color: ${template.secondaryColor}; font-size: 13px; margin-top: 4px; line-height: 1.5;">
                      ${item.details}
                    </div>
                  ` : ''}
                </div>
                <div style="text-align: right; font-weight: 500;">${item.quantity}</div>
                <div style="text-align: right; font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</div>
                <div style="text-align: right; font-weight: 700; color: ${template.primaryColor};">
                  ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Summary -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
          <div style="width: 384px; border-radius: 12px; overflow: hidden; background-color: ${template.borderColor}20; box-shadow: 0 0 0 1px ${template.borderColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="padding: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="color: ${template.secondaryColor}; font-size: 14px;">Subtotal</span>
                <span style="font-weight: 500; font-size: 16px;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="color: ${template.secondaryColor}; font-size: 14px;">Tax (10%)</span>
                <span style="font-weight: 500; font-size: 16px;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 2px solid ${template.borderColor};">
                <span style="font-weight: 700; font-size: 18px; color: ${template.primaryColor};">Total Due</span>
                <span style="font-weight: 800; font-size: 24px; color: ${template.accentColor};">
                  ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

          <!-- Notes -->
          ${template.showNotes && invoiceData.notes ? `
            <div class="p-6 rounded-lg" style="background-color: ${template.borderColor}20;">
              <div style="font-weight: 600; margin-bottom: 8px; color: ${template.primaryColor};">Notes</div>
              <div style="color: ${template.secondaryColor}; font-size: 14px; line-height: 1.6;">
                ${invoiceData.notes}
              </div>
            </div>
          ` : ''}
        </div>
        </div>
      </div>
    `
  }

  function renderSlateTemplate() {
    return `
      ${tailwindStyles}
      <div class="a4-container">
        <div class="invoice-content">
          <div class="invoice-wrapper" style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
            <!-- Minimal Header -->
          <div class="mb-12">
            <div class="flex items-start justify-between mb-6">
              ${template.showLogo && companyInfo.logoUrl ? `
                <img 
                  src="${companyInfo.logoUrl}" 
                  alt="Logo" 
                  style="height: ${logoSize * 0.8}px; border-radius: ${logoBorderRadius}px; opacity: 0.9;" 
                  class="object-contain"
                />
              ` : ''}
              <div 
                style="display: inline-block; font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 9999px; background-color: ${invoiceData.status === 'PAID' ? `${template.accentColor}20` : `${template.secondaryColor}20`}; color: ${invoiceData.status === 'PAID' ? template.accentColor : template.secondaryColor}; border: 1px solid ${invoiceData.status === 'PAID' ? template.accentColor : template.secondaryColor}30; -webkit-print-color-adjust: exact; print-color-adjust: exact;"
              >
                ${invoiceData.status}
              </div>
            </div>

            <div class="mb-8">
              <div class="flex items-start justify-between">
                <div>
                  <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em;">
                    Invoice
                  </h1>
                  ${template.showInvoiceNumber ? `
                    <div style="font-size: 14px; font-weight: 500; color: ${template.secondaryColor}; background-color: ${template.borderColor}30; padding: 6px 16px; border-radius: 20px; display: inline-block;">
                      ${invoiceData.number}
                    </div>
                  ` : ''}
                </div>
                ${template.showDates ? `
                  <div style="text-align: right; font-size: 13px; color: ${template.secondaryColor};">
                    <div style="margin-bottom: 4px;">
                      <span style="font-weight: 500;">Issue Date:</span> ${invoiceData.date.toLocaleDateString()}
                    </div>
                    <div>
                      <span style="font-weight: 500;">Due Date:</span> ${invoiceData.dueDate.toLocaleDateString()}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Cards Layout -->
          <div class="grid grid-cols-2 gap-4 mb-12">
            <div style="padding: 20px; border-radius: 8px; background-color: ${template.backgroundColor}; border: 1px solid ${template.borderColor}60; transition: all 0.3s ease;">
              <div style="font-size: 11px; color: ${template.secondaryColor}; margin-bottom: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                From
              </div>
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${companyInfo.name}</div>
              <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                ${companyInfo.address}
              </div>
              ${companyInfo.email ? `
                <div style="font-size: 14px; color: ${template.secondaryColor}; margin-top: 8px;">
                  ${companyInfo.email}<br />
                  ${companyInfo.phone}
                </div>
              ` : ''}
              ${template.showTaxId && companyInfo.taxId ? `
                <div style="font-size: 13px; color: ${template.secondaryColor}; margin-top: 8px;">
                  Tax ID: ${companyInfo.taxId}
                </div>
              ` : ''}
            </div>
            
            <div style="padding: 20px; border-radius: 8px; background-color: ${template.backgroundColor}; border: 1px solid ${template.borderColor}60; transition: all 0.3s ease;">
              <div style="font-size: 11px; color: ${template.secondaryColor}; margin-bottom: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                Bill To
              </div>
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 16px;">${invoiceData.client.name}</div>
              <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                ${invoiceData.client.address}
              </div>
              ${invoiceData.client.email ? `
                <div style="font-size: 14px; color: ${template.secondaryColor}; margin-top: 8px;">
                  ${invoiceData.client.email}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Services Table -->
          <div class="mb-12">
            <div class="mb-6">
              <h3 style="font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">Services</h3>
            </div>

            <div style="border: 1px solid ${template.borderColor}; border-radius: 12px; overflow: hidden; background-color: ${template.backgroundColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <table style="width: 100%; border-collapse: collapse; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <thead>
                  <tr style="background-color: ${template.borderColor}20; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="text-align: left; padding: 12px 16px; font-weight: 600; font-size: ${tableHeaderSize}px; color: ${template.primaryColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Item</th>
                    <th style="text-align: center; padding: 12px 16px; font-weight: 600; font-size: ${tableHeaderSize}px; color: ${template.primaryColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Qty</th>
                    <th style="text-align: right; padding: 12px 16px; font-weight: 600; font-size: ${tableHeaderSize}px; color: ${template.primaryColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Rate</th>
                    <th style="text-align: right; padding: 12px 16px; font-weight: 600; font-size: ${tableHeaderSize}px; color: ${template.primaryColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map((item: any, index: number) => `
                    <tr style="border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                      <td style="padding: 16px; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <div style="margin-bottom: 2px; font-weight: 500;">${item.description}</div>
                        ${template.showItemDetails && item.details ? `
                          <div style="color: ${template.secondaryColor}; font-size: 13px; line-height: 1.4;">
                            ${item.details}
                          </div>
                        ` : ''}
                      </td>
                      <td style="padding: 16px; text-align: center; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${item.quantity}</td>
                      <td style="padding: 16px; text-align: right; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</td>
                      <td style="padding: 16px; text-align: right; font-weight: 500; border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Total -->
          <div class="flex justify-end mb-12">
            <div style="width: 288px;">
              <div style="background-color: ${template.borderColor}10; padding: 20px; border-radius: 12px; border: 1px solid ${template.borderColor}40; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: ${template.secondaryColor}; font-size: 14px;">Subtotal</span>
                    <span style="font-size: 15px; font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${template.secondaryColor}; font-size: 14px;">Tax (10%)</span>
                    <span style="font-size: 15px; font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.tax.toFixed(2)}</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 2px solid ${template.accentColor}30;">
                  <span style="font-weight: 700; font-size: 16px; color: ${template.primaryColor};">Total</span>
                  <span style="font-weight: 700; font-size: 22px; color: ${template.accentColor};">
                    ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Info -->
          ${(template.showPaymentTerms || template.showNotes) ? `
            <div style="padding: 24px; border-radius: 12px; background-color: ${template.accentColor}08; border: 1px solid ${template.accentColor}20; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              ${template.showPaymentTerms ? `
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 600; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.03em; text-transform: uppercase;">Payment Terms</div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    ${invoiceData.paymentTerms}
                  </div>
                </div>
              ` : ''}
              ${template.showNotes && invoiceData.notes ? `
                <div>
                  <div style="font-weight: 600; font-size: 13px; color: ${template.primaryColor}; margin-bottom: 6px; letter-spacing: 0.03em; text-transform: uppercase;">Notes</div>
                  <div style="font-size: 14px; color: ${template.secondaryColor}; line-height: 1.6;">
                    ${invoiceData.notes}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        </div>
      </div>
    `
  }

  function renderEdgeTemplate() {
    return `
      ${tailwindStyles}
      <div class="a4-container">
        <div class="invoice-content">
          <div class="invoice-wrapper" style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
                         <!-- Edge Header -->
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem;">
               <h1 style="font-size: 5rem; font-weight: 300; color: ${template.primaryColor}; line-height: 1; margin: 0;">
                 Invoice
               </h1>
               <div style="display: flex; align-items: center; gap: 0.75rem;">
                 ${template.showLogo && companyInfo.logoUrl ? `
                   <img 
                     src="${companyInfo.logoUrl}" 
                     alt="Company Logo" 
                     style="height: ${logoSize}px; border-radius: ${logoBorderRadius}px;"
                     class="object-contain"
                   />
                 ` : ''}
               </div>
             </div>

            <!-- From, To, Details Section -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; margin-bottom: 4rem;">
              <!-- From -->
              <div>
                <h3 style="color: ${template.secondaryColor}; font-weight: 500; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 1px solid ${template.borderColor}; font-size: 16px;">
                  From
                </h3>
                <div style="line-height: 1.6;">
                  <div style="font-weight: 500; color: ${template.primaryColor}; margin-bottom: 4px;">
                    ${companyInfo.name}
                  </div>
                  <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">
                    ${companyInfo.email}
                  </div>
                  <div style="color: ${template.secondaryColor}; margin-top: 16px; white-space: pre-line;">
                    ${companyInfo.address}
                  </div>
                  ${companyInfo.phone ? `
                    <div style="color: ${template.secondaryColor}; margin-top: 4px;">
                      ${companyInfo.phone}
                    </div>
                  ` : ''}
                  ${template.showTaxId && companyInfo.taxId ? `
                    <div style="color: ${template.secondaryColor}; margin-top: 8px;">
                      Tax ID: ${companyInfo.taxId}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- To -->
              <div>
                <h3 style="color: ${template.secondaryColor}; font-weight: 500; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 1px solid ${template.borderColor}; font-size: 16px;">
                  To
                </h3>
                <div style="line-height: 1.6;">
                  <div style="font-weight: 500; color: ${template.primaryColor}; margin-bottom: 4px;">
                    ${invoiceData.client.name}
                  </div>
                  <div style="color: ${template.secondaryColor}; margin-bottom: 4px;">
                    ${invoiceData.client.email}
                  </div>
                  <div style="color: ${template.secondaryColor}; margin-top: 16px; white-space: pre-line;">
                    ${invoiceData.client.address}
                  </div>
                </div>
              </div>

              <!-- Details -->
              <div>
                <h3 style="color: ${template.secondaryColor}; font-weight: 500; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 1px solid ${template.borderColor}; font-size: 16px;">
                  Details
                </h3>
                <div style="line-height: 1.6;">
                                     ${template.showInvoiceNumber ? `
                     <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                       <span style="color: ${template.secondaryColor};">No:</span>
                       <span style="color: ${template.primaryColor}; font-weight: 500;">${invoiceData.number}</span>
                     </div>
                   ` : ''}
                  ${template.showDates ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: ${template.secondaryColor};">Issue date</span>
                      <span style="color: ${template.primaryColor}; font-weight: 500;">${invoiceData.date.toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: ${template.secondaryColor};">Due date</span>
                      <span style="color: ${template.primaryColor}; font-weight: 500;">${invoiceData.dueDate.toLocaleDateString()}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Line Items -->
            <div class="mb-16">
              <div style="border-bottom: 1px solid ${template.borderColor}; padding-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem;">
                  <div style="color: ${template.secondaryColor}; font-weight: 500;">Line items</div>
                  <div style="color: ${template.secondaryColor}; font-weight: 500; text-align: center;">Quantity</div>
                  <div style="color: ${template.secondaryColor}; font-weight: 500; text-align: right;">Amount</div>
                </div>
              </div>
              
              <div>
                ${invoiceData.items.map((item: any, index: number) => `
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; align-items: center; padding: 12px 0; border-bottom: 1px solid ${template.borderColor}40;">
                    <div>
                      <div style="color: ${template.primaryColor}; font-weight: 500;">
                        ${item.description}
                      </div>
                      ${template.showItemDetails && item.details ? `
                        <div style="color: ${template.secondaryColor}; font-size: 14px; margin-top: 4px;">
                          ${item.details}
                        </div>
                      ` : ''}
                    </div>
                    <div style="color: ${template.primaryColor}; text-align: center;">${item.quantity}</div>
                    <div style="color: ${template.primaryColor}; text-align: right; font-weight: 500;">
                      ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Total -->
              <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid ${template.borderColor};">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem;">
                  <div></div>
                  <div style="font-size: 24px; font-weight: 500; color: ${template.primaryColor}; text-align: center;">
                    Total
                  </div>
                  <div style="font-size: 24px; font-weight: 700; color: ${template.primaryColor}; text-align: right;">
                    ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <!-- Terms and Notes -->
            ${(template.showPaymentTerms || template.showNotes) ? `
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4rem; padding-top: 2rem; border-top: 1px solid ${template.borderColor};">
                ${template.showPaymentTerms ? `
                  <div>
                    <h3 style="color: ${template.secondaryColor}; font-weight: 500; margin-bottom: 24px; font-size: 16px;">
                      Terms
                    </h3>
                    <div style="line-height: 1.6;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: ${template.secondaryColor};">Payment Terms</span>
                        <span style="color: ${template.primaryColor};">${invoiceData.paymentTerms}</span>
                      </div>
                    </div>
                  </div>
                ` : ''}

                ${template.showNotes && invoiceData.notes ? `
                  <div>
                    <h3 style="color: ${template.secondaryColor}; font-weight: 500; margin-bottom: 24px; font-size: 16px;">
                      Notes
                    </h3>
                    <div style="color: ${template.primaryColor};">
                    ${invoiceData.notes}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        </div>
      </div>
    `
  }

  // Template selection logic
  switch (template.templateId) {
    case 'bold':
      return renderBoldTemplate()
    case 'classic':
      return renderClassicTemplate()
    case 'slate':
      return renderSlateTemplate()
    case 'edge':
      return renderEdgeTemplate()
    default:
      return renderModernTemplate()
  }
}