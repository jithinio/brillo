"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Save, Bell, Shield, CreditCard, Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  })

  const [uploading, setUploading] = useState(false)
  const [companyLogo, setCompanyLogo] = useState("")
  const { toast } = useToast()

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.")
      }

      const file = event.target.files[0]

      // For demo purposes, create a local URL
      const localUrl = URL.createObjectURL(file)
      setCompanyLogo(localUrl)
      localStorage.setItem("company_logo", localUrl)

      toast({
        title: "Success",
        description: "Company logo uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Error",
        description: "Failed to upload company logo",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <Button size="sm">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Preferences</CardTitle>
              <CardDescription>Update your general application preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD (A$) - Australian Dollar</SelectItem>
                      <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                      <SelectItem value="CHF">CHF (Fr) - Swiss Franc</SelectItem>
                      <SelectItem value="CNY">CNY (¥) - Chinese Yuan</SelectItem>
                      <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This currency will be used throughout the app for invoices, projects, and reports.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue="mm/dd/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details for invoices and contracts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyLogo">Company Logo</Label>
                  <div className="flex items-center space-x-4">
                    {companyLogo ? (
                      <div className="w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={companyLogo || "/placeholder.svg"}
                          alt="Company Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" disabled={uploading} asChild>
                          <span>
                            {uploading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            {companyLogo ? "Change Logo" : "Upload Logo"}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: PNG or JPG, max 2MB, square format
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="Suitebase" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea id="companyAddress" defaultValue="123 Business St, City, State 12345" rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone</Label>
                    <Input id="companyPhone" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input id="companyWebsite" defaultValue="https://suitebase.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input id="companyEmail" type="email" defaultValue="contact@suitebase.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyRegistration">Registration Number</Label>
                    <Input id="companyRegistration" placeholder="e.g., 123456789" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Information</CardTitle>
              <CardDescription>Configure tax settings for invoices and financial reporting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                  <Input id="taxId" placeholder="e.g., VAT123456789" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                  <Input id="defaultTaxRate" type="number" step="0.01" min="0" max="100" defaultValue="8.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxName">Tax Name</Label>
                  <Input id="taxName" defaultValue="Sales Tax" placeholder="e.g., VAT, GST, Sales Tax" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxJurisdiction">Tax Jurisdiction</Label>
                  <Input id="taxJurisdiction" placeholder="e.g., California, UK, EU" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxAddress">Tax Address</Label>
                <Textarea
                  id="taxAddress"
                  placeholder="Address for tax purposes (if different from company address)"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="includeTaxInPrices" />
                <Label htmlFor="includeTaxInPrices" className="text-sm">
                  Include tax in displayed prices
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="autoCalculateTax" defaultChecked />
                <Label htmlFor="autoCalculateTax" className="text-sm">
                  Automatically calculate tax on invoices
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about important updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">Not enabled</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>Manage your subscription and payment methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">Enterprise - $99/month</p>
                </div>
                <Button variant="outline">Change Plan</Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Payment Method</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
