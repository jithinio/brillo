"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { formatCurrency as formatCurrencyUtil, setDefaultCurrency, getDefaultCurrency } from "@/lib/currency"
import { getCompanySettings, upsertCompanySettings, type CompanySettings } from "@/lib/company-settings"
import { getDateFormat, setDateFormat, formatDateWithUserPreference, type DateFormat } from "@/lib/date-format"
import { useAuth } from "@/components/auth-provider"

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
  taxId: string
  taxJurisdiction: string
  taxAddress: string
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
  companyName: "",
  companyAddress: "",
  companyEmail: "",
  companyPhone: "",
  companyWebsite: "",
  companyRegistration: "",
  companyLogo: "",
  taxRate: 8.0,
  taxName: "Sales Tax",
  taxId: "",
  taxJurisdiction: "",
  taxAddress: "",
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
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false) // Start with false to prevent flash



  useEffect(() => {
    let isMounted = true // Track if component is still mounted
    
    async function loadSettings() {
      if (!USE_DATABASE_SETTINGS) {
        console.log('Database settings disabled')
        if (isMounted) setIsLoading(false)
        return
      }

      // Wait for authentication to complete before loading from database
      if (authLoading) {
        console.log('⏳ Waiting for authentication to complete...')
        return
      }

      console.log('🔑 Auth state:', { 
        user: user?.email || 'not logged in', 
        userId: user?.id || 'none',
        authLoading,
        timestamp: new Date().toISOString()
      })
      
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
      
      if (isMounted) setSettings(loadedSettings)
      
      // Then try to load from database only if user is authenticated
      if (user?.id) {
        console.log('📦 Loading settings from database for user:', user.email)
        console.log('📦 User session details:', {
          userId: user.id,
          email: user.email,
          hasSession: !!user,
          userKeys: Object.keys(user)
        })
        try {
          const dbSettings = await getCompanySettings()
          
          if (dbSettings && isMounted) {
            console.log('✅ Database settings loaded:', dbSettings)
          // Update settings state with database values
          const updatedSettings = {
            ...loadedSettings,
            companyName: dbSettings.company_name || loadedSettings.companyName,
            companyAddress: dbSettings.company_address || loadedSettings.companyAddress,
            companyEmail: dbSettings.company_email || loadedSettings.companyEmail,
            companyPhone: dbSettings.company_phone || loadedSettings.companyPhone,
            companyWebsite: dbSettings.company_website || loadedSettings.companyWebsite,
            companyRegistration: dbSettings.company_registration || loadedSettings.companyRegistration,
            companyLogo: dbSettings.company_logo || "", // Always use database value for logo
            defaultCurrency: dbSettings.default_currency || loadedSettings.defaultCurrency,
            taxRate: dbSettings.tax_rate || loadedSettings.taxRate,
            taxName: dbSettings.tax_name || loadedSettings.taxName,
            taxId: dbSettings.tax_id || loadedSettings.taxId,
            taxJurisdiction: dbSettings.tax_jurisdiction || loadedSettings.taxJurisdiction,
            taxAddress: dbSettings.tax_address || loadedSettings.taxAddress,
            includeTaxInPrices: dbSettings.include_tax_in_prices || loadedSettings.includeTaxInPrices,
            autoCalculateTax: dbSettings.auto_calculate_tax || loadedSettings.autoCalculateTax,
            invoicePrefix: dbSettings.invoice_prefix || loadedSettings.invoicePrefix,
            invoiceTemplate: dbSettings.invoice_template || loadedSettings.invoiceTemplate,
            dateFormat: (dbSettings.date_format as DateFormat) || loadedSettings.dateFormat, // Load date format from database
          }
          
          // Sync database currency with localStorage if it's different
          if (dbSettings.default_currency && dbSettings.default_currency !== getDefaultCurrency()) {
            setDefaultCurrency(dbSettings.default_currency)
          }
          
          // Sync database date format with localStorage if it's different  
          if (dbSettings.date_format && dbSettings.date_format !== getDateFormat()) {
            setDateFormat(dbSettings.date_format as DateFormat)
          }
          
          if (isMounted) {
            console.log('🔄 Settings provider updating context with database values:', {
              companyName: updatedSettings.companyName,
              taxId: updatedSettings.taxId,
              taxJurisdiction: updatedSettings.taxJurisdiction,
              taxAddress: updatedSettings.taxAddress
            })
            setSettings(updatedSettings)
          }
          

          
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
                const updatedSettingsWithLocalTemplate = {
                  ...loadedSettings,
                  companyName: dbSettings.company_name || loadedSettings.companyName,
                  companyAddress: dbSettings.company_address || loadedSettings.companyAddress,
                  companyEmail: dbSettings.company_email || loadedSettings.companyEmail,
                  companyPhone: dbSettings.company_phone || loadedSettings.companyPhone,
                  companyWebsite: dbSettings.company_website || loadedSettings.companyWebsite,
                  companyRegistration: dbSettings.company_registration || loadedSettings.companyRegistration,
                  companyLogo: dbSettings.company_logo || "",
                  defaultCurrency: dbSettings.default_currency || loadedSettings.defaultCurrency,
                  taxRate: dbSettings.tax_rate || loadedSettings.taxRate,
                  taxName: dbSettings.tax_name || loadedSettings.taxName,
                  taxId: dbSettings.tax_id || loadedSettings.taxId,
                  taxJurisdiction: dbSettings.tax_jurisdiction || loadedSettings.taxJurisdiction,
                  taxAddress: dbSettings.tax_address || loadedSettings.taxAddress,
                  includeTaxInPrices: dbSettings.include_tax_in_prices || loadedSettings.includeTaxInPrices,
                  autoCalculateTax: dbSettings.auto_calculate_tax || loadedSettings.autoCalculateTax,
                  invoicePrefix: dbSettings.invoice_prefix || loadedSettings.invoicePrefix,
                  invoiceTemplate: parsedLocalTemplate, // Use localStorage template
                  dateFormat: (dbSettings.date_format as DateFormat) || loadedSettings.dateFormat, // Sync date format
                }
                
                // Sync database currency with localStorage if it's different
                if (dbSettings.default_currency && dbSettings.default_currency !== getDefaultCurrency()) {
                  setDefaultCurrency(dbSettings.default_currency)
                }
                
                // Sync database date format with localStorage if it's different  
                if (dbSettings.date_format && dbSettings.date_format !== getDateFormat()) {
                  setDateFormat(dbSettings.date_format as DateFormat)
                }
                
                if (isMounted) {
                  console.log('🔄 Settings provider updating context with localStorage template values:', {
                    companyName: updatedSettingsWithLocalTemplate.companyName,
                    taxId: updatedSettingsWithLocalTemplate.taxId,
                    taxJurisdiction: updatedSettingsWithLocalTemplate.taxJurisdiction,
                    taxAddress: updatedSettingsWithLocalTemplate.taxAddress
                  })
                  setSettings(updatedSettingsWithLocalTemplate)
                }
                
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
          

          
          // Cache the logo to localStorage for faster subsequent loads
          if (dbSettings.company_logo) {
            localStorage.setItem('setting_companyLogo', JSON.stringify(dbSettings.company_logo))
          }
        }
        } catch (error) {
          console.error('Failed to load settings from database:', error)
          // Continue with localStorage/default settings - don't break the app
        }
      } else {
        console.log('ℹ️ User not authenticated - using localStorage/default settings only')
      }
      
      // Always set loading to false at the end
      if (isMounted) setIsLoading(false)
    }
    
    // Only load settings if we're not in the middle of logout
    if (!authLoading && user === null) {
      // User is logged out, just set loading to false and don't fetch anything
      setIsLoading(false)
      return
    }
    
    loadSettings()
    
    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [authLoading, user?.id]) // Re-run when auth state changes

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
        case 'taxId':
          dbSettingsUpdate.tax_id = value
          break
        case 'taxJurisdiction':
          dbSettingsUpdate.tax_jurisdiction = value
          break
        case 'taxAddress':
          dbSettingsUpdate.tax_address = value
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
        
        if (result) {
          console.log('✅ Settings successfully saved to database')
        } else {
          console.warn('⚠️ Settings not saved to database - check console for errors')
          console.warn('💡 If you see column errors, run the SQL from add-tax-columns.sql')
        }
      } else {
        console.log('No database fields to update for key:', key)
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
