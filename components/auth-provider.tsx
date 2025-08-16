"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"
import { LogoutOverlay } from "@/components/logout-overlay"

interface AuthContextType {
  user: User | null
  loading: boolean
  signingOut: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>
  resetPassword: (email: string) => Promise<{ error?: any }>
  updatePassword: (newPassword: string) => Promise<{ error?: any }>
  getCachedUser: () => User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Remove mock user creation - require proper authentication
function createMockUser(email: string): User {
  return {
    id: "mock-user-id",
    email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Cache user data to prevent menu flash on refresh
  const getCachedUser = (): User | null => {
    if (typeof window === 'undefined' || !hasMounted) return null
    
    try {
      const cachedUserData = localStorage.getItem('auth-user-cache')
      if (cachedUserData) {
        return JSON.parse(cachedUserData)
      }
    } catch (error) {
      logger.error("Error reading cached user data", error)
    }
    return null
  }

  const setCachedUser = (user: User | null) => {
    if (typeof window === 'undefined') return
    
    try {
      if (user) {
        // Cache essential user data for UI persistence
        const userCache = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
          aud: user.aud,
          role: user.role,
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata
        }
        localStorage.setItem('auth-user-cache', JSON.stringify(userCache))
      } else {
        localStorage.removeItem('auth-user-cache')
      }
    } catch (error) {
      logger.error("Error caching user data", error)
    }
  }

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Check cache immediately on mount to prevent flash
  useEffect(() => {
    if (hasMounted && loading) {
      const cachedUser = getCachedUser()
      if (cachedUser) {
        setUser(cachedUser)
        setLoading(false)
        logger.authLog("Using cached user data to prevent menu flash")
      }
    }
  }, [hasMounted, loading])

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        logger.error("Supabase not configured properly - authentication required")
        setLoading(false)
        return
      }

      // Use real Supabase authentication only
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setCachedUser(currentUser) // Cache the user data
        logger.authLog("Authentication initialized successfully")
      } catch (error) {
        logger.error("Auth initialization error", error)
        setUser(null)
        setCachedUser(null)
      }
      setLoading(false)
    }

    initializeAuth()

    // Set up Supabase listener if configured
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const previousUser = user
        const currentUser = session?.user ?? null
        
        setUser(currentUser)
        setCachedUser(currentUser) // Cache the user data on state change
        setLoading(false)
        
        // If user just signed in, trigger subscription sync
        if (event === 'SIGNED_IN' && currentUser && (!previousUser || previousUser.id !== currentUser.id)) {
          logger.authLog('User signed in, triggering subscription sync')
          
          // Use a timeout to ensure the subscription provider has initialized
          setTimeout(() => {
            // Dispatch a custom event that the subscription provider can listen to
            window.dispatchEvent(new CustomEvent('user-signed-in', { 
              detail: { userId: currentUser.id } 
            }))
          }, 1000)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      logger.error("Supabase not configured - authentication required")
      return { error: { message: "Authentication service not available" } }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error) {
        logger.authLog("User sign in successful")
      }
      return { error }
    } catch (error) {
      logger.error("Sign in error", error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    if (!isSupabaseConfigured()) {
      logger.error("Supabase not configured - authentication required")
      return { error: { message: "Authentication service not available" } }
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })
      if (!error) {
        logger.authLog("User sign up successful")
      }
      return { error }
    } catch (error) {
      logger.error("Sign up error", error)
      return { error }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      logger.error("Supabase not configured - cannot sign out")
      setSigningOut(true)
      
      // Add a delay to show the logout overlay
      setTimeout(() => {
        setUser(null)
        setCachedUser(null) // Clear user cache
        clearAllCaches()
        setSigningOut(false)
      }, 1500)
      return
    }

    try {
      setSigningOut(true) // Show logout overlay
      
      // Add a brief delay to ensure overlay is visible
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Clear any cached authentication state
      setUser(null)
      setCachedUser(null) // Clear user cache
      setLoading(true)
      
      // Clear all caches before signing out
      clearAllCaches()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      logger.authLog("User signed out successfully")
      
      // Add another brief delay before hiding overlay
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      logger.error("Sign out error", error)
      // Force local sign out even if Supabase fails
      setUser(null)
      setCachedUser(null) // Clear user cache
      clearAllCaches()
    } finally {
      setLoading(false)
      setSigningOut(false) // Hide logout overlay
    }
  }

  // Comprehensive cache clearing function
  const clearAllCaches = () => {
    try {
      // Clear all localStorage items that cache user data
      const cacheKeys = [
        'auth-user-cache', // Add auth cache to clearing
        'unified-projects-data',
        'analytics-data', 
        'dashboard-data',
        'table-preferences',
        'subscription-cache',
        'usage-cache',
        'company-settings',
        'general-settings',
        'company-info',
        'company_logo',
        'default_currency'
      ]
      
      // Clear specific cache keys
      cacheKeys.forEach(key => {
        localStorage.removeItem(key)
      })
      
      // Clear any cache keys with prefixes
      const prefixesToClear = [
        'fallback_setting_',
        'rates_',
        'currency_conversion_cache_',
        'setting_',
        'brillo-sub-cache-', // Add subscription cache prefix
        'brillo-subscription-' // Add any legacy subscription cache prefix
      ]
      
      // Get all localStorage keys and clear those matching prefixes
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        prefixesToClear.forEach(prefix => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key)
          }
        })
      })
      
      // Dispatch a custom event to notify other components to clear their caches
      window.dispatchEvent(new CustomEvent('auth-logout', { 
        detail: { reason: 'User logged out - clearing all caches' } 
      }))
      
      logger.authLog("All caches cleared on logout")
    } catch (error) {
      logger.error("Error clearing caches on logout", error)
    }
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      logger.error("Supabase not configured - password reset not available")
      return { error: { message: "Password reset service not available" } }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (!error) {
        logger.authLog("Password reset email sent successfully")
      }
      return { error }
    } catch (error) {
      logger.error("Password reset error", error)
      return { error }
    }
  }

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      logger.error("Supabase not configured - password update not available")
      return { error: { message: "Password update service not available" } }
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (!error) {
        logger.authLog("Password updated successfully")
      }
      return { error }
    } catch (error) {
      logger.error("Password update error", error)
      return { error }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signingOut, signOut, signIn, signUp, resetPassword, updatePassword, getCachedUser }}>
      {children}
      <LogoutOverlay isVisible={signingOut} />
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
