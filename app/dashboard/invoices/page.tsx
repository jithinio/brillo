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
      // Store the full invoice data for potential restoration
      const deletedInvoiceData = { ...invoice }
      
      try {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id)

        if (error) throw error

        // Show success toast with undo functionality
        toast.success('Invoice deleted', {
          description: `${invoice.invoice_number} has been removed`,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                // Restore the deleted invoice
                const restoreData = {
                  invoice_number: deletedInvoiceData.invoice_number,
                  client_id: deletedInvoiceData.client_id,
                  project_id: deletedInvoiceData.project_id,
                  amount: deletedInvoiceData.amount,
                  tax_rate: deletedInvoiceData.tax_rate,
                  tax_amount: deletedInvoiceData.tax_amount,
                  total_amount: deletedInvoiceData.total_amount,
                  status: deletedInvoiceData.status,
                  issue_date: deletedInvoiceData.issue_date,
                  due_date: deletedInvoiceData.due_date,
                  paid_date: deletedInvoiceData.paid_date,
                  notes: deletedInvoiceData.notes,
                  terms: deletedInvoiceData.terms
                }

                const { error: restoreError } = await supabase
                  .from('invoices')
                  .insert([restoreData])

                if (restoreError) {
                  console.error('Error restoring invoice:', restoreError)
                  toast.error('Failed to restore invoice', {
                    description: 'Please check your database connection and try again'
                  })
                  return
                }

                toast.success('Invoice restored successfully', {
                  description: `${invoice.invoice_number} has been recovered`
                })
                invoicesData.refetch()
              } catch (error: any) {
                console.error('Error restoring invoice:', error)
                toast.error('Failed to restore invoice', {
                  description: error.message
                })
              }
            },
          },
        })
        invoicesData.refetch()
      } catch (error) {
        console.error('Error deleting invoice:', error)
        toast.error('Failed to delete invoice')
      }
    },
    onBatchDelete: async (invoices: any[]) => {
      // Store the full invoice data for potential restoration
      const deletedInvoicesData = invoices.map(invoice => ({ ...invoice }))
      const invoiceNumbers = invoices.map(inv => inv.invoice_number).join(', ')
      
      try {
        const ids = invoices.map(inv => inv.id)
        const { error } = await supabase
          .from('invoices')
          .delete()
          .in('id', ids)

        if (error) throw error

        // Show success toast with undo functionality
        toast.success(`Deleted ${ids.length} invoice${ids.length > 1 ? 's' : ''}`, {
          description: `${invoiceNumbers.length > 50 ? ids.length + ' invoices' : invoiceNumbers} removed`,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                // Restore the deleted invoices
                const restoreDataArray = deletedInvoicesData.map(invoice => ({
                  invoice_number: invoice.invoice_number,
                  client_id: invoice.client_id,
                  project_id: invoice.project_id,
                  amount: invoice.amount,
                  tax_rate: invoice.tax_rate,
                  tax_amount: invoice.tax_amount,
                  total_amount: invoice.total_amount,
                  status: invoice.status,
                  issue_date: invoice.issue_date,
                  due_date: invoice.due_date,
                  paid_date: invoice.paid_date,
                  notes: invoice.notes,
                  terms: invoice.terms
                }))

                const { error: restoreError } = await supabase
                  .from('invoices')
                  .insert(restoreDataArray)

                if (restoreError) {
                  console.error('Error restoring invoices:', restoreError)
                  toast.error('Failed to restore invoices', {
                    description: 'Please check your database connection and try again'
                  })
                  return
                }

                toast.success(`${ids.length} invoice${ids.length > 1 ? 's' : ''} restored successfully`, {
                  description: 'All deleted invoices have been recovered'
                })
                invoicesData.refetch()
              } catch (error: any) {
                console.error('Error restoring invoices:', error)
                toast.error('Failed to restore invoices', {
                  description: error.message
                })
              }
            },
          },
        })
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
        onStatusChange: (invoice, newStatus) => {
          const previousStatus = invoice.status
          const statusLabels = {
            draft: 'Draft',
            sent: 'Sent', 
            paid: 'Paid',
            overdue: 'Overdue',
            cancelled: 'Cancelled'
          }
          
          // Execute status change immediately
          invoicesData.updateStatus?.(invoice.id, newStatus)
          
          // Show toast with undo functionality
          toast.success(`Status changed to ${statusLabels[newStatus as keyof typeof statusLabels]}`, {
            description: `${invoice.invoice_number} is now ${statusLabels[newStatus as keyof typeof statusLabels].toLowerCase()}`,
            action: {
              label: "Undo",
              onClick: () => {
                invoicesData.updateStatus?.(invoice.id, previousStatus)
                toast.success(`Reverted to ${statusLabels[previousStatus as keyof typeof statusLabels]}`, {
                  description: `${invoice.invoice_number} status restored`
                })
              },
            },
          })
        },
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
