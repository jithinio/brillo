import { createClient } from '@supabase/supabase-js'
import type { FunctionCall } from './claude-provider'
import { formatCurrency } from '@/lib/currency'
import { getDateRangeForPeriod, filterProjectsByDateRange, getProjectRelevantDate } from '@/lib/date-filtering-utils'

export interface FunctionResult {
  success: boolean
  data?: any
  error?: string
  message: string
}

export class BusinessFunctionHandler {
  private userId: string
  private supabase: any
  private userCurrency: string = 'USD'

  constructor(userId: string, userToken: string) {
    this.userId = userId
    // Create supabase client with user's auth token
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      }
    )
  }

  private async getUserCurrency(): Promise<string> {
    try {
      // Try to get currency from company_settings table using authenticated supabase client
      const { data: settings, error } = await this.supabase
        .from('company_settings')
        .select('default_currency')
        .eq('user_id', this.userId)
        .single()

      if (error) {
        console.warn('Failed to load user currency from DB:', error.message)
        return 'USD'
      }

      return settings?.default_currency || 'USD'
    } catch (error) {
      console.warn('Error getting user currency:', error)
      return 'USD'
    }
  }

  private async formatUserCurrency(amount: number): Promise<string> {
    if (!this.userCurrency || this.userCurrency === 'USD') {
      // Load currency on first use
      this.userCurrency = await this.getUserCurrency()
    }
    return formatCurrency(amount, this.userCurrency)
  }

  async executeFunction(functionCall: FunctionCall): Promise<FunctionResult> {
    try {
      switch (functionCall.name) {
        case 'create_client':
          return await this.createClient(functionCall.arguments)
        case 'create_project':
          return await this.createProject(functionCall.arguments)
        case 'get_revenue_analytics':
          return await this.getRevenueAnalytics(functionCall.arguments)
        case 'get_pipeline_status':
          return await this.getPipelineStatus(functionCall.arguments)
        case 'get_client_analytics':
          return await this.getClientAnalytics(functionCall.arguments)
        case 'update_project_status':
          return await this.updateProjectStatus(functionCall.arguments)
        case 'generate_invoice':
          return await this.generateInvoice(functionCall.arguments)
        case 'search_projects':
          return await this.searchProjects(functionCall.arguments)
        case 'get_expense_analytics':
          return await this.getExpenseAnalytics(functionCall.arguments)
        case 'get_profit_analytics':
          return await this.getProfitAnalytics(functionCall.arguments)
        case 'get_overdue_invoices':
          return await this.getOverdueInvoices(functionCall.arguments)
        case 'get_cash_flow':
          return await this.getCashFlow(functionCall.arguments)
        case 'get_project_deadlines':
          return await this.getProjectDeadlines(functionCall.arguments)
        case 'get_payment_status':
          return await this.getPaymentStatus(functionCall.arguments)
        default:
          throw new Error(`Unknown function: ${functionCall.name}`)
      }
    } catch (error) {
      console.error(`Error executing function ${functionCall.name}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to execute ${functionCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async createClient(args: any): Promise<FunctionResult> {
    const { name, company, email, phone } = args

    console.log('Creating client with args:', args)
    console.log('User ID:', this.userId)

    // Validate required fields
    if (!name) {
      return {
        success: false,
        error: 'Client name is required',
        message: 'Please provide a client name to create a new client.'
      }
    }

    const clientData = {
      name: name.trim(),
      company: company?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: null,
      city: null,
      state: null,
      zip_code: null,
      country: 'United States',
      notes: null,
      source: null,
      status: 'active',
      client_since: new Date().toISOString(),
      relationship: 'regular',
      user_id: this.userId,
      created_at: new Date().toISOString()
    }

    console.log('Client data to insert:', clientData)

    const { data, error } = await this.supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()

    if (error) {
      console.error('Client creation error:', error)
      return {
        success: false,
        error: error.message,
        message: `❌ Failed to create client: ${error.message}`
      }
    }

    console.log('Client created successfully:', data)

    return {
      success: true,
      data,
      message: `✅ Client "${name}" has been successfully created! ${company ? `(${company})` : ''}\n\n**Details:**\n• Name: ${name}\n${company ? `• Company: ${company}\n` : ''}${email ? `• Email: ${email}\n` : ''}${phone ? `• Phone: ${phone}\n` : ''}`
    }
  }

  private async createProject(args: any): Promise<FunctionResult> {
    const { name, description, budget, clientId, clientName, startDate, dueDate } = args

    console.log('Creating project with args:', args)
    console.log('User ID:', this.userId)

    // Validate required fields
    if (!name) {
      return {
        success: false,
        error: 'Project name is required',
        message: 'Please provide a project name.'
      }
    }

    if (!budget && budget !== 0) {
      return {
        success: false,
        error: 'Project budget is required',
        message: 'Please provide a budget amount for the project.'
      }
    }

    // If client name is provided instead of ID, try to find the client
    let finalClientId = clientId
    if (!clientId && clientName) {
      console.log('Looking up client by name:', clientName)
      const { data: clients } = await this.supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', this.userId)
        .ilike('name', `%${clientName}%`)
        .limit(1)

      if (clients && clients.length > 0) {
        finalClientId = clients[0].id
        console.log('Found client:', clients[0])
      } else {
        return {
          success: false,
          error: 'Client not found',
          message: `Could not find a client matching "${clientName}". Would you like me to create this client first?`
        }
      }
    }

    const projectData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      budget: parseFloat(budget),
      total_budget: parseFloat(budget),
      user_id: this.userId,
      status: 'active',
      created_at: new Date().toISOString(),
      payment_received: 0,
      expenses: 0
    }

    if (finalClientId) {
      projectData.client_id = finalClientId
    }
    if (startDate) {
      projectData.start_date = startDate
    }
    if (dueDate) {
      projectData.due_date = dueDate
    }

    console.log('Project data to insert:', projectData)

    const { data, error } = await this.supabase
      .from('projects')
      .insert(projectData)
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .single()

    if (error) {
      console.error('Project creation error:', error)
      return {
        success: false,
        error: error.message,
        message: `❌ Failed to create project: ${error.message}`
      }
    }

    console.log('Project created successfully:', data)

    const formattedBudget = await this.formatUserCurrency(parseFloat(budget))

    return {
      success: true,
      data,
      message: `🚀 Project "${name}" has been successfully created!\n\n**Details:**\n• **Project ID**: ${data.id}\n• **Budget**: ${formattedBudget}\n• **Status**: Active\n${data.clients ? `• **Client**: ${data.clients.name}${data.clients.company ? ` (${data.clients.company})` : ''}\n` : ''}${description ? `• **Description**: ${description}\n` : ''}${startDate ? `• **Start Date**: ${new Date(startDate).toLocaleDateString()}\n` : ''}${dueDate ? `• **Due Date**: ${new Date(dueDate).toLocaleDateString()}\n` : ''}\n\n*You can now update this project's status or create tasks for it.*`
    }
  }

  private async getRevenueAnalytics(args: any): Promise<FunctionResult> {
    const { period, includeProjections } = args

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', this.userId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Get standardized date range
    const dateRange = getDateRangeForPeriod(period || 'current-month')
    
    console.log(`Filtering projects for ${dateRange.periodLabel}: ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`)



    // Get all projects in period for revenue calculation (using general context for date filtering)
    // Exclude pipeline and cancelled projects from revenue
    const periodProjects = filterProjectsByDateRange(projects, dateRange, 'general', ['pipeline', 'cancelled'])

    console.log(`Date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`)
    console.log(`Found ${periodProjects.length} projects for ${dateRange.periodLabel}:`, periodProjects.map(p => ({
      name: p.name,
      total_budget: p.total_budget || p.budget,
      payment_received: p.payment_received,
      created_at: p.created_at,
      start_date: p.start_date,
      relevantDate: getProjectRelevantDate(p, 'general')
    })))

    // Revenue = total project value (using total_budget field) for the period
    const totalRevenue = periodProjects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0)
    
    // Actual payments received
    const totalPaymentsReceived = periodProjects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
    
    // Outstanding = total_budget - received for projects in period
    const totalOutstanding = periodProjects.reduce((sum, p) => {
      const budget = p.total_budget || p.budget || 0
      const received = p.payment_received || 0
      return sum + (budget - received)
    }, 0)
    
    const completedProjects = periodProjects.filter(p => p.status === 'completed').length
    const paidProjectsCount = periodProjects.filter(p => p.payment_received > 0).length

    console.log(`Revenue calculation for ${dateRange.periodLabel}: Revenue=${totalRevenue}, PaymentsReceived=${totalPaymentsReceived}, Outstanding=${totalOutstanding}`)

    const analytics = {
      period: dateRange.periodLabel,
      totalRevenue,
      totalBudget: totalRevenue, // Revenue is now the total budget
      totalPaymentsReceived,
      totalOutstanding,
      projectCount: periodProjects.length,
      paidProjectsCount,
      completedProjects,
      averageProjectValue: periodProjects.length > 0 ? totalRevenue / periodProjects.length : 0,
      revenueRealization: totalRevenue > 0 ? (totalPaymentsReceived / totalRevenue) * 100 : 0,
      collectionRate: periodProjects.length > 0 ? (paidProjectsCount / periodProjects.length) * 100 : 0
    }

    const formattedTotalRevenue = await this.formatUserCurrency(totalRevenue)
    const formattedTotalPaymentsReceived = await this.formatUserCurrency(totalPaymentsReceived)
    const formattedTotalOutstanding = await this.formatUserCurrency(totalOutstanding)
    const formattedAvgValue = await this.formatUserCurrency(analytics.averageProjectValue)

    // If no revenue for current period, provide helpful context
    let message = formattedTotalRevenue
    if (totalRevenue === 0) {
      // Check if there are any projects at all
      const allProjects = projects.filter(p => (p.total_budget || p.budget) > 0)
      
      if (allProjects.length > 0) {
        const allTimeRevenue = allProjects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0)
        const formattedAllTimeRevenue = await this.formatUserCurrency(allTimeRevenue)
        message = `Your ${dateRange.periodLabel} revenue is ${formattedTotalRevenue}. 

Note: You have ${formattedAllTimeRevenue} in total project value across all time from ${allProjects.length} projects. No projects fall within ${dateRange.periodLabel}.`
      } else {
        message = `Your ${dateRange.periodLabel} revenue is ${formattedTotalRevenue}.

Note: No projects with budgets found. Revenue is calculated based on total project value (budget) for the period.`
      }
    }

    // Return concise data - let Claude decide how to present it based on context
    return {
      success: true,
      data: {
        ...analytics,
        formattedRevenue: formattedTotalRevenue,
        formattedBudget: formattedTotalRevenue, // Revenue is now total budget
        formattedPaymentsReceived: formattedTotalPaymentsReceived,
        formattedOutstanding: formattedTotalOutstanding,
        formattedAvgValue: formattedAvgValue
      },
      message
    }
  }

  private async getPipelineStatus(args: any): Promise<FunctionResult> {
    const { stage, includeMetrics } = args

    let query = this.supabase
      .from('projects')
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .eq('user_id', this.userId)

    if (stage && stage !== 'all') {
      query = query.eq('pipeline_stage', stage)
    }

    const { data: projects, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const pipelineData = projects.reduce((acc: any, project) => {
      const stage = project.pipeline_stage || 'unknown'
      if (!acc[stage]) {
        acc[stage] = {
          count: 0,
          value: 0,
          projects: []
        }
      }
      acc[stage].count += 1
      acc[stage].value += project.total_budget || project.budget || 0
      acc[stage].projects.push({
        name: project.name,
        budget: project.total_budget || project.budget || 0,
        client: project.clients?.name || 'No client assigned'
      })
      return acc
    }, {})

    const totalValue = Object.values(pipelineData).reduce((sum: number, stage: any) => sum + stage.value, 0)
    const totalDeals = Object.values(pipelineData).reduce((sum: number, stage: any) => sum + stage.count, 0)

    const formattedTotalValue = await this.formatUserCurrency(totalValue)

    let message = `🏢 Sales Pipeline Status:\n\n`
    message += `**Total Pipeline Value**: ${formattedTotalValue}\n`
    message += `**Total Deals**: ${totalDeals}\n\n`

    for (const [stageName, stageData] of Object.entries(pipelineData)) {
      const formattedStageValue = await this.formatUserCurrency((stageData as any).value)
      message += `**${stageName.charAt(0).toUpperCase() + stageName.slice(1)}**: ${(stageData as any).count} deals (${formattedStageValue})\n`
    }

    return {
      success: true,
      data: pipelineData,
      message
    }
  }

  private async getClientAnalytics(args: any): Promise<FunctionResult> {
    const { clientId, metricType } = args

    let query = this.supabase
      .from('clients')
      .select(`
        *,
        projects (
          id,
          name,
          budget,
          total_budget,
          payment_received,
          status,
          created_at
        )
      `)
      .eq('user_id', this.userId)

    if (clientId) {
      query = query.eq('id', clientId)
    }

    const { data: clients, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const analytics = clients.map(client => {
      const projects = client.projects || []
      const totalRevenue = projects.reduce((sum: number, p: any) => sum + (p.payment_received || 0), 0)
      const totalBudget = projects.reduce((sum: number, p: any) => sum + (p.total_budget || p.budget || 0), 0)
      const completedProjects = projects.filter((p: any) => p.status === 'completed').length

      return {
        client: client.name,
        company: client.company,
        projectCount: projects.length,
        totalRevenue,
        totalBudget,
        completedProjects,
        averageProjectValue: projects.length > 0 ? totalBudget / projects.length : 0
      }
    })

    let message = `👥 Client Analytics:\n\n`
    
    if (clientId && analytics.length === 1) {
      const client = analytics[0]
      const formattedRevenue = await this.formatUserCurrency(client.totalRevenue)
      const formattedBudget = await this.formatUserCurrency(client.totalBudget)
      const formattedAvgValue = await this.formatUserCurrency(client.averageProjectValue)
      
      message += `**${client.client}** ${client.company ? `(${client.company})` : ''}\n`
      message += `• Projects: ${client.projectCount} (${client.completedProjects} completed)\n`
      message += `• Total Revenue: ${formattedRevenue}\n`
      message += `• Total Budget: ${formattedBudget}\n`
      message += `• Average Project Value: ${formattedAvgValue}\n`
    } else {
      const sortedClients = analytics
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)
      
      for (const client of sortedClients) {
        const formattedRevenue = await this.formatUserCurrency(client.totalRevenue)
        message += `**${client.client}**: ${formattedRevenue} revenue (${client.projectCount} projects)\n`
      }
    }

    return {
      success: true,
      data: analytics,
      message
    }
  }

  private async updateProjectStatus(args: any): Promise<FunctionResult> {
    const { projectId, projectName, status, notes } = args

    console.log('Updating project status with args:', args)

    // Validate status
    const validStatuses = ['active', 'completed', 'on_hold', 'cancelled', 'pipeline']
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      }
    }

    let project
    
    // If projectId is provided, use it directly
    if (projectId) {
      const { data: foundProject, error: findError } = await this.supabase
        .from('projects')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('id', projectId)
        .eq('user_id', this.userId)
        .single()

      if (findError || !foundProject) {
        return {
          success: false,
          error: 'Project not found',
          message: `No project found with ID "${projectId}"`
        }
      }
      project = foundProject
    } 
    // If projectName is provided, search by name
    else if (projectName) {
      const { data: projects, error: searchError } = await this.supabase
        .from('projects')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('user_id', this.userId)
        .ilike('name', `%${projectName}%`)
        .limit(1)

      if (searchError || !projects || projects.length === 0) {
        return {
          success: false,
          error: 'Project not found',
          message: `No project found with name containing "${projectName}"`
        }
      }
      project = projects[0]
    } else {
      return {
        success: false,
        error: 'Missing project identifier',
        message: 'Please provide either projectId or projectName'
      }
    }

    // Update the project
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data, error } = await this.supabase
      .from('projects')
      .update(updateData)
      .eq('id', project.id)
      .eq('user_id', this.userId)
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .single()

    if (error) {
      console.error('Project update error:', error)
      return {
        success: false,
        error: error.message,
        message: `❌ Failed to update project: ${error.message}`
      }
    }

    console.log('Project updated successfully:', data)

    const statusLabels = {
      'active': 'Active',
      'completed': 'Completed',
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled',
      'pipeline': 'Pipeline'
    }

    const formattedBudget = await this.formatUserCurrency(data.total_budget || data.budget || 0)

    return {
      success: true,
      data,
      message: `✅ Project "${data.name}" status has been updated to "${statusLabels[status as keyof typeof statusLabels] || status}"!\n\n**Project Details:**\n• **Name**: ${data.name}\n• **Status**: ${statusLabels[status as keyof typeof statusLabels] || status}\n• **Budget**: ${formattedBudget}\n${data.clients ? `• **Client**: ${data.clients.name}${data.clients.company ? ` (${data.clients.company})` : ''}\n` : ''}${notes ? `• **Notes**: ${notes}\n` : ''}`
    }
  }

  private async generateInvoice(args: any): Promise<FunctionResult> {
    const { projectId, amount, dueDate, items } = args

    // First get the project details
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select(`
        *,
        clients (
          name,
          company,
          email
        )
      `)
      .eq('id', projectId)
      .eq('user_id', this.userId)
      .single()

    if (projectError) {
      throw new Error(`Project not found: ${projectError.message}`)
    }

    // Create invoice record
    const invoiceData = {
      project_id: projectId,
      client_id: project.client_id,
      amount: parseFloat(amount),
      due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'pending',
      user_id: this.userId,
      items: items || [
        {
          description: `Work on ${project.name}`,
          amount: parseFloat(amount),
          quantity: 1
        }
      ],
      created_at: new Date().toISOString()
    }

    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      throw new Error(`Invoice creation failed: ${invoiceError.message}`)
    }

    const formattedAmount = await this.formatUserCurrency(parseFloat(amount))

    return {
      success: true,
      data: invoice,
      message: `📄 Invoice has been generated for project "${project.name}"!\n\n• **Amount**: ${formattedAmount}\n• **Client**: ${project.clients?.name || 'Unknown'}\n• **Due Date**: ${new Date(dueDate || invoice.due_date).toLocaleDateString()}`
    }
  }

  private async searchProjects(args: any): Promise<FunctionResult> {
    const { query, clientName } = args

    let dbQuery = this.supabase
      .from('projects')
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .eq('user_id', this.userId)

    // If searching for a specific client
    if (clientName) {
      const { data: clients } = await this.supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', this.userId)
        .or(`name.ilike.%${clientName}%,company.ilike.%${clientName}%`)

      console.log(`Found ${clients?.length || 0} clients matching "${clientName}":`, clients?.map(c => c.name))

      if (clients && clients.length > 0) {
        const clientIds = clients.map(c => c.id)
        dbQuery = dbQuery.in('client_id', clientIds)
      } else {
        // No matching clients found, return empty result
        return {
          success: true,
          data: [],
          message: `🔍 No clients found matching "${clientName}". Please check the client name and try again.`
        }
      }
    }

    // If searching by project name
    if (query && !clientName) {
      dbQuery = dbQuery.ilike('name', `%${query}%`)
    }

    const { data: projects, error } = await dbQuery.limit(10) // Limit to 10 projects

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!projects || projects.length === 0) {
      return {
        success: true,
        data: [],
        message: `🔍 No projects found ${clientName ? `for client "${clientName}"` : query ? `matching "${query}"` : ''}.`
      }
    }

    const totalValue = projects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0)
    const totalReceived = projects.reduce((sum, p) => sum + (p.payment_received || 0), 0)

    const showingLimit = projects.length === 10 ? " (showing top 10)" : ""
    let message = `🔍 Found ${projects.length} project${projects.length === 1 ? '' : 's'}${clientName ? ` for "${clientName}"` : ''}${showingLimit}:\n\n`
    
    // Show summary first for better readability
    const formattedTotalValue = await this.formatUserCurrency(totalValue)
    const formattedTotalReceived = await this.formatUserCurrency(totalReceived)
    const formattedOutstanding = await this.formatUserCurrency(totalValue - totalReceived)
    
    message += `**📊 Summary:**\n`
    message += `• **Total Project Value**: ${formattedTotalValue}\n`
    message += `• **Total Received**: ${formattedTotalReceived}\n`
    message += `• **Outstanding**: ${formattedOutstanding}\n\n`

    message += `**📋 Project Details:**\n`
    for (let index = 0; index < projects.length; index++) {
      const project = projects[index]
      const budget = project.budget || project.total_budget || 0
      const received = project.payment_received || 0
      const outstanding = budget - received

      const formattedBudget = await this.formatUserCurrency(budget)
      const formattedReceived = received > 0 ? await this.formatUserCurrency(received) : null
      const formattedProjectOutstanding = outstanding > 0 ? await this.formatUserCurrency(outstanding) : null

      message += `${index + 1}. **${project.name}**\n`
      message += `   • Budget: ${formattedBudget}`
      if (formattedReceived) {
        message += ` | Received: ${formattedReceived}`
      }
      if (formattedProjectOutstanding) {
        message += ` | Outstanding: ${formattedProjectOutstanding}`
      }
      message += `\n   • Status: ${project.status}`
      if (project.clients) {
        message += ` | Client: ${project.clients.name}`
      }
      message += `\n\n`
    }

    return {
      success: true,
      data: projects,
      message
    }
  }

  private async getExpenseAnalytics(args: any): Promise<FunctionResult> {
    const { period, category, includeBreakdown } = args

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', this.userId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Get standardized date range
    const dateRange = getDateRangeForPeriod(period || 'current-month')
    
    // Filter projects using expense context
    const periodProjects = filterProjectsByDateRange(projects, dateRange, 'expense')

    const totalExpenses = periodProjects.reduce((sum, p) => sum + (p.expenses || 0), 0)
    const projectsWithExpenses = periodProjects.filter(p => p.expenses && p.expenses > 0)

    const formattedTotalExpenses = await this.formatUserCurrency(totalExpenses)

    let message = `💸 Expense Analytics for ${dateRange.periodLabel}:\n\n`
    message += `**Total Expenses**: ${formattedTotalExpenses}\n`
    message += `**Projects with expenses**: ${projectsWithExpenses.length} of ${periodProjects.length}\n`

    if (includeBreakdown && projectsWithExpenses.length > 0) {
      message += `\n**Top expense projects:**\n`
      const topExpenseProjects = projectsWithExpenses
        .sort((a, b) => (b.expenses || 0) - (a.expenses || 0))
        .slice(0, 5)
      
      for (const project of topExpenseProjects) {
        const expenseAmount = await this.formatUserCurrency(project.expenses || 0)
        message += `• ${project.name}: ${expenseAmount}\n`
      }
    }

    return {
      success: true,
      data: {
        period: dateRange.periodLabel,
        totalExpenses,
        projectCount: periodProjects.length,
        projectsWithExpenses: projectsWithExpenses.length,
        formattedExpenses: formattedTotalExpenses
      },
      message
    }
  }

  private async getProfitAnalytics(args: any): Promise<FunctionResult> {
    const { period, includeMargins } = args

    // Get revenue data
    const revenueResult = await this.getRevenueAnalytics({ period })
    const expenseResult = await this.getExpenseAnalytics({ period })

    if (!revenueResult.success || !expenseResult.success) {
      return {
        success: false,
        error: 'Failed to calculate profit analytics',
        message: 'Unable to retrieve revenue or expense data'
      }
    }

    const revenue = revenueResult.data.totalRevenue
    const expenses = expenseResult.data.totalExpenses
    const profit = revenue - expenses
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

    const formattedRevenue = await this.formatUserCurrency(revenue)
    const formattedExpenses = await this.formatUserCurrency(expenses)
    const formattedProfit = await this.formatUserCurrency(profit)

    let message = `📊 Profit/Loss Analysis for ${revenueResult.data.period}:\n\n`
    message += `**Revenue**: ${formattedRevenue}\n`
    message += `**Expenses**: ${formattedExpenses}\n`
    message += `**Net Profit**: ${formattedProfit} ${profit < 0 ? '(Loss)' : ''}\n`
    
    if (includeMargins) {
      message += `**Profit Margin**: ${profitMargin.toFixed(1)}%\n`
      
      if (profitMargin < 10) {
        message += `\n⚠️ Low profit margin - consider reviewing expenses or pricing`
      } else if (profitMargin > 30) {
        message += `\n✅ Excellent profit margin!`
      }
    }

    return {
      success: true,
      data: {
        period: revenueResult.data.period,
        revenue,
        expenses,
        profit,
        profitMargin,
        formattedRevenue,
        formattedExpenses,
        formattedProfit
      },
      message
    }
  }

  private async getOverdueInvoices(args: any): Promise<FunctionResult> {
    const { includePending, clientId, sortBy = 'age' } = args

    let query = this.supabase
      .from('invoices')
      .select(`
        *,
        projects (
          name,
          client_id
        ),
        clients (
          name,
          company,
          email
        )
      `)
      .eq('user_id', this.userId)

    if (!includePending) {
      query = query.in('status', ['overdue', 'unpaid'])
    } else {
      query = query.in('status', ['pending', 'overdue', 'unpaid'])
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: invoices, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const now = new Date()
    const overdueInvoices = invoices.filter(invoice => {
      const dueDate = new Date(invoice.due_date)
      return dueDate < now && invoice.status !== 'paid'
    }).map(invoice => {
      const daysOverdue = Math.floor((now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      return { ...invoice, daysOverdue }
    })

    // Sort based on preference
    if (sortBy === 'age') {
      overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue)
    } else if (sortBy === 'amount') {
      overdueInvoices.sort((a, b) => b.amount - a.amount)
    }

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const formattedTotalOverdue = await this.formatUserCurrency(totalOverdue)

    let message = `⚠️ Overdue Invoices Summary:\n\n`
    message += `**Total Overdue**: ${formattedTotalOverdue}\n`
    message += `**Count**: ${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? 's' : ''}\n\n`

    if (overdueInvoices.length > 0) {
      message += `**Details:**\n`
      for (let i = 0; i < Math.min(overdueInvoices.length, 10); i++) {
        const invoice = overdueInvoices[i]
        const formattedAmount = await this.formatUserCurrency(invoice.amount)
        message += `${i + 1}. Invoice #${invoice.id.slice(-6)}\n`
        message += `   • Client: ${invoice.clients?.name || 'Unknown'}\n`
        message += `   • Amount: ${formattedAmount}\n`
        message += `   • Days overdue: ${invoice.daysOverdue}\n`
        if (invoice.projects?.name) {
          message += `   • Project: ${invoice.projects.name}\n`
        }
        message += `\n`
      }

      if (overdueInvoices.length > 10) {
        message += `... and ${overdueInvoices.length - 10} more\n`
      }

      message += `\n💡 Would you like me to draft follow-up emails for these clients?`
    } else {
      message = `✅ Great news! You have no overdue invoices.`
    }

    return {
      success: true,
      data: {
        overdueInvoices,
        totalOverdue,
        count: overdueInvoices.length,
        formattedTotalOverdue
      },
      message
    }
  }

  private async getCashFlow(args: any): Promise<FunctionResult> {
    const { period, includeProjections } = args

    // Get standardized date range
    const dateRange = getDateRangeForPeriod(period || 'current-month')

    // Get projects and invoices
    const [projectsRes, invoicesRes] = await Promise.all([
      this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.userId),
      this.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', this.userId)
    ])

    if (projectsRes.error || invoicesRes.error) {
      throw new Error('Database error retrieving cash flow data')
    }

    const projects = projectsRes.data || []
    const invoices = invoicesRes.data || []

    // Calculate incoming cash (paid invoices)
    const incomingCash = invoices.filter(inv => {
      const paymentDate = inv.payment_date ? new Date(inv.payment_date) : null
      return paymentDate && paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate && inv.status === 'paid'
    }).reduce((sum, inv) => sum + inv.amount, 0)

    // Calculate outgoing cash (expenses) using standardized filtering
    const expenseProjects = filterProjectsByDateRange(projects, dateRange, 'expense')
    const outgoingCash = expenseProjects.reduce((sum, p) => sum + (p.expenses || 0), 0)

    const netCashFlow = incomingCash - outgoingCash

    const formattedIncoming = await this.formatUserCurrency(incomingCash)
    const formattedOutgoing = await this.formatUserCurrency(outgoingCash)
    const formattedNet = await this.formatUserCurrency(netCashFlow)

    let message = `💰 Cash Flow Analysis for ${dateRange.periodLabel}:\n\n`
    message += `**Incoming**: ${formattedIncoming}\n`
    message += `**Outgoing**: ${formattedOutgoing}\n`
    message += `**Net Cash Flow**: ${formattedNet} ${netCashFlow < 0 ? '⚠️' : '✅'}\n`

    if (includeProjections && (period === 'next-month' || period === 'next-quarter')) {
      // Calculate expected income from pending invoices
      const expectedIncome = invoices.filter(inv => {
        const dueDate = new Date(inv.due_date)
        return dueDate >= dateRange.startDate && dueDate <= dateRange.endDate && inv.status !== 'paid'
      }).reduce((sum, inv) => sum + inv.amount, 0)

      const formattedExpected = await this.formatUserCurrency(expectedIncome)
      message += `\n**📈 Projections:**\n`
      message += `• Expected income: ${formattedExpected}\n`
      message += `• Projected net: ${await this.formatUserCurrency(expectedIncome - outgoingCash)}\n`
    }

    return {
      success: true,
      data: {
        period: dateRange.periodLabel,
        incomingCash,
        outgoingCash,
        netCashFlow,
        formattedIncoming,
        formattedOutgoing,
        formattedNet
      },
      message
    }
  }

  private async getProjectDeadlines(args: any): Promise<FunctionResult> {
    const { daysAhead = 30, includeOverdue = true, status = 'active' } = args

    let query = this.supabase
      .from('projects')
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .eq('user_id', this.userId)

    if (status === 'active') {
      query = query.eq('status', 'active')
    }

    const { data: projects, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const now = new Date()
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    // Filter projects with due dates
    const projectsWithDeadlines = projects.filter(p => p.due_date)
    
    // Categorize projects
    const overdueProjects = includeOverdue ? projectsWithDeadlines.filter(p => {
      const dueDate = new Date(p.due_date)
      return dueDate < now && p.status !== 'completed'
    }) : []

    const upcomingProjects = projectsWithDeadlines.filter(p => {
      const dueDate = new Date(p.due_date)
      return dueDate >= now && dueDate <= futureDate
    })

    // Sort by due date
    overdueProjects.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    upcomingProjects.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

    let message = `📅 Project Deadlines:\n\n`

    if (overdueProjects.length > 0) {
      message += `⚠️ **Overdue Projects** (${overdueProjects.length}):\n`
      for (const project of overdueProjects.slice(0, 5)) {
        const daysOverdue = Math.floor((now.getTime() - new Date(project.due_date).getTime()) / (1000 * 60 * 60 * 24))
        const budget = await this.formatUserCurrency(project.total_budget || project.budget || 0)
        message += `• ${project.name} - ${daysOverdue} days overdue\n`
        message += `  Client: ${project.clients?.name || 'No client'} | Budget: ${budget}\n\n`
      }
      if (overdueProjects.length > 5) {
        message += `... and ${overdueProjects.length - 5} more overdue\n`
      }
      message += `\n`
    }

    if (upcomingProjects.length > 0) {
      message += `📆 **Upcoming Deadlines** (next ${daysAhead} days):\n`
      for (const project of upcomingProjects.slice(0, 5)) {
        const daysUntilDue = Math.floor((new Date(project.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const budget = await this.formatUserCurrency(project.total_budget || project.budget || 0)
        message += `• ${project.name} - Due in ${daysUntilDue} days (${new Date(project.due_date).toLocaleDateString()})\n`
        message += `  Client: ${project.clients?.name || 'No client'} | Budget: ${budget}\n\n`
      }
      if (upcomingProjects.length > 5) {
        message += `... and ${upcomingProjects.length - 5} more upcoming\n`
      }
    }

    if (overdueProjects.length === 0 && upcomingProjects.length === 0) {
      message = `✅ No project deadlines in the next ${daysAhead} days!`
    }

    return {
      success: true,
      data: {
        overdueProjects,
        upcomingProjects,
        totalOverdue: overdueProjects.length,
        totalUpcoming: upcomingProjects.length
      },
      message
    }
  }

  private async getPaymentStatus(args: any): Promise<FunctionResult> {
    const { period, groupBy = 'status' } = args

    let query = this.supabase
      .from('projects')
      .select(`
        *,
        clients (
          name,
          company
        )
      `)
      .eq('user_id', this.userId)

    const { data: projects, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Filter by period if not all-time
    let filteredProjects = projects
    if (period !== 'all-time') {
      const dateRange = getDateRangeForPeriod(period || 'current-month')
      filteredProjects = filterProjectsByDateRange(projects, dateRange, 'general')
    }

    // Calculate payment metrics
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.total_budget || p.budget || 0), 0)
    const totalReceived = filteredProjects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
    const totalPending = filteredProjects.reduce((sum, p) => sum + (p.payment_pending || 0), 0)
    const totalOutstanding = totalBudget - totalReceived

    const paidInFull = filteredProjects.filter(p => {
      const budget = p.total_budget || p.budget || 0
      return budget > 0 && p.payment_received >= budget
    }).length

    const partiallyPaid = filteredProjects.filter(p => {
      const budget = p.total_budget || p.budget || 0
      return p.payment_received > 0 && p.payment_received < budget
    }).length

    const unpaid = filteredProjects.filter(p => {
      const budget = p.total_budget || p.budget || 0
      return budget > 0 && (!p.payment_received || p.payment_received === 0)
    }).length

    const formattedTotalBudget = await this.formatUserCurrency(totalBudget)
    const formattedTotalReceived = await this.formatUserCurrency(totalReceived)
    const formattedTotalOutstanding = await this.formatUserCurrency(totalOutstanding)

    const collectionRate = totalBudget > 0 ? (totalReceived / totalBudget) * 100 : 0

    let message = `💳 Payment Status Summary (${period}):\n\n`
    message += `**Total Contract Value**: ${formattedTotalBudget}\n`
    message += `**Total Received**: ${formattedTotalReceived}\n`
    message += `**Outstanding**: ${formattedTotalOutstanding}\n`
    message += `**Collection Rate**: ${collectionRate.toFixed(1)}%\n\n`

    message += `**Payment Breakdown**:\n`
    message += `✅ Paid in full: ${paidInFull} projects\n`
    message += `⏳ Partially paid: ${partiallyPaid} projects\n`
    message += `❌ Unpaid: ${unpaid} projects\n`

    if (groupBy === 'client' && totalOutstanding > 0) {
      // Group outstanding by client
      const clientOutstanding = new Map<string, { name: string; amount: number; count: number }>()
      
      filteredProjects.forEach(p => {
        const outstanding = (p.total_budget || p.budget || 0) - (p.payment_received || 0)
        if (outstanding > 0 && p.clients) {
          const clientKey = p.client_id
          if (!clientOutstanding.has(clientKey)) {
            clientOutstanding.set(clientKey, {
              name: p.clients.name,
              amount: 0,
              count: 0
            })
          }
          const client = clientOutstanding.get(clientKey)!
          client.amount += outstanding
          client.count += 1
        }
      })

      if (clientOutstanding.size > 0) {
        message += `\n**Top Clients with Outstanding Payments**:\n`
        const sortedClients = Array.from(clientOutstanding.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)

        for (const client of sortedClients) {
          const formattedAmount = await this.formatUserCurrency(client.amount)
          message += `• ${client.name}: ${formattedAmount} (${client.count} project${client.count !== 1 ? 's' : ''})\n`
        }
      }
    }

    return {
      success: true,
      data: {
        period,
        totalBudget,
        totalReceived,
        totalOutstanding,
        collectionRate,
        paidInFull,
        partiallyPaid,
        unpaid,
        formattedTotalBudget,
        formattedTotalReceived,
        formattedTotalOutstanding
      },
      message
    }
  }
}
