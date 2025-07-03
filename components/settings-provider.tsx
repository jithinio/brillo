"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { formatCurrency as formatCurrencyUtil, setDefaultCurrency, getDefaultCurrency } from "@/lib/currency"

interface AppSettings {
  defaultCurrency: string
  companyName: string
  companyLogo: string
  taxRate: number
  taxName: string
  includeTaxInPrices: boolean
  autoCalculateTax: boolean
  invoicePrefix: string
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: any) => void
  formatCurrency: (amount: number) => string
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
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  useEffect(() => {
    // Load settings from localStorage
    const loadedSettings = { ...defaultSettings }
    
    // First, get currency from global currency system
    const globalCurrency = getDefaultCurrency()
    loadedSettings.defaultCurrency = globalCurrency
    
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
  }, [])

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    localStorage.setItem(`setting_${key}`, JSON.stringify(value))
    
    // Sync currency changes with global currency system
    if (key === 'defaultCurrency') {
      setDefaultCurrency(value)
    }
  }

  const formatCurrency = (amount: number): string => {
    // Use the global currency formatting utility
    return formatCurrencyUtil(amount, settings.defaultCurrency)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, formatCurrency }}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
