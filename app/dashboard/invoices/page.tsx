import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Eye } from "lucide-react"

const invoices = [
  {
    id: "INV-001",
    client: "Acme Corporation",
    amount: 2500,
    status: "Paid",
    dueDate: "2024-01-15",
    issueDate: "2024-01-01",
  },
  {
    id: "INV-002",
    client: "TechStart Inc.",
    amount: 1800,
    status: "Pending",
    dueDate: "2024-02-10",
    issueDate: "2024-01-25",
  },
  {
    id: "INV-003",
    client: "Global Solutions",
    amount: 3200,
    status: "Overdue",
    dueDate: "2024-01-20",
    issueDate: "2024-01-05",
  },
]

export default function InvoicesPage() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Create, manage, and track your invoices and payments.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." className="pl-8" />
        </div>
      </div>

      <div className="grid gap-6">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{invoice.id}</CardTitle>
                  <CardDescription>{invoice.client}</CardDescription>
                </div>
                <Badge
                  variant={
                    invoice.status === "Paid" ? "default" : invoice.status === "Pending" ? "secondary" : "destructive"
                  }
                >
                  {invoice.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-2xl font-bold">${invoice.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Issue Date</p>
                    <p className="text-sm text-muted-foreground">{invoice.issueDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-muted-foreground">{invoice.dueDate}</p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
