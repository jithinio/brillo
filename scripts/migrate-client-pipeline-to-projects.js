#!/usr/bin/env node

/**
 * Migration Script: Client Pipeline to Project Pipeline
 * 
 * This script migrates existing client pipeline data to project format.
 * It creates projects from pipeline clients and preserves all data.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migratePipelineData() {
  console.log('🚀 Starting client pipeline to project pipeline migration...\n')

  try {
    // Step 1: Fetch all pipeline clients
    console.log('📋 Fetching pipeline clients...')
    const { data: pipelineClients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'pipeline')

    if (clientsError) {
      throw new Error(`Failed to fetch pipeline clients: ${clientsError.message}`)
    }

    console.log(`✅ Found ${pipelineClients.length} pipeline clients to migrate`)

    if (pipelineClients.length === 0) {
      console.log('✨ No pipeline clients found. Migration not needed.')
      return
    }

    // Step 2: Create projects from pipeline clients
    console.log('\n🔄 Converting clients to projects...')
    
    const projectsToCreate = []
    let migratedCount = 0

    for (const client of pipelineClients) {
      // Create project data from client data
      const projectData = {
        name: client.name + (client.company ? ` (${client.company})` : ''),
        description: `Migrated from pipeline client: ${client.name}${client.company ? ` at ${client.company}` : ''}`,
        status: 'pipeline',
        pipeline_stage: client.pipeline_stage || 'lead',
        budget: client.potential_value || null,
        deal_probability: client.deal_probability || 10,
        pipeline_notes: client.pipeline_notes || null,
        client_id: client.id, // Link to the original client
        created_at: client.created_at,
        updated_at: client.updated_at || new Date().toISOString(),
      }

      projectsToCreate.push(projectData)
      console.log(`   → Converting "${client.name}" to project`)
    }

    // Step 3: Insert projects in batches
    console.log('\n💾 Inserting projects into database...')
    const batchSize = 10
    
    for (let i = 0; i < projectsToCreate.length; i += batchSize) {
      const batch = projectsToCreate.slice(i, i + batchSize)
      
      const { data: insertedProjects, error: insertError } = await supabase
        .from('projects')
        .insert(batch)
        .select()

      if (insertError) {
        throw new Error(`Failed to insert projects batch: ${insertError.message}`)
      }

      migratedCount += insertedProjects.length
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertedProjects.length} projects`)
    }

    // Step 4: Update original clients to 'active' status
    console.log('\n🔄 Converting pipeline clients to active clients...')
    
    const clientIds = pipelineClients.map(c => c.id)
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        status: 'active',
        pipeline_stage: null,
        deal_probability: null 
      })
      .in('id', clientIds)

    if (updateError) {
      throw new Error(`Failed to update clients: ${updateError.message}`)
    }

    console.log(`   ✅ Updated ${clientIds.length} clients to active status`)

    // Step 5: Summary
    console.log('\n🎉 Migration completed successfully!')
    console.log(`📊 Migration Summary:`)
    console.log(`   • Pipeline clients migrated: ${pipelineClients.length}`)
    console.log(`   • Projects created: ${migratedCount}`)
    console.log(`   • Clients converted to active: ${clientIds.length}`)
    console.log('\n✨ Your pipeline now uses projects instead of clients!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check your database connection')
    console.log('2. Ensure the projects table has pipeline fields (run migration 18)')
    console.log('3. Verify your Supabase credentials')
    process.exit(1)
  }
}

// Add verification function
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...')

  try {
    // Check remaining pipeline clients
    const { data: remainingClients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('status', 'pipeline')

    if (clientsError) throw clientsError

    // Check created pipeline projects
    const { data: pipelineProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'pipeline')

    if (projectsError) throw projectsError

    console.log(`✅ Verification complete:`)
    console.log(`   • Pipeline clients remaining: ${remainingClients.length}`)
    console.log(`   • Pipeline projects created: ${pipelineProjects.length}`)

    if (remainingClients.length === 0 && pipelineProjects.length > 0) {
      console.log('🎯 Migration successful - all data migrated correctly!')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

// Run migration
if (require.main === module) {
  migratePipelineData()
    .then(() => verifyMigration())
    .catch((error) => {
      console.error('💥 Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { migratePipelineData, verifyMigration } 