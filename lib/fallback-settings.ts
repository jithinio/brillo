// Fallback settings system that works without database
// Use this if Supabase integration is causing issues

interface FallbackSettings {
  companyName: string
  companyLogo: string
  defaultCurrency: string
  taxRate: number
  taxName: string
  includeTaxInPrices: boolean
  autoCalculateTax: boolean
  invoicePrefix: string
}

const FALLBACK_DEFAULTS: FallbackSettings = {
  companyName: "Brillo",
  companyLogo: "",
  defaultCurrency: "USD",
  taxRate: 8.0,
  taxName: "Sales Tax",
  includeTaxInPrices: false,
  autoCalculateTax: true,
  invoicePrefix: "INV",
}

export class FallbackSettingsManager {
  private static instance: FallbackSettingsManager
  private settings: FallbackSettings
  private listeners: Array<(settings: FallbackSettings) => void> = []

  private constructor() {
    this.settings = this.loadFromStorage()
  }

  static getInstance(): FallbackSettingsManager {
    if (!FallbackSettingsManager.instance) {
      FallbackSettingsManager.instance = new FallbackSettingsManager()
    }
    return FallbackSettingsManager.instance
  }

  private loadFromStorage(): FallbackSettings {
    const settings = { ...FALLBACK_DEFAULTS }
    
    try {
      // Load from localStorage
      Object.keys(settings).forEach((key) => {
        const stored = localStorage.getItem(`fallback_setting_${key}`)
        if (stored !== null) {
          try {
            ;(settings as any)[key] = JSON.parse(stored)
          } catch {
            ;(settings as any)[key] = stored
          }
        }
      })

      // Load legacy settings
      const savedGeneral = localStorage.getItem('general-settings')
      if (savedGeneral) {
        const parsed = JSON.parse(savedGeneral)
        settings.defaultCurrency = parsed.defaultCurrency || settings.defaultCurrency
        settings.invoicePrefix = parsed.invoicePrefix || settings.invoicePrefix
      }

      const savedCompany = localStorage.getItem('company-info')
      if (savedCompany) {
        const parsed = JSON.parse(savedCompany)
        settings.companyName = parsed.companyName || settings.companyName
      }

      const savedLogo = localStorage.getItem('company_logo')
      if (savedLogo) {
        settings.companyLogo = savedLogo
      }

    } catch (error) {
      console.error('Error loading fallback settings:', error)
    }

    return settings
  }

  getSettings(): FallbackSettings {
    return { ...this.settings }
  }

  updateSetting<K extends keyof FallbackSettings>(key: K, value: FallbackSettings[K]): void {
    this.settings[key] = value
    
    // Save to localStorage
    localStorage.setItem(`fallback_setting_${key}`, JSON.stringify(value))
    
    // Notify listeners
    this.listeners.forEach(listener => listener(this.getSettings()))
  }

  subscribe(listener: (settings: FallbackSettings) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

// Singleton instance
export const fallbackSettings = FallbackSettingsManager.getInstance()

// Export helper functions
export function getFallbackSettings(): FallbackSettings {
  return fallbackSettings.getSettings()
}

export function updateFallbackSetting<K extends keyof FallbackSettings>(
  key: K, 
  value: FallbackSettings[K]
): void {
  fallbackSettings.updateSetting(key, value)
} 