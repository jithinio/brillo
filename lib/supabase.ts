import { createClient } from "@supabase/supabase-js"

// Use environment variables if available, otherwise fall back to demo values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-key"

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== "https://demo.supabase.co" && 
         supabaseAnonKey !== "demo-key" &&
         !supabaseUrl.includes("your-supabase-project-url") &&
         !supabaseAnonKey.includes("your-supabase-anon-key")
}

// Create Supabase client with error handling
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : "https://demo.supabase.co", 
  isSupabaseConfigured() ? supabaseAnonKey : "demo-key", 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Mock user data for development
export const mockUser = {
  id: "1",
  email: "demo@example.com",
  name: "Demo User",
  avatar: null,
}
