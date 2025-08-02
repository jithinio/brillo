"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { SubscriptionProvider } from "@/components/providers/subscription-provider"
import { SettingsProvider } from "@/components/settings-provider"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
              <QueryProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <SettingsProvider>
                {children}
              </SettingsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryProvider>
    )
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <SettingsProvider>
              {children}
              <Toaster />
            </SettingsProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
} 