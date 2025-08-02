import { getHistoricalExchangeRate } from './exchange-rates-live'
import { getCompanySettings } from './company-settings'

/**
 * Historical currency conversion for invoices
 * Converts invoice amounts to company default currency using historical rates
 */

export interface ConvertedInvoiceAmount {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  conversionDate: string
  wasConverted: boolean
}

/**
 * Convert invoice amount to default currency using historical exchange rate
 * @param amount - Original invoice amount
 * @param invoiceCurrency - Invoice currency code
 * @param issueDate - Invoice issue date (for historical rate)
 * @param targetCurrency - Target currency (optional, defaults to company default)
 */
export async function convertInvoiceAmount(
  amount: number,
  invoiceCurrency: string,
  issueDate: string,
  targetCurrency?: string
): Promise<ConvertedInvoiceAmount> {
  
  // Get target currency (company default if not provided)
  let defaultCurrency = targetCurrency
  if (!defaultCurrency) {
    try {
      const settings = await getCompanySettings()
      defaultCurrency = settings?.default_currency || 'USD'
    } catch {
      defaultCurrency = 'USD'
    }
  }

  // If same currency, no conversion needed
  if (invoiceCurrency === defaultCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: amount,
      targetCurrency: defaultCurrency,
      exchangeRate: 1,
      conversionDate: issueDate,
      wasConverted: false
    }
  }

  try {
    // 🚀 NEW: Get actual historical exchange rate for the invoice issue date
    console.log(`💰 Converting invoice: ${amount} ${invoiceCurrency} → ${defaultCurrency} (date: ${issueDate})`)
    
    // Validate the issue date
    const issueDateTime = new Date(issueDate)
    const today = new Date()
    if (issueDateTime > today) {
      console.warn(`⚠️ Future invoice date detected: ${issueDate}. This will use live rates instead of historical.`)
    }
    
    const exchangeRate = await getHistoricalExchangeRate(invoiceCurrency, defaultCurrency, issueDate)
    const convertedAmount = amount * exchangeRate
    
    console.log(`✅ Conversion result: ${amount} ${invoiceCurrency} = ${convertedAmount} ${defaultCurrency} (rate: ${exchangeRate})`)

    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: convertedAmount,
      targetCurrency: defaultCurrency,
      exchangeRate: exchangeRate,
      conversionDate: issueDate,
      wasConverted: true
    }
  } catch (error) {
    console.error(`Currency conversion failed for ${invoiceCurrency} to ${defaultCurrency}:`, error)
    
    // Fallback: return original amount without conversion
    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: amount,
      targetCurrency: invoiceCurrency, // Keep original currency as fallback
      exchangeRate: 1,
      conversionDate: issueDate,
      wasConverted: false
    }
  }
}

/**
 * Convert multiple invoice amounts to default currency using historical rates
 * 
 * NOTE: Changed from batch processing to individual historical rate lookups
 * to ensure each invoice uses the exact exchange rate from its issue date.
 * This provides perfect accuracy for financial reporting.
 */
export async function convertInvoiceAmounts(
  invoices: Array<{
    total_amount: number
    currency?: string
    issue_date: string
  }>,
  targetCurrency?: string
): Promise<ConvertedInvoiceAmount[]> {
  
  if (!invoices.length) return []
  
  // Get target currency once
  let defaultCurrency = targetCurrency
  if (!defaultCurrency) {
    try {
      const settings = await getCompanySettings()
      defaultCurrency = settings?.default_currency || 'USD'
    } catch {
      defaultCurrency = 'USD'
    }
  }

  // Group invoices by currency for batch processing
  const currencyGroups = invoices.reduce((groups, invoice, index) => {
    const currency = invoice.currency || 'USD'
    if (!groups[currency]) {
      groups[currency] = []
    }
    groups[currency].push({ invoice, index })
    return groups
  }, {} as Record<string, Array<{ invoice: typeof invoices[0], index: number }>>)

  // 🚀 NEW: Process each invoice with its specific historical exchange rate
  const results: ConvertedInvoiceAmount[] = new Array(invoices.length)
  
  // Convert each invoice using its historical rate from issue date
  const conversionPromises = invoices.map(async (invoice, index) => {
    const currency = invoice.currency || 'USD'
    const isSameCurrency = currency === defaultCurrency
    
    if (isSameCurrency) {
      // No conversion needed for same currency
      results[index] = {
        originalAmount: invoice.total_amount,
        originalCurrency: currency,
        convertedAmount: invoice.total_amount,
        targetCurrency: defaultCurrency,
        exchangeRate: 1,
        conversionDate: invoice.issue_date,
        wasConverted: false
      }
    } else {
      try {
        // 🎯 KEY FIX: Use historical rate for each invoice's issue date
        const exchangeRate = await getHistoricalExchangeRate(currency, defaultCurrency, invoice.issue_date)
        const convertedAmount = invoice.total_amount * exchangeRate
        
        results[index] = {
          originalAmount: invoice.total_amount,
          originalCurrency: currency,
          convertedAmount,
          targetCurrency: defaultCurrency,
          exchangeRate,
          conversionDate: invoice.issue_date,
          wasConverted: true
        }
      } catch (error) {
        console.error(`Historical conversion failed for ${currency} to ${defaultCurrency} on ${invoice.issue_date}:`, error)
        
        // Fallback: no conversion
        results[index] = {
          originalAmount: invoice.total_amount,
          originalCurrency: currency,
          convertedAmount: invoice.total_amount,
          targetCurrency: currency,
          exchangeRate: 1,
          conversionDate: invoice.issue_date,
          wasConverted: false
        }
      }
    }
  })
  
  // Wait for all conversions to complete
  await Promise.all(conversionPromises)
  
  return results
}

/**
 * Calculate total amount from converted invoices
 */
export function calculateConvertedTotal(conversions: ConvertedInvoiceAmount[]): {
  totalConverted: number
  totalOriginal: number
  currency: string
  conversionsCount: number
} {
  const totalConverted = conversions.reduce((sum, conv) => sum + conv.convertedAmount, 0)
  const totalOriginal = conversions.reduce((sum, conv) => sum + conv.originalAmount, 0)
  const conversionsCount = conversions.filter(conv => conv.wasConverted).length
  
  // Get target currency from first conversion (they should all be the same)
  const currency = conversions.length > 0 ? conversions[0].targetCurrency : 'USD'
  
  return {
    totalConverted,
    totalOriginal,
    currency,
    conversionsCount
  }
}

/**
 * Get conversion summary for display
 */
export function getConversionSummary(conversions: ConvertedInvoiceAmount[]): {
  message: string
  details: string[]
} {
  const conversionsCount = conversions.filter(conv => conv.wasConverted).length
  const totalInvoices = conversions.length
  
  if (conversionsCount === 0) {
    return {
      message: "All amounts in default currency",
      details: []
    }
  }
  
  const currencyBreakdown = conversions
    .filter(conv => conv.wasConverted)
    .reduce((acc, conv) => {
      acc[conv.originalCurrency] = (acc[conv.originalCurrency] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  
  const details = Object.entries(currencyBreakdown)
    .map(([currency, count]) => `${count} invoice${count > 1 ? 's' : ''} converted from ${currency}`)
  
  return {
    message: `${conversionsCount} of ${totalInvoices} invoices converted to default currency`,
    details
  }
}