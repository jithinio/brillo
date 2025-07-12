// Test what fields are actually available in projects table
const { createClient } = require('@supabase/supabase-js')

// Use the same hardcoded credentials as the app
const supabaseUrl = "https://hirrwwzrixpypdnhrwvc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcnJ3d3pyaXhweXBkbmhyd3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjc1NTQsImV4cCI6MjA2Njg0MzU1NH0.0XfgudzrXsi1vwjEoZ6pSbJSbQrrId9mYOmzYKEJcJo"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testProjectsFields() {
  console.log('🧪 Testing projects table fields...\n')
  console.log('✅ Supabase configured')
  console.log('📍 URL:', supabaseUrl)
  
  // Test 1: Try inserting minimal record
  console.log('\n📝 Test 1: Minimal project (name only)')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name: 'TEST_MINIMAL_PROJECT' }])
      .select()
    
    if (error) {
      console.log('❌ Minimal insert failed:', error.message)
    } else {
      console.log('✅ Minimal insert succeeded:', data)
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 1 error:', error.message)
  }
  
  // Test 2: Try with common fields
  console.log('\n📝 Test 2: Common fields (name, status, budget)')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        name: 'TEST_COMMON_FIELDS',
        status: 'active',
        budget: 1000
      }])
      .select()
    
    if (error) {
      console.log('❌ Common fields insert failed:', error.message)
    } else {
      console.log('✅ Common fields insert succeeded:', data)
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 2 error:', error.message)
  }
  
  // Test 3: Try with expenses field specifically
  console.log('\n📝 Test 3: With expenses field')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        name: 'TEST_WITH_EXPENSES',
        status: 'active',
        budget: 1000,
        expenses: 100
      }])
      .select()
    
    if (error) {
      console.log('❌ With expenses insert failed:', error.message)
    } else {
      console.log('✅ With expenses insert succeeded:', data)
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 3 error:', error.message)
  }
  
  // Test 4: Try with all import fields
  console.log('\n📝 Test 4: All import fields')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ 
        name: 'TEST_ALL_FIELDS',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        budget: 1000,
        expenses: 100,
        received: 500,
        pending: 500,
        description: 'Test project'
      }])
      .select()
    
    if (error) {
      console.log('❌ All fields insert failed:', error.message)
      console.log('Error details:', error)
    } else {
      console.log('✅ All fields insert succeeded:', data)
      
      // Clean up
      if (data && data[0]) {
        await supabase.from('projects').delete().eq('id', data[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
  } catch (error) {
    console.error('❌ Test 4 error:', error.message)
  }
  
  // Test 5: Check what fields actually exist by querying
  console.log('\n📝 Test 5: Query existing projects to see fields')
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Query failed:', error.message)
    } else if (data && data.length > 0) {
      console.log('✅ Sample project fields:')
      Object.keys(data[0]).forEach(key => {
        console.log(`  ✓ ${key}: ${typeof data[0][key]} = ${data[0][key]}`)
      })
    } else {
      console.log('📝 No existing projects found')
    }
  } catch (error) {
    console.error('❌ Test 5 error:', error.message)
  }
}

testProjectsFields().catch(console.error) 