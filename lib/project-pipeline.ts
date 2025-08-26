import { supabase } from './supabase'
import type { PipelineProject, PipelineStage, PipelineMetrics, ProjectStageColumn } from './types/pipeline'
import { formatDateForDatabase } from './date-format'

export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  try {
    // Always return simplified stages for all users
    console.log('🎯 Returning simplified pipeline stages for all users')
    const simplifiedStages = await getSimplifiedPipelineStages()
    return simplifiedStages
  } catch (error) {
    console.error('Error fetching pipeline stages:', error)
    return []
  }
}

async function getSimplifiedPipelineStages(): Promise<PipelineStage[]> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user for pipeline stages:', userError)
      return []
    }

    // Return hardcoded simplified stages - no database dependency
    const simplifiedStages: PipelineStage[] = [
      {
        id: `${user.id}-lead`,
        user_id: user.id,
        name: 'Lead',
        order_index: 1,
        color: '#3b82f6', // Blue
        default_probability: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `${user.id}-pitched`,
        user_id: user.id,
        name: 'Pitched',
        order_index: 2,
        color: '#8b5cf6', // Purple
        default_probability: 40,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `${user.id}-discussion`,
        user_id: user.id,
        name: 'In Discussion',
        order_index: 3,
        color: '#f59e0b', // Amber
        default_probability: 70,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    return simplifiedStages
  } catch (error) {
    console.error('Error getting simplified pipeline stages:', error)
    return []
  }
}

export async function resetPipelineStages(): Promise<PipelineStage[]> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user for pipeline reset:', userError)
      return []
    }

    console.log('🔄 Starting pipeline stage reset for user:', user.id)

    // First, get existing projects and map them to new stages
    const { data: existingProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, pipeline_stage')
      .eq('status', 'pipeline')
      .not('pipeline_stage', 'is', null)

    if (projectsError) {
      console.error('Error fetching existing projects:', projectsError)
    }

    // Create stage mapping for existing projects
    const stageMapping: { [key: string]: string } = {
      'lead': 'Lead',
      'qualified': 'Pitched', 
      'proposal': 'In Discussion',
      'negotiation': 'In Discussion',
      'pitched': 'Pitched',
      'in discussion': 'In Discussion'
    }

    // Update existing projects to use new stage names
    if (existingProjects && existingProjects.length > 0) {
      console.log(`📝 Updating ${existingProjects.length} existing pipeline projects`)
      
      for (const project of existingProjects) {
        if (project.pipeline_stage) {
          const oldStage = project.pipeline_stage.toLowerCase()
          const newStage = stageMapping[oldStage] || 'Lead' // Default to Lead if not mapped
          
          if (newStage !== project.pipeline_stage) {
            const { error: updateError } = await supabase
              .from('projects')
              .update({ 
                pipeline_stage: newStage,
                updated_at: new Date().toISOString()
              })
              .eq('id', project.id)

            if (updateError) {
              console.error(`Error updating project ${project.id}:`, updateError)
            } else {
              console.log(`✅ Updated project ${project.id}: ${project.pipeline_stage} → ${newStage}`)
            }
          }
        }
      }
    }

    // Delete existing pipeline stages
    const { error: deleteError } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting existing pipeline stages:', deleteError)
      throw deleteError
    }

    console.log('🗑️ Deleted existing pipeline stages')

    // Create new simplified stages
    const newStages = [
      {
        user_id: user.id,
        name: 'Lead',
        order_index: 1,
        color: '#3b82f6', // Blue
        default_probability: 10
      },
      {
        user_id: user.id,
        name: 'Pitched',
        order_index: 2,
        color: '#8b5cf6', // Purple
        default_probability: 40
      },
      {
        user_id: user.id,
        name: 'In Discussion',
        order_index: 3,
        color: '#f59e0b', // Amber
        default_probability: 70
      }
    ]

    const { data: createdStages, error: createError } = await supabase
      .from('pipeline_stages')
      .insert(newStages)
      .select('*')
      .order('order_index', { ascending: true })

    if (createError) {
      console.error('Error creating new pipeline stages:', createError)
      throw createError
    }

    console.log('✅ Created new simplified pipeline stages:', createdStages?.length)
    return createdStages || []
  } catch (error) {
    console.error('Error resetting pipeline stages:', error)
    return []
  }
}

async function initializeDefaultPipelineStages(): Promise<PipelineStage[]> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user for pipeline initialization:', userError)
      return []
    }

    // Default pipeline stages for new users
    const defaultStages = [
      {
        user_id: user.id,
        name: 'Lead',
        order_index: 1,
        color: '#3b82f6', // Blue
        default_probability: 10
      },
      {
        user_id: user.id,
        name: 'Pitched',
        order_index: 2,
        color: '#8b5cf6', // Purple
        default_probability: 40
      },
      {
        user_id: user.id,
        name: 'In Discussion',
        order_index: 3,
        color: '#f59e0b', // Amber
        default_probability: 70
      }
    ]

    console.log('Creating default pipeline stages for user:', user.id)
    
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert(defaultStages)
      .select('*')
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error creating default pipeline stages:', error)
      return []
    }

    console.log('Default pipeline stages created successfully:', data?.length)
    return data || []
  } catch (error) {
    console.error('Error initializing default pipeline stages:', error)
    return []
  }
}

export async function fetchPipelineProjects(): Promise<PipelineProject[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('status', 'pipeline')
      .not('pipeline_stage', 'eq', 'lost') // Exclude lost projects from main pipeline view
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pipeline projects:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pipeline projects:', error)
    return []
  }
}

export async function updateProjectStage(projectId: string, newStage: string, probability?: number): Promise<boolean> {
  try {
    const updateData: any = { pipeline_stage: newStage }
    if (probability !== undefined) {
      updateData.deal_probability = probability
    }

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)

    if (error) {
      console.error('Error updating project stage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating project stage:', error)
    return false
  }
}

export async function updatePipelineProject(projectId: string, projectData: Partial<PipelineProject>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', projectId)

    if (error) {
      console.error('Error updating pipeline project:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating pipeline project:', error)
    return false
  }
}

export async function convertProjectToActive(projectId: string): Promise<boolean> {
  try {
    console.log('🔄 Converting pipeline project to active:', projectId)
    
    // First, get the project data to check if currency conversion is needed
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('budget, currency, pipeline_notes, name')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      console.error('❌ Error fetching project for conversion:', fetchError)
      return false
    }

    console.log('📊 Project data:', {
      name: project.name,
      budget: project.budget,
      currency: project.currency,
      hasNotes: !!project.pipeline_notes
    })

    // Get company default currency
    const { data: settings } = await supabase
      .from('company_settings')
      .select('default_currency')
      .single()

    const defaultCurrency = settings?.default_currency || 'USD'
    const todayDate = formatDateForDatabase(new Date())
    console.log('💰 Default currency:', defaultCurrency)
    console.log('📅 Setting start date to today:', todayDate)
    
    let updateData: any = {
      status: 'active',
      pipeline_stage: 'closed', // Mark as closed deal from pipeline
      deal_probability: 100, // Won deal
      start_date: todayDate // Set start date to today when project becomes active
    }

    // If project has a different currency than default, convert it
    if (project.currency && project.currency !== defaultCurrency && project.budget) {
      console.log(`💱 Currency conversion needed: ${project.currency} → ${defaultCurrency}`)
      
      try {
        const { convertWithLiveRate } = await import('./exchange-rates-live')
        console.log('📞 Calling convertWithLiveRate with:', {
          amount: project.budget,
          from: project.currency,
          to: defaultCurrency
        })
        
        const conversion = await convertWithLiveRate(
          project.budget,
          project.currency,
          defaultCurrency
        )

        console.log('✅ Conversion result:', conversion)

        // Add conversion note
        const conversionNote = `\n\n💱 Currency Conversion Applied:\nOriginal: ${project.budget} ${project.currency}\nConverted: ${conversion.convertedAmount} ${defaultCurrency}\nRate: 1 ${project.currency} = ${conversion.rate} ${defaultCurrency}\nDate: ${new Date(conversion.date).toLocaleDateString()}`

        updateData = {
          ...updateData,
          budget: conversion.convertedAmount,
          currency: defaultCurrency,
          original_currency: project.currency,
          conversion_rate: conversion.rate,
          conversion_date: conversion.date,
          pipeline_notes: (project.pipeline_notes || '') + conversionNote
        }
        
        console.log('📝 Update data with conversion:', updateData)
      } catch (conversionError) {
        console.error('❌ Currency conversion failed:', conversionError)
        console.error('❌ Conversion error details:', {
          message: conversionError.message,
          stack: conversionError.stack
        })
        // Continue without conversion if exchange rate fails
      }
    } else {
      console.log('💡 No currency conversion needed:', {
        projectCurrency: project.currency,
        defaultCurrency: defaultCurrency,
        hasBudget: !!project.budget,
        sameOrMissingCurrency: !project.currency || project.currency === defaultCurrency
      })
    }

    console.log('💾 Updating project with data:', updateData)
    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)

    if (error) {
      console.error('❌ Error updating project:', error)
      return false
    }

    console.log('✅ Project conversion completed successfully')
    return true
  } catch (error) {
    console.error('❌ Error converting project to active:', error)
    return false
  }
}

