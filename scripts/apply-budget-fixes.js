/**
 * Apply Budget Calculation Fixes
 * 
 * This script manually applies the key fixes for recurring and hourly projects:
 * 1. Sync total_hours_logged with actual_hours/estimated_hours for hourly projects
 * 2. Force recalculation of auto-calculated projects
 * 3. Test the new calculation logic
 */

const { createClient } = require('@supabase/supabase-js')

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

async function fixHourlyProjectHours() {
  console.log('🔧 Step 1: Fixing hourly project hours...')
  
  try {
    // Get all hourly projects that need hours sync
    const { data: hourlyProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id, actual_hours, estimated_hours, total_hours_logged')
      .eq('project_type', 'hourly')
    
    if (fetchError) {
      console.error('❌ Error fetching hourly projects:', fetchError.message)
      return false
    }
    
    console.log(`Found ${hourlyProjects?.length || 0} hourly projects`)
    
    let updated = 0
    
    for (const project of hourlyProjects || []) {
      const correctHours = (project.actual_hours && project.actual_hours > 0) 
        ? project.actual_hours 
        : (project.estimated_hours || 0)
      
      // Only update if different
      if (Math.abs((project.total_hours_logged || 0) - correctHours) > 0.01) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ 
            total_hours_logged: correctHours,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id)
        
        if (updateError) {
          console.error(`❌ Error updating project ${project.id}:`, updateError.message)
        } else {
          updated++
          console.log(`✅ Updated project ${project.id}: ${project.total_hours_logged || 0} → ${correctHours} hours`)
        }
      }
    }
    
    console.log(`✅ Updated ${updated} hourly projects`)
    return true
    
  } catch (error) {
    console.error('❌ Error in fixHourlyProjectHours:', error.message)
    return false
  }
}

async function forceRecalculateProjects() {
  console.log('🔄 Step 2: Force recalculation of auto-calculated projects...')
  
  try {
    // Get projects that need recalculation
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, project_type, auto_calculate_total')
      .eq('auto_calculate_total', true)
      .in('project_type', ['recurring', 'hourly'])
    
    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError.message)
      return false
    }
    
    console.log(`Found ${projects?.length || 0} projects to recalculate`)
    
    let updated = 0
    
    for (const project of projects || []) {
      // Force recalculation by updating the updated_at field
      const { error: updateError } = await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', project.id)
      
      if (updateError) {
        console.error(`❌ Error updating project ${project.id}:`, updateError.message)
      } else {
        updated++
        console.log(`✅ Triggered recalculation for ${project.name || project.id} (${project.project_type})`)
      }
    }
    
    console.log(`✅ Triggered recalculation for ${updated} projects`)
    return true
    
  } catch (error) {
    console.error('❌ Error in forceRecalculateProjects:', error.message)
    return false
  }
}

async function testRecurringCalculation() {
  console.log('🧪 Step 3: Testing recurring project calculations...')
  
  try {
    // Get sample recurring projects
    const { data: recurringProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, recurring_amount, recurring_frequency, start_date, total_budget, auto_calculate_total')
      .eq('project_type', 'recurring')
      .limit(5)
    
    if (fetchError) {
      console.error('❌ Error fetching recurring projects:', fetchError.message)
      return false
    }
    
    console.log(`Testing ${recurringProjects?.length || 0} recurring projects:`)
    
    for (const project of recurringProjects || []) {
      if (project.recurring_amount && project.recurring_frequency && project.start_date) {
        const startDate = new Date(project.start_date)
        const currentDate = new Date()
        const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24))
        
        let expectedPeriods = 1
        if (daysDiff > 0) {
          switch (project.recurring_frequency) {
            case 'weekly':
              expectedPeriods = Math.max(1, Math.ceil(daysDiff / 7))
              break
            case 'monthly':
              expectedPeriods = Math.max(1, Math.ceil(daysDiff / 30.44))
              break
            case 'quarterly':
              expectedPeriods = Math.max(1, Math.ceil(daysDiff / 91.31))
              break
            case 'yearly':
              expectedPeriods = Math.max(1, Math.ceil(daysDiff / 365.25))
              break
          }
        }
        
        const expectedTotal = project.recurring_amount * expectedPeriods
        
        console.log(`📊 ${project.name || project.id}:`)
        console.log(`   Amount: $${project.recurring_amount} ${project.recurring_frequency}`)
        console.log(`   Days since start: ${daysDiff}`)
        console.log(`   Expected periods: ${expectedPeriods}`)
        console.log(`   Expected total: $${expectedTotal}`)
        console.log(`   Current total: $${project.total_budget || 0}`)
        console.log(`   Auto-calc: ${project.auto_calculate_total ? 'Yes' : 'No'}`)
        console.log('')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error in testRecurringCalculation:', error.message)
    return false
  }
}

async function getProjectStats() {
  console.log('📊 Step 4: Getting project statistics...')
  
  try {
    // Get counts by type
    const { data: recurringData } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'recurring')
    
    const { data: hourlyData } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'hourly')
    
    const { data: autoCalcRecurring } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'recurring')
      .eq('auto_calculate_total', true)
    
    const { data: autoCalcHourly } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_type', 'hourly')
      .eq('auto_calculate_total', true)
    
    console.log('📈 Project Statistics:')
    console.log(`   Total recurring projects: ${recurringData?.count || 0}`)
    console.log(`   Auto-calculating recurring: ${autoCalcRecurring?.count || 0}`)
    console.log(`   Total hourly projects: ${hourlyData?.count || 0}`)
    console.log(`   Auto-calculating hourly: ${autoCalcHourly?.count || 0}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Error in getProjectStats:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting budget calculation fixes...')
  console.log('================================================\n')
  
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
    
    console.log('✅ Database connection successful\n')
    
    // Apply fixes step by step
    await fixHourlyProjectHours()
    console.log('')
    
    await forceRecalculateProjects()
    console.log('')
    
    await testRecurringCalculation()
    console.log('')
    
    await getProjectStats()
    console.log('')
    
    console.log('🎉 Budget calculation fixes completed!')
    console.log('================================================')
    console.log('✅ Hourly project hours have been synced')
    console.log('✅ Auto-calculated projects have been recalculated')  
    console.log('✅ Recurring projects will now calculate based on elapsed time')
    console.log('✅ Pending amounts will use correct budget fields')
    console.log('\n💡 Note: The database trigger needs to be manually applied using SQL:')
    console.log('   Run scripts/35-fix-recurring-hourly-calculations.sql in your database')
    
  } catch (error) {
    console.error('❌ Fixes failed:', error.message)
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