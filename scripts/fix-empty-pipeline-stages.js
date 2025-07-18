#!/usr/bin/env node

/**
 * Fix Script: Empty Pipeline Stages
 * 
 * This script fixes projects that have status='pipeline' but 
 * have empty or null pipeline_stage values.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️ Supabase environment variables not found')
  console.log('This script requires database access to fix pipeline stages')
  console.log('\nTo fix manually:')
  console.log('1. Go to Projects page') 
  console.log('2. Change the SEQ project status to "Active"')
  console.log('3. Change it back to "Pipeline"')
  console.log('4. This will set the correct pipeline_stage="Lead"')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixEmptyPipelineStages() {
  console.log('🔧 Fixing Empty Pipeline Stages...\n')

  try {
    // Step 1: Find projects with pipeline status but empty/null pipeline_stage
    console.log('1️⃣ Finding projects with empty pipeline stages...')
    const { data: brokenProjects, error: findError } = await supabase
      .from('projects')
      .select('id, name, status, pipeline_stage, deal_probability')
      .eq('status', 'pipeline')
      .or('pipeline_stage.is.null,pipeline_stage.eq.')

    if (findError) {
      throw new Error(`Failed to find broken projects: ${findError.message}`)
    }

    if (!brokenProjects || brokenProjects.length === 0) {
      console.log('✅ No projects found with empty pipeline stages')
      console.log('All pipeline projects have valid stages!')
      return
    }

    console.log(`🔍 Found ${brokenProjects.length} projects with empty pipeline stages:`)
    brokenProjects.forEach(project => {
      const stage = project.pipeline_stage === null ? 'null' : `"${project.pipeline_stage}"`
      console.log(`   • ${project.name} - stage: ${stage}, probability: ${project.deal_probability}%`)
    })

    // Step 2: Fix each project
    console.log('\n2️⃣ Fixing pipeline stages...')
    let fixedCount = 0

    for (const project of brokenProjects) {
      console.log(`🔄 Fixing "${project.name}"...`)
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          pipeline_stage: 'Lead',  // Set to default Lead stage
          deal_probability: project.deal_probability || 10  // Ensure probability is set
        })
        .eq('id', project.id)

      if (updateError) {
        console.error(`   ❌ Failed to fix "${project.name}": ${updateError.message}`)
        continue
      }

      console.log(`   ✅ Fixed "${project.name}" - set pipeline_stage="Lead"`)
      fixedCount++
    }

    // Step 3: Verify fixes
    console.log('\n3️⃣ Verifying fixes...')
    const { data: verifyProjects, error: verifyError } = await supabase
      .from('projects')
      .select('id, name, pipeline_stage, deal_probability')
      .eq('status', 'pipeline')

    if (verifyError) {
      throw new Error(`Failed to verify fixes: ${verifyError.message}`)
    }

    const stillBroken = verifyProjects.filter(p => !p.pipeline_stage || p.pipeline_stage === '')
    
    if (stillBroken.length === 0) {
      console.log('🎉 All pipeline projects now have valid stages!')
    } else {
      console.log(`⚠️ ${stillBroken.length} projects still have empty stages:`)
      stillBroken.forEach(p => console.log(`   • ${p.name}`))
    }

    // Summary
    console.log('\n📊 Fix Summary:')
    console.log(`✅ Projects found with empty stages: ${brokenProjects.length}`)
    console.log(`✅ Projects successfully fixed: ${fixedCount}`)
    console.log(`✅ Projects still broken: ${stillBroken.length}`)

    if (fixedCount > 0) {
      console.log('\n🎯 Fixed! Your pipeline projects should now appear in the Lead column.')
      console.log('💡 Refresh the Pipeline page to see the changes.')
    }

  } catch (error) {
    console.error('❌ Fix script failed:', error.message)
    console.log('\n🔧 Manual fix steps:')
    console.log('1. Go to Projects page')
    console.log('2. For each project with pipeline status:')
    console.log('   - Change status to "Active"')
    console.log('   - Change status back to "Pipeline"')
    console.log('3. This will set the correct pipeline fields')
  }
}

// Run fix
if (require.main === module) {
  fixEmptyPipelineStages()
    .catch((error) => {
      console.error('💥 Fix script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixEmptyPipelineStages } 