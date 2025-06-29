"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface AppSettings {
  defaultCurrency: string
  timezone: string
  language: string
  dateFormat: string
  companyName: string
  companyLogo: string
  taxRate: number
  taxName: string
  includeTaxInPrices: boolean
  autoCalculateTax: boolean
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: any) => void
  formatCurrency: (amount: number) => string
}

const defaultSettings: AppSettings = {
  defaultCurrency: "USD",
  timezone: "UTC",
  language: "en",
  dateFormat: "mm/dd/yyyy",
  companyName: "Suitebase",
  companyLogo: "",
  taxRate: 8.0,
  taxName: "Sales Tax",
  includeTaxInPrices: false,
  autoCalculateTax: true,
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
    Object.keys(defaultSettings).forEach((key) => {
      const stored = localStorage.getItem(`setting_${key}`)
      if (stored !== null) {
        try {
          loadedSettings[key as keyof AppSettings] = JSON.parse(stored)
        } catch {
          loadedSettings[key as keyof AppSettings] = stored
        }
      }
    })
    setSettings(loadedSettings)
  }, [])

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    localStorage.setItem(`setting_${key}`, JSON.stringify(value))
  }

  const formatCurrency = (amount: number): string => {
    const currency = settings.defaultCurrency || "USD"
    const config = {
      USD: { symbol: "$", position: "before", decimals: 2 },
      EUR: { symbol: "€", position: "after", decimals: 2 },
      GBP: { symbol: "£", position: "before", decimals: 2 },
      CAD: { symbol: "C$", position: "before", decimals: 2 },
      AUD: { symbol: "A$", position: "before", decimals: 2 },
      JPY: { symbol: "¥", position: "before", decimals: 0 },
      CHF: { symbol: "Fr", position: "after", decimals: 2 },
      CNY: { symbol: "¥", position: "before", decimals: 2 },
      INR: { symbol: "₹", position: "before", decimals: 2 },
    }[currency] || { symbol: "$", position: "before", decimals: 2 }

    const formattedAmount = amount.toFixed(config.decimals)

    if (config.position === "before") {
      return `${config.symbol}${formattedAmount}`
    } else {
      return `${formattedAmount}${config.symbol}`
    }
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
