import { createClient } from '@supabase/supabase-js'
import type { FunctionCall } from './claude-provider'
import { formatCurrency } from '@/lib/currency'

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

    // Calculate revenue based on period
    const now = new Date()
    let startDate: Date
    let periodLabel: string

    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        periodLabel = 'this month'
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        periodLabel = 'last month'
        break
      case 'current-quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        periodLabel = 'this quarter'
        break
      case 'current-year':
        startDate = new Date(now.getFullYear(), 0, 1)
        periodLabel = 'this year'
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        periodLabel = 'this month'
    }

    const periodProjects = projects.filter(p => {
      const createdAt = new Date(p.created_at)
      return createdAt >= startDate
    })

    const totalRevenue = periodProjects.reduce((sum, p) => sum + (p.payment_received || 0), 0)
    const totalBudget = periodProjects.reduce((sum, p) => sum + (p.budget || p.total_budget || 0), 0)
    const completedProjects = periodProjects.filter(p => p.status === 'completed').length

    const analytics = {
      period: periodLabel,
      totalRevenue,
      totalBudget,
      projectCount: periodProjects.length,
      completedProjects,
      averageProjectValue: periodProjects.length > 0 ? totalBudget / periodProjects.length : 0,
      revenueRealization: totalBudget > 0 ? (totalRevenue / totalBudget) * 100 : 0
    }

    const formattedTotalRevenue = await this.formatUserCurrency(totalRevenue)
    const formattedTotalBudget = await this.formatUserCurrency(totalBudget)
    const formattedAvgValue = await this.formatUserCurrency(analytics.averageProjectValue)

    return {
      success: true,
      data: analytics,
      message: `📊 Revenue Analytics for ${periodLabel}:\n\n• **Total Revenue**: ${formattedTotalRevenue}\n• **Total Budget**: ${formattedTotalBudget}\n• **Projects**: ${periodProjects.length} (${completedProjects} completed)\n• **Average Project Value**: ${formattedAvgValue}\n• **Revenue Realization**: ${analytics.revenueRealization.toFixed(1)}%`
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
      acc[stage].value += project.budget || project.total_budget || 0
      acc[stage].projects.push({
        name: project.name,
        budget: project.budget || project.total_budget || 0,
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
      const totalBudget = projects.reduce((sum: number, p: any) => sum + (p.budget || p.total_budget || 0), 0)
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

    const formattedBudget = await this.formatUserCurrency(data.budget || data.total_budget || 0)

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

    const totalValue = projects.reduce((sum, p) => sum + (p.budget || p.total_budget || 0), 0)
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
}
