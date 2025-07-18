#!/usr/bin/env node

/**
 * Verification Script: Check Pipeline Projects and Stages
 * 
 * This script verifies that pipeline projects appear correctly
 * and troubleshoots any issues with the grouping.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️ Supabase environment variables not found')
  console.log('This script requires database access to verify pipeline integration')
  console.log('\nTo test manually:')
  console.log('1. Go to Projects page')
  console.log('2. Change a project status to "Pipeline"')
  console.log('3. Go to Pipeline page')
  console.log('4. Check if the project appears in the Lead column')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyPipelineSetup() {
  console.log('🔍 Verifying Pipeline Setup...\n')

  try {
    // Step 1: Check pipeline stages
    console.log('1️⃣ Checking pipeline stages...')
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index', { ascending: true })

    if (stagesError) {
      throw new Error(`Failed to fetch stages: ${stagesError.message}`)
    }

    if (!stages || stages.length === 0) {
      console.log('❌ No pipeline stages found!')
      console.log('📋 Expected stages: Lead, Pitched, In Discussion')
      console.log('🔧 Run the pipeline migration scripts to create stages')
      return
    }

    console.log(`✅ Found ${stages.length} pipeline stages:`)
    stages.forEach(stage => {
      console.log(`   • ${stage.name} (probability: ${stage.default_probability}%, color: ${stage.color})`)
    })

    // Step 2: Check pipeline projects
    console.log('\n2️⃣ Checking pipeline projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        status, 
        pipeline_stage, 
        deal_probability,
        clients (name, company)
      `)
      .eq('status', 'pipeline')

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log('📝 No pipeline projects found')
      console.log('💡 To test:')
      console.log('   1. Go to Projects page')
      console.log('   2. Change a project status to "Pipeline"')
      console.log('   3. Check if it appears here')
      return
    }

    console.log(`✅ Found ${projects.length} pipeline projects:`)
    projects.forEach(project => {
      const client = project.clients ? `(${project.clients.name})` : '(No client)'
      console.log(`   • ${project.name} ${client}`)
      console.log(`     Stage: ${project.pipeline_stage}, Probability: ${project.deal_probability}%`)
    })

    // Step 3: Group projects by stage
    console.log('\n3️⃣ Grouping projects by stage...')
    
    stages.forEach(stage => {
      const stageProjects = projects.filter(project => 
        project.pipeline_stage?.toLowerCase() === stage.name.toLowerCase()
      )
      
      console.log(`\n📂 ${stage.name} Column:`)
      if (stageProjects.length === 0) {
        console.log('   (empty)')
      } else {
        stageProjects.forEach(project => {
          console.log(`   • ${project.name} (${project.deal_probability}%)`)
        })
      }
    })

    // Step 4: Check for mismatched stages
    console.log('\n4️⃣ Checking for stage mismatches...')
    const stageNames = stages.map(s => s.name.toLowerCase())
    const unmatchedProjects = projects.filter(project => {
      if (!project.pipeline_stage) return true
      return !stageNames.includes(project.pipeline_stage.toLowerCase())
    })

    if (unmatchedProjects.length > 0) {
      console.log('⚠️ Found projects with unmatched stages:')
      unmatchedProjects.forEach(project => {
        console.log(`   • ${project.name}: stage="${project.pipeline_stage}"`)
      })
      console.log('\n🔧 Fix: Update these projects to use valid stage names:')
      stageNames.forEach(name => console.log(`   • ${name}`))
    } else {
      console.log('✅ All projects have valid stage assignments')
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`✅ Pipeline stages: ${stages.length}`)
    console.log(`✅ Pipeline projects: ${projects.length}`)
    console.log(`✅ Stage matching: ${unmatchedProjects.length === 0 ? 'Working' : 'Issues found'}`)
    
    if (projects.length > 0 && unmatchedProjects.length === 0) {
      console.log('\n🎯 Pipeline integration is working correctly!')
    } else if (unmatchedProjects.length > 0) {
      console.log('\n⚠️ Pipeline integration has stage mismatch issues')
    } else {
      console.log('\n💡 No pipeline projects to test with yet')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check that Supabase is configured correctly')
    console.log('2. Ensure pipeline migration scripts have been run')
    console.log('3. Verify RLS policies allow access to pipeline_stages and projects')
  }
}

// Run verification
if (require.main === module) {
  verifyPipelineSetup()
    .catch((error) => {
      console.error('💥 Verification script failed:', error)
      process.exit(1)
    })
}

module.exports = { verifyPipelineSetup } 