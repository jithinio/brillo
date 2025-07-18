import { createClient } from "@supabase/supabase-js"

// Require environment variables for security - no hardcoded fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith("https://") &&
    supabaseUrl.includes(".supabase.co") &&
    supabaseAnonKey.startsWith("eyJ")
  )
}

// Create Supabase client - will throw error if not configured
export const supabase = createClient(
  supabaseUrl || "", 
  supabaseAnonKey || "", 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
)

// Mock user data for development/fallback
export const mockUser = {
  id: "1",
  email: "demo@example.com",
  name: "Demo User",
  avatar: null,
}
