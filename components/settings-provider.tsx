"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { formatCurrency as formatCurrencyUtil, setDefaultCurrency, getDefaultCurrency } from "@/lib/currency"
import { getCompanySettings, upsertCompanySettings, type CompanySettings } from "@/lib/company-settings"

// Feature flag: Set to false if database integration is causing issues
// Re-enabled after fixing duplicate records issue
const USE_DATABASE_SETTINGS = true

interface AppSettings {
  defaultCurrency: string
  companyName: string
  companyLogo: string
  taxRate: number
  taxName: string
  includeTaxInPrices: boolean
  autoCalculateTax: boolean
  invoicePrefix: string
  invoiceTemplate?: any
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: any) => void
  formatCurrency: (amount: number) => string
  isLoading: boolean
}

const defaultSettings: AppSettings = {
  defaultCurrency: "USD",
  companyName: "Suitebase",
  companyLogo: "",
  taxRate: 8.0,
  taxName: "Sales Tax",
  includeTaxInPrices: false,
  autoCalculateTax: true,
  invoicePrefix: "INV",
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
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
            companyLogo: dbSettings.company_logo || "", // Always use database value for logo
            defaultCurrency: dbSettings.default_currency || prev.defaultCurrency,
            taxRate: dbSettings.tax_rate || prev.taxRate,
            taxName: dbSettings.tax_name || prev.taxName,
            includeTaxInPrices: dbSettings.include_tax_in_prices || prev.includeTaxInPrices,
            autoCalculateTax: dbSettings.auto_calculate_tax || prev.autoCalculateTax,
            invoicePrefix: dbSettings.invoice_prefix || prev.invoicePrefix,
            invoiceTemplate: dbSettings.invoice_template || prev.invoiceTemplate,
          }))
          
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
      }
      
      if (Object.keys(dbSettingsUpdate).length > 0) {
        await upsertCompanySettings(dbSettingsUpdate)
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

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, formatCurrency, isLoading }}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
