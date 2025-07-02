// Test Supabase Connection Script
// Run with: node scripts/test-connection.js

const { createClient } = require('@supabase/supabase-js')

// Load environment variables (you may need to install dotenv)
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Connection...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not found!')
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file')
  process.exit(1)
}

console.log('✅ Environment variables found')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('clients').select('count').limit(1)
    
    if (error) {
      console.log('\n❌ Connection test failed:')
      console.log('Error:', error.message)
      
      if (error.message.includes('relation "clients" does not exist')) {
        console.log('\n💡 It looks like your database tables haven\'t been created yet.')
        console.log('Please run the setup-database.sql script in your Supabase SQL Editor.')
      }
      return false
    }
    
    console.log('\n✅ Successfully connected to Supabase!')
    
    // Test sample data
    const { data: clients, error: clientError } = await supabase.from('clients').select('*').limit(3)
    
    if (clientError) {
      console.log('⚠️  Could not fetch clients:', clientError.message)
    } else {
      console.log(`📊 Found ${clients.length} sample clients`)
      if (clients.length === 0) {
        console.log('💡 Consider running the seed-sample-data.sql script to add test data.')
      }
    }
    
    return true
    
  } catch (err) {
    console.log('\n❌ Connection error:', err.message)
    return false
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase is properly configured and ready to use!')
  } else {
    console.log('\n🔧 Please check your Supabase configuration and try again.')
  }
})
