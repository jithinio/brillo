"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { SettingsProvider } from "@/components/settings-provider"
import { Toaster } from "@/components/ui/sonner"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <AuthProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </AuthProvider>
    )
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          {children}
          <Toaster />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
} 