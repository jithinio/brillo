"use client"

import { forwardRef } from "react"
import { formatCurrency } from "@/lib/currency"
import type { Invoice } from "@/components/invoices/columns"

interface InvoiceTemplateProps {
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
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoice, template }, ref) => {
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

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 min-h-[700px] max-w-4xl mx-auto"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.4'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start space-x-4">
            {currentTemplate.logoUrl && (
              <img 
                src={currentTemplate.logoUrl} 
                alt="Company Logo" 
                className="w-20 h-20 object-contain"
              />
            )}
            <div>
              <h1 
                className="text-3xl font-bold mb-3"
                style={{ color: currentTemplate.primaryColor }}
              >
                {currentTemplate.companyName}
              </h1>
              <div className="text-sm text-gray-600 whitespace-pre-line">
                {currentTemplate.companyAddress}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {currentTemplate.companyEmail} • {currentTemplate.companyPhone}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 
              className="text-4xl font-bold mb-3"
              style={{ color: currentTemplate.accentColor }}
            >
              INVOICE
            </h2>
            <div className="text-sm text-gray-600">
              <div className="mb-1">
                <span className="font-medium">Invoice #:</span> {invoice.invoice_number}
              </div>
              <div className="mb-1">
                <span className="font-medium">Date:</span> {new Date(invoice.issue_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Due:</span> {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-3">Bill To:</h3>
          <div className="text-sm text-gray-700">
            <div className="font-medium text-base mb-1">
              {invoice.clients?.name || 'Client Name'}
            </div>
            {invoice.clients?.company && (
              <div className="mb-1">{invoice.clients.company}</div>
            )}
            <div>client@email.com</div>
          </div>
        </div>

        {/* Project Info */}
        {invoice.projects?.name && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Project:</span> {invoice.projects.name}
            </div>
            {invoice.notes && (
              <div className="text-sm mt-2">
                <span className="font-medium">Description:</span> {invoice.notes}
              </div>
            )}
          </div>
        )}

        {/* Services Table */}
        <div className="mb-8">
          <div className="border-t-2 border-b-2 border-gray-300 py-3 mb-4">
            <div className="grid grid-cols-4 gap-4 font-semibold text-sm">
              <div>Description</div>
              <div className="text-center">Quantity</div>
              <div className="text-center">Rate</div>
              <div className="text-right">Amount</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-200">
              <div>
                {invoice.projects?.name || 'Professional Services'}
                {invoice.notes && (
                  <div className="text-xs text-gray-500 mt-1">{invoice.notes}</div>
                )}
              </div>
              <div className="text-center">1</div>
              <div className="text-center">{formatCurrency(invoice.amount)}</div>
              <div className="text-right font-medium">{formatCurrency(invoice.amount)}</div>
            </div>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between py-2">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              
              <div className="flex justify-between py-3 border-t-2 border-gray-300 font-bold text-base">
                <span>Total:</span>
                <span style={{ color: currentTemplate.accentColor }}>
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-medium">
            <span className="text-gray-600">Status: </span>
            <span 
              className={`font-semibold ${
                invoice.status === 'paid' ? 'text-green-600' :
                invoice.status === 'sent' ? 'text-blue-600' :
                invoice.status === 'overdue' ? 'text-red-600' :
                'text-gray-600'
              }`}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-500 text-center">
          <div>Thank you for your business!</div>
          <div className="mt-2">
            Please remit payment within 30 days of the due date.
          </div>
        </div>
      </div>
    )
  }
)

InvoiceTemplate.displayName = "InvoiceTemplate" 