"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { convertInvoiceAmountsOptimized, getCurrencyConversionStats } from "@/lib/currency-conversion-cache"
import { calculateConvertedTotal } from "@/lib/currency-conversion"
import { toast } from "sonner"
import { DataHookReturn } from "@/components/table/types"

export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  payment_received?: number
  balance_due?: number
  currency?: string
  status: string
  issue_date: string
  due_date: string
  notes?: string
  terms?: string
  created_at: string
  updated_at?: string
  clients?: {
    id?: string
    name: string
    company?: string
    email?: string
    avatar_url?: string | null
  }
  projects?: {
    id?: string
    name: string
  }
}

interface InvoiceFilters {
  status?: string[]
  client?: string[]
  search?: string
  dateRange?: { from: Date; to: Date }
  limit?: number // Add pagination support for better performance
  offset?: number
}

// Performance monitoring for search operations
function logSearchPerformance(operation: string, startTime: number, resultCount: number, searchTerm?: string) {
  const duration = performance.now() - startTime
  if (duration > 100) { // Log slow operations (>100ms)
    console.warn(`🐌 Slow ${operation}: ${duration.toFixed(2)}ms`, {
      searchTerm,
      resultCount,
      duration
    })
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${operation}: ${duration.toFixed(2)}ms (${resultCount} results)`)
  }
}

async function fetchInvoices(filters: InvoiceFilters = {}): Promise<{
  data: Invoice[]
  count: number
  metrics: {
    totalInvoices: number
    totalAmount: number
    totalPaid: number
    totalPending: number
    totalOverdue: number
    totalPaymentReceived: number
    totalBalanceDue: number
  }
}> {
  const fetchStartTime = performance.now()
  
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      count: 0,
      metrics: {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalPaymentReceived: 0,
        totalBalanceDue: 0
      }
    }
  }

  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          avatar_url
        ),
        projects (
          id,
          name
        )
      `, { count: 'exact' })

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.client?.length) {
      query = query.in('client_id', filters.client)
    }
    // Don't filter at database level for search - let client-side filtering handle everything
    // This ensures we can search across all fields including client names and amounts
    if (filters.dateRange) {
      query = query
        .gte('issue_date', filters.dateRange.from.toISOString())
        .lte('issue_date', filters.dateRange.to.toISOString())
    }

    // Order by issue date descending
    query = query.order('issue_date', { ascending: false })

    // Add pagination for better performance with large datasets
    if (filters.limit) {
      query = query.limit(filters.limit)
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1)
      }
    }

    const { data, error, count } = await query

    if (error) throw error

    // Log database query performance
    logSearchPerformance('Database Query', fetchStartTime, data?.length || 0, filters.search)

    // Optimized client-side filtering for better search performance
    let filteredData = data || []
    if (filters.search && filters.search.trim()) {
      const searchStartTime = performance.now()
      const searchTerm = filters.search.trim().toLowerCase()
      if (searchTerm) {
        // Pre-check if it's a numeric search to avoid repeated parsing
        const isNumericSearch = !isNaN(parseFloat(searchTerm))
        const searchNum = isNumericSearch ? parseFloat(searchTerm) : null
        
        // Use more efficient filtering with early returns and search optimization
        filteredData = filteredData.filter(invoice => {
          // Pre-compute common search fields to avoid repeated toLowerCase() calls
          const invoiceNumber = invoice.invoice_number?.toLowerCase()
          const clientName = invoice.clients?.name?.toLowerCase()
          const clientCompany = invoice.clients?.company?.toLowerCase()
          const status = invoice.status?.toLowerCase()
          const projectName = invoice.projects?.name?.toLowerCase()
          
          // Priority order: most common searches first for better performance
          
          // 1. Invoice number (most common)
          if (invoiceNumber?.includes(searchTerm)) {
            return true
          }
          
          // 2. Client name and company (second most common)
          if (clientName?.includes(searchTerm) || clientCompany?.includes(searchTerm)) {
            return true
          }
          
          // 3. Status search (common and fast)
          if (status?.includes(searchTerm)) {
            return true
          }
          
          // 4. Project name (if available)
          if (projectName?.includes(searchTerm)) {
            return true
          }
          
          // 5. Amount searches (more expensive, so check later)
          if (isNumericSearch && searchNum !== null) {
            // Optimized numeric search - avoid repeated toString() calls
            const amounts = [
              invoice.total_amount,
              invoice.amount,
              invoice.payment_received,
              (invoice.total_amount || 0) - (invoice.payment_received || 0) // balance_due
            ]
            
            for (const amount of amounts) {
              if (amount !== undefined && amount !== null) {
                // Direct numeric comparison for exact matches (fastest)
                if (amount === searchNum) return true
                
                // String-based search for partial matches
                const amountStr = amount.toString()
                if (amountStr.includes(searchTerm)) return true
                
                // Formatted currency search (most expensive, do last)
                try {
                  const formattedAmount = new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  }).format(amount)
                  if (formattedAmount.includes(searchTerm)) return true
                } catch (e) {
                  // Skip if formatting fails
                }
              }
            }
          }
          
          // 6. Text field searches (less common)
          if (invoice.notes?.toLowerCase().includes(searchTerm) ||
              invoice.terms?.toLowerCase().includes(searchTerm)) {
            return true
          }
          
          // 7. Date searches (least common and most expensive)
          try {
            if (invoice.issue_date && new Date(invoice.issue_date).toLocaleDateString().includes(searchTerm)) {
              return true
            }
            if (invoice.due_date && new Date(invoice.due_date).toLocaleDateString().includes(searchTerm)) {
              return true
            }
          } catch (e) {
            // Ignore date parsing errors
          }
          
          return false
        })
        
        // Log search performance
        logSearchPerformance('Client-side Search', searchStartTime, filteredData.length, searchTerm)
      }
    }

    // Calculate metrics with optimized currency conversion
    let metrics = {
      totalInvoices: count || 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalPaymentReceived: 0,
      totalBalanceDue: 0
    }

    if (filteredData && filteredData.length > 0) {
      try {
        // PERFORMANCE OPTIMIZATION: Intelligent cached conversion - only converts new/changed invoices
        console.time('💰 Currency conversion with cache')
        const allConversions = await convertInvoiceAmountsOptimized(
          filteredData.map(inv => ({
            id: inv.id,
            total_amount: inv.total_amount || 0,
            currency: inv.currency,
            issue_date: inv.issue_date
          }))
        )
        console.timeEnd('💰 Currency conversion with cache')
        
        // Log cache performance stats
        const cacheStats = getCurrencyConversionStats()
        console.log(`📊 Conversion cache performance:`, cacheStats)

        // Client-side filtering of conversion results (much faster than multiple async calls)
        let totalConverted = 0
        let paidConverted = 0
        let pendingConverted = 0
        let overdueConverted = 0
        let totalPaymentReceivedConverted = 0
        let totalBalanceDueConverted = 0

        filteredData.forEach((invoice, index) => {
          const convertedAmount = allConversions[index]?.convertedAmount || 0
          
          totalConverted += convertedAmount
          
          // Calculate payment received and balance due with conversion
          const paymentReceived = invoice.payment_received || 0
          const balanceDue = (invoice.total_amount || 0) - paymentReceived
          
          // For now, using simple conversion rate for payment amounts
          // TODO: Could optimize this with separate payment conversion cache
          const conversionRate = convertedAmount / (invoice.total_amount || 1)
          totalPaymentReceivedConverted += paymentReceived * conversionRate
          totalBalanceDueConverted += balanceDue * conversionRate
          
          switch (invoice.status) {
            case 'paid':
              paidConverted += convertedAmount
              break
            case 'sent':
            case 'partially_paid':
              pendingConverted += convertedAmount
              break
            case 'overdue':
              overdueConverted += convertedAmount
              break
          }
        })

        metrics = {
          totalInvoices: filteredData.length, // Use filtered count instead of total count
          totalAmount: totalConverted,
          totalPaid: paidConverted,
          totalPending: pendingConverted,
          totalOverdue: overdueConverted,
          totalPaymentReceived: totalPaymentReceivedConverted,
          totalBalanceDue: totalBalanceDueConverted
        }
      } catch (error) {
        console.error('Error converting invoice currencies for metrics:', error)
        // Fallback to simple sum without conversion
        metrics = {
          totalInvoices: filteredData.length, // Use filtered count
          totalAmount: filteredData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalPaid: filteredData?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalPending: filteredData?.filter(inv => ['sent', 'partially_paid'].includes(inv.status)).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalOverdue: filteredData?.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalPaymentReceived: filteredData?.reduce((sum, inv) => sum + (inv.payment_received || 0), 0) || 0,
          totalBalanceDue: filteredData?.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.payment_received || 0)), 0) || 0
        }
      }
    }

    return {
      data: filteredData || [],
      count: filteredData.length, // Return filtered count
      metrics
    }
  } catch (error) {
    console.error('Error fetching invoices:', error)
    console.error('Filters used:', filters)
    throw new Error(`Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Search result cache for better performance
const searchCache = new Map<string, { data: Invoice[]; timestamp: number }>()
const SEARCH_CACHE_TTL = 60 * 1000 // 1 minute cache

function getCachedSearchResults(cacheKey: string): Invoice[] | null {
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedSearchResults(cacheKey: string, data: Invoice[]) {
  searchCache.set(cacheKey, { data, timestamp: Date.now() })
  
  // Clean up old cache entries
  if (searchCache.size > 20) {
    const entries = Array.from(searchCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    // Remove oldest 5 entries
    for (let i = 0; i < 5; i++) {
      searchCache.delete(entries[i][0])
    }
  }
}

export function useInvoices(filters: InvoiceFilters = {}): DataHookReturn<Invoice> {
  const queryClient = useQueryClient()

  // Enhanced query with better caching strategy
  const invoicesQuery = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: filters.search ? 30 * 1000 : 2 * 60 * 1000, // Shorter stale time for search, longer for other filters
    gcTime: 10 * 60 * 1000, // 10 minutes - keep data longer for better UX
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    // Enable background refetching for better UX
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Don't retry search queries as aggressively
      if (filters.search && failureCount >= 1) return false
      return failureCount < 3
    }
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['invoices', filters] })
      
      const previousData = queryClient.getQueryData(['invoices', filters])
      
      queryClient.setQueryData(['invoices', filters], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((invoice: Invoice) =>
            invoice.id === id ? { ...invoice, status } : invoice
          )
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['invoices', filters], context.previousData)
      }
      toast.error('Failed to update invoice status')
    },
    onSuccess: () => {
      // No toast here - handled by the UI layer with more details and undo functionality
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', filters] })
    }
  })

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, payment_received }: { id: string; payment_received: number }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ payment_received, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, payment_received }) => {
      await queryClient.cancelQueries({ queryKey: ['invoices', filters] })
      
      const previousData = queryClient.getQueryData(['invoices', filters])
      
      queryClient.setQueryData(['invoices', filters], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((invoice: Invoice) => {
            if (invoice.id === id) {
              const total = invoice.total_amount || 0
              const balance_due = Math.max(0, total - payment_received)
              let status = invoice.status
              
              if (payment_received === 0) {
                status = invoice.status === 'paid' ? 'sent' : invoice.status
              } else if (payment_received >= total) {
                status = 'paid'
              } else if (payment_received > 0 && payment_received < total) {
                status = 'partially_paid'
              }
              
              return { ...invoice, payment_received, balance_due, status }
            }
            return invoice
          })
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['invoices', filters], context.previousData)
      }
      toast.error('Failed to update payment')
    },
    onSuccess: () => {
      toast.success('Payment updated successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', filters] })
    }
  })

  const refetch = useCallback(() => {
    return invoicesQuery.refetch()
  }, [invoicesQuery])

  return {
    data: invoicesQuery.data?.data || [],
    totalCount: invoicesQuery.data?.count || 0,
    isLoading: invoicesQuery.isLoading,
    isFetching: invoicesQuery.isFetching,
    isError: invoicesQuery.isError,
    error: invoicesQuery.error,
    refetch,
    updateStatus: (id: string, status: string) => updateStatusMutation.mutate({ id, status }),
    updatePayment: (id: string, payment_received: number) => updatePaymentMutation.mutate({ id, payment_received }),
    isUpdating: updateStatusMutation.isPending || updatePaymentMutation.isPending,
    metrics: invoicesQuery.data?.metrics
  }
} 