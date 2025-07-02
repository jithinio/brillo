"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getDefaultCurrency, getCurrencySymbol } from "@/lib/currency"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Eye } from "lucide-react"
import { PageHeader, PageContent } from "@/components/page-header"

export default function CustomizeInvoicePage() {
  const [template, setTemplate] = useState({
    companyName: "Your Company",
    companyAddress: "123 Business St, City, State 12345",
    companyEmail: "contact@yourcompany.com",
    companyPhone: "+1 (555) 123-4567",
    logoUrl: "",
    primaryColor: "#000000",
    accentColor: "#6366f1",
    fontSize: "medium",
    currency: "USD", // This will be updated from global setting
  })

  // Initialize currency from global setting
  useEffect(() => {
    const globalCurrency = getDefaultCurrency()
    setTemplate(prev => ({ ...prev, currency: globalCurrency }))
  }, [])

  return (
    <>
      <PageHeader
        title="Customize Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Customize" }
        ]}
        action={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        }
      />
      <PageContent>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details that will appear on invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={template.companyName}
                  onChange={(e) => setTemplate({ ...template, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Textarea
                  id="companyAddress"
                  value={template.companyAddress}
                  onChange={(e) => setTemplate({ ...template, companyAddress: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={template.companyEmail}
                    onChange={(e) => setTemplate({ ...template, companyEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    value={template.companyPhone}
                    onChange={(e) => setTemplate({ ...template, companyPhone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize the visual appearance of your invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={template.logoUrl}
                  onChange={(e) => setTemplate({ ...template, logoUrl: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={template.primaryColor}
                    onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <Input
                    id="accentColor"
                    type="color"
                    value={template.accentColor}
                    onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select
                    value={template.fontSize}
                    onValueChange={(value) => setTemplate({ ...template, fontSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={template.currency}
                    onValueChange={(value) => setTemplate({ ...template, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your invoice will look with the current settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 bg-white text-black min-h-[600px]">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-2xl font-bold" style={{ color: template.primaryColor }}>
                      {template.companyName}
                    </h1>
                    <div className="text-sm text-gray-600 mt-2 whitespace-pre-line">{template.companyAddress}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {template.companyEmail} • {template.companyPhone}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold" style={{ color: template.accentColor }}>
                      INVOICE
                    </h2>
                    <div className="text-sm text-gray-600 mt-2">
                      Invoice #: INV-001
                      <br />
                      Date: {new Date().toLocaleDateString()}
                      <br />
                      Due: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <div className="text-sm text-gray-600">
                    Client Name
                    <br />
                    Client Address
                    <br />
                    client@email.com
                  </div>
                </div>

                <div className="border-t border-b py-4 mb-4">
                  <div className="grid grid-cols-4 gap-4 font-semibold text-sm">
                    <div>Description</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-center">Rate</div>
                    <div className="text-right">Amount</div>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>Sample Service</div>
                    <div className="text-center">1</div>
                    <div className="text-center">
                      {getCurrencySymbol(template.currency)}1,000
                    </div>
                    <div className="text-right">
                      {getCurrencySymbol(template.currency)}1,000
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg" style={{ color: template.accentColor }}>
                        {getCurrencySymbol(template.currency)}1,000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </PageContent>
    </>
  )
}
