"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { formatCurrency as formatCurrencyUtil, setDefaultCurrency, getDefaultCurrency } from "@/lib/currency"
import { getCompanySettings, upsertCompanySettings, type CompanySettings } from "@/lib/company-settings"
import { getDateFormat, setDateFormat, formatDateWithUserPreference, type DateFormat } from "@/lib/date-format"

// Feature flag: Set to false if database integration is causing issues
// Re-enabled after fixing duplicate records issue
const USE_DATABASE_SETTINGS = true

interface AppSettings {
  defaultCurrency: string
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  companyWebsite: string
  companyRegistration: string
  companyLogo: string
  taxRate: number
  taxName: string
  includeTaxInPrices: boolean
  autoCalculateTax: boolean
  invoicePrefix: string
  dateFormat: DateFormat
  invoiceTemplate?: any
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: any) => void
  formatCurrency: (amount: number) => string
  formatDate: (date: string | Date | null | undefined) => string
  isLoading: boolean
}

const defaultSettings: AppSettings = {
  defaultCurrency: "USD",
  companyName: "Suitebase",
  companyAddress: "123 Business St, City, State 12345",
  companyEmail: "contact@suitebase.com",
  companyPhone: "+1 (555) 123-4567",
  companyWebsite: "https://suitebase.com",
  companyRegistration: "",
  companyLogo: "",
  taxRate: 8.0,
  taxName: "Sales Tax",
  includeTaxInPrices: false,
  autoCalculateTax: true,
  invoicePrefix: "INV",
  dateFormat: "MM/DD/YYYY",
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  formatDate: (date: string | Date | null | undefined) => "",
  isLoading: false,
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)



  useEffect(() => {
    async function loadSettings() {
      if (!USE_DATABASE_SETTINGS) {
        console.log('Database settings disabled')
        setIsLoading(false)
        return
      }

      const loadedSettings = { ...defaultSettings }
      
      // First, get currency from global currency system
      const globalCurrency = getDefaultCurrency()
      loadedSettings.defaultCurrency = globalCurrency
      
      // Load from localStorage first (including logo for faster initial load)
      Object.keys(defaultSettings).forEach((key) => {
        const stored = localStorage.getItem(`setting_${key}`)
        if (stored !== null) {
          try {
            const value = JSON.parse(stored)
            ;(loadedSettings as any)[key] = value
          } catch {
            ;(loadedSettings as any)[key] = stored
          }
        }
      })
      
      setSettings(loadedSettings)
      
      // Then try to load from database immediately (don't wait)
      try {
        const dbSettings = await getCompanySettings()
        
        if (dbSettings) {
          // Update settings state with database values
          setSettings(prev => ({
            ...prev,
            companyName: dbSettings.company_name || prev.companyName,
            companyAddress: dbSettings.company_address || prev.companyAddress,
            companyEmail: dbSettings.company_email || prev.companyEmail,
            companyPhone: dbSettings.company_phone || prev.companyPhone,
            companyWebsite: dbSettings.company_website || prev.companyWebsite,
            companyRegistration: dbSettings.company_registration || prev.companyRegistration,
            companyLogo: dbSettings.company_logo || "", // Always use database value for logo
            defaultCurrency: dbSettings.default_currency || prev.defaultCurrency,
            taxRate: dbSettings.tax_rate || prev.taxRate,
            taxName: dbSettings.tax_name || prev.taxName,
            includeTaxInPrices: dbSettings.include_tax_in_prices || prev.includeTaxInPrices,
            autoCalculateTax: dbSettings.auto_calculate_tax || prev.autoCalculateTax,
            invoicePrefix: dbSettings.invoice_prefix || prev.invoicePrefix,
            invoiceTemplate: dbSettings.invoice_template || prev.invoiceTemplate,
            dateFormat: (dbSettings.date_format as DateFormat) || prev.dateFormat, // Load date format from database
          }))
          
          console.log('🔍 Database settings loaded:', {
            invoiceTemplate: dbSettings.invoice_template,
            hasTemplate: !!dbSettings.invoice_template,
            templateId: dbSettings.invoice_template?.templateId
          })
          
          // Check if localStorage has a newer template than database
          const localStorageTemplate = localStorage.getItem('setting_invoiceTemplate') || localStorage.getItem('invoice-template-settings')
          if (localStorageTemplate) {
            try {
              const parsedLocalTemplate = JSON.parse(localStorageTemplate)
              const dbTemplateId = dbSettings.invoice_template?.templateId
              const localTemplateId = parsedLocalTemplate.templateId
              
              console.log('🔄 Template sync check:', {
                database: dbTemplateId,
                localStorage: localTemplateId,
                needsSync: dbTemplateId !== localTemplateId
              })
              
              // If localStorage template is different from database, prefer localStorage (newer)
              if (localTemplateId && localTemplateId !== dbTemplateId) {
                console.log('⚠️ Template mismatch! Using localStorage template and syncing to database...')
                
                // Use localStorage template instead of database
                setSettings(prev => ({
                  ...prev,
                  companyName: dbSettings.company_name || prev.companyName,
                  companyAddress: dbSettings.company_address || prev.companyAddress,
                  companyEmail: dbSettings.company_email || prev.companyEmail,
                  companyPhone: dbSettings.company_phone || prev.companyPhone,
                  companyWebsite: dbSettings.company_website || prev.companyWebsite,
                  companyRegistration: dbSettings.company_registration || prev.companyRegistration,
                  companyLogo: dbSettings.company_logo || "",
                  defaultCurrency: dbSettings.default_currency || prev.defaultCurrency,
                  taxRate: dbSettings.tax_rate || prev.taxRate,
                  taxName: dbSettings.tax_name || prev.taxName,
                  includeTaxInPrices: dbSettings.include_tax_in_prices || prev.includeTaxInPrices,
                  autoCalculateTax: dbSettings.auto_calculate_tax || prev.autoCalculateTax,
                  invoicePrefix: dbSettings.invoice_prefix || prev.invoicePrefix,
                  invoiceTemplate: parsedLocalTemplate, // Use localStorage template
                  dateFormat: (dbSettings.date_format as DateFormat) || prev.dateFormat, // Sync date format
                }))
                
                // Sync localStorage template to database in background
                try {
                  const updateResult = await upsertCompanySettings({ invoice_template: parsedLocalTemplate })
                  if (updateResult) {
                    console.log('✅ Template synced to database:', localTemplateId)
                  }
                } catch (syncError) {
                  console.error('❌ Failed to sync template to database:', syncError)
                }
                
                return // Exit early since we've set the settings
              }
            } catch (error) {
              console.error('❌ Error parsing localStorage template:', error)
            }
          }
          
          if (dbSettings.invoice_template) {
            console.log('✅ Template loaded from database:', dbSettings.invoice_template.templateId)
            console.log('✅ Template details:', dbSettings.invoice_template)
          } else {
            console.log('❌ No invoice template found in database')
          }
          
          // Cache the logo to localStorage for faster subsequent loads
          if (dbSettings.company_logo) {
            localStorage.setItem('setting_companyLogo', JSON.stringify(dbSettings.company_logo))
          }
        }
      } catch (error) {
        console.error('Failed to load settings from database:', error)
        // Continue with localStorage/default settings - don't break the app
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSettings()
  }, [])

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    localStorage.setItem(`setting_${key}`, JSON.stringify(value))
    
    // Sync currency changes with global currency system
    if (key === 'defaultCurrency') {
      setDefaultCurrency(value)
    }

    // Sync date format changes with global date formatting system
    if (key === 'dateFormat') {
      setDateFormat(value)
    }
    
    // If database is disabled, only use localStorage
    if (!USE_DATABASE_SETTINGS) {
      return
    }
    
    // Save to database (only if we have auth and database is enabled)
    try {
      const dbSettingsUpdate: Partial<CompanySettings> = {}
      
      // Map app settings to database fields
      switch (key) {
        case 'companyName':
          dbSettingsUpdate.company_name = value
          break
        case 'companyAddress':
          dbSettingsUpdate.company_address = value
          break
        case 'companyEmail':
          dbSettingsUpdate.company_email = value
          break
        case 'companyPhone':
          dbSettingsUpdate.company_phone = value
          break
        case 'companyWebsite':
          dbSettingsUpdate.company_website = value
          break
        case 'companyRegistration':
          dbSettingsUpdate.company_registration = value
          break
        case 'companyLogo':
          dbSettingsUpdate.company_logo = value
          break
        case 'defaultCurrency':
          dbSettingsUpdate.default_currency = value
          break
        case 'taxRate':
          dbSettingsUpdate.tax_rate = value
          break
        case 'taxName':
          dbSettingsUpdate.tax_name = value
          break
        case 'includeTaxInPrices':
          dbSettingsUpdate.include_tax_in_prices = value
          break
        case 'autoCalculateTax':
          dbSettingsUpdate.auto_calculate_tax = value
          break
        case 'invoicePrefix':
          dbSettingsUpdate.invoice_prefix = value
          break
        case 'invoiceTemplate':
          dbSettingsUpdate.invoice_template = value
          break
        case 'dateFormat':
          dbSettingsUpdate.date_format = value
          break
      }
      
      if (Object.keys(dbSettingsUpdate).length > 0) {
        console.log('Updating database with settings:', dbSettingsUpdate)
        const result = await upsertCompanySettings(dbSettingsUpdate)
        console.log('Database update result:', result)
      }
    } catch (error) {
      console.error('Failed to save setting to database:', error)
      // Continue with localStorage only
    }
  }

  const formatCurrency = (amount: number): string => {
    // Use the global currency formatting utility
    return formatCurrencyUtil(amount, settings.defaultCurrency)
  }

  const formatDate = (date: string | Date | null | undefined): string => {
    return formatDateWithUserPreference(date, settings.dateFormat)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, formatCurrency, formatDate, isLoading }}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
