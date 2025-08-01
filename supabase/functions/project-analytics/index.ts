import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectAnalyticsRequest {
  dateRange?: {
    start: string
    end: string
  }
  clientIds?: string[]
  statusFilter?: string[]
  includeFinancials?: boolean
  includePerformance?: boolean
  includeForecasting?: boolean
}

interface ProjectAnalyticsResponse {
  overview: {
    totalProjects: number
    totalRevenue: number
    averageProjectValue: number
    completionRate: number
    averageDuration: number
  }
  trends: {
    monthlyRevenue: Array<{ month: string; revenue: number; projects: number }>
    statusDistribution: Record<string, number>
    clientPerformance: Array<{
      clientId: string
      clientName: string
      projectCount: number
      totalValue: number
      averageDelay: number
    }>
  }
  forecasting?: {
    predictedRevenue: number
    estimatedCompletions: number
    riskProjects: Array<{
      projectId: string
      projectName: string
      riskScore: number
      reasons: string[]
    }>
  }
  performance?: {
    budgetAccuracy: number
    timelineAccuracy: number
    clientSatisfactionScore: number
    profitMargin: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const requestBody: ProjectAnalyticsRequest = await req.json()
    
    // Build base query with advanced joins
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        budget,
        expenses,
        payment_received,
        start_date,
        due_date,
        created_at,
        updated_at,
        client_id,
        clients (
          id,
          name,
          company,
          created_at
        )
      `)

    // Apply filters
    if (requestBody.dateRange) {
      query = query
        .gte('created_at', requestBody.dateRange.start)
        .lte('created_at', requestBody.dateRange.end)
    }

    if (requestBody.clientIds?.length) {
      query = query.in('client_id', requestBody.clientIds)
    }

    if (requestBody.statusFilter?.length) {
      query = query.in('status', requestBody.statusFilter)
    }
    
    // Exclude lost projects and pipeline projects from analytics
    query = query.not('status', 'is', null) // Exclude lost projects (status=null)
    query = query.neq('status', 'pipeline') // Exclude pipeline projects

    const { data: projects, error } = await query

    if (error) {
      throw error
    }

    // Calculate overview metrics
    const overview = calculateOverviewMetrics(projects || [])
    
    // Calculate trends
    const trends = calculateTrends(projects || [])

    // Prepare response
    const response: ProjectAnalyticsResponse = {
      overview,
      trends,
    }

    // Add optional analytics
    if (requestBody.includePerformance) {
      response.performance = calculatePerformanceMetrics(projects || [])
    }

    if (requestBody.includeForecasting) {
      response.forecasting = await calculateForecastingMetrics(supabase, projects || [])
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
        metadata: {
          totalRecords: projects?.length || 0,
          generatedAt: new Date().toISOString(),
          region: Deno.env.get('DENO_REGION') || 'unknown',
          edgeFunction: true,
        }
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minute cache
        },
      },
    )

  } catch (error) {
    console.error('Edge Function Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

// Helper functions for complex calculations
function calculateOverviewMetrics(projects: any[]) {
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => p.status === 'completed')
  const totalRevenue = projects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
  
  // Calculate average project duration for completed projects
  const durations = completedProjects
    .filter(p => p.start_date && p.due_date)
    .map(p => {
      const start = new Date(p.start_date).getTime()
      const end = new Date(p.due_date).getTime()
      return (end - start) / (1000 * 60 * 60 * 24) // days
    })
    .filter(d => d > 0)

  const averageDuration = durations.length > 0 
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
    : 0

  return {
    totalProjects,
    totalRevenue,
    averageProjectValue: totalProjects > 0 ? totalRevenue / totalProjects : 0,
    completionRate: totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 0,
    averageDuration: Math.round(averageDuration)
  }
}

function calculateTrends(projects: any[]) {
  // Monthly revenue trends
  const monthlyData: Record<string, { revenue: number; projects: number }> = {}
  
  projects.forEach(project => {
    const month = new Date(project.created_at).toISOString().slice(0, 7) // YYYY-MM
    
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, projects: 0 }
    }
    
    monthlyData[month].revenue += project.payment_received || 0
    monthlyData[month].projects += 1
  })

  const monthlyRevenue = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Status distribution
  const statusDistribution: Record<string, number> = {}
  projects.forEach(project => {
    const status = project.status || 'unknown'
    statusDistribution[status] = (statusDistribution[status] || 0) + 1
  })

  // Client performance analysis
  const clientData: Record<string, any> = {}
  
  projects.forEach(project => {
    if (!project.clients || !project.client_id) return
    
    const clientId = project.client_id
    const clientName = project.clients.name || 'Unknown Client'
    
    if (!clientData[clientId]) {
      clientData[clientId] = {
        clientId,
        clientName,
        projectCount: 0,
        totalValue: 0,
        delays: [],
      }
    }
    
    clientData[clientId].projectCount += 1
    clientData[clientId].totalValue += project.budget || 0
    
    // Calculate delays for completed projects
    if (project.status === 'completed' && project.due_date && project.updated_at) {
      const dueDate = new Date(project.due_date).getTime()
      const completedDate = new Date(project.updated_at).getTime()
      const delay = Math.max(0, (completedDate - dueDate) / (1000 * 60 * 60 * 24)) // days
      clientData[clientId].delays.push(delay)
    }
  })

  const clientPerformance = Object.values(clientData).map((client: any) => ({
    clientId: client.clientId,
    clientName: client.clientName,
    projectCount: client.projectCount,
    totalValue: client.totalValue,
    averageDelay: client.delays.length > 0 
      ? client.delays.reduce((sum: number, delay: number) => sum + delay, 0) / client.delays.length 
      : 0
  })).sort((a, b) => b.totalValue - a.totalValue)

  return {
    monthlyRevenue,
    statusDistribution,
    clientPerformance
  }
}

function calculatePerformanceMetrics(projects: any[]) {
  const projectsWithBudget = projects.filter(p => p.budget && p.expenses)
  
  // Budget accuracy
  const budgetAccuracies = projectsWithBudget.map(p => {
    const variance = Math.abs(p.budget - p.expenses) / p.budget
    return Math.max(0, 1 - variance) * 100
  })
  
  const budgetAccuracy = budgetAccuracies.length > 0 
    ? budgetAccuracies.reduce((sum, acc) => sum + acc, 0) / budgetAccuracies.length 
    : 0

  // Timeline accuracy for completed projects
  const completedProjects = projects.filter(p => 
    p.status === 'completed' && p.start_date && p.due_date && p.updated_at
  )
  
  const timelineAccuracies = completedProjects.map(p => {
    const plannedDuration = new Date(p.due_date).getTime() - new Date(p.start_date).getTime()
    const actualDuration = new Date(p.updated_at).getTime() - new Date(p.start_date).getTime()
    const variance = Math.abs(plannedDuration - actualDuration) / plannedDuration
    return Math.max(0, 1 - variance) * 100
  })
  
  const timelineAccuracy = timelineAccuracies.length > 0 
    ? timelineAccuracies.reduce((sum, acc) => sum + acc, 0) / timelineAccuracies.length 
    : 0

  // Profit margin calculation
  const totalRevenue = projects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
  const totalExpenses = projects.reduce((sum, p) => sum + (p.expenses || 0), 0)
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

  return {
    budgetAccuracy: Math.round(budgetAccuracy * 100) / 100,
    timelineAccuracy: Math.round(timelineAccuracy * 100) / 100,
    clientSatisfactionScore: 85, // Placeholder - would come from surveys/feedback
    profitMargin: Math.round(profitMargin * 100) / 100
  }
}

async function calculateForecastingMetrics(supabase: any, projects: any[]) {
  // Simple forecasting based on historical data
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'pipeline')
  const completedProjects = projects.filter(p => p.status === 'completed')
  
  // Predict revenue from active projects
  const averageCompletionRate = completedProjects.length > 0 
    ? completedProjects.reduce((sum, p) => sum + (p.payment_received || 0) / (p.budget || 1), 0) / completedProjects.length 
    : 0.8 // Default 80% completion rate
  
  const predictedRevenue = activeProjects.reduce((sum, p) => 
    sum + (p.budget || 0) * averageCompletionRate, 0
  )

  // Estimate completion timeline
  const averageProjectDuration = calculateAverageProjectDuration(completedProjects)
  const estimatedCompletions = activeProjects.filter(p => {
    if (!p.start_date) return false
    const startDate = new Date(p.start_date).getTime()
    const estimatedCompletion = startDate + (averageProjectDuration * 24 * 60 * 60 * 1000)
    const nextMonth = Date.now() + (30 * 24 * 60 * 60 * 1000)
    return estimatedCompletion <= nextMonth
  }).length

  // Identify risk projects (simplified risk scoring)
  const riskProjects = activeProjects
    .map(project => {
      const riskFactors = []
      let riskScore = 0

      // Budget risk
      if (project.expenses && project.budget && project.expenses > project.budget * 0.8) {
        riskFactors.push('Budget overrun risk')
        riskScore += 30
      }

      // Timeline risk
      if (project.due_date) {
        const dueDate = new Date(project.due_date).getTime()
        const now = Date.now()
        const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24)
        
        if (daysUntilDue < 7 && project.status !== 'completed') {
          riskFactors.push('Approaching deadline')
          riskScore += 40
        }
      }

      // Payment risk
      const paymentRatio = project.payment_received / (project.budget || 1)
      if (paymentRatio < 0.3) {
        riskFactors.push('Low payment collection')
        riskScore += 20
      }

      return {
        projectId: project.id,
        projectName: project.name,
        riskScore,
        reasons: riskFactors
      }
    })
    .filter(p => p.riskScore > 30) // Only show projects with significant risk
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10) // Top 10 risk projects

  return {
    predictedRevenue: Math.round(predictedRevenue),
    estimatedCompletions,
    riskProjects
  }
}

function calculateAverageProjectDuration(projects: any[]): number {
  const durations = projects
    .filter(p => p.start_date && p.updated_at)
    .map(p => {
      const start = new Date(p.start_date).getTime()
      const end = new Date(p.updated_at).getTime()
      return (end - start) / (1000 * 60 * 60 * 24) // days
    })
    .filter(d => d > 0 && d < 365) // Filter outliers

  return durations.length > 0 
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
    : 30 // Default 30 days
} 