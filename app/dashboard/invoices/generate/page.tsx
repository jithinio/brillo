"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Send, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"
import { PageHeader, PageContent } from "@/components/page-header"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
}

export default function GenerateInvoicePage() {
  const { toast } = useToast()
  const [client, setClient] = useState("")
  const [clientCompany, setClientCompany] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", quantity: 1, rate: 0 }])
  const [projectData, setProjectData] = useState<any>(null)
  const [clientData, setClientData] = useState<any>(null)

  // Load project or client data from sessionStorage when component mounts
  useEffect(() => {
    const storedProjectData = sessionStorage.getItem('invoice-project-data')
    const storedClientData = sessionStorage.getItem('invoice-client-data')
    
    if (storedProjectData) {
      try {
        const projectInfo = JSON.parse(storedProjectData)
        setProjectData(projectInfo)
        
        // Auto-populate form fields
        setClient(projectInfo.clientName || "")
        setClientCompany(projectInfo.clientCompany || "")
        
        // Set due date to 30 days from now
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        setDueDate(dueDate.toISOString().split('T')[0])
        
        // Calculate suggested amount from project data
        const suggestedAmount = projectInfo.projectPending || projectInfo.projectBudget || 0
        
        // Create default invoice item for the project
        setItems([{
          id: "1",
          description: `${projectInfo.projectName} - Project development and implementation`,
          quantity: 1,
          rate: suggestedAmount // Use pending amount or total budget as suggested rate
        }])
        
        // Clear the session storage after loading
        sessionStorage.removeItem('invoice-project-data')
        
        // Show success notification
        toast({
          title: "Invoice Auto-Populated",
          description: `Form filled with data from "${projectInfo.projectName}". ${suggestedAmount > 0 ? `Suggested amount: ${formatCurrency(suggestedAmount)}` : 'Please set the invoice amount.'}`,
        })
      } catch (error) {
        console.error('Error parsing project data:', error)
        toast({
          title: "Error",
          description: "Could not load project data. Please fill the form manually.",
          variant: "destructive",
        })
      }
    } else if (storedClientData) {
      // Handle client data from clients page
      try {
        const clientInfo = JSON.parse(storedClientData)
        setClientData(clientInfo)
        
        // Auto-populate form fields with client data
        setClient(clientInfo.clientName || "")
        setClientCompany(clientInfo.clientCompany || "")
        
        // Set due date to 30 days from now
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        setDueDate(dueDate.toISOString().split('T')[0])
        
        // Create default invoice item
        setItems([{
          id: "1",
          description: "Professional services",
          quantity: 1,
          rate: 0 // User will need to set the rate
        }])
        
        // Clear the session storage after loading
        sessionStorage.removeItem('invoice-client-data')
        
        // Show success notification
        toast({
          title: "Invoice Auto-Populated",
          description: `Form filled with client data for "${clientInfo.clientName}". Please add services and set amounts.`,
        })
      } catch (error) {
        console.error('Error parsing client data:', error)
        toast({
          title: "Error",
          description: "Could not load client data. Please fill the form manually.",
          variant: "destructive",
        })
      }
    }
  }, [])

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.rate, 0)
  }

  return (
    <>
      <PageHeader
        title="Generate Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Generate" }
        ]}
        action={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button size="sm">
              <Send className="mr-2 h-4 w-4" />
              Send Invoice
            </Button>
          </div>
        }
      />
      <PageContent>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Basic information about this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input 
                    id="client" 
                    value={client} 
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCompany">Company</Label>
                  <Input 
                    id="clientCompany" 
                    value={clientCompany} 
                    onChange={(e) => setClientCompany(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input 
                    id="invoiceDate" 
                    type="date" 
                    value={new Date().toISOString().split('T')[0]} 
                    readOnly 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or payment terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>Add services or products to this invoice.</CardDescription>
                </div>
                <Button onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <Label htmlFor={`description-${item.id}`}>Description</Label>
                      <Input
                        id={`description-${item.id}`}
                        placeholder="Service or product description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`quantity-${item.id}`}>Qty</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`rate-${item.id}`}>Rate</Label>
                      <Input
                        id={`rate-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Amount</Label>
                      <div className="h-10 flex items-center font-medium">
                        ${(item.quantity * item.rate).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
              <CardDescription>Review the total amount and details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectData && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                  <div className="text-sm text-green-800">
                    <span className="font-medium">✓ Auto-populated from project:</span>
                    <div className="mt-1">{projectData.projectName}</div>
                  </div>
                </div>
              )}
              
              {clientData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">✓ Auto-populated from client:</span>
                    <div className="mt-1">{clientData.clientName}</div>
                  </div>
                </div>
              )}
              
              {client && (
                <div className="space-y-1 pb-4 border-b">
                  <div className="text-sm font-medium">Bill To:</div>
                  <div className="text-sm">{client}</div>
                  {clientCompany && <div className="text-sm text-muted-foreground">{clientCompany}</div>}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (0%):</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Invoice #:</span> INV-{Date.now().toString().slice(-6)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Issue Date:</span> {new Date().toLocaleDateString()}
                </div>
                {dueDate && (
                  <div className="text-sm">
                    <span className="font-medium">Due Date:</span> {new Date(dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </PageContent>
    </>
  )
}
