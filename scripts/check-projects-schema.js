const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProjectsSchema() {
  console.log('🔍 Checking projects table schema...\n')
  
  try {
    // Check what columns exist in projects table
    const { data: columns, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
          FROM information_schema.columns 
          WHERE table_name = 'projects' 
              AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })

    if (error) {
      console.error('❌ Error checking schema:', error)
      
      // Try alternative method - just query the table to see what exists
      console.log('\n🔄 Trying alternative method...')
      const { data: testData, error: testError } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.error('❌ Error querying projects table:', testError.message)
      } else {
        console.log('✅ Projects table exists!')
        if (testData && testData.length > 0) {
          console.log('\n📋 Available columns (from sample record):')
          Object.keys(testData[0]).forEach(key => {
            console.log(`  - ${key}`)
          })
        } else {
          console.log('📝 Table is empty, cannot determine columns from data')
          
          // Try to insert a test record to see what fields are required
          console.log('\n🧪 Testing field requirements...')
          const { error: insertError } = await supabase
            .from('projects')
            .insert([{ name: 'TEST_PROJECT_DELETE_ME' }])
          
          if (insertError) {
            console.log('❌ Insert test failed:', insertError.message)
            console.log('This tells us what fields might be required or missing')
          } else {
            console.log('✅ Basic insert worked with just name field')
            // Clean up test record
            await supabase
              .from('projects')
              .delete()
              .eq('name', 'TEST_PROJECT_DELETE_ME')
          }
        }
      }
      return
    }

    if (columns && columns.length > 0) {
      console.log('✅ Projects table schema:')
      console.log('┌─────────────────────┬─────────────────┬─────────────┬─────────────────────┐')
      console.log('│ Column Name         │ Data Type       │ Nullable    │ Default             │')
      console.log('├─────────────────────┼─────────────────┼─────────────┼─────────────────────┤')
      
      columns.forEach(col => {
        const name = (col.column_name || '').padEnd(19)
        const type = (col.data_type || '').padEnd(15)
        const nullable = (col.is_nullable || '').padEnd(11)
        const defaultVal = (col.column_default || 'NULL').padEnd(19)
        console.log(`│ ${name} │ ${type} │ ${nullable} │ ${defaultVal} │`)
      })
      console.log('└─────────────────────┴─────────────────┴─────────────┴─────────────────────┘')
      
      // Check which fields from our import are missing
      const existingColumns = columns.map(col => col.column_name)
      const importFields = ['name', 'status', 'start_date', 'end_date', 'budget', 'expenses', 'received', 'pending', 'description', 'client_id']
      
      console.log('\n📊 Import Field Analysis:')
      const missingFields = []
      const existingFields = []
      
      importFields.forEach(field => {
        if (existingColumns.includes(field)) {
          existingFields.push(field)
          console.log(`  ✅ ${field} - EXISTS`)
        } else {
          missingFields.push(field)
          console.log(`  ❌ ${field} - MISSING`)
        }
      })
      
      if (missingFields.length > 0) {
        console.log(`\n⚠️  Missing fields: ${missingFields.join(', ')}`)
        console.log('\n🔧 You have two options:')
        console.log('1. Add missing columns to your database')
        console.log('2. Remove missing fields from the import')
        
        console.log('\n📝 SQL to add missing columns:')
        missingFields.forEach(field => {
          let sqlType = 'TEXT'
          if (['budget', 'expenses', 'received', 'pending'].includes(field)) {
            sqlType = 'DECIMAL(10,2)'
          } else if (['start_date', 'end_date'].includes(field)) {
            sqlType = 'DATE'
          } else if (field === 'client_id') {
            sqlType = 'UUID REFERENCES clients(id)'
          }
          console.log(`ALTER TABLE projects ADD COLUMN ${field} ${sqlType};`)
        })
      } else {
        console.log('\n✅ All import fields exist in the database!')
      }
      
    } else {
      console.log('❌ Could not retrieve schema information')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkProjectsSchema() 