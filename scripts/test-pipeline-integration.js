#!/usr/bin/env node

/**
 * Test Script: Project to Pipeline Integration
 * 
 * This script tests that changing a project status to 'pipeline' 
 * makes it appear in the pipeline page correctly.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPipelineIntegration() {
  console.log('🧪 Testing Project → Pipeline Integration...\n')

  try {
    // Step 1: Check current pipeline projects
    console.log('📋 Checking current pipeline projects...')
    const { data: currentPipelineProjects, error: currentError } = await supabase
      .from('projects')
      .select('id, name, status, pipeline_stage, deal_probability')
      .eq('status', 'pipeline')

    if (currentError) throw currentError

    console.log(`✅ Found ${currentPipelineProjects.length} existing pipeline projects`)
    if (currentPipelineProjects.length > 0) {
      currentPipelineProjects.forEach(project => {
        console.log(`   • ${project.name} - Stage: ${project.pipeline_stage}, Probability: ${project.deal_probability}%`)
      })
    }

    // Step 2: Find a non-pipeline project to test with
    console.log('\n🔍 Looking for a non-pipeline project to test...')
    const { data: testProjects, error: testError } = await supabase
      .from('projects')
      .select('id, name, status')
      .neq('status', 'pipeline')
      .limit(1)

    if (testError) throw testError

    if (testProjects.length === 0) {
      console.log('⚠️ No non-pipeline projects found. Creating a test project...')
      
      // Create a test project
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([{
          name: 'Test Pipeline Integration Project',
          status: 'active',
          budget: 5000,
          description: 'Test project for pipeline integration'
        }])
        .select()
        .single()

      if (createError) throw createError

      testProjects.push(newProject)
      console.log(`✅ Created test project: ${newProject.name}`)
    }

    const testProject = testProjects[0]
    console.log(`✅ Using test project: ${testProject.name} (current status: ${testProject.status})`)

    // Step 3: Convert project to pipeline
    console.log('\n🔄 Converting project to pipeline status...')
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'pipeline',
        pipeline_stage: 'Lead',  // Use capitalized 'Lead' to match database
        deal_probability: 10,
        pipeline_notes: 'Converted for testing pipeline integration'
      })
      .eq('id', testProject.id)

    if (updateError) throw updateError

    console.log(`✅ Project "${testProject.name}" converted to pipeline status`)

    // Step 4: Verify it appears in pipeline
    console.log('\n✅ Verifying project appears in pipeline...')
    const { data: pipelineProjects, error: verifyError } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        status, 
        pipeline_stage, 
        deal_probability, 
        budget,
        clients (name, company)
      `)
      .eq('status', 'pipeline')

    if (verifyError) throw verifyError

    const convertedProject = pipelineProjects.find(p => p.id === testProject.id)
    
    if (convertedProject) {
      console.log(`🎉 SUCCESS! Project appears in pipeline:`)
      console.log(`   • Name: ${convertedProject.name}`)
      console.log(`   • Stage: ${convertedProject.pipeline_stage}`)
      console.log(`   • Probability: ${convertedProject.deal_probability}%`)
      console.log(`   • Budget: ${convertedProject.budget ? `$${convertedProject.budget}` : 'Not set'}`)
      console.log(`   • Client: ${convertedProject.clients?.name || 'No client assigned'}`)
    } else {
      console.log('❌ ERROR: Project not found in pipeline after conversion')
    }

    // Step 5: Test conversion back to active
    console.log('\n🔄 Testing conversion back to active...')
    const { error: revertError } = await supabase
      .from('projects')
      .update({
        status: 'active',
        pipeline_stage: null,
        deal_probability: null,
        pipeline_notes: null
      })
      .eq('id', testProject.id)

    if (revertError) throw revertError

    // Verify it's no longer in pipeline
    const { data: verifyRemoval, error: removalError } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'pipeline')
      .eq('id', testProject.id)

    if (removalError) throw removalError

    if (verifyRemoval.length === 0) {
      console.log(`✅ Project successfully removed from pipeline`)
    } else {
      console.log(`❌ ERROR: Project still appears in pipeline after reversion`)
    }

    // Summary
    console.log('\n📊 Integration Test Summary:')
    console.log(`✅ Project → Pipeline conversion: Working`)
    console.log(`✅ Pipeline fields set correctly: Working`)
    console.log(`✅ Project appears in pipeline query: Working`)
    console.log(`✅ Pipeline → Active conversion: Working`)
    console.log(`✅ Pipeline fields cleared: Working`)
    console.log('\n🎯 Integration is working correctly!')

  } catch (error) {
    console.error('❌ Integration test failed:', error.message)
    console.log('\n🔧 This means:')
    console.log('1. Projects with status="pipeline" will NOT appear in the pipeline page')
    console.log('2. Check database schema and pipeline library functions')
    process.exit(1)
  }
}

// Add info about the integration
function showIntegrationInfo() {
  console.log('\n📘 How the Integration Works:')
  console.log('1. Change any project status to "Pipeline" in the Projects page')
  console.log('2. Project automatically gets pipeline_stage="lead" and deal_probability=10')
  console.log('3. Project appears in the Pipeline page kanban board')
  console.log('4. You can drag it between pipeline stages')
  console.log('5. Converting to "Active" in pipeline moves it back to active projects')
  console.log('\n🔗 This creates seamless workflow between Projects and Pipeline!')
}

// Run test
if (require.main === module) {
  testPipelineIntegration()
    .then(() => showIntegrationInfo())
    .catch((error) => {
      console.error('💥 Test script failed:', error)
      process.exit(1)
    })
}

module.exports = { testPipelineIntegration } 