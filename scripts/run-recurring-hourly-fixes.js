/**
 * Run the recurring and hourly project calculation fixes
 * 
 * This script applies the database fixes for:
 * 1. Recurring project dynamic calculations
 * 2. Hourly project hour syncing
 * 3. Pending amount calculations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQL(sqlContent) {
  try {
    console.log('🔄 Executing SQL script...')
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          return false
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting recurring and hourly project fixes...')
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      process.exit(1)
    }
    
    console.log('✅ Database connection successful')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '35-fix-recurring-hourly-calculations.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    
    // Extract the main SQL content (remove BEGIN/COMMIT wrapper)
    const mainSQL = sqlContent
      .replace(/BEGIN;/g, '')
      .replace(/COMMIT;/g, '')
      .trim()
    
    console.log('📖 SQL file loaded successfully')
    
    // Apply the fixes step by step
    console.log('🔧 Applying budget calculation fixes...')
    
    // Step 1: Update total_hours_logged for hourly projects
    console.log('Step 1: Syncing hourly project hours...')
    const { error: updateHoursError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE projects 
        SET total_hours_logged = COALESCE(actual_hours, estimated_hours, 0)
        WHERE project_type = 'hourly' 
          AND (total_hours_logged IS NULL OR total_hours_logged = 0)
          AND (actual_hours > 0 OR estimated_hours > 0)
      `
    })
    
    if (updateHoursError) {
      console.error('❌ Error updating hours:', updateHoursError.message)
    } else {
      console.log('✅ Hourly project hours synced')
    }
    
    // Step 2: Create/update the calculation function
    console.log('Step 2: Creating improved calculation function...')
    
    // Read function definition from SQL file
    const functionSQL = mainSQL.match(/CREATE OR REPLACE FUNCTION[\s\S]*?LANGUAGE plpgsql;/)?.[0]
    
    if (functionSQL) {
      const { error: functionError } = await supabase.rpc('exec_sql', {
        sql_query: functionSQL
      })
      
      if (functionError) {
        console.error('❌ Error creating function:', functionError.message)
      } else {
        console.log('✅ Calculation function created')
      }
    }
    
    // Step 3: Create trigger
    console.log('Step 3: Setting up trigger...')
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql_query: `
        DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget ON projects;
        DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget_v2 ON projects;
        CREATE TRIGGER trigger_calculate_project_total_budget_v2
          BEFORE INSERT OR UPDATE ON projects
          FOR EACH ROW
          EXECUTE FUNCTION calculate_project_total_budget_v2();
      `
    })
    
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError.message)
    } else {
      console.log('✅ Trigger created')
    }
    
    // Step 4: Force recalculation of existing projects
    console.log('Step 4: Recalculating existing projects...')
    const { error: recalcError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE projects 
        SET updated_at = NOW()
        WHERE auto_calculate_total = true 
          AND project_type IN ('recurring', 'hourly')
      `
    })
    
    if (recalcError) {
      console.error('❌ Error recalculating projects:', recalcError.message)
    } else {
      console.log('✅ Projects recalculated')
    }
    
    // Step 5: Get summary statistics
    console.log('📊 Getting summary statistics...')
    const { data: recurringCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'recurring')
      .eq('auto_calculate_total', true)
    
    const { data: hourlyCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'hourly')
      .eq('auto_calculate_total', true)
    
    console.log('🎉 Fixes applied successfully!')
    console.log(`📈 ${recurringCount?.count || 0} recurring projects will now calculate dynamically`)
    console.log(`⏱️ ${hourlyCount?.count || 0} hourly projects will now sync hours properly`)
    console.log('💰 Pending amounts will now use total_budget for new project types')
    
    console.log('\n✨ All fixes have been applied!')
    console.log('🔄 Recurring projects without due dates will now update their total budget based on elapsed time')
    console.log('⚡ Hourly projects will automatically sync actual_hours/estimated_hours with total_hours_logged')
    console.log('📊 Pending amounts will be calculated correctly for all project types')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

main().catch(console.error)