"use client"

import { useEffect, useState } from "react"
import { Plus, Eye, Mail, Download, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase } from "@/lib/supabase"
import InvoicesLoading from "./loading"
import { isSupabaseConfigured } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createColumns, type Invoice } from "@/components/invoices/columns"
import { DataTable } from "@/components/invoices/data-table"
import { formatCurrency } from "@/lib/currency"

// Mock data fallback
const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoice_number: "INV-2024-001",
    amount: 2450,
    tax_amount: 245,
    total_amount: 2695,
    status: "sent",
    issue_date: "2024-01-15",
    due_date: "2024-02-15",
    notes: "Web development services",
    created_at: "2024-01-15T00:00:00Z",
    clients: {
      name: "John Doe",
      company: "Acme Corp",
    },
    projects: {
      name: "E-commerce Website",
    },
  },
  {
    id: "2",
    invoice_number: "INV-2024-002",
    amount: 1800,
    tax_amount: 180,
    total_amount: 1980,
    status: "paid",
    issue_date: "2024-01-20",
    due_date: "2024-02-20",
    notes: "Monthly retainer",
    created_at: "2024-01-20T00:00:00Z",
    clients: {
      name: "Jane Smith",
      company: "Tech Solutions Inc",
    },
    projects: {
      name: "Tech Solutions App",
    },
  },
  {
    id: "3",
    invoice_number: "INV-2024-003",
    amount: 3200,
    tax_amount: 320,
    total_amount: 3520,
    status: "overdue",
    issue_date: "2024-01-05",
    due_date: "2024-01-05",
    notes: "Logo design and branding",
    created_at: "2024-01-05T00:00:00Z",
    clients: {
      name: "Mike Johnson",
      company: "Creative Studios",
    },
    projects: {
      name: "Brand Identity",
    },
  },
  {
    id: "4",
    invoice_number: "INV-2024-004",
    amount: 2800,
    tax_amount: 280,
    total_amount: 3080,
    status: "draft",
    issue_date: "2024-02-01",
    due_date: "2024-03-01",
    notes: "Mobile app development",
    created_at: "2024-02-01T00:00:00Z",
    clients: {
      name: "Sarah Williams",
      company: "Mobile Innovations",
    },
    projects: {
      name: "Mobile Banking App",
    },
  },
]

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [sendInvoiceOpen, setSendInvoiceOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
  // Send invoice form state
  const [sendForm, setSendForm] = useState({
    to: "",
    subject: "",
    message: ""
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    try {
      setError(null)

      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, using mock data")
        setInvoices(mockInvoices)
        setError("Using demo data - Supabase not configured")
        return
      }

      const { data, error } = await supabase
        .from("invoices")
        .select(`
        *,
        clients (
          name,
          company
        ),
        projects (
          name
        )
      `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        // Use mock data as fallback
        setInvoices(mockInvoices)
        setError("Using demo data - database connection failed")
      } else {
        setInvoices(data || [])
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
      // Use mock data as fallback
      setInvoices(mockInvoices)
      setError("Using demo data - connection error")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push("/dashboard/invoices/generate")
  }

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewDetailsOpen(true)
  }

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setSendForm({
      to: invoice.clients?.name ? `${invoice.clients.name.toLowerCase().replace(' ', '.')}@example.com` : "",
      subject: `Invoice ${invoice.invoice_number} from Your Company`,
      message: `Dear ${invoice.clients?.name || 'Client'},\n\nPlease find attached your invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)}.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nThank you for your business!\n\nBest regards,\nYour Company`
    })
    setSendInvoiceOpen(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    // Create a simple PDF-like content
    const pdfContent = `
INVOICE
${invoice.invoice_number}

Invoice Date: ${new Date(invoice.issue_date).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}

Bill To:
${invoice.clients?.name || 'N/A'}
${invoice.clients?.company || ''}

Project: ${invoice.projects?.name || 'N/A'}
Description: ${invoice.notes || 'No description'}

Amount: ${formatCurrency(invoice.amount)}
Tax: ${formatCurrency(invoice.tax_amount)}
Total: ${formatCurrency(invoice.total_amount)}

Status: ${invoice.status.toUpperCase()}
    `.trim()

    // Create and download the file
    const blob = new Blob([pdfContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoice.invoice_number}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`Invoice ${invoice.invoice_number} downloaded successfully!`)
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      // In a real app, you would delete from Supabase here
      // For now, just remove from local state
      setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id))
      toast.success(`Invoice ${selectedInvoice.invoice_number} deleted successfully!`)
    } catch (error) {
      toast.error("Failed to delete invoice")
    } finally {
      setDeleteConfirmOpen(false)
      setSelectedInvoice(null)
    }
  }

  const handleSendInvoiceSubmit = async () => {
    if (!selectedInvoice) return

    try {
      // In a real app, you would integrate with an email service here
      // For now, just simulate success and update status
      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'sent' }
          : inv
      ))
      
      toast.success(`Invoice ${selectedInvoice.invoice_number} sent to ${sendForm.to}!`)
    } catch (error) {
      toast.error("Failed to send invoice")
    } finally {
      setSendInvoiceOpen(false)
      setSelectedInvoice(null)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
      sent: { label: "Sent", color: "bg-blue-100 text-blue-700" },
      paid: { label: "Paid", color: "bg-green-100 text-green-700" },
      overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
      cancelled: { label: "Cancelled", color: "bg-gray-50 text-gray-600" },
    }
    return configs[status as keyof typeof configs] || configs.draft
  }

  const columnActions = {
    onViewDetails: handleViewDetails,
    onEditInvoice: (invoice: Invoice) => {
      router.push(`/dashboard/invoices/customize?id=${invoice.id}`)
    },
    onSendInvoice: handleSendInvoice,
    onDownloadPDF: handleDownloadPDF,
    onDeleteInvoice: handleDeleteInvoice,
  }

  const columns = createColumns(columnActions)

  if (loading) {
    return <InvoicesLoading />
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        breadcrumbs={[{ label: "Invoices" }]}
      />
      <PageContent>
        <PageTitle title="Invoices" description="Create, send, and track your invoices" error={error} />
        <div className="overflow-x-auto">
          <DataTable 
            columns={columns} 
            data={invoices} 
            onCreateInvoice={handleCreateInvoice}
          />
        </div>
      </PageContent>

      {/* View Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Invoice Details</span>
            </DialogTitle>
            <DialogDescription>
              Detailed information for {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Invoice #:</span>
                      <span className="text-sm font-medium">{selectedInvoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={getStatusConfig(selectedInvoice.status).color}>
                        {getStatusConfig(selectedInvoice.status).label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Issue Date:</span>
                      <span className="text-sm">{new Date(selectedInvoice.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Due Date:</span>
                      <span className="text-sm">{new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium">{selectedInvoice.clients?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Company:</span>
                      <span className="text-sm">{selectedInvoice.clients?.company || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Project:</span>
                      <span className="text-sm">{selectedInvoice.projects?.name || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Amount Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                    <span className="text-sm">{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tax:</span>
                    <span className="text-sm">{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-medium text-lg">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>

              {selectedInvoice.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Invoice Modal */}
      <Dialog open={sendInvoiceOpen} onOpenChange={setSendInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Send Invoice</span>
            </DialogTitle>
            <DialogDescription>
              Send {selectedInvoice?.invoice_number} via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={sendForm.to}
                onChange={(e) => setSendForm({...sendForm, to: e.target.value})}
                placeholder="client@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={sendForm.subject}
                onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                rows={6}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSendInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvoiceSubmit}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {selectedInvoice?.invoice_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
