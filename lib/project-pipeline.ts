import { supabase } from './supabase'
import type { PipelineProject, PipelineStage, PipelineMetrics, ProjectStageColumn } from './types/pipeline'

export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  try {
    console.log('Fetching pipeline stages...')
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index', { ascending: true })

    console.log('Pipeline stages query result:', { data, error })
    if (data) {
      console.log('Found stages:', data.map(s => ({ name: s.name, order: s.order_index })))
    }

    if (error) {
      console.error('Error fetching pipeline stages:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pipeline stages:', error)
    return []
  }
}

export async function fetchPipelineProjects(): Promise<PipelineProject[]> {
  try {
    console.log('Fetching pipeline projects...')
    
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

    console.log('Raw query result:', { data, error })
    console.log('Pipeline projects found:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('Sample project:', data[0])
      console.log('Projects by pipeline_stage:', data.reduce((acc, p) => {
        const stage = p.pipeline_stage || 'no_stage'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {} as Record<string, number>))
    }

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
    const todayDate = new Date().toISOString().split('T')[0]
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
  const leadCount = projects.filter(p => p.pipeline_stage === 'lead').length
  const pitchedCount = projects.filter(p => p.pipeline_stage === 'pitched').length
  const discussionCount = projects.filter(p => p.pipeline_stage === 'in discussion').length
  
  // Calculate total potential value (budget)
  const totalValue = projects.reduce((sum, project) => {
    return sum + (project.budget || 0)
  }, 0)
  
  // Calculate weighted value (budget * probability)
  const weightedValue = projects.reduce((sum, project) => {
    const potential = project.budget || 0
    const probability = (project.deal_probability || 0) / 100
    return sum + (potential * probability)
  }, 0)
  
  // Revenue forecast (same as weighted value for now)
  const revenueForeccast = weightedValue
  
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
    revenueForeccast,
    weightedValue,
    conversionRate,
    winRate
  }
}

export function groupProjectsByStage(projects: PipelineProject[], stages: PipelineStage[]): ProjectStageColumn[] {
  console.log('=== GROUPING DEBUG ===')
  console.log('Input projects:', projects.length)
  console.log('Input stages:', stages.length)
  console.log('Stages:', stages.map(s => ({ name: s.name, id: s.id, order: s.order_index })))
  
  // 🚀 FILTER OUT: Exclude "Lost" stage since we have a combined Closed column
  const activeStages = stages.filter(stage => stage.name.toLowerCase() !== 'lost')
  console.log('Active stages (excluding Lost):', activeStages.map(s => s.name))
  
  const stageMap = new Map(activeStages.map(stage => [stage.name.toLowerCase(), stage]))
  console.log('Stage map keys:', Array.from(stageMap.keys()))
  
  const result = activeStages.map(stage => {
    const filteredProjects = projects.filter(project => {
      const match = project.pipeline_stage?.toLowerCase() === stage.name.toLowerCase()
      if (project.pipeline_stage) {
        console.log(`Project "${project.name}" (stage: "${project.pipeline_stage}") matches "${stage.name}"?`, match)
      }
      return match
    })
    
    console.log(`Stage "${stage.name}" has ${filteredProjects.length} projects:`, filteredProjects.map(p => p.name))
    
    return {
      id: stage.name.toLowerCase().replace(/\s+/g, '-'),
      title: stage.name,
      color: stage.color,
      defaultProbability: stage.default_probability,
      projects: filteredProjects
    }
  })
  
  console.log('=== END GROUPING DEBUG ===')
  return result
} 