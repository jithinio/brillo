"use client"

import { useState } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { GenericTableWrapper } from "@/components/table/GenericTableWrapper"
import { createInvoiceColumns } from "@/components/invoices/generic-columns"
import { useInvoices } from "@/hooks/use-invoices"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { InvoiceMetrics } from "@/components/invoices/InvoiceMetrics"
import { EntityActions } from "@/components/table/types"
import { DataHookReturn } from "@/components/table/types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { getDateRangeFromTimePeriod } from "@/lib/project-filters-v2"

export default function InvoicesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<any>({})
  
  // Convert timePeriod filter to dateRange for useInvoices
  const processedFilters = React.useMemo(() => {
    if (!filters.timePeriod) return filters
    
    const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
    if (dateFrom && dateTo) {
      return {
        ...filters,
        dateRange: {
          from: new Date(dateFrom),
          to: new Date(dateTo)
        }
      }
    }
    
    return filters
  }, [filters])
  
  const invoicesData = useInvoices(processedFilters)

  // Calculate metrics from data
  const metrics = React.useMemo(() => {
    if (!invoicesData.data || invoicesData.isLoading) return null
    
    const paidInvoices = invoicesData.data.filter(i => i.status === 'paid').length
    const totalAmount = invoicesData.data.reduce((sum, i) => sum + (i.total_amount || 0), 0)
    const paidAmount = invoicesData.data
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0)
    const pendingAmount = invoicesData.data
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0)
    const overdueAmount = invoicesData.data
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0)
    
    return {
      totalInvoices: invoicesData.data.length,
      paidInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount
    }
  }, [invoicesData.data, invoicesData.isLoading])

  // Entity actions for generic table
  const entityActions: EntityActions<any> = {
    onCreate: () => router.push('/dashboard/invoices/generate'),
    onEdit: (invoice: any) => {
      // Navigate to edit invoice
    const editData = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.clients?.id || null,
      clientName: invoice.clients?.name,
        clientCompany: invoice.clients?.company || undefined,
      amount: invoice.amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      paymentTerms: invoice.terms,
      items: invoice.items || [],
      projectName: invoice.projects?.name
    }
    
    sessionStorage.setItem('edit-invoice-data', JSON.stringify(editData))
      router.push('/dashboard/invoices/generate?edit=true')
    },
    onDelete: async (invoice: any) => {
      try {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id)

        if (error) throw error

        toast.success('Invoice deleted')
        invoicesData.refetch()
      } catch (error) {
        console.error('Error deleting invoice:', error)
        toast.error('Failed to delete invoice')
      }
    },
    onBatchDelete: async (invoices: any[]) => {
      try {
        const ids = invoices.map(inv => inv.id)
        const { error } = await supabase
          .from('invoices')
          .delete()
          .in('id', ids)

        if (error) throw error

        toast.success(`Deleted ${ids.length} invoice${ids.length > 1 ? 's' : ''}`)
        invoicesData.refetch()
      } catch (error) {
        console.error('Error deleting invoices:', error)
        toast.error('Failed to delete invoices')
      }
    },
    onExport: () => {
      toast.info('Export feature coming soon')
    },
    // New context menu specific actions
    customActions: {
      'View Details': (invoice: any) => {
        router.push(`/dashboard/invoices/${invoice.id}/preview`)
      },
      'Send Invoice': (invoice: any) => {
        // Check if client has email
        if (!invoice.clients?.email) {
          toast.error('Client email not found', {
            description: 'Please add an email address for this client before sending.'
          })
          return
        }
        
        toast.info('Send invoice feature coming soon')
        // TODO: Implement send invoice functionality
      },
    }
  }

  return (
    <GenericTableWrapper
      entityType="invoices"
      pageTitle="Invoices"
      dataHook={() => invoicesData as DataHookReturn<any>}
      onFiltersChange={setFilters}
      createColumns={(actions: any) => createInvoiceColumns({
        onStatusChange: (invoice, status) => invoicesData.updateStatus?.(invoice.id, status),
        onInvoiceClick: (invoice) => router.push(`/dashboard/invoices/${invoice.id}/preview`),
      })}
      features={{
        search: true,
        batchOperations: true,
        contextMenu: true,
        infiniteScroll: false,
        footerAggregations: true,
        columnResizing: true,
      }}
      actions={entityActions}
      defaultColumnWidths={{
        select: 50,
        invoice_number: 150,
        client: 200,
        project: 200,
        status: 120,
        total_amount: 150,
        issue_date: 120,
        due_date: 120,
      }}
      metricsComponent={<InvoiceMetrics metrics={metrics} />}
      addButton={
                        <Button 
          onClick={() => router.push('/dashboard/invoices/generate')}
                          size="sm"
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
                        Create Invoice
                      </Button>
      }
    />
  )
}
