"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Calendar, DollarSign, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  issue_date: string
  due_date: string
  notes?: string
  created_at: string
  clients?: {
    name: string
    company?: string
  }
  projects?: {
    name: string
  }
}

const statusColors = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  cancelled: "bg-gray-400",
}

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

// Mock data fallback
const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoice_number: "INV-2024-001",
    amount: 5000,
    tax_amount: 400,
    total_amount: 5400,
    status: "paid",
    issue_date: "2024-01-15",
    due_date: "2024-02-14",
    notes: "First milestone payment",
    created_at: "2024-01-15T00:00:00Z",
    clients: {
      name: "John Smith",
      company: "Acme Corporation",
    },
    projects: {
      name: "Website Redesign",
    },
  },
  {
    id: "2",
    invoice_number: "INV-2024-002",
    amount: 15000,
    tax_amount: 1200,
    total_amount: 16200,
    status: "sent",
    issue_date: "2024-02-01",
    due_date: "2024-03-03",
    notes: "Initial development phase",
    created_at: "2024-02-01T00:00:00Z",
    clients: {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
    },
    projects: {
      name: "Mobile App Development",
    },
  },
  {
    id: "3",
    invoice_number: "INV-2024-003",
    amount: 7500,
    tax_amount: 600,
    total_amount: 8100,
    status: "overdue",
    issue_date: "2024-01-01",
    due_date: "2024-01-31",
    notes: "Final payment for brand identity",
    created_at: "2024-01-01T00:00:00Z",
    clients: {
      name: "Michael Brown",
      company: "Global Solutions LLC",
    },
    projects: {
      name: "Brand Identity Package",
    },
  },
  {
    id: "4",
    invoice_number: "INV-2024-004",
    amount: 8750,
    tax_amount: 700,
    total_amount: 9450,
    status: "sent",
    issue_date: "2024-02-15",
    due_date: "2024-03-17",
    notes: "E-commerce platform development",
    created_at: "2024-02-15T00:00:00Z",
    clients: {
      name: "Emily Davis",
      company: "Creative Studio",
    },
    projects: {
      name: "E-commerce Platform",
    },
  },
  {
    id: "5",
    invoice_number: "INV-2024-005",
    amount: 3000,
    tax_amount: 240,
    total_amount: 3240,
    status: "draft",
    issue_date: "2024-02-20",
    due_date: "2024-03-22",
    notes: "Marketing automation setup",
    created_at: "2024-02-20T00:00:00Z",
    clients: {
      name: "David Wilson",
      company: "Retail Plus",
    },
    projects: {
      name: "Marketing Automation",
    },
  },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

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

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projects?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Invoices" breadcrumbs={[{ label: "Invoices" }]} />
        <PageContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        breadcrumbs={[{ label: "Invoices" }]}
        action={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        }
      />
      <PageContent>
        <PageTitle title="Invoices" description="Create, send, and track your invoices" error={error} />

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>{invoice.invoice_number}</span>
                  </CardTitle>
                  {invoice.clients && (
                    <CardDescription className="text-xs">
                      {invoice.clients.company || invoice.clients.name}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Invoice</DropdownMenuItem>
                    <DropdownMenuItem>Edit Invoice</DropdownMenuItem>
                    <DropdownMenuItem>Send Invoice</DropdownMenuItem>
                    <DropdownMenuItem>Download PDF</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete Invoice</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-white ${statusColors[invoice.status as keyof typeof statusColors]}`}
                  >
                    {statusLabels[invoice.status as keyof typeof statusLabels]}
                  </Badge>
                  <div className="flex items-center space-x-1 text-lg font-semibold">
                    <DollarSign className="h-4 w-4" />
                    <span>${invoice.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {invoice.projects && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="truncate">{invoice.projects.name}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Issued {new Date(invoice.issue_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                    </div>
                    {invoice.status !== "paid" && (
                      <span
                        className={`text-xs font-medium ${
                          getDaysUntilDue(invoice.due_date) < 0
                            ? "text-red-600"
                            : getDaysUntilDue(invoice.due_date) <= 7
                              ? "text-yellow-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {getDaysUntilDue(invoice.due_date) < 0
                          ? `${Math.abs(getDaysUntilDue(invoice.due_date))} days overdue`
                          : `${getDaysUntilDue(invoice.due_date)} days left`}
                      </span>
                    )}
                  </div>
                </div>

                {invoice.clients && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{invoice.clients.name}</span>
                  </div>
                )}

                {invoice.notes && <p className="text-xs text-muted-foreground line-clamp-2">{invoice.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInvoices.length === 0 && !loading && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No invoices found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first invoice"}
            </p>
          </div>
        )}
      </PageContent>
    </>
  )
}
