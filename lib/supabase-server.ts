import { createClient } from "@supabase/supabase-js"

// Require environment variables for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are required for server-side operations")
}

export function createServerClient() {
  // At this point, both variables are guaranteed to be strings due to the check above
  return createClient(supabaseUrl!, supabaseAnonKey!)
}
