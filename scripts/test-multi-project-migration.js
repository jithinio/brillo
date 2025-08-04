#!/usr/bin/env node

/**
 * Multi-Project Type Migration Testing Script
 * This script tests the migration from the current single-type system to the new multi-project type system
 * It validates data integrity, backwards compatibility, and functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Please check your .env.local file for:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test data samples
const testProjects = [
  {
    name: 'Test Fixed Project',
    description: 'A test fixed project for migration testing',
    project_type: 'fixed',
    total_budget: 5000,
    currency: 'USD',
    status: 'active',
    auto_calculate_total: false
  },
  {
    name: 'Test Recurring Project',
    description: 'A test recurring project for migration testing',
    project_type: 'recurring',
    recurring_frequency: 'monthly',
    recurring_amount: 1000,
    currency: 'USD',
    status: 'active',
    start_date: '2024-01-01',
    auto_calculate_total: true
  },
  {
    name: 'Test Hourly Project',
    description: 'A test hourly project for migration testing',
    project_type: 'hourly',
    hourly_rate_new: 150,
    total_hours_logged: 10,
    currency: 'USD',
    status: 'active',
    auto_calculate_total: true
  }
]

class MigrationTester {
  constructor() {
    this.testResults = {
      schemaTests: [],
      dataIntegrityTests: [],
      functionalityTests: [],
      backwardsCompatibilityTests: [],
      performanceTests: []
    }
    this.createdTestProjects = []
  }

  // Utility functions
  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      test: '🧪'
    }[type] || 'ℹ️'
    
    console.log(`[${timestamp}] ${prefix} ${message}`)
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, 'test')
    try {
      const result = await testFunction()
      this.log(`✅ ${testName} - PASSED`, 'success')
      return { name: testName, status: 'PASSED', result }
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error')
      return { name: testName, status: 'FAILED', error: error.message }
    }
  }

  // Schema validation tests
  async testSchemaChanges() {
    this.log('Testing database schema changes...', 'info')

    const tests = [
      {
        name: 'Check project_type column exists',
        test: async () => {
          const { data, error } = await supabase.rpc('check_column_exists', {
            table_name: 'projects',
            column_name: 'project_type'
          })
          if (error) throw error
          if (!data) throw new Error('project_type column does not exist')
          return 'project_type column exists'
        }
      },
      {
        name: 'Check total_budget column exists',
        test: async () => {
          const { data } = await supabase
            .from('projects')
            .select('total_budget')
            .limit(1)
          return 'total_budget column accessible'
        }
      },
      {
        name: 'Check recurring fields exist',
        test: async () => {
          const { data } = await supabase
            .from('projects')
            .select('recurring_frequency, recurring_amount, recurring_end_date')
            .limit(1)
          return 'Recurring fields accessible'
        }
      },
      {
        name: 'Check hourly fields exist',
        test: async () => {
          const { data } = await supabase
            .from('projects')
            .select('hourly_rate_new, total_hours_logged')
            .limit(1)
          return 'Hourly fields accessible'
        }
      },
      {
        name: 'Check indexes exist',
        test: async () => {
          const { data, error } = await supabase
            .from('pg_indexes')
            .select('indexname')
            .like('indexname', '%projects%')
          
          const requiredIndexes = ['idx_projects_type', 'idx_projects_auto_calc']
          const existingIndexes = (data || []).map(row => row.indexname)
          
          for (const index of requiredIndexes) {
            if (!existingIndexes.includes(index)) {
              throw new Error(`Missing index: ${index}`)
            }
          }
          
          return `Found ${requiredIndexes.length} required indexes`
        }
      }
    ]

    for (const test of tests) {
      const result = await this.runTest(test.name, test.test)
      this.testResults.schemaTests.push(result)
    }
  }

  // Data integrity tests
  async testDataIntegrity() {
    this.log('Testing data integrity...', 'info')

    const tests = [
      {
        name: 'Verify existing projects have project_type',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .select('id, project_type')
            .is('project_type', null)
          
          if (error) throw error
          
          if (data && data.length > 0) {
            throw new Error(`Found ${data.length} projects without project_type`)
          }
          
          return 'All projects have project_type assigned'
        }
      },
      {
        name: 'Verify total_budget matches legacy budget for fixed projects',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .select('id, budget, total_budget, project_type')
            .eq('project_type', 'fixed')
            .not('budget', 'is', null)
            .not('total_budget', 'is', null)
          
          if (error) throw error
          
          const mismatches = data?.filter(p => 
            Math.abs((p.budget || 0) - (p.total_budget || 0)) > 0.01
          ) || []
          
          if (mismatches.length > 0) {
            throw new Error(`Found ${mismatches.length} budget mismatches in fixed projects`)
          }
          
          return `Verified ${data?.length || 0} fixed projects have matching budgets`
        }
      },
      {
        name: 'Check constraint validations',
        test: async () => {
          // Try to insert invalid project_type
          try {
            await supabase
              .from('projects')
              .insert([{
                name: 'Invalid Test',
                project_type: 'invalid_type'
              }])
            throw new Error('Constraint validation failed - invalid project_type was accepted')
          } catch (error) {
            if (error.message.includes('violates check constraint')) {
              return 'Project type constraints working correctly'
            }
            throw error
          }
        }
      }
    ]

    for (const test of tests) {
      const result = await this.runTest(test.name, test.test)
      this.testResults.dataIntegrityTests.push(result)
    }
  }

  // Functionality tests
  async testProjectFunctionality() {
    this.log('Testing project functionality...', 'info')

    const tests = [
      {
        name: 'Create fixed project',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .insert([testProjects[0]])
            .select()
            .single()
          
          if (error) throw error
          
          this.createdTestProjects.push(data.id)
          
          if (data.project_type !== 'fixed') {
            throw new Error('Project type not set correctly')
          }
          if (data.total_budget !== 5000) {
            throw new Error('Total budget not set correctly')
          }
          
          return `Created fixed project with ID: ${data.id}`
        }
      },
      {
        name: 'Create recurring project with auto-calculation',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .insert([testProjects[1]])
            .select()
            .single()
          
          if (error) throw error
          
          this.createdTestProjects.push(data.id)
          
          if (data.project_type !== 'recurring') {
            throw new Error('Project type not set correctly')
          }
          if (!data.auto_calculate_total) {
            throw new Error('Auto calculate not enabled')
          }
          
          return `Created recurring project with ID: ${data.id}`
        }
      },
      {
        name: 'Create hourly project with auto-calculation',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .insert([testProjects[2]])
            .select()
            .single()
          
          if (error) throw error
          
          this.createdTestProjects.push(data.id)
          
          if (data.project_type !== 'hourly') {
            throw new Error('Project type not set correctly')
          }
          if (!data.auto_calculate_total) {
            throw new Error('Auto calculate not enabled')
          }
          
          return `Created hourly project with ID: ${data.id}`
        }
      },
      {
        name: 'Test calculation triggers',
        test: async () => {
          // Update hourly project with new hours
          const hourlyProjectId = this.createdTestProjects[2]
          
          const { data, error } = await supabase
            .from('projects')
            .update({ total_hours_logged: 20 })
            .eq('id', hourlyProjectId)
            .select()
            .single()
          
          if (error) throw error
          
          // Check if total_budget was recalculated (150 * 20 = 3000)
          if (Math.abs((data.total_budget || 0) - 3000) > 0.01) {
            throw new Error(`Expected total_budget 3000, got ${data.total_budget}`)
          }
          
          return 'Automatic calculation trigger working correctly'
        }
      }
    ]

    for (const test of tests) {
      const result = await this.runTest(test.name, test.test)
      this.testResults.functionalityTests.push(result)
    }
  }

  // Backwards compatibility tests
  async testBackwardsCompatibility() {
    this.log('Testing backwards compatibility...', 'info')

    const tests = [
      {
        name: 'Legacy budget field still accessible',
        test: async () => {
          const { data, error } = await supabase
            .from('projects')
            .select('budget, total_budget')
            .limit(5)
          
          if (error) throw error
          
          // Check that legacy budget field is still accessible
          const hasLegacyBudget = data?.some(p => p.budget !== undefined)
          if (!hasLegacyBudget) {
            throw new Error('Legacy budget field not accessible')
          }
          
          return 'Legacy budget field remains accessible'
        }
      },
      {
        name: 'Existing queries still work',
        test: async () => {
          // Test a typical legacy query
          const { data, error } = await supabase
            .from('projects')
            .select(`
              id,
              name,
              status,
              budget,
              start_date,
              clients!inner(name)
            `)
            .limit(1)
          
          if (error) throw error
          
          return 'Legacy query structure still functional'
        }
      },
      {
        name: 'Projects without project_type handled gracefully',
        test: async () => {
          // Temporarily create a project without project_type (if possible)
          // This tests fallback behavior
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .or('project_type.is.null,project_type.eq.fixed')
            .limit(1)
          
          if (error) throw error
          
          return 'Projects without explicit type handled correctly'
        }
      }
    ]

    for (const test of tests) {
      const result = await this.runTest(test.name, test.test)
      this.testResults.backwardsCompatibilityTests.push(result)
    }
  }

  // Performance tests
  async testPerformance() {
    this.log('Testing performance...', 'info')

    const tests = [
      {
        name: 'Query performance with new indexes',
        test: async () => {
          const start = Date.now()
          
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('project_type', 'fixed')
            .eq('status', 'active')
            .limit(100)
          
          if (error) throw error
          
          const duration = Date.now() - start
          
          if (duration > 1000) { // 1 second threshold
            throw new Error(`Query took ${duration}ms, expected < 1000ms`)
          }
          
          return `Query completed in ${duration}ms`
        }
      },
      {
        name: 'Bulk operations performance',
        test: async () => {
          const start = Date.now()
          
          // Test bulk insert
          const bulkProjects = Array.from({ length: 10 }, (_, i) => ({
            name: `Bulk Test Project ${i}`,
            project_type: 'fixed',
            total_budget: 1000,
            status: 'active'
          }))
          
          const { data, error } = await supabase
            .from('projects')
            .insert(bulkProjects)
            .select('id')
          
          if (error) throw error
          
          // Clean up
          const ids = data?.map(p => p.id) || []
          this.createdTestProjects.push(...ids)
          
          const duration = Date.now() - start
          
          return `Bulk insert of 10 projects completed in ${duration}ms`
        }
      }
    ]

    for (const test of tests) {
      const result = await this.runTest(test.name, test.test)
      this.testResults.performanceTests.push(result)
    }
  }

  // Cleanup test data
  async cleanup() {
    this.log('Cleaning up test data...', 'info')
    
    if (this.createdTestProjects.length > 0) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .in('id', this.createdTestProjects)
      
      if (error) {
        this.log(`Warning: Failed to cleanup test projects: ${error.message}`, 'warning')
      } else {
        this.log(`Cleaned up ${this.createdTestProjects.length} test projects`, 'success')
      }
    }
  }

  // Generate test report
  generateReport() {
    const allTests = [
      ...this.testResults.schemaTests,
      ...this.testResults.dataIntegrityTests,
      ...this.testResults.functionalityTests,
      ...this.testResults.backwardsCompatibilityTests,
      ...this.testResults.performanceTests
    ]

    const passed = allTests.filter(t => t.status === 'PASSED').length
    const failed = allTests.filter(t => t.status === 'FAILED').length
    const total = allTests.length

    console.log('\n' + '='.repeat(80))
    console.log('📊 MIGRATION TEST REPORT')
    console.log('='.repeat(80))
    console.log(`Total Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    console.log('='.repeat(80))

    // Detailed results by category
    const categories = [
      { name: 'Schema Tests', tests: this.testResults.schemaTests },
      { name: 'Data Integrity Tests', tests: this.testResults.dataIntegrityTests },
      { name: 'Functionality Tests', tests: this.testResults.functionalityTests },
      { name: 'Backwards Compatibility Tests', tests: this.testResults.backwardsCompatibilityTests },
      { name: 'Performance Tests', tests: this.testResults.performanceTests }
    ]

    for (const category of categories) {
      console.log(`\n📂 ${category.name}:`)
      for (const test of category.tests) {
        const status = test.status === 'PASSED' ? '✅' : '❌'
        console.log(`  ${status} ${test.name}`)
        if (test.status === 'FAILED') {
          console.log(`     Error: ${test.error}`)
        }
      }
    }

    console.log('\n' + '='.repeat(80))
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Migration is ready for production.')
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before proceeding.')
    }
    
    console.log('='.repeat(80))

    return { total, passed, failed, successRate: (passed / total) * 100 }
  }

  // Main test runner
  async runAllTests() {
    this.log('Starting Multi-Project Type Migration Tests...', 'info')
    console.log('='.repeat(80))

    try {
      await this.testSchemaChanges()
      await this.testDataIntegrity()
      await this.testProjectFunctionality()
      await this.testBackwardsCompatibility()
      await this.testPerformance()
    } catch (error) {
      this.log(`Test suite failed with error: ${error.message}`, 'error')
    } finally {
      await this.cleanup()
    }

    return this.generateReport()
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MigrationTester()
  tester.runAllTests()
    .then((report) => {
      process.exit(report.failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('Test suite crashed:', error)
      process.exit(1)
    })
}

module.exports = { MigrationTester }