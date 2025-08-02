"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
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
  }
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      count: 0,
      metrics: {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0
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
    if (filters.search) {
      query = query.or(`invoice_number.ilike.%${filters.search}%,clients.name.ilike.%${filters.search}%`)
    }
    if (filters.dateRange) {
      query = query
        .gte('issue_date', filters.dateRange.from.toISOString())
        .lte('issue_date', filters.dateRange.to.toISOString())
    }

    // Order by issue date descending
    query = query.order('issue_date', { ascending: false })

    const { data, error, count } = await query

    if (error) throw error

    // Calculate metrics with optimized currency conversion
    let metrics = {
      totalInvoices: count || 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0
    }

    if (data && data.length > 0) {
      try {
        // PERFORMANCE OPTIMIZATION: Intelligent cached conversion - only converts new/changed invoices
        console.time('💰 Currency conversion with cache')
        const allConversions = await convertInvoiceAmountsOptimized(
          data.map(inv => ({
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

        data.forEach((invoice, index) => {
          const convertedAmount = allConversions[index]?.convertedAmount || 0
          
          totalConverted += convertedAmount
          
          switch (invoice.status) {
            case 'paid':
              paidConverted += convertedAmount
              break
            case 'sent':
              pendingConverted += convertedAmount
              break
            case 'overdue':
              overdueConverted += convertedAmount
              break
          }
        })

        metrics = {
          totalInvoices: count || 0,
          totalAmount: totalConverted,
          totalPaid: paidConverted,
          totalPending: pendingConverted,
          totalOverdue: overdueConverted
        }
      } catch (error) {
        console.error('Error converting invoice currencies for metrics:', error)
        // Fallback to simple sum without conversion
        metrics = {
          totalInvoices: count || 0,
          totalAmount: data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalPaid: data?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalPending: data?.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          totalOverdue: data?.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
        }
      }
    }

    return {
      data: data || [],
      count: count || 0,
      metrics
    }
  } catch (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }
}

export function useInvoices(filters: InvoiceFilters = {}): DataHookReturn<Invoice> {
  const queryClient = useQueryClient()

  // Main query
  const invoicesQuery = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - longer since conversions are cached
    gcTime: 10 * 60 * 1000, // 10 minutes - keep data longer for better UX
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
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
      toast.success('Invoice status updated')
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
    isUpdating: updateStatusMutation.isPending,
    metrics: invoicesQuery.data?.metrics
  }
} 