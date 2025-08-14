import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, differenceInDays, differenceInMonths } from "date-fns"

// Types for analytics data
export interface Project {
  id: string
  name: string
  project_type?: 'fixed' | 'recurring' | 'hourly'
  budget?: number
  total_budget?: number
  revenue?: number
  expenses?: number
  payment_received?: number
  payment_pending?: number
  start_date?: string
  due_date?: string
  created_at: string
  status: string
  pipeline_stage?: string
  client_id?: string
  clients?: {
    id: string
    name: string
    company?: string
    created_at?: string
  }
}

export interface Client {
  id: string
  name: string
  company?: string
  created_at: string
  projects?: Project[]
}

export interface AnalyticsResult {
  current: number
  previous: number
  trend: 'up' | 'down'
  percentage: number
}

export interface ChartDataPoint {
  period: string
  value: number
  label?: string
}

export interface CashFlowData {
  period: string
  incoming: number
  outgoing: number
  net: number
}

export interface TopClient {
  id: string
  name: string
  company?: string
  totalValue: number
  projectCount: number
  avgProjectValue: number
  trend: 'up' | 'down'
  trendPercentage: number
}

// Utility functions
const getProjectValue = (project: Project): number => {
  if (project.status === 'on hold' || project.status === 'cancelled') {
    return project.payment_received || 0
  }
  return project.total_budget || project.budget || project.revenue || 0
}

const getProjectExpenses = (project: Project): number => {
  return project.expenses || 0
}

// Utility function to check if a project should be included in analytics
const isValidForAnalytics = (project: Project): boolean => {
  const isPipeline = project.status === 'pipeline'
  const isLost = (project as any).pipeline_stage === 'lost'
  return !isPipeline && !isLost
}

const filterProjectsByDateRange = (projects: Project[], startDate: Date, endDate: Date): Project[] => {
  const filtered = projects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    const isInDateRange = projectDate >= startDate && projectDate <= endDate
    const isValidForMetrics = isValidForAnalytics(project)
    
    // Debug logging for filtering
    if (!isValidForMetrics) {
      console.log('🚫 Analytics: Filtering out project (PIPELINE EXCLUSION)', {
        name: project.name,
        status: project.status,
        pipeline_stage: (project as any).pipeline_stage,
        reason: project.status === 'pipeline' ? 'EXCLUDED: pipeline status' : 'EXCLUDED: lost pipeline stage'
      })
    }
    
    if (!isInDateRange) {
      console.log('📅 Analytics: Project outside date range', {
        name: project.name,
        projectDate: projectDate.toISOString(),
        rangeStart: startDate.toISOString(),
        rangeEnd: endDate.toISOString()
      })
    }
    
    return isInDateRange && isValidForMetrics
  })
  
  console.log('🔍 Analytics: Date range filtering results', {
    totalProjects: projects.length,
    filteredProjects: filtered.length,
    dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
    filteredProjectNames: filtered.map(p => p.name)
  })
  
  return filtered
}

// Helper function to diagnose filtering issues
export const diagnoseProjectFiltering = (projects: Project[]): void => {
  const pipelineProjects = projects.filter(p => p.status === 'pipeline')
  const lostProjects = projects.filter(p => (p as any).pipeline_stage === 'lost')
  const validProjects = projects.filter(isValidForAnalytics)
  
  console.log('🔍 Analytics: Project filtering diagnosis', {
    totalProjects: projects.length,
    pipelineProjects: pipelineProjects.length,
    lostProjects: lostProjects.length,
    validProjectsForAnalytics: validProjects.length,
    statusBreakdown: projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    pipelineStageBreakdown: projects.reduce((acc, p) => {
      const stage = (p as any).pipeline_stage || 'none'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    projectsWithBudgets: validProjects.filter(p => (p.budget || 0) > 0 || (p.total_budget || 0) > 0).length,
    averageBudget: validProjects.length > 0 
      ? validProjects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0) / validProjects.length 
      : 0,
    exclusionSummary: {
      excludedPipeline: pipelineProjects.map(p => ({ name: p.name, status: p.status })),
      excludedLost: lostProjects.map(p => ({ name: p.name, pipeline_stage: (p as any).pipeline_stage }))
    }
  })
}

const calculateTrendData = (current: number, previous: number): AnalyticsResult => {
  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const trend = current >= previous ? 'up' : 'down'

  return {
    current,
    previous,
    trend,
    percentage: Math.abs(percentage)
  }
}

// Main calculation functions
export const calculateOverallRevenue = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const now = new Date()
  const currentStart = dateRange?.start || startOfYear(now)
  const currentEnd = dateRange?.end || now
  const previousStart = startOfYear(subYears(currentStart, 1))
  const previousEnd = subYears(currentEnd, 1)

  console.log('💰 Analytics: Calculating Overall Revenue', {
    totalProjects: projects.length,
    dateRange: dateRange ? `${currentStart.toISOString()} to ${currentEnd.toISOString()}` : 'Year to date',
    hasProjects: projects.length > 0
  })

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  console.log('💰 Analytics: Revenue calculation details', {
    currentProjectsCount: currentProjects.length,
    previousProjectsCount: previousProjects.length,
    currentProjectsWithValues: currentProjects.filter(p => getProjectValue(p) > 0).length,
    currentProjectValues: currentProjects.map(p => ({
      name: p.name,
      value: getProjectValue(p),
      budget: p.budget,
      total_budget: p.total_budget,
      status: p.status
    }))
  })

  const current = currentProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
  const previous = previousProjects.reduce((sum, project) => sum + getProjectValue(project), 0)

  // If no filtered projects but we have projects, try a fallback approach
  if (current === 0 && projects.length > 0) {
    console.log('💰 Analytics: No filtered projects found, trying fallback approach')
    
    // Fallback: Include all valid NON-PIPELINE projects regardless of date if no projects in date range
    const allValidProjects = projects.filter(isValidForAnalytics)
    
    console.log('💰 Analytics: Fallback filtering details', {
      totalProjects: projects.length,
      pipelineProjects: projects.filter(p => p.status === 'pipeline').length,
      lostProjects: projects.filter(p => (p as any).pipeline_stage === 'lost').length,
      validNonPipelineProjects: allValidProjects.length
    })
    
    if (allValidProjects.length > 0) {
      const fallbackCurrent = allValidProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
      console.log('💰 Analytics: Fallback revenue calculation (EXCLUDING PIPELINE)', {
        fallbackProjectsCount: allValidProjects.length,
        fallbackRevenue: fallbackCurrent,
        pipelineProjectsExcluded: projects.filter(p => p.status === 'pipeline').length
      })
      
      // Use fallback value but keep previous as 0 to show no trend data
      return calculateTrendData(fallbackCurrent, 0)
    }
  }

  console.log('💰 Analytics: Revenue result', { current, previous })

  return calculateTrendData(current, previous)
}

export const calculateOverallExpenses = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const now = new Date()
  const currentStart = dateRange?.start || startOfYear(now)
  const currentEnd = dateRange?.end || now
  const previousStart = startOfYear(subYears(currentStart, 1))
  const previousEnd = subYears(currentEnd, 1)

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  const current = currentProjects.reduce((sum, project) => sum + getProjectExpenses(project), 0)
  const previous = previousProjects.reduce((sum, project) => sum + getProjectExpenses(project), 0)

  return calculateTrendData(current, previous)
}

export const calculateTotalProjects = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const now = new Date()
  const currentStart = dateRange?.start || startOfYear(now)
  const currentEnd = dateRange?.end || now
  const previousStart = startOfYear(subYears(currentStart, 1))
  const previousEnd = subYears(currentEnd, 1)

  console.log('📊 Analytics: Calculating Total Projects', {
    totalProjects: projects.length,
    dateRange: dateRange ? `${currentStart.toISOString()} to ${currentEnd.toISOString()}` : 'Year to date'
  })

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  let current = currentProjects.length
  const previous = previousProjects.length

  // If no filtered projects but we have projects, try fallback approach
  if (current === 0 && projects.length > 0) {
    console.log('📊 Analytics: No filtered projects found, using fallback count')
    
    // Fallback: Count all valid NON-PIPELINE projects regardless of date
    const allValidProjects = projects.filter(isValidForAnalytics)
    
    current = allValidProjects.length
    console.log('📊 Analytics: Fallback total projects (EXCLUDING PIPELINE)', { 
      fallbackCount: current,
      pipelineProjectsExcluded: projects.filter(p => p.status === 'pipeline').length,
      totalProjectsBeforeFilter: projects.length
    })
  }

  console.log('📊 Analytics: Total Projects result', { current, previous })

  return calculateTrendData(current, previous)
}

