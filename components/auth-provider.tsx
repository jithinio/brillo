"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>
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

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        console.error("Supabase not configured properly - authentication required")
        setLoading(false)
        return
      }

      // Use real Supabase authentication only
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Auth initialization error:", error)
        setUser(null)
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
        setLoading(false)
        
        // If user just signed in, trigger subscription sync
        if (event === 'SIGNED_IN' && currentUser && (!previousUser || previousUser.id !== currentUser.id)) {
          console.log('🔄 User signed in, triggering subscription sync...')
          
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
      console.error("Supabase not configured - authentication required")
      return { error: { message: "Authentication service not available" } }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error("Sign in error:", error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    if (!isSupabaseConfigured()) {
      console.error("Supabase not configured - authentication required")
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
      return { error }
    } catch (error) {
      console.error("Sign up error:", error)
      return { error }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      console.error("Supabase not configured - cannot sign out")
      setUser(null)
      return
    }

    try {
      // Clear any cached authentication state
      setUser(null)
      setLoading(true)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error("Sign out error:", error)
      // Force local sign out even if Supabase fails
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut, signIn, signUp }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
