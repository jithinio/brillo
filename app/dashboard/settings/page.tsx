"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { setDefaultCurrency, getDefaultCurrency } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  })

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [companyLogo, setCompanyLogo] = useState("")
  
  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    defaultCurrency: "USD",
  })

  // Company information state
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "Suitebase",
    companyAddress: "123 Business St, City, State 12345",
    companyPhone: "+1 (555) 123-4567",
    companyWebsite: "https://suitebase.com",
    companyEmail: "contact@suitebase.com",
    companyRegistration: "",
  })

  // Tax information state
  const [taxInfo, setTaxInfo] = useState({
    taxId: "",
    defaultTaxRate: "8.00",
    taxName: "Sales Tax",
    taxJurisdiction: "",
    taxAddress: "",
    includeTaxInPrices: false,
    autoCalculateTax: true,
  })

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { toast } = useToast()
  const { updateSetting } = useSettings()

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedGeneral = localStorage.getItem('general-settings')
    const savedCompany = localStorage.getItem('company-info')
    const savedTax = localStorage.getItem('tax-info')
    const savedNotifications = localStorage.getItem('notifications')
    const savedLogo = localStorage.getItem('company_logo')

    if (savedGeneral) {
      const parsed = JSON.parse(savedGeneral)
      setGeneralSettings(parsed)
      // Sync currency with global currency system
      if (parsed.defaultCurrency !== getDefaultCurrency()) {
        setDefaultCurrency(parsed.defaultCurrency)
      }
    } else {
      // Load current currency from global system
      const currentCurrency = getDefaultCurrency()
      setGeneralSettings(prev => ({ ...prev, defaultCurrency: currentCurrency }))
    }
    
    if (savedCompany) {
      setCompanyInfo(JSON.parse(savedCompany))
    }
    if (savedTax) {
      setTaxInfo(JSON.parse(savedTax))
    }
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
    if (savedLogo) {
      setCompanyLogo(savedLogo)
    }
  }, [])

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      
      // Save all settings to localStorage
      localStorage.setItem('general-settings', JSON.stringify(generalSettings))
      localStorage.setItem('company-info', JSON.stringify(companyInfo))
      localStorage.setItem('tax-info', JSON.stringify(taxInfo))
      localStorage.setItem('notifications', JSON.stringify(notifications))
      if (companyLogo) {
        localStorage.setItem('company_logo', companyLogo)
      }
      
      // Update global currency setting
      setDefaultCurrency(generalSettings.defaultCurrency)
      updateSetting('defaultCurrency', generalSettings.defaultCurrency)
      
      // Update other settings in the global provider
      updateSetting('companyName', companyInfo.companyName)
      updateSetting('taxRate', parseFloat(taxInfo.defaultTaxRate))
      updateSetting('taxName', taxInfo.taxName)
      updateSetting('includeTaxInPrices', taxInfo.includeTaxInPrices)
      updateSetting('autoCalculateTax', taxInfo.autoCalculateTax)
      
      // In a real app, you would send this to your backend API
      // await api.saveUserSettings({ generalSettings, companyInfo, taxInfo, notifications })
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully. Currency changes will reflect across the app.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!securitySettings.currentPassword) {
      toast({
        title: "Validation Error",
        description: "Current password is required.",
        variant: "destructive",
      })
      return
    }

    if (!securitySettings.newPassword) {
      toast({
        title: "Validation Error",
        description: "New password is required.",
        variant: "destructive",
      })
      return
    }

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (securitySettings.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    try {
      // In a real app, you would send this to your backend API
      // await api.updatePassword(securitySettings.currentPassword, securitySettings.newPassword)
      
      // Clear password fields
      setSecuritySettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    }
  }

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
    <>
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: "Settings" }]}
        action={
          <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />
      <PageContent>
        <PageTitle title="Settings" description="Manage your account settings and preferences" />

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
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select value={generalSettings.defaultCurrency} onValueChange={(value) => setGeneralSettings({...generalSettings, defaultCurrency: value})}>
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
                    <Input 
                      id="companyName" 
                      value={companyInfo.companyName} 
                      onChange={(e) => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Textarea 
                      id="companyAddress" 
                      value={companyInfo.companyAddress} 
                      onChange={(e) => setCompanyInfo({...companyInfo, companyAddress: e.target.value})}
                      rows={3} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <Input 
                        id="companyPhone" 
                        value={companyInfo.companyPhone} 
                        onChange={(e) => setCompanyInfo({...companyInfo, companyPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Website</Label>
                      <Input 
                        id="companyWebsite" 
                        value={companyInfo.companyWebsite} 
                        onChange={(e) => setCompanyInfo({...companyInfo, companyWebsite: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input 
                        id="companyEmail" 
                        type="email" 
                        value={companyInfo.companyEmail} 
                        onChange={(e) => setCompanyInfo({...companyInfo, companyEmail: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyRegistration">Registration Number</Label>
                      <Input 
                        id="companyRegistration" 
                        value={companyInfo.companyRegistration} 
                        onChange={(e) => setCompanyInfo({...companyInfo, companyRegistration: e.target.value})}
                        placeholder="e.g., 123456789" 
                      />
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
                    <Input 
                      id="taxId" 
                      value={taxInfo.taxId} 
                      onChange={(e) => setTaxInfo({...taxInfo, taxId: e.target.value})}
                      placeholder="e.g., VAT123456789" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                    <Input 
                      id="defaultTaxRate" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      max="100" 
                      value={taxInfo.defaultTaxRate} 
                      onChange={(e) => setTaxInfo({...taxInfo, defaultTaxRate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxName">Tax Name</Label>
                    <Input 
                      id="taxName" 
                      value={taxInfo.taxName} 
                      onChange={(e) => setTaxInfo({...taxInfo, taxName: e.target.value})}
                      placeholder="e.g., VAT, GST, Sales Tax" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxJurisdiction">Tax Jurisdiction</Label>
                    <Input 
                      id="taxJurisdiction" 
                      value={taxInfo.taxJurisdiction} 
                      onChange={(e) => setTaxInfo({...taxInfo, taxJurisdiction: e.target.value})}
                      placeholder="e.g., California, UK, EU" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxAddress">Tax Address</Label>
                  <Textarea
                    id="taxAddress"
                    value={taxInfo.taxAddress}
                    onChange={(e) => setTaxInfo({...taxInfo, taxAddress: e.target.value})}
                    placeholder="Address for tax purposes (if different from company address)"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="includeTaxInPrices" 
                    checked={taxInfo.includeTaxInPrices}
                    onCheckedChange={(checked) => setTaxInfo({...taxInfo, includeTaxInPrices: checked})}
                  />
                  <Label htmlFor="includeTaxInPrices" className="text-sm">
                    Include tax in displayed prices
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="autoCalculateTax" 
                    checked={taxInfo.autoCalculateTax}
                    onCheckedChange={(checked) => setTaxInfo({...taxInfo, autoCalculateTax: checked})}
                  />
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
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={securitySettings.currentPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, currentPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={securitySettings.newPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, confirmPassword: e.target.value})}
                  />
                </div>
                <Button onClick={handleUpdatePassword}>Update Password</Button>
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
      </PageContent>
    </>
  )
}
