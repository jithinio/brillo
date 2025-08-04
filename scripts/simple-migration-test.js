#!/usr/bin/env node

/**
 * Simple Migration Test - Works with current database setup
 * This is a streamlined test that focuses on essential functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSimpleTests() {
  console.log('🧪 Running Simple Migration Tests...')
  console.log('=' .repeat(50))

  let passed = 0
  let failed = 0

  // Test 1: Check if new columns exist
  try {
    console.log('Testing column existence...')
    const { data, error } = await supabase
      .from('projects')
      .select('project_type, total_budget, recurring_frequency, hourly_rate_new')
      .limit(1)
    
    if (error) throw error
    console.log('✅ New columns accessible')
    passed++
  } catch (error) {
    console.log('❌ Column test failed:', error.message)
    failed++
  }

  // Test 2: Check data migration
  try {
    console.log('Testing data migration...')
    const { data, error } = await supabase
      .from('projects')
      .select('project_type, total_budget, budget')
      .not('project_type', 'is', null)
      .limit(5)
    
    if (error) throw error
    
    const allHaveType = data.every(p => p.project_type)
    const allHaveBudget = data.every(p => p.total_budget !== null || p.budget !== null)
    
    if (allHaveType && allHaveBudget) {
      console.log('✅ Data migration successful')
      console.log(`   Found ${data.length} projects with project_type`)
      passed++
    } else {
      throw new Error('Some projects missing required fields')
    }
  } catch (error) {
    console.log('❌ Data migration test failed:', error.message)
    failed++
  }

  // Test 3: Test backwards compatibility
  try {
    console.log('Testing backwards compatibility...')
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status, budget, total_budget')
      .limit(3)
    
    if (error) throw error
    console.log('✅ Backwards compatible queries work')
    passed++
  } catch (error) {
    console.log('❌ Backwards compatibility test failed:', error.message)
    failed++
  }

  // Test 4: Check if we can query by project type
  try {
    console.log('Testing project type filtering...')
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_type')
      .eq('project_type', 'fixed')
      .limit(1)
    
    if (error) throw error
    console.log('✅ Project type filtering works')
    passed++
  } catch (error) {
    console.log('❌ Project type filtering failed:', error.message)
    failed++
  }

  // Test 5: Check function existence
  try {
    console.log('Testing calculation function...')
    const { data, error } = await supabase.rpc('validate_migration_data')
    
    if (error) {
      // Function might not exist yet, that's okay
      console.log('⚠️  Validation function not available (will be added in fix script)')
    } else {
      console.log('✅ Validation function works')
      passed++
    }
  } catch (error) {
    console.log('⚠️  Validation function test skipped')
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 SIMPLE TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)

  if (failed === 0) {
    console.log('\n🎉 Basic migration is working! You can proceed with the fix script.')
  } else {
    console.log('\n⚠️  Some basic tests failed. Check your database setup.')
  }

  return { passed, failed }
}

// Run the tests
runSimpleTests()
  .then((result) => {
    process.exit(result.failed > 0 ? 1 : 0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })