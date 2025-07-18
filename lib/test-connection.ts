import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function testSupabaseConnection() {
  console.log('=== Supabase Connection Test ===')
  
  // Test 1: Configuration
  console.log('1. Testing configuration...')
  const isConfigured = isSupabaseConfigured()
  console.log('Supabase configured:', isConfigured)
  
  if (!isConfigured) {
    console.log('❌ Supabase is not properly configured')
    return false
  }
  
  // Test 2: Authentication
  console.log('2. Testing authentication...')
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('❌ Authentication error:', authError)
      return false
    }
    
    if (!user) {
      console.log('❌ No authenticated user found')
      return false
    }
    
    console.log('✅ User authenticated:', { id: user.id, email: user.email })
    
    // Test 3: Check if table exists and has proper structure
    console.log('3. Testing table structure...')
    const { data: tableData, error: tableError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
    
    if (tableError) {
      console.log('❌ Table structure error:', tableError)
      console.log('This likely means the company_settings table does not exist.')
      console.log('Please run the migration script in your Supabase SQL editor.')
      return false
    }
    
    console.log('✅ Table exists and structure correct')
    console.log('Existing settings:', tableData)
    
    // Test 4: Test inserting a basic record
    console.log('4. Testing insert/upsert...')
    const { data: upsertData, error: upsertError } = await supabase
      .from('company_settings')
      .upsert({
        user_id: user.id,
        company_name: 'Test Company',
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (upsertError) {
      console.log('❌ Upsert error:', upsertError)
      return false
    }
    
    console.log('✅ Insert/upsert working correctly')
    console.log('Upserted data:', upsertData)
    
    return true
  } catch (err) {
    console.log('❌ Unexpected error:', err)
    return false
  }
}

// Simple test function to test company_settings table specifically
export async function testCompanySettingsTable() {
  console.log('=== Testing Company Settings Table ===')
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No authenticated user')
      return false
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Test 1: Try to select from table
    console.log('1. Testing basic select...')
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Basic select failed:', error)
      return false
    }
    
    console.log('✅ Basic select works:', data)
    
    // Test 2: Try user-specific query
    console.log('2. Testing user-specific query...')
    const { data: userData, error: userError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (userError) {
      console.log('❌ User-specific query failed:', userError)
      return false
    }
    
    console.log('✅ User-specific query works:', userData)
    return true
    
  } catch (err) {
    console.log('❌ Unexpected error:', err)
    return false
  }
}

// Call this function in the browser console to test
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
  (window as any).testCompanySettingsTable = testCompanySettingsTable
} 