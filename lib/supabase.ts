import { createClient } from "@supabase/supabase-js"

// Debug logging for environment variables
console.log('🔍 Supabase Config Debug:')
console.log('Raw Environment Variables:', {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'undefined'
})

// Use environment variables if available, otherwise fall back to actual project values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tcjamlmfdafopidqbrsw.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjamFtbGZmZGFmb3BpZHFicnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMTU5MTMsImV4cCI6MjA2Njc5MTkxM30.xsYOlHrwH2y0hfExtG0-cwac1FyyFg0tyfE2MI4AaT0"

console.log('Final Configuration:', {
  url: supabaseUrl,
  key: supabaseAnonKey.substring(0, 20) + '...',
  usingEnvVars: !!process.env.NEXT_PUBLIC_SUPABASE_URL
})

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== "https://demo.supabase.co" && 
    supabaseAnonKey !== "demo-key" &&
    !supabaseUrl.includes("your-supabase-project-url") &&
    !supabaseAnonKey.includes("your-supabase-anon-key") &&
    supabaseUrl.startsWith("https://") &&
    supabaseUrl.includes(".supabase.co")
  )
}

// Create Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Mock user data for development/fallback
export const mockUser = {
  id: "1",
  email: "demo@example.com",
  name: "Demo User",
  avatar: null,
}
