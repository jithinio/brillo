import { supabase } from './supabase'
import type { PipelineClient, PipelineStage, PipelineMetrics } from './types/pipeline'

export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index', { ascending: true })

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

export async function fetchPipelineClients(): Promise<PipelineClient[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'pipeline')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pipeline clients:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pipeline clients:', error)
    return []
  }
}

export async function updateClientStage(clientId: string, newStage: string, probability?: number): Promise<boolean> {
  try {
    const updateData: any = { pipeline_stage: newStage }
    if (probability !== undefined) {
      updateData.deal_probability = probability
    }

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)

    if (error) {
      console.error('Error updating client stage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating client stage:', error)
    return false
  }
}

export async function updatePipelineClient(clientId: string, clientData: Partial<PipelineClient>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', clientId)

    if (error) {
      console.error('Error updating pipeline client:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating pipeline client:', error)
    return false
  }
}

export async function convertClientToActive(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ 
        status: 'active',
        pipeline_stage: null,
        deal_probability: null 
      })
      .eq('id', clientId)

    if (error) {
      console.error('Error converting client to active:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error converting client to active:', error)
    return false
  }
}

export async function deletePipelineClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      console.error('Error deleting pipeline client:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting pipeline client:', error)
    return false
  }
}

export async function createPipelineClient(clientData: Partial<PipelineClient>): Promise<PipelineClient | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...clientData,
        status: 'pipeline',
        pipeline_stage: 'lead',
        deal_probability: 10
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating pipeline client:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating pipeline client:', error)
    return null
  }
}

export function calculatePipelineMetrics(clients: PipelineClient[], stages: PipelineStage[]): PipelineMetrics {
  const leadCount = clients.filter(c => c.pipeline_stage === 'lead').length
  const pitchedCount = clients.filter(c => c.pipeline_stage === 'pitched').length
  const discussionCount = clients.filter(c => c.pipeline_stage === 'in discussion').length
  
  // Calculate total potential value
  const totalValue = clients.reduce((sum, client) => {
    return sum + (client.potential_value || 0)
  }, 0)
  
  // Calculate weighted value (potential * probability)
  const weightedValue = clients.reduce((sum, client) => {
    const potential = client.potential_value || 0
    const probability = (client.deal_probability || 0) / 100
    return sum + (potential * probability)
  }, 0)
  
  // Revenue forecast (same as weighted value for now)
  const revenueForeccast = weightedValue
  
  // Conversion rate (placeholder - would need historical data)
  const conversionRate = 68 // Default placeholder
  
  // Win rate (placeholder - would need historical data)
  const winRate = 42 // Default placeholder

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

export function groupClientsByStage(clients: PipelineClient[], stages: PipelineStage[]) {
  const stageMap = new Map(stages.map(stage => [stage.name.toLowerCase(), stage]))
  
  return stages.map(stage => ({
    id: stage.name.toLowerCase().replace(/\s+/g, '-'),
    title: stage.name,
    color: stage.color,
    defaultProbability: stage.default_probability,
    clients: clients.filter(client => 
      client.pipeline_stage?.toLowerCase() === stage.name.toLowerCase()
    )
  }))
} 