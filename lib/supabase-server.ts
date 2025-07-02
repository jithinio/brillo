import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://hirrwwzrixpypdnhrwvc.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjamFtbGZmZGFmb3BpZHFicnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMTU5MTMsImV4cCI6MjA2Njc5MTkxM30.xsYOlHrwH2y0hfExtG0-cwac1FyyFg0tyfE2MI4AaT0"

export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