export const calculateMRR = (projects: Project[], period: string = 'current-month'): AnalyticsResult => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'current-month':
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
      break
    case 'last-month':
      currentStart = startOfMonth(subMonths(now, 1))
      currentEnd = endOfMonth(subMonths(now, 1))
      previousStart = startOfMonth(subMonths(now, 2))
      previousEnd = endOfMonth(subMonths(now, 2))
      break
    case '3-months':
      currentStart = startOfMonth(subMonths(now, 2))
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 5))
      previousEnd = endOfMonth(subMonths(now, 3))
      break
    default:
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
  }

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  const current = currentProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
  const previous = previousProjects.reduce((sum, project) => sum + getProjectValue(project), 0)

  return calculateTrendData(current, previous)
}

export const calculateARR = (projects: Project[], period: string = 'current-year'): AnalyticsResult => {
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date

  switch (period) {
    case 'current-year':
      currentStart = startOfYear(now)
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = endOfYear(subYears(now, 1))
      break
    case 'last-year':
      currentStart = startOfYear(subYears(now, 1))
      currentEnd = endOfYear(subYears(now, 1))
      previousStart = startOfYear(subYears(now, 2))
      previousEnd = endOfYear(subYears(now, 2))
      break
    default:
      currentStart = startOfYear(now)
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 1))
      previousEnd = endOfYear(subYears(now, 1))
  }

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  const current = currentProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
  const previous = previousProjects.reduce((sum, project) => sum + getProjectValue(project), 0)

  return calculateTrendData(current, previous)
}

export const calculateYoYGrowth = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const revenueData = calculateOverallRevenue(projects, dateRange)
  return revenueData
}

export const calculateTopPayingClients = (projects: Project[], limit: number = 5): TopClient[] => {
  const clientMap = new Map<string, TopClient>()
  
  // Filter out pipeline and lost projects for client metrics
  const validProjects = projects.filter(isValidForAnalytics)
  
  // Group projects by client
  validProjects.forEach(project => {
    if (!project.clients || !project.client_id) return
    
    const clientId = project.client_id
    const clientName = project.clients.name
    const clientCompany = project.clients.company
    const projectValue = getProjectValue(project)
    
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        id: clientId,
        name: clientName,
        company: clientCompany,
        totalValue: 0,
        projectCount: 0,
        avgProjectValue: 0,
        trend: 'up',
        trendPercentage: 0
      })
    }
    
    const client = clientMap.get(clientId)!
    client.totalValue += projectValue
    client.projectCount += 1
  })
  
  // Calculate averages and trends
  const clients = Array.from(clientMap.values()).map(client => {
    client.avgProjectValue = client.totalValue / client.projectCount
    
    // Calculate trend using quarterly comparison for more accuracy
    const clientProjects = validProjects.filter(p => p.client_id === client.id)
    const now = new Date()
    
    // Get last two quarters of data
    const currentQuarterStart = startOfQuarter(now)
    const currentQuarterEnd = endOfQuarter(now)
    const previousQuarterStart = startOfQuarter(subQuarters(now, 1))
    const previousQuarterEnd = endOfQuarter(subQuarters(now, 1))
    
    const currentQuarterProjects = clientProjects.filter(p => {
      const projectDate = new Date(p.created_at)
      return projectDate >= currentQuarterStart && projectDate <= currentQuarterEnd
    })
    
    const previousQuarterProjects = clientProjects.filter(p => {
      const projectDate = new Date(p.created_at)
      return projectDate >= previousQuarterStart && projectDate <= previousQuarterEnd
    })
    
    const currentValue = currentQuarterProjects.reduce((sum, p) => sum + getProjectValue(p), 0)
    const previousValue = previousQuarterProjects.reduce((sum, p) => sum + getProjectValue(p), 0)
    
    // Calculate trend based on quarterly performance
    if (previousValue > 0) {
      const trendPercentage = ((currentValue - previousValue) / previousValue) * 100
      client.trend = trendPercentage >= 0 ? 'up' : 'down'
      client.trendPercentage = Math.abs(trendPercentage)
    } else if (currentValue > 0) {
      // New client or first quarter activity
      client.trend = 'up'
      client.trendPercentage = 100
    } else {
      // No recent activity
      client.trend = 'down'
      client.trendPercentage = 0
    }
    
    return client
  })
  
  return clients
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit)
}

export const calculateCLTV = (projects: Project[], clients: Client[]): AnalyticsResult => {
  // Filter out pipeline and lost projects for CLTV calculation
  const validProjects = projects.filter(isValidForAnalytics)
  
  // Calculate current CLTV
  const clientsWithProjects = clients.filter(client => 
    validProjects.some(p => p.client_id === client.id)
  )
  
  if (clientsWithProjects.length === 0) {
    return calculateTrendData(0, 0)
  }
  
  // Calculate total revenue and total number of clients
  const totalRevenue = validProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
  const totalClients = clientsWithProjects.length
  
  // Simple CLTV = Average Revenue per Client
  const currentCLTV = totalRevenue / totalClients
  
  // Calculate previous period CLTV (last year)
  const now = new Date()
  const lastYearStart = startOfYear(subYears(now, 1))
  const lastYearEnd = endOfYear(subYears(now, 1))
  
  const previousProjects = validProjects.filter(project => {
    const projectDate = new Date(project.start_date || project.created_at)
    return projectDate >= lastYearStart && projectDate <= lastYearEnd
  })
  
  const previousClientsWithProjects = clients.filter(client => 
    previousProjects.some(p => p.client_id === client.id)
  )
  
  let previousCLTV = 0
  if (previousClientsWithProjects.length > 0) {
    const previousTotalRevenue = previousProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
    previousCLTV = previousTotalRevenue / previousClientsWithProjects.length
  }
  
  return calculateTrendData(currentCLTV, previousCLTV)
}

export const generateRevenueBarChartData = (projects: Project[], period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): ChartDataPoint[] => {
  const now = new Date()
  const currentYear = now.getFullYear()
  
  if (period === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1)
      const monthEnd = new Date(currentYear, index + 1, 0)
      
      const monthProjects = filterProjectsByDateRange(projects, monthStart, monthEnd)
      const value = monthProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
      
      return {
        period: month,
        value,
        label: format(monthStart, 'MMM yyyy')
      }
    })
  }
  
  if (period === 'quarterly') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    
    return quarters.map((quarter, index) => {
      const quarterStart = startOfQuarter(new Date(currentYear, index * 3, 1))
      const quarterEnd = endOfQuarter(new Date(currentYear, index * 3, 1))
      
      const quarterProjects = filterProjectsByDateRange(projects, quarterStart, quarterEnd)
      const value = quarterProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
      
      return {
        period: quarter,
        value,
        label: `${quarter} ${currentYear}`
      }
    })
  }
  
  // Yearly
  const years = [currentYear - 2, currentYear - 1, currentYear]
  
  return years.map(year => {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    
    const yearProjects = filterProjectsByDateRange(projects, yearStart, yearEnd)
    const value = yearProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
    
    return {
      period: year.toString(),
      value,
      label: year.toString()
    }
  })
}

export const calculateCashFlow = (projects: Project[], period: 'monthly' | 'quarterly' = 'monthly'): CashFlowData[] => {
  const now = new Date()
  const currentYear = now.getFullYear()
  
  if (period === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1)
      const monthEnd = new Date(currentYear, index + 1, 0)
      
      const monthProjects = filterProjectsByDateRange(projects, monthStart, monthEnd)
      
      const incoming = monthProjects.reduce((sum, project) => sum + (project.payment_received || 0), 0)
      const outgoing = monthProjects.reduce((sum, project) => sum + getProjectExpenses(project), 0)
      const net = incoming - outgoing
      
      return {
        period: month,
        incoming,
        outgoing,
        net
      }
    })
  }
  
  // Quarterly
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  
  return quarters.map((quarter, index) => {
    const quarterStart = startOfQuarter(new Date(currentYear, index * 3, 1))
    const quarterEnd = endOfQuarter(new Date(currentYear, index * 3, 1))
    
    const quarterProjects = filterProjectsByDateRange(projects, quarterStart, quarterEnd)
    
    const incoming = quarterProjects.reduce((sum, project) => sum + (project.payment_received || 0), 0)
    const outgoing = quarterProjects.reduce((sum, project) => sum + getProjectExpenses(project), 0)
    const net = incoming - outgoing
    
    return {
      period: quarter,
      incoming,
      outgoing,
      net
    }
  })
}

export const calculateNetProfit = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const revenue = calculateOverallRevenue(projects, dateRange)
  const expenses = calculateOverallExpenses(projects, dateRange)
  
  const current = revenue.current - expenses.current
  const previous = revenue.previous - expenses.previous
  
  return calculateTrendData(current, previous)
}

export const calculateTotalPending = (projects: Project[], dateRange?: { start: Date; end: Date }): AnalyticsResult => {
  const now = new Date()
  const currentStart = dateRange?.start || startOfYear(now)
  const currentEnd = dateRange?.end || now
  const previousStart = startOfYear(subYears(currentStart, 1))
  const previousEnd = subYears(currentEnd, 1)

  console.log('⏳ Analytics: Calculating Total Pending', {
    totalProjects: projects.length,
    dateRange: dateRange ? `${currentStart.toISOString()} to ${currentEnd.toISOString()}` : 'Year to date'
  })

  const currentProjects = filterProjectsByDateRange(projects, currentStart, currentEnd)
  const previousProjects = filterProjectsByDateRange(projects, previousStart, previousEnd)

  // Filter for only active and due projects
  const currentActiveDueProjects = currentProjects.filter(project => 
    project.status === 'active' || project.status === 'due'
  )
  const previousActiveDueProjects = previousProjects.filter(project => 
    project.status === 'active' || project.status === 'due'
  )

  console.log('⏳ Analytics: Pending calculation details', {
    currentActiveDueCount: currentActiveDueProjects.length,
    previousActiveDueCount: previousActiveDueProjects.length,
    currentActiveDueProjects: currentActiveDueProjects.map(p => ({
      name: p.name,
      status: p.status,
      budget: p.total_budget || p.budget || 0,
      received: p.payment_received || 0,
      pending: Math.max(0, (p.total_budget || p.budget || 0) - (p.payment_received || 0))
    }))
  })

  // Calculate pending amounts: total budget - payment received (only for active + due projects)
  let current = currentActiveDueProjects.reduce((sum, project) => {
    const budget = project.total_budget || project.budget || 0
    const received = project.payment_received || 0
    const pending = Math.max(0, budget - received) // Ensure it's not negative
    return sum + pending
  }, 0)

  const previous = previousActiveDueProjects.reduce((sum, project) => {
    const budget = project.total_budget || project.budget || 0
    const received = project.payment_received || 0
    const pending = Math.max(0, budget - received) // Ensure it's not negative
    return sum + pending
  }, 0)

  // If no pending amount but we have projects, try fallback approach
  if (current === 0 && projects.length > 0) {
    console.log('⏳ Analytics: No filtered pending projects found, using fallback')
    
    // Fallback: Include all active/due projects regardless of date (pipeline already excluded by status check)
    const allActiveDueProjects = projects.filter(project => 
      (project.status === 'active' || project.status === 'due') &&
      (project as any).pipeline_stage !== 'lost'
    )
    
    current = allActiveDueProjects.reduce((sum, project) => {
      const budget = project.total_budget || project.budget || 0
      const received = project.payment_received || 0
      const pending = Math.max(0, budget - received)
      return sum + pending
    }, 0)
    
    console.log('⏳ Analytics: Fallback pending calculation (EXCLUDING PIPELINE)', { 
      fallbackProjectsCount: allActiveDueProjects.length,
      fallbackPending: current,
      pipelineProjectsExcluded: projects.filter(p => p.status === 'pipeline').length,
      activeDueBeforeFilter: projects.filter(p => p.status === 'active' || p.status === 'due').length
    })
  }

  console.log('⏳ Analytics: Total Pending result', { current, previous })

  return calculateTrendData(current, previous)
}

// Generate sparkline data for MRR based on period
export const generateMRRSparklineData = (projects: Project[], period: string = 'current-month'): Array<{ value: number; label: string }> => {
  const sparklineData: Array<{ value: number; label: string }> = []
  
  // Determine the number of periods and granularity based on the period
  let periodsToShow = 6
  let getDateRangeFunction: (date: Date) => { start: Date; end: Date }
  let subtractFunction: (date: Date, amount: number) => Date
  let formatFunction: (date: Date) => string
  
  switch (period) {
    case 'last-month':
    case 'current-month':
      getDateRangeFunction = (date) => ({ start: startOfMonth(date), end: endOfMonth(date) })
      subtractFunction = subMonths
      formatFunction = (date) => format(date, 'MMM')
      break
    case '3-months':
      periodsToShow = 12 // Show more months for 3-month view
      getDateRangeFunction = (date) => ({ start: startOfMonth(date), end: endOfMonth(date) })
      subtractFunction = subMonths
      formatFunction = (date) => format(date, 'MMM')
      break
    default:
      getDateRangeFunction = (date) => ({ start: startOfMonth(date), end: endOfMonth(date) })
      subtractFunction = subMonths
      formatFunction = (date) => format(date, 'MMM')
  }
  
  // Generate data points
  for (let i = periodsToShow - 1; i >= 0; i--) {
    const periodDate = subtractFunction(new Date(), i)
    const { start, end } = getDateRangeFunction(periodDate)
    
    const periodProjects = filterProjectsByDateRange(projects, start, end)
    const periodRevenue = periodProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
    
    sparklineData.push({
      value: periodRevenue,
      label: formatFunction(periodDate)
    })
  }
  
  return sparklineData
}

// Generate sparkline data for ARR based on period
export const generateARRSparklineData = (projects: Project[], period: string = 'current-year'): Array<{ value: number; label: string }> => {
  const sparklineData: Array<{ value: number; label: string }> = []
  
  // Determine the number of periods and granularity based on the period
  let periodsToShow = 6
  let getDateRangeFunction: (date: Date) => { start: Date; end: Date }
  let subtractFunction: (date: Date, amount: number) => Date
  let formatFunction: (date: Date) => string
  let multiplier = 1
  
  switch (period) {
    case 'current-year':
    case 'last-year':
      getDateRangeFunction = (date) => ({ start: startOfQuarter(date), end: endOfQuarter(date) })
      subtractFunction = subQuarters
      formatFunction = (date) => `Q${Math.floor((date.getMonth() / 3) + 1)}`
      multiplier = 4 // Annualize quarterly revenue
      break
    default:
      getDateRangeFunction = (date) => ({ start: startOfQuarter(date), end: endOfQuarter(date) })
      subtractFunction = subQuarters
      formatFunction = (date) => `Q${Math.floor((date.getMonth() / 3) + 1)}`
      multiplier = 4
  }
  
  // Generate data points
  for (let i = periodsToShow - 1; i >= 0; i--) {
    const periodDate = subtractFunction(new Date(), i)
    const { start, end } = getDateRangeFunction(periodDate)
    
    const periodProjects = filterProjectsByDateRange(projects, start, end)
    const periodRevenue = periodProjects.reduce((sum, project) => sum + getProjectValue(project), 0)
    const calculatedValue = periodRevenue * multiplier
    
    sparklineData.push({
      value: calculatedValue,
      label: formatFunction(periodDate)
    })
  }
  
  return sparklineData
} 