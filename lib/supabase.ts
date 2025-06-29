import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://cdithoxgjiejfsjfxyyx.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaXRob3hnamllZmpzZmp4eWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjA0NzYsImV4cCI6MjA2Njc5NjQ3Nn0.j0XaWOm5aI_I0ZLF2tWnX1YMAgHszipGUugf31TliBY"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Mock user data for development
export const mockUser = {
  id: "1",
  email: "demo@example.com",
  name: "Demo User",
  avatar: null,
}
