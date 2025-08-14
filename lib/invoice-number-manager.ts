import { supabase } from '@/lib/supabase'

export interface InvoiceNumberReservation {
  invoiceNumber: string
  expiresAt: Date
  sessionId?: string
}

export class InvoiceNumberManager {
  private sessionId: string

  constructor() {
    // Generate a unique session ID for this browser session
    this.sessionId = this.getOrCreateSessionId()
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('invoice-session-id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('invoice-session-id', sessionId)
    }
    return sessionId
  }

  /**
   * Preview the next invoice number without reserving it
   */
  async previewNextInvoiceNumber(prefix: string = 'INV', year?: number): Promise<string> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('User not authenticated')

      const currentYear = year || new Date().getFullYear()

      const { data, error } = await supabase.rpc('preview_next_invoice_number', {
        p_user_id: userData.user.id,
        p_prefix: prefix,
        p_year: currentYear
      })

      if (error) {
        console.error('Error previewing invoice number:', error)
        return this.generateFallbackPreview(prefix, currentYear, userData.user.id)
      }

      return data
    } catch (error) {
      console.error('Error in previewNextInvoiceNumber:', error)
      return this.generateFallbackPreview(prefix, year || new Date().getFullYear())
    }
  }

  /**
   * Reserve the next invoice number for 30 minutes
   */
  async reserveNextInvoiceNumber(prefix: string = 'INV', year?: number): Promise<string> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('User not authenticated')

      const currentYear = year || new Date().getFullYear()

      const { data, error } = await supabase.rpc('get_next_invoice_number', {
        p_user_id: userData.user.id,
        p_prefix: prefix,
        p_year: currentYear,
        p_session_id: this.sessionId
      })

      if (error) {
        console.error('Error reserving invoice number:', error)
        return this.generateFallbackNumber(prefix, currentYear, userData.user.id)
      }

      return data
    } catch (error) {
      console.error('Error in reserveNextInvoiceNumber:', error)
      return this.generateFallbackNumber(prefix, year || new Date().getFullYear())
    }
  }

  /**
   * Cancel a specific invoice number reservation
   */
  async cancelReservation(invoiceNumber?: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return false

      const { data, error } = await supabase.rpc('cancel_invoice_number_reservation', {
        p_user_id: userData.user.id,
        p_invoice_number: invoiceNumber,
        p_session_id: this.sessionId
      })

      if (error) {
        console.error('Error canceling reservation:', error)
        return false
      }

      return data
    } catch (error) {
      console.error('Error in cancelReservation:', error)
      return false
    }
  }

  /**
   * Cancel all reservations for this session
   */
  async cancelAllSessionReservations(): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return false

      const { data, error } = await supabase.rpc('cancel_invoice_number_reservation', {
        p_user_id: userData.user.id,
        p_invoice_number: null,
        p_session_id: this.sessionId
      })

      if (error) {
        console.error('Error canceling session reservations:', error)
        return false
      }

      return data
    } catch (error) {
      console.error('Error in cancelAllSessionReservations:', error)
      return false
    }
  }

  /**
   * Confirm a reservation when an invoice is actually created
   */
  async confirmReservation(invoiceNumber: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return false

      const { data, error } = await supabase.rpc('confirm_invoice_number_reservation', {
        p_user_id: userData.user.id,
        p_invoice_number: invoiceNumber
      })

      if (error) {
        console.error('Error confirming reservation:', error)
        return false
      }

      return data
    } catch (error) {
      console.error('Error in confirmReservation:', error)
      return false
    }
  }

  /**
   * Fallback method for previewing numbers when database functions fail
   */
  private async generateFallbackPreview(prefix: string, year: number, userId?: string): Promise<string> {
    try {
      if (!userId) {
        const { data: userData } = await supabase.auth.getUser()
        userId = userData.user?.id
      }

      if (!userId) return `${prefix}-${year}-001`

      // Query existing invoices to find the highest number
      const { data: existingInvoices, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .like('invoice_number', `${prefix}-${year}-%`)
        .order('invoice_number', { ascending: false })

      if (error) {
        console.error('Error in fallback preview:', error)
        return `${prefix}-${year}-001`
      }

      let maxNumber = 0
      if (existingInvoices && existingInvoices.length > 0) {
        existingInvoices.forEach(invoice => {
          if (invoice.invoice_number) {
            // Only process invoices from the current year and prefix
            const expectedPattern = `${prefix}-${year}-`
            if (invoice.invoice_number.startsWith(expectedPattern)) {
              const match = invoice.invoice_number.match(/-(\d+)$/)
              if (match) {
                const num = parseInt(match[1], 10)
                if (num > maxNumber) {
                  maxNumber = num
                }
              }
            }
          }
        })
      }

      const nextNumber = maxNumber + 1
      return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`
    } catch (error) {
      console.error('Error in generateFallbackPreview:', error)
      return `${prefix}-${year}-001`
    }
  }

  /**
   * Fallback method for generating numbers when database functions fail
   */
  private async generateFallbackNumber(prefix: string, year: number, userId?: string): Promise<string> {
    // For fallback, we'll use the same logic as preview
    // In a real scenario, this should also handle reservations in memory or localStorage
    return this.generateFallbackPreview(prefix, year, userId)
  }

  /**
   * Setup page unload handler to cancel reservations
   */
  setupPageUnloadHandler(): void {
    const handlePageUnload = () => {
      // Use sendBeacon for reliable cleanup on page unload
      const cleanup = async () => {
        await this.cancelAllSessionReservations()
      }
      
      // For immediate sync operation
      if (navigator.sendBeacon) {
        // For async operations, we'll rely on the session timeout
        cleanup().catch(console.error)
      }
    }

    // Handle page refresh/close
    window.addEventListener('beforeunload', handlePageUnload)
    
    // Handle navigation within the app
    window.addEventListener('pagehide', handlePageUnload)
    
    // Cleanup function to remove listeners
    return () => {
      window.removeEventListener('beforeunload', handlePageUnload)
      window.removeEventListener('pagehide', handlePageUnload)
    }
  }

  /**
   * Clean up expired session data on app startup
   */
  async cleanupOnStartup(): Promise<void> {
    try {
      // Cancel any existing reservations for this session
      await this.cancelAllSessionReservations()
    } catch (error) {
      console.error('Error during startup cleanup:', error)
    }
  }
}

// Export a singleton instance
export const invoiceNumberManager = new InvoiceNumberManager()
