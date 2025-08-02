"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { PhoneInput } from "@/components/ui/phone-input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Save, Upload, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { setDefaultCurrency, getDefaultCurrency, CURRENCIES } from "@/lib/currency"
import { useSettings } from "@/components/settings-provider"
import { useSubscription } from "@/components/providers/subscription-provider"
import { uploadCompanyLogo } from "@/lib/company-settings"
import { DATE_FORMAT_OPTIONS, type DateFormat } from "@/lib/date-format"
import { clearCurrencyConversionCache } from "@/lib/currency-conversion-cache"
import { SubscriptionManagement } from "@/components/pricing/subscription-management"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [companyLogo, setCompanyLogo] = useState("") // Always start empty, will be set by settings provider
  const [originalCurrency, setOriginalCurrency] = useState("USD") // Track original currency for change detection
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false) // Control currency change warning dialog
  const [activeTab, setActiveTab] = useState("general")
  const [hasUserChanges, setHasUserChanges] = useState(false) // Track if user has made changes
  
  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    defaultCurrency: "USD",
    invoicePrefix: "INV",
    dateFormat: "MM/DD/YYYY" as DateFormat,
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

  const { updateSetting, settings, isLoading } = useSettings()
  const { isLoading: subscriptionLoading } = useSubscription()

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['general', 'company', 'subscription'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Load settings from localStorage and settings provider on component mount
  useEffect(() => {
    const savedGeneral = localStorage.getItem('general-settings')
    const savedTax = localStorage.getItem('tax-info')

    // Load general settings
    if (savedGeneral) {
      const parsed = JSON.parse(savedGeneral)
      setGeneralSettings(prev => ({
        ...prev,
        defaultCurrency: parsed.defaultCurrency || settings.defaultCurrency || prev.defaultCurrency,
        invoicePrefix: parsed.invoicePrefix || settings.invoicePrefix || prev.invoicePrefix,
        dateFormat: parsed.dateFormat || settings.dateFormat || prev.dateFormat,
      }))
    } else {
      // Use settings provider values (from database) as fallback
      setGeneralSettings(prev => ({
        ...prev,
        defaultCurrency: settings.defaultCurrency || prev.defaultCurrency,
        invoicePrefix: settings.invoicePrefix || prev.invoicePrefix,
        dateFormat: settings.dateFormat || prev.dateFormat,
      }))
    }
    
    // Load company info - prioritize database over localStorage
    if (!isLoading && settings.companyName) {
      console.log('📞 Loading phone from database:', settings.companyPhone)
      setCompanyInfo({
        companyName: settings.companyName || "Suitebase",
        companyAddress: settings.companyAddress || "123 Business St, City, State 12345",
        companyPhone: settings.companyPhone || "+1 (555) 123-4567",
        companyWebsite: settings.companyWebsite || "https://suitebase.com",
        companyEmail: settings.companyEmail || "contact@suitebase.com",
        companyRegistration: settings.companyRegistration || "",
      })
      
      // Reset user changes flag when loading from database
      setHasUserChanges(false)
    }
    
    // Load tax info 
    if (savedTax) {
      const parsed = JSON.parse(savedTax)
      setTaxInfo(prev => ({
        taxId: parsed.taxId || prev.taxId,
        defaultTaxRate: parsed.defaultTaxRate || settings.taxRate?.toString() || prev.defaultTaxRate,
        taxName: parsed.taxName || settings.taxName || prev.taxName,
        taxJurisdiction: parsed.taxJurisdiction || prev.taxJurisdiction,
        taxAddress: parsed.taxAddress || prev.taxAddress,
        includeTaxInPrices: parsed.includeTaxInPrices !== undefined ? parsed.includeTaxInPrices : settings.includeTaxInPrices || prev.includeTaxInPrices,
        autoCalculateTax: parsed.autoCalculateTax !== undefined ? parsed.autoCalculateTax : settings.autoCalculateTax || prev.autoCalculateTax,
      }))
    } else {
      // Use settings provider values (from database) as primary source
      setTaxInfo(prev => ({
        ...prev,
        defaultTaxRate: settings.taxRate?.toString() || prev.defaultTaxRate,
        taxName: settings.taxName || prev.taxName,
        includeTaxInPrices: settings.includeTaxInPrices !== undefined ? settings.includeTaxInPrices : prev.includeTaxInPrices,
        autoCalculateTax: settings.autoCalculateTax !== undefined ? settings.autoCalculateTax : prev.autoCalculateTax,
      }))
    }
    
    // Always use settings provider as the source of truth for logo
    setCompanyLogo(settings.companyLogo || "")
    
    // Track original currency for change detection
    if (settings.defaultCurrency) {
      setOriginalCurrency(settings.defaultCurrency)
    }
  }, [settings, isLoading]) // Load when settings or loading state changes

  const handleSaveSettings = async () => {
    // Check if currency has changed and show warning dialog
    if (generalSettings.defaultCurrency !== originalCurrency) {
      setShowCurrencyWarning(true)
      return
    }
    
    await saveFinalSettings()
  }

  const saveFinalSettings = async () => {
    try {
      setSaving(true)
      
      // Save all settings to localStorage (for backup/faster loading)
      localStorage.setItem('general-settings', JSON.stringify(generalSettings))
      localStorage.setItem('company-info', JSON.stringify(companyInfo))
      localStorage.setItem('tax-info', JSON.stringify(taxInfo))
      
      // Update global currency setting
      setDefaultCurrency(generalSettings.defaultCurrency)
      
      // Update ALL settings in the global provider (which syncs to database)
      updateSetting('defaultCurrency', generalSettings.defaultCurrency)
      updateSetting('invoicePrefix', generalSettings.invoicePrefix)
      updateSetting('dateFormat', generalSettings.dateFormat)
      
      // Update company information
      updateSetting('companyName', companyInfo.companyName)
      updateSetting('companyAddress', companyInfo.companyAddress)
      updateSetting('companyEmail', companyInfo.companyEmail)
      updateSetting('companyPhone', companyInfo.companyPhone)
      updateSetting('companyWebsite', companyInfo.companyWebsite)
      updateSetting('companyRegistration', companyInfo.companyRegistration)
      updateSetting('companyLogo', companyLogo)
      
      // Update tax information
      console.log('Saving tax settings:', {
        taxRate: parseFloat(taxInfo.defaultTaxRate),
        taxName: taxInfo.taxName,
        includeTaxInPrices: taxInfo.includeTaxInPrices,
        autoCalculateTax: taxInfo.autoCalculateTax
      })
      
      updateSetting('taxRate', parseFloat(taxInfo.defaultTaxRate))
      updateSetting('taxName', taxInfo.taxName)
      updateSetting('includeTaxInPrices', taxInfo.includeTaxInPrices)
      updateSetting('autoCalculateTax', taxInfo.autoCalculateTax)
      
      // If currency was changed, clear conversion cache and show special message
      const currencyChanged = generalSettings.defaultCurrency !== originalCurrency
      
      if (currencyChanged) {
        // Clear currency conversion cache to force fresh conversions
        clearCurrencyConversionCache()
        
        toast.success("Settings saved successfully - Currency changed!", {
          description: "Application will refresh to update all currency conversions. Please review financial data for accuracy."
        })
        
        // Refresh the page to update currency conversions
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        toast.success("Settings saved successfully", {
          description: "All changes have been saved to the database and will be available across sessions."
        })
      }
      
      // Update the original currency reference after successful save
      setOriginalCurrency(generalSettings.defaultCurrency)
      
      // Reset user changes flag after successful save
      setHasUserChanges(false)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.")
      }

      const file = event.target.files[0]

      // Create a local URL for immediate preview
      const localUrl = URL.createObjectURL(file)
      setCompanyLogo(localUrl)
      
      // Upload to Supabase storage
      const publicUrl = await uploadCompanyLogo(file)
      
      if (publicUrl) {
        // Add cache-busting parameter to force browser to reload
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
        
        // Update with the cache-busted public URL
        setCompanyLogo(cacheBustedUrl)
        
        // Save to settings provider (original URL without cache-busting)
        await updateSetting('companyLogo', publicUrl)

        toast.success("Company logo uploaded successfully")
      } else {
        // If upload fails, keep local URL as fallback
        await updateSetting('companyLogo', localUrl)
        toast.success("Company logo saved locally (storage upload failed)")
      }
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast.error("Failed to upload company logo")
    } finally {
      setUploading(false)
      
      // Reset the file input so the same file can be selected again
      const fileInput = event.target
      if (fileInput) {
        fileInput.value = ''
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        action={
          activeTab !== 'subscription' ? (
            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : null
        }
      />
      <PageContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
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
                  <div className="flex items-center gap-2">
                    <Select value={generalSettings.defaultCurrency} onValueChange={(value) => setGeneralSettings({...generalSettings, defaultCurrency: value})}>
                      <SelectTrigger id="defaultCurrency" className="text-sm rounded-lg shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {Object.values(CURRENCIES)
                          .sort((a, b) => {
                            // Prioritize most common currencies globally
                            const priority = [
                              'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', // Major global currencies
                              'CNY', 'INR', 'SGD', 'HKD', 'AED', 'SAR', 'NZD' // Major emerging markets & others
                            ]
                            
                            const aIndex = priority.indexOf(a.code)
                            const bIndex = priority.indexOf(b.code)
                            
                            if (aIndex !== -1 && bIndex !== -1) {
                              return aIndex - bIndex
                            }
                            if (aIndex !== -1) return -1
                            if (bIndex !== -1) return 1
                            
                            return a.name.localeCompare(b.name)
                          })
                          .map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} ({currency.symbol}) - {currency.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-5 w-5 text-amber-500 hover:text-amber-600 cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm" sideOffset={8}>
                          <div className="space-y-2">
                            <div className="font-medium text-amber-700">⚠️ Important: Currency Change Impact</div>
                            <div className="text-sm">Changing the default currency will:</div>
                            <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                              <li>Refresh the entire application automatically</li>
                              <li>Re-fetch all currency conversion data</li>
                              <li>Potentially cause temporary data inconsistencies</li>
                              <li>Require manual verification of converted amounts</li>
                            </ul>
                            <div className="text-xs text-amber-600 font-medium">Please review all financial data after the change.</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This currency will be used throughout the app for invoices, projects, and reports.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                  <Input 
                    id="invoicePrefix" 
                    value={generalSettings.invoicePrefix} 
                    onChange={(e) => setGeneralSettings({...generalSettings, invoicePrefix: e.target.value})}
                    placeholder="INV"
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    This prefix will be used for all invoice numbers (e.g., {generalSettings.invoicePrefix || 'INV'}-2024-001).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={generalSettings.dateFormat} onValueChange={(value) => setGeneralSettings({...generalSettings, dateFormat: value as DateFormat})}>
                    <SelectTrigger id="dateFormat" className="text-sm rounded-lg shadow-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} - {option.example}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select how dates should be displayed in the application.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
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
                      {isLoading ? (
                        // Loading skeleton
                        <div className="w-16 h-16 border rounded-lg bg-muted animate-pulse flex items-center justify-center">
                          <div className="w-8 h-8 bg-muted-foreground/20 rounded"></div>
                        </div>
                      ) : companyLogo ? (
                        <div className="w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            key={companyLogo} // Force re-render when logo changes
                            src={companyLogo || "/placeholder.svg"}
                            alt="Company Logo"
                            className="w-full h-full object-contain"
                            onLoad={() => {
                              // Clean up blob URLs to prevent memory leaks
                              if (companyLogo.startsWith('blob:')) {
                                URL.revokeObjectURL(companyLogo)
                              }
                            }}
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
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-4 w-4" />
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
                      onChange={(e) => {
                        setCompanyInfo({...companyInfo, companyName: e.target.value})
                        setHasUserChanges(true)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Textarea 
                      id="companyAddress" 
                      value={companyInfo.companyAddress} 
                      onChange={(e) => {
                        setCompanyInfo({...companyInfo, companyAddress: e.target.value})
                        setHasUserChanges(true)
                      }}
                      rows={3} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <PhoneInput 
                        id="companyPhone" 
                        value={companyInfo.companyPhone} 
                        onChange={(value) => {
                          setCompanyInfo({...companyInfo, companyPhone: value})
                          setHasUserChanges(true)
                        }}
                        placeholder="Enter company phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Website</Label>
                      <Input 
                        id="companyWebsite" 
                        value={companyInfo.companyWebsite} 
                        onChange={(e) => {
                          setCompanyInfo({...companyInfo, companyWebsite: e.target.value})
                          setHasUserChanges(true)
                        }}
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
                        onChange={(e) => {
                          setCompanyInfo({...companyInfo, companyEmail: e.target.value})
                          setHasUserChanges(true)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyRegistration">Registration Number</Label>
                      <Input 
                        id="companyRegistration" 
                        value={companyInfo.companyRegistration} 
                        onChange={(e) => {
                          setCompanyInfo({...companyInfo, companyRegistration: e.target.value})
                          setHasUserChanges(true)
                        }}
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

          <TabsContent value="subscription" className="space-y-6">
            {subscriptionLoading ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-6 w-32" />
                        </CardTitle>
                        <CardDescription>
                          <Skeleton className="h-4 w-48 mt-2" />
                        </CardDescription>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Skeleton className="h-4 w-8 mb-1" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-10 mb-1" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <div>
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <Skeleton className="h-9 w-32" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-6 w-32" />
                    </CardTitle>
                    <CardDescription>
                      <Skeleton className="h-4 w-56" />
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                          <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <SubscriptionManagement />
            )}
          </TabsContent>
        </Tabs>

        {/* Currency Change Warning Dialog */}
        <AlertDialog open={showCurrencyWarning} onOpenChange={setShowCurrencyWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Currency Change
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div>
                    You are about to change the default currency from <strong>{originalCurrency}</strong> to <strong>{generalSettings.defaultCurrency}</strong>.
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div className="font-medium text-amber-800 mb-2">⚠️ This change will have significant impact:</div>
                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                      <li>The entire application will refresh automatically</li>
                      <li>All currency conversion data will be re-fetched</li>
                      <li>Previously converted amounts may show temporary inconsistencies</li>
                      <li>Exchange rate caches will be cleared and rebuilt</li>
                    </ul>
                  </div>
                  
                  <div className="text-sm font-medium text-destructive">
                    ⚠️ Important: Please manually review all financial data, invoices, and reports after this change to ensure accuracy.
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Are you sure you want to proceed with this currency change?
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowCurrencyWarning(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  setShowCurrencyWarning(false)
                  await saveFinalSettings()
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Yes, Change Currency
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </PageContent>
    </>
  )
}
