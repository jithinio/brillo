import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Enable Vercel Edge Runtime for global performance
export const runtime = 'edge'

// Cache configuration for Vercel
export const revalidate = 60 // 60 seconds

// Define analytics data structure
interface ProjectAnalytics {
  overview: {
    totalProjects: number
    totalValue: number
    averageProjectValue: number
    completionRate: number
  }
  statusDistribution: Record<string, number>
  monthlyTrends: Array<{
    month: string
    projectsStarted: number
    projectsCompleted: number
    revenue: number
  }>
  clientAnalytics: Array<{
    clientId: string
    clientName: string
    projectCount: number
    totalValue: number
  }>
  performanceMetrics: {
    averageProjectDuration: number
    onTimeCompletionRate: number
    budgetAccuracy: number
  }
}

export async function GET(request: NextRequest) {
  try {
    // Add CORS headers for cross-origin requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503, headers }
      )
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const clientId = searchParams.get('clientId')
    const projectType = searchParams.get('projectType')

    // Build base query
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        budget,
        total_budget,
        project_type,
        expenses,
        payment_received,
        start_date,
        due_date,
        created_at,
        client_id,
        clients (
          id,
          name,
          company
        )
      `)

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    if (projectType) {
      query = query.eq('project_type', projectType)
    }
    
    // Exclude lost projects and pipeline projects from analytics
    query = query.not('status', 'is', null) // Exclude lost projects (status=null)
    query = query.neq('status', 'pipeline') // Exclude pipeline projects

    const { data: projects, error } = await query

    if (error) {
      console.error('Edge Function: Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project data' },
        { status: 500, headers }
      )
    }

    // Perform analytics calculations on the edge
    const analytics: ProjectAnalytics = {
      overview: calculateOverview(projects || []),
      statusDistribution: calculateStatusDistribution(projects || []),
      monthlyTrends: calculateMonthlyTrends(projects || []),
      clientAnalytics: calculateClientAnalytics(projects || []),
      performanceMetrics: calculatePerformanceMetrics(projects || []),
    }

    return NextResponse.json(
      {
        success: true,
        data: analytics,
        metadata: {
          totalRecords: projects?.length || 0,
          generatedAt: new Date().toISOString(),
          cacheUntil: new Date(Date.now() + 60000).toISOString(), // 1 minute
          edge: true,
        }
      },
      { headers }
    )

  } catch (error) {
    console.error('Edge Function: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Analytics calculation functions (optimized for edge runtime)
function calculateOverview(projects: any[]) {
  const totalProjects = projects.length
  const totalValue = projects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0)
  const completedProjects = projects.filter(p => p.status === 'completed').length
  
  return {
    totalProjects,
    totalValue,
    averageProjectValue: totalProjects > 0 ? totalValue / totalProjects : 0,
    completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
  }
}

function calculateStatusDistribution(projects: any[]) {
  const distribution: Record<string, number> = {}
  
  projects.forEach(project => {
    const status = project.status || 'unknown'
    distribution[status] = (distribution[status] || 0) + 1
  })
  
  return distribution
}

function calculateMonthlyTrends(projects: any[]) {
  const trends: Record<string, any> = {}
  
  projects.forEach(project => {
    const month = new Date(project.created_at).toISOString().slice(0, 7) // YYYY-MM
    
    if (!trends[month]) {
      trends[month] = {
        month,
        projectsStarted: 0,
        projectsCompleted: 0,
        revenue: 0,
      }
    }
    
    trends[month].projectsStarted++
    
    if (project.status === 'completed') {
      trends[month].projectsCompleted++
      trends[month].revenue += project.payment_received || 0
    }
  })
  
  return Object.values(trends).sort((a: any, b: any) => a.month.localeCompare(b.month))
}

function calculateClientAnalytics(projects: any[]) {
  const clientMap: Record<string, any> = {}
  
  projects.forEach(project => {
    if (!project.clients || !project.client_id) return
    
    const clientId = project.client_id
    const clientName = project.clients.name || 'Unknown Client'
    
    if (!clientMap[clientId]) {
      clientMap[clientId] = {
        clientId,
        clientName,
        projectCount: 0,
        totalValue: 0,
      }
    }
    
    clientMap[clientId].projectCount++
    clientMap[clientId].totalValue += project.budget || 0
  })
  
  return Object.values(clientMap)
    .sort((a: any, b: any) => b.totalValue - a.totalValue)
    .slice(0, 10) // Top 10 clients
}

function calculatePerformanceMetrics(projects: any[]) {
  const completedProjects = projects.filter(p => p.status === 'completed' && p.start_date && p.due_date)
  
  // Calculate average project duration
  const durations = completedProjects
    .map(p => {
      const start = new Date(p.start_date).getTime()
      const end = new Date(p.due_date).getTime()
      return (end - start) / (1000 * 60 * 60 * 24) // days
    })
    .filter(d => d > 0)
  
  const averageProjectDuration = durations.length > 0 
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
    : 0
  
  // Calculate on-time completion rate (simplified)
  const onTimeProjects = completedProjects.filter(p => {
    const dueDate = new Date(p.due_date).getTime()
    const completedDate = new Date(p.updated_at || p.created_at).getTime()
    return completedDate <= dueDate
  })
  
  const onTimeCompletionRate = completedProjects.length > 0 
    ? (onTimeProjects.length / completedProjects.length) * 100 
    : 0
  
  // Calculate budget accuracy
  const projectsWithBudget = projects.filter(p => (p.total_budget || p.budget) && p.expenses)
  const budgetAccuracies = projectsWithBudget.map(p => {
    const budget = p.budget || p.total_budget || 0
    const variance = Math.abs(budget - p.expenses) / budget
    return Math.max(0, 1 - variance) * 100
  })
  
  const budgetAccuracy = budgetAccuracies.length > 0 
    ? budgetAccuracies.reduce((sum, acc) => sum + acc, 0) / budgetAccuracies.length 
    : 0
  
  return {
    averageProjectDuration: Math.round(averageProjectDuration),
    onTimeCompletionRate: Math.round(onTimeCompletionRate * 100) / 100,
    budgetAccuracy: Math.round(budgetAccuracy * 100) / 100,
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}