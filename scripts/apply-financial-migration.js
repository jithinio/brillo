// Apply financial migration to Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Use the same hardcoded credentials as the app
const supabaseUrl = "https://hirrwwzrixpypdnhrwvc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpcnJ3d3pyaXhweXBkbmhyd3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjc1NTQsImV4cCI6MjA2Njg0MzU1NH0.0XfgudzrXsi1vwjEoZ6pSbJSbQrrId9mYOmzYKEJcJo"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyFinancialMigration() {
  console.log('🚀 Applying financial migration to Supabase...\n')
  
  // Read the SQL migration file
  const sqlPath = path.join(__dirname, '12-add-financial-fields.sql')
  
  try {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log('📖 Read migration SQL file')
    
    // Split SQL into individual statements (rough approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`)
      console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message)
          
          // Continue with other statements for non-critical errors
          if (error.message.includes('already exists') || 
              error.message.includes('constraint') ||
              error.message.includes('IF NOT EXISTS')) {
            console.log(`   ⚠️  This might be expected if migration was partially applied`)
          } else {
            console.log(`   ❌ This is a critical error`)
          }
        } else {
          console.log(`✅ Statement ${i + 1} succeeded`)
        }
      } catch (execError) {
        console.log(`❌ Statement ${i + 1} execution error:`, execError.message)
      }
    }
    
    console.log('\n🎉 Migration execution completed!')
    console.log('🧪 Running verification test...\n')
    
    // Run a simple verification test
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('expenses, revenue, profit_margin, currency, payment_status')
      .limit(1)
    
    if (testError) {
      console.log('❌ Verification test failed:', testError.message)
    } else {
      console.log('✅ Verification test passed - new fields are accessible!')
      if (testData && testData.length > 0) {
        console.log('📊 Sample data:')
        Object.keys(testData[0]).forEach(key => {
          console.log(`   ${key}: ${testData[0][key]}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('📝 Make sure your Supabase database has the necessary permissions')
    console.error('💡 You may need to run this migration manually in the Supabase SQL editor')
  }
}

// Alternative approach if direct SQL execution doesn't work
async function applyMigrationManually() {
  console.log('\n🔧 Alternative: Manual migration steps')
  console.log('If the automatic migration fails, copy and paste these steps into your Supabase SQL editor:')
  console.log('━'.repeat(80))
  
  const sqlPath = path.join(__dirname, '12-add-financial-fields.sql')
  try {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log(sqlContent)
    console.log('━'.repeat(80))
    console.log('💡 Copy the SQL above and run it in your Supabase dashboard → SQL Editor')
  } catch (error) {
    console.error('❌ Could not read SQL file:', error.message)
  }
}

// Run the migration
applyFinancialMigration()
  .then(() => {
    console.log('\n✅ Migration process completed!')
    console.log('🧪 You can now run: node scripts/test-financial-migration.js')
  })
  .catch((error) => {
    console.error('❌ Migration process failed:', error.message)
    applyMigrationManually()
  }) 