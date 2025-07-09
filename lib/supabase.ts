import { createClient } from "@supabase/supabase-js"

// Use environment variables if available, otherwise use working project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hirrwwzrixpypdnhrwvc.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcnJ3d3pyaXhweXBkbmhyd3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjc1NTQsImV4cCI6MjA2Njg0MzU1NH0.0XfgudzrXsi1vwjEoZ6pSbJSbQrrId9mYOmzYKEJcJo"

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

// Create Supabase client with the working credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

// Mock user data for development/fallback
export const mockUser = {
  id: "1",
  email: "demo@example.com",
  name: "Demo User",
  avatar: null,
}
