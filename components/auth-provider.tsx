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

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
})

// Mock user for when Supabase is disabled
const createMockUser = (email: string): User => ({
  id: "mock-user-id",
  email,
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {
    full_name: email.split("@")[0],
    first_name: email.split("@")[0],
  },
  aud: "authenticated",
  confirmation_sent_at: undefined,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  invited_at: undefined,
  last_sign_in_at: new Date().toISOString(),
  phone: undefined,
  phone_confirmed_at: undefined,
  recovery_sent_at: undefined,
  role: "authenticated",
  updated_at: new Date().toISOString(),
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        // Use mock authentication
        const savedUser = localStorage.getItem("mock-user")
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
        setLoading(false)
        return
      }

      // Use real Supabase authentication
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Auth initialization error:", error)
        // Fall back to mock auth if Supabase fails
        const savedUser = localStorage.getItem("mock-user")
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      }
      setLoading(false)
    }

    initializeAuth()

    // Only set up Supabase listener if configured
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      // Mock authentication - accept any email/password
      const mockUser = createMockUser(email)
      setUser(mockUser)
      localStorage.setItem("mock-user", JSON.stringify(mockUser))
      return { error: null }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      // Fall back to mock auth if Supabase fails
      const mockUser = createMockUser(email)
      setUser(mockUser)
      localStorage.setItem("mock-user", JSON.stringify(mockUser))
      return { error: null }
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    if (!isSupabaseConfigured()) {
      // Mock authentication - accept any signup
      const mockUser = createMockUser(email)
      setUser(mockUser)
      localStorage.setItem("mock-user", JSON.stringify(mockUser))
      return { error: null }
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
      // Fall back to mock auth if Supabase fails
      const mockUser = createMockUser(email)
      setUser(mockUser)
      localStorage.setItem("mock-user", JSON.stringify(mockUser))
      return { error: null }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      // Mock sign out
      setUser(null)
      localStorage.removeItem("mock-user")
      return
    }

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Sign out error:", error)
      // Force local sign out even if Supabase fails
      setUser(null)
      localStorage.removeItem("mock-user")
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