export async function convertProjectToLost(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
        status: null, // Remove from all project status pages
        pipeline_stage: 'lost', // Mark as lost in pipeline
        deal_probability: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      console.error('Error converting project to lost:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error converting project to lost:', error)
    return false
  }
}

export async function deletePipelineProject(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('Error deleting pipeline project:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting pipeline project:', error)
    return false
  }
}

export async function createPipelineProject(projectData: Partial<PipelineProject>): Promise<PipelineProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,
        status: 'pipeline',
        pipeline_stage: 'lead',
        deal_probability: 10
      }])
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          phone,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating pipeline project:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating pipeline project:', error)
    return null
  }
}

// Note: Lost stage is now created via SQL script instead of programmatically

export async function calculateProjectPipelineMetrics(projects: PipelineProject[], stages: PipelineStage[]): Promise<PipelineMetrics> {
  const leadCount = projects.filter(p => p.pipeline_stage?.toLowerCase() === 'lead').length
  const pitchedCount = projects.filter(p => p.pipeline_stage?.toLowerCase() === 'pitched').length
  const discussionCount = projects.filter(p => p.pipeline_stage?.toLowerCase() === 'in discussion').length
  
  // Calculate total potential value (total_budget)
  const totalValue = projects.reduce((sum, project) => {
    return sum + (project.total_budget || project.budget || 0)
  }, 0)
  
  // Calculate weighted value (total_budget * probability)
  const weightedValue = projects.reduce((sum, project) => {
    const potential = project.total_budget || project.budget || 0
    const probability = (project.deal_probability || 0) / 100
    return sum + (potential * probability)
  }, 0)
  

  
  // Calculate real metrics from historical data
  let conversionRate = 0
  let winRate = 0

  try {
    // Fetch all projects (including active and cancelled) for metrics calculation
    const { data: allProjects, error } = await supabase
      .from('projects')
      .select('status, pipeline_stage, created_at, updated_at')
      .not('pipeline_stage', 'is', null) // Only projects that were in pipeline

    if (!error && allProjects && allProjects.length > 0) {
      // Calculate conversion rate: (active + cancelled) / total pipeline projects
      const totalPipelineProjects = allProjects.length
      const convertedProjects = allProjects.filter(p => p.status === 'active' || p.status === 'cancelled').length
      conversionRate = totalPipelineProjects > 0 ? Math.round((convertedProjects / totalPipelineProjects) * 100) : 0

      // Calculate win rate: active projects / (active + cancelled) projects
      const closedProjects = allProjects.filter(p => p.status === 'active' || p.status === 'cancelled')
      const wonProjects = closedProjects.filter(p => p.status === 'active')
      winRate = closedProjects.length > 0 ? Math.round((wonProjects.length / closedProjects.length) * 100) : 0
    }
  } catch (error) {
    console.error('Error calculating metrics:', error)
    // Fall back to placeholder values if query fails
    conversionRate = 68
    winRate = 42
  }

  return {
    totalValue,
    leadCount,
    pitchedCount,
    discussionCount,
    weightedValue,
    conversionRate,
    winRate
  }
}

export function groupProjectsByStage(projects: PipelineProject[], stages: PipelineStage[]): ProjectStageColumn[] {
  // 🚀 FILTER OUT: Exclude "Lost" stage since we have a combined Closed column
  const activeStages = stages.filter(stage => stage.name.toLowerCase() !== 'lost')
  
  const stageMap = new Map(activeStages.map(stage => [stage.name.toLowerCase(), stage]))
  
  const result = activeStages.map(stage => {
    const filteredProjects = projects.filter(project => {
      return project.pipeline_stage?.toLowerCase() === stage.name.toLowerCase()
    })
    
    return {
      id: stage.name.toLowerCase().replace(/\s+/g, '-'),
      title: stage.name,
      color: stage.color,
      defaultProbability: stage.default_probability,
      projects: filteredProjects
    }
  })
  
  return result
} 