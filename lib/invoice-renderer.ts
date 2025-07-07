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

  // Extract values from arrays
  const fontSize = Array.isArray(template.fontSize) ? template.fontSize[0] : (template.fontSize || 14)
  const padding = Array.isArray(template.invoicePadding) ? template.invoicePadding[0] : (template.invoicePadding || 48)
  const lineHeight = Array.isArray(template.lineHeight) ? template.lineHeight[0] : (template.lineHeight || 1.6)
  const logoSize = Array.isArray(template.logoSize) ? template.logoSize[0] : (template.logoSize || 80)
  const logoBorderRadius = Array.isArray(template.logoBorderRadius) ? template.logoBorderRadius[0] : (template.logoBorderRadius || 8)
  const tableHeaderSize = Array.isArray(template.tableHeaderSize) ? template.tableHeaderSize[0] : (template.tableHeaderSize || 13)

  // Base styles
  const baseStyles = {
    fontFamily: getFontFamily(),
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    color: template.primaryColor || '#000000',
    backgroundColor: template.backgroundColor || '#FFFFFF',
    padding: `${padding}px`,
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

  // Enhanced Tailwind styles with better table support
  const tailwindStyles = `
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { 
        box-sizing: border-box; 
        margin: 0;
        padding: 0;
      }
      body { 
        margin: 0; 
        padding: 0; 
        background-color: ${template.backgroundColor || '#FFFFFF'};
        color: ${template.primaryColor || '#000000'};
        font-family: ${getFontFamily()};
      }
      html {
        background-color: ${template.backgroundColor || '#FFFFFF'};
      }
      
      /* Enhanced table styles for better PDF rendering */
      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        font-size: ${fontSize}px;
      }
      
      .invoice-table th {
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        font-size: ${tableHeaderSize}px;
        border-bottom: 2px solid ${template.borderColor || '#E5E7EB'};
      }
      
      .invoice-table td {
        padding: 16px 8px;
        border-bottom: 1px solid ${template.borderColor || '#E5E7EB'};
        vertical-align: top;
      }
      
      .invoice-table th:last-child,
      .invoice-table td:last-child {
        text-align: right;
      }
      
      .invoice-table th:nth-child(3),
      .invoice-table td:nth-child(3) {
        text-align: right;
      }
      
      .invoice-table th:nth-child(2),
      .invoice-table td:nth-child(2) {
        text-align: center;
      }
      
      /* Grid system for non-table layouts */
      .grid-container {
        display: table;
        width: 100%;
        table-layout: fixed;
      }
      
      .grid-row {
        display: table-row;
      }
      
      .grid-cell {
        display: table-cell;
        padding: 12px 8px;
        vertical-align: top;
      }
      
      .grid-header {
        font-weight: 600;
        font-size: ${tableHeaderSize}px;
        border-bottom: 2px solid ${template.borderColor || '#E5E7EB'};
        padding-bottom: 8px;
        margin-bottom: 8px;
      }
      
      /* Responsive utilities */
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .font-medium { font-weight: 500; }
      
      /* Spacing utilities */
      .mb-2 { margin-bottom: 8px; }
      .mb-4 { margin-bottom: 16px; }
      .mb-8 { margin-bottom: 32px; }
      .mb-12 { margin-bottom: 48px; }
      .mt-2 { margin-top: 8px; }
      .mt-4 { margin-top: 16px; }
      .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .py-3 { padding-top: 12px; padding-bottom: 12px; }
      .py-4 { padding-top: 16px; padding-bottom: 16px; }
      .px-4 { padding-left: 16px; padding-right: 16px; }
      .p-4 { padding: 16px; }
      .p-6 { padding: 24px; }
      .p-8 { padding: 32px; }
      
      /* Flexbox utilities */
      .flex { display: flex; }
      .items-center { align-items: center; }
      .items-baseline { align-items: baseline; }
      .items-start { align-items: flex-start; }
      .justify-between { justify-content: space-between; }
      .justify-end { justify-content: flex-end; }
      .space-y-2 > * + * { margin-top: 8px; }
      .gap-4 { gap: 16px; }
      .gap-8 { gap: 32px; }
      .gap-12 { gap: 48px; }
      
      /* Width utilities */
      .w-full { width: 100%; }
      .w-64 { width: 256px; }
      .w-80 { width: 320px; }
      .flex-1 { flex: 1; }
      
      /* Grid utilities for better PDF support */
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
      .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
      .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
      .grid-cols-12 { grid-template-columns: repeat(12, 1fr); }
      .col-span-2 { grid-column: span 2; }
      .col-span-3 { grid-column: span 3; }
      .col-span-4 { grid-column: span 4; }
      .col-span-6 { grid-column: span 6; }
      .col-span-8 { grid-column: span 8; }
      
      /* Border utilities */
      .border { border: 1px solid ${template.borderColor || '#E5E7EB'}; }
      .border-b { border-bottom: 1px solid ${template.borderColor || '#E5E7EB'}; }
      .border-t { border-top: 1px solid ${template.borderColor || '#E5E7EB'}; }
      .rounded { border-radius: 6px; }
      .rounded-lg { border-radius: 8px; }
      .rounded-xl { border-radius: 12px; }
      .rounded-full { border-radius: 50%; }
      .overflow-hidden { overflow: hidden; }
      
      /* Object utilities */
      .object-contain { object-fit: contain; }
      
      /* Typography utilities */
      .text-xs { font-size: 12px; }
      .text-sm { font-size: 14px; }
      .text-base { font-size: 16px; }
      .text-lg { font-size: 18px; }
      .text-xl { font-size: 20px; }
      .text-2xl { font-size: 24px; }
      .text-3xl { font-size: 32px; }
      .uppercase { text-transform: uppercase; }
      .whitespace-pre-line { white-space: pre-line; }
      .letter-spacing-tight { letter-spacing: -0.025em; }
      .letter-spacing-wide { letter-spacing: 0.05em; }
      
      /* Shadow utilities */
      .shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
      .shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
      
      /* Opacity utilities */
      .opacity-80 { opacity: 0.8; }
      .opacity-70 { opacity: 0.7; }
      .opacity-60 { opacity: 0.6; }
    </style>
  `

  // Render based on template
  switch (template.templateId) {
    case 'contra-inspired':
      return renderContraTemplate()
    case 'mercury-inspired':
      return renderMercuryTemplate()
    case 'notion-inspired':
      return renderNotionTemplate()
    default:
      return renderStripeTemplate()
  }

  function renderStripeTemplate() {
    return `
      ${tailwindStyles}
      <div style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
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
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 50%;">Description</th>
                <th style="width: 15%;">Qty</th>
                <th style="width: 20%;">Rate</th>
                <th style="width: 15%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item: any) => `
                <tr>
                  <td>
                    <div style="font-weight: 500; margin-bottom: 4px;">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 13px; line-height: 1.4;">${item.details}</div>
                    ` : ''}
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td>${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</td>
                  <td style="font-weight: 500;">
                    ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="flex justify-end mb-12">
          <div class="w-64">
            <div class="flex justify-between py-2">
              <span style="color: ${template.secondaryColor};">Subtotal</span>
              <span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between py-2">
              <span style="color: ${template.secondaryColor};">Tax</span>
              <span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.tax.toFixed(2)}</span>
            </div>
            <div class="flex justify-between py-3 mt-2" style="border-top: 2px solid ${template.primaryColor};">
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
    `
  }

  function renderContraTemplate() {
    return `
      ${tailwindStyles}
      <div style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
        <!-- Bold Header -->
        <div class="mb-16">
          <div class="flex items-center justify-between mb-8">
            ${template.showLogo && companyInfo.logoUrl ? `
              <img src="${companyInfo.logoUrl}" alt="Logo" style="height: ${logoSize}px; border-radius: ${logoBorderRadius}px;" class="object-contain">
            ` : ''}
            <div class="px-4 py-2 rounded-full text-sm font-medium" style="background-color: ${template.accentColor}20; color: ${template.accentColor};">
              ${invoiceData.status.toUpperCase()}
            </div>
          </div>

          <h1 style="font-size: 48px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px;">
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
            <div class="text-xs font-semibold mb-4" style="color: ${template.accentColor}; letter-spacing: 0.05em; text-transform: uppercase;">
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
            <div class="text-xs font-semibold mb-4" style="color: ${template.accentColor}; letter-spacing: 0.05em; text-transform: uppercase;">
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

          <div class="grid-container">
            ${invoiceData.items.map((item: any, index: number) => `
              <div class="grid-row" style="border-bottom: ${index < invoiceData.items.length - 1 ? `1px solid ${template.borderColor}` : 'none'};">
                <div class="grid-cell" style="width: 70%; padding: 24px 0;">
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                    ${item.description}
                  </div>
                  ${template.showItemDetails && item.details ? `
                    <div style="color: ${template.secondaryColor}; font-size: 14px; line-height: 1.4; margin-bottom: 8px;">
                      ${item.details}
                    </div>
                  ` : ''}
                  <div style="color: ${template.secondaryColor}; font-size: 14px;">
                    ${item.quantity} × ${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}
                  </div>
                </div>
                <div class="grid-cell" style="width: 30%; text-align: right; padding: 24px 0;">
                  <div style="font-weight: 600; font-size: 18px;">
                    ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Total -->
        <div class="p-8 rounded-lg mb-12" style="background-color: ${template.primaryColor}; color: ${template.backgroundColor};">
          <div class="flex justify-between items-center">
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Total Amount</div>
              <div style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em;">
                ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
              </div>
            </div>
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
    `
  }

  function renderMercuryTemplate() {
    return `
      ${tailwindStyles}
      <div style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
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
              <div style="font-size: 32px; font-weight: 800; letter-spacing: -0.03em; color: ${template.accentColor}; margin-bottom: 12px;">
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

        <!-- Items Table -->
        <div class="mb-12">
          <div class="rounded-xl overflow-hidden border">
            <table class="invoice-table" style="margin: 0;">
              <thead>
                <tr style="background-color: ${template.primaryColor}; color: ${template.backgroundColor};">
                  <th style="width: 45%; padding: 16px; font-size: ${tableHeaderSize}px;">Description</th>
                  <th style="width: 15%; padding: 16px; font-size: ${tableHeaderSize}px;">Quantity</th>
                  <th style="width: 20%; padding: 16px; font-size: ${tableHeaderSize}px;">Rate</th>
                  <th style="width: 20%; padding: 16px; font-size: ${tableHeaderSize}px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map((item: any, index: number) => `
                  <tr style="background-color: ${index % 2 === 0 ? 'transparent' : template.borderColor + '10'};">
                    <td style="padding: 16px;">
                      <div style="font-weight: 600; color: ${template.primaryColor}; margin-bottom: 4px;">${item.description}</div>
                      ${template.showItemDetails && item.details ? `
                        <div style="color: ${template.secondaryColor}; font-size: 13px; line-height: 1.4;">
                          ${item.details}
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 16px; text-align: center; font-weight: 500;">${item.quantity}</td>
                    <td style="padding: 16px; font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</td>
                    <td style="padding: 16px; font-weight: 700; color: ${template.primaryColor};">
                      ${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals -->
        <div class="flex justify-end mb-12">
          <div class="w-80">
            <div class="space-y-2">
              <div class="flex justify-between items-center py-2">
                <span style="color: ${template.secondaryColor};">Subtotal</span>
                <span style="font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              ${invoiceData.tax > 0 ? `
                <div class="flex justify-between items-center py-2">
                  <span style="color: ${template.secondaryColor};">Tax</span>
                  <span style="font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.tax.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between items-center py-3" style="border-top: 2px solid ${template.primaryColor};">
                <span style="font-weight: 700; font-size: 16px;">Total</span>
                <span style="font-weight: 700; font-size: 20px; color: ${template.primaryColor};">
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
    `
  }

  function renderNotionTemplate() {
    return `
      ${tailwindStyles}
      <div style="${Object.entries(baseStyles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
        <!-- Minimal Header -->
        <div class="mb-8">
          ${template.showLogo && companyInfo.logoUrl ? `
            <img src="${companyInfo.logoUrl}" alt="Logo" style="height: ${logoSize}px; margin-bottom: 24px; border-radius: ${logoBorderRadius}px;" class="object-contain">
          ` : ''}
          <div class="flex items-baseline gap-3 mb-2">
            <h1 style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em;">Invoice</h1>
            ${template.showInvoiceNumber ? `
              <span style="color: ${template.secondaryColor}; font-size: 16px;">${invoiceData.number}</span>
            ` : ''}
          </div>
          ${template.showDates ? `
            <div style="color: ${template.secondaryColor}; font-size: 14px;">
              ${invoiceData.date.toLocaleDateString()} → ${invoiceData.dueDate.toLocaleDateString()}
            </div>
          ` : ''}
        </div>

        <!-- Simple Info Grid -->
        <div class="grid grid-cols-2 gap-8 mb-12">
          <div>
            <div style="font-size: 12px; color: ${template.secondaryColor}; margin-bottom: 4px;">From</div>
            <div style="font-weight: 600;">${companyInfo.name}</div>
            <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line; margin-top: 4px; line-height: 1.5;">
              ${companyInfo.address}
            </div>
          </div>
          
          <div>
            <div style="font-size: 12px; color: ${template.secondaryColor}; margin-bottom: 4px;">To</div>
            <div style="font-weight: 600;">${invoiceData.client.name}</div>
            <div style="color: ${template.secondaryColor}; font-size: 14px; white-space: pre-line; margin-top: 4px; line-height: 1.5;">
              ${invoiceData.client.address}
            </div>
          </div>
        </div>

        <!-- Clean Items Table -->
        <div class="mb-12">
          <table class="invoice-table" style="border: none;">
            <thead>
              <tr style="border-bottom: 2px solid ${template.borderColor};">
                <th style="width: 50%; font-size: ${tableHeaderSize}px; color: ${template.secondaryColor}; padding: 8px 0;">Item</th>
                <th style="width: 15%; font-size: ${tableHeaderSize}px; color: ${template.secondaryColor}; padding: 8px 0;">Qty</th>
                <th style="width: 20%; font-size: ${tableHeaderSize}px; color: ${template.secondaryColor}; padding: 8px 0;">Rate</th>
                <th style="width: 15%; font-size: ${tableHeaderSize}px; color: ${template.secondaryColor}; padding: 8px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item: any) => `
                <tr style="border-bottom: 1px solid ${template.borderColor}20;">
                  <td style="padding: 12px 0;">
                    <div style="margin-bottom: 2px;">${item.description}</div>
                    ${template.showItemDetails && item.details ? `
                      <div style="color: ${template.secondaryColor}; font-size: 13px; line-height: 1.4;">
                        ${item.details}
                      </div>
                    ` : ''}
                  </td>
                  <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
                  <td style="padding: 12px 0;">${getCurrencySymbol(invoiceData.currency)}${item.rate.toFixed(2)}</td>
                  <td style="padding: 12px 0; font-weight: 500;">${getCurrencySymbol(invoiceData.currency)}${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Simple Total -->
        <div class="flex justify-end mb-12">
          <div style="display: flex; align-items: baseline; gap: 48px;">
            <span style="font-size: 14px; color: ${template.secondaryColor};">Total</span>
            <span style="font-size: 24px; font-weight: 700;">
              ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total.toFixed(2)}
            </span>
          </div>
        </div>

        <!-- Footer Notes -->
        ${(template.showPaymentTerms || template.showNotes) ? `
          <div style="border-top: 1px solid ${template.borderColor}; padding-top: 24px;">
            ${template.showPaymentTerms ? `
              <div class="mb-4">
                <span style="font-size: 12px; color: ${template.secondaryColor};">Payment terms: </span>
                <span style="font-size: 14px;">${invoiceData.paymentTerms}</span>
              </div>
            ` : ''}
            ${template.showNotes && invoiceData.notes ? `
              <div>
                <div style="font-size: 12px; color: ${template.secondaryColor}; margin-bottom: 4px;">Notes</div>
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
} 