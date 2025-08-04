/**
 * Project Compatibility Layer
 * Provides backwards compatibility for existing code while introducing new multi-project type functionality
 * This allows gradual migration without breaking existing components
 */

import type { 
  EnhancedProject, 
  CompatibleProject, 
  BaseProject 
} from './types/enhanced-project'

/**
 * Convert enhanced project to legacy format for backwards compatibility
 */
export function toLegacyProject(project: EnhancedProject): CompatibleProject {
  return {
    ...project,
    // Map total_budget back to budget for backwards compatibility
    budget: project.total_budget,
    // Keep project_type optional for existing code
    project_type: project.project_type,
    total_budget: project.total_budget
  }
}

/**
 * Convert legacy project to enhanced format
 */
export function toEnhancedProject(project: CompatibleProject): EnhancedProject {
  return {
    ...project,
    // Ensure required fields have defaults
    project_type: project.project_type || 'fixed',
    total_budget: project.total_budget || project.budget || 0,
    auto_calculate_total: project.project_type ? 
      (project.project_type !== 'fixed') : false,
    // Legacy budget field is preserved but total_budget takes precedence
    budget: project.budget
  } as EnhancedProject
}

/**
 * Convert array of enhanced projects to legacy format
 */
export function toLegacyProjects(projects: EnhancedProject[]): CompatibleProject[] {
  return projects.map(toLegacyProject)
}

/**
 * Convert array of legacy projects to enhanced format
 */
export function toEnhancedProjects(projects: CompatibleProject[]): EnhancedProject[] {
  return projects.map(toEnhancedProject)
}

/**
 * Check if a project is using the new enhanced format
 */
export function isEnhancedProject(project: any): project is EnhancedProject {
  return project && 
    typeof project.project_type === 'string' &&
    ['fixed', 'recurring', 'hourly'].includes(project.project_type) &&
    typeof project.total_budget === 'number'
}

/**
 * Safely get the budget value from any project format
 */
export function getProjectBudget(project: EnhancedProject | CompatibleProject): number {
  if (isEnhancedProject(project)) {
    return project.total_budget || 0
  }
  return project.budget || 0
}

/**
 * Safely get the project type with fallback
 */
export function getProjectType(project: EnhancedProject | CompatibleProject): 'fixed' | 'recurring' | 'hourly' {
  if (isEnhancedProject(project)) {
    return project.project_type
  }
  return project.project_type || 'fixed'
}

/**
 * Create a compatible project response that works with both old and new code
 */
export function createCompatibleResponse(projects: EnhancedProject[]) {
  return projects.map(project => ({
    ...project,
    // Ensure both budget and total_budget are available
    budget: project.total_budget,
    total_budget: project.total_budget
  }))
}

/**
 * Migrate existing project data to enhanced format
 * This is used during the transition period
 */
export function migrateProjectData(legacyProject: any): EnhancedProject {
  return {
    id: legacyProject.id,
    name: legacyProject.name,
    description: legacyProject.description,
    client_id: legacyProject.client_id,
    status: legacyProject.status || 'active',
    start_date: legacyProject.start_date,
    due_date: legacyProject.due_date,
    created_at: legacyProject.created_at,
    updated_at: legacyProject.updated_at,
    
    // Enhanced fields with safe defaults
    project_type: legacyProject.project_type || 'fixed',
    total_budget: legacyProject.total_budget || legacyProject.budget || 0,
    auto_calculate_total: false, // Conservative default for existing projects
    
    // Financial fields
    expenses: legacyProject.expenses,
    revenue: legacyProject.revenue,
    profit_margin: legacyProject.profit_margin,
    currency: legacyProject.currency,
    payment_status: legacyProject.payment_status,
    invoice_amount: legacyProject.invoice_amount,
    payment_received: legacyProject.payment_received,
    payment_pending: legacyProject.payment_pending,
    
    // Currency conversion fields
    original_currency: legacyProject.original_currency,
    conversion_rate: legacyProject.conversion_rate,
    conversion_date: legacyProject.conversion_date,
    
    // Legacy time tracking fields
    hourly_rate: legacyProject.hourly_rate,
    estimated_hours: legacyProject.estimated_hours,
    actual_hours: legacyProject.actual_hours,
    progress: legacyProject.progress,
    notes: legacyProject.notes,
    
    // New type-specific fields
    recurring_frequency: legacyProject.recurring_frequency,
    recurring_amount: legacyProject.recurring_amount,
    recurring_end_date: legacyProject.recurring_end_date,
    last_recurring_calculation: legacyProject.last_recurring_calculation,
    hourly_rate_new: legacyProject.hourly_rate_new,
    estimated_hours: legacyProject.estimated_hours || 0,
    actual_hours: legacyProject.actual_hours || 0,
    
    // Client relationship
    clients: legacyProject.clients,
    
    // Backwards compatibility
    budget: legacyProject.budget
  }
}

/**
 * Wrapper function for API calls that ensures backwards compatibility
 */
export async function compatibleFetch(
  fetchFunction: () => Promise<any>,
  options: { 
    convertToLegacy?: boolean 
    convertToEnhanced?: boolean 
  } = {}
): Promise<any> {
  try {
    const result = await fetchFunction()
    
    if (!result) return result
    
    // Handle array responses
    if (Array.isArray(result)) {
      if (options.convertToLegacy) {
        return result.map(toLegacyProject)
      }
      if (options.convertToEnhanced) {
        return result.map(toEnhancedProject)
      }
      return result
    }
    
    // Handle single project responses
    if (result.id) {
      if (options.convertToLegacy) {
        return toLegacyProject(result)
      }
      if (options.convertToEnhanced) {
        return toEnhancedProject(result)
      }
      return result
    }
    
    // Handle paginated responses
    if (result.projects && Array.isArray(result.projects)) {
      if (options.convertToLegacy) {
        return {
          ...result,
          projects: result.projects.map(toLegacyProject)
        }
      }
      if (options.convertToEnhanced) {
        return {
          ...result,
          projects: result.projects.map(toEnhancedProject)
        }
      }
    }
    
    return result
  } catch (error) {
    console.error('Error in compatible fetch:', error)
    throw error
  }
}

/**
 * Type-safe wrapper for project operations
 */
export class ProjectCompatibilityManager {
  /**
   * Safely update a project regardless of its current format
   */
  static async updateProject(
    projectId: string, 
    updates: Partial<EnhancedProject | CompatibleProject>
  ): Promise<EnhancedProject> {
    // Normalize the updates to enhanced format
    const normalizedUpdates = isEnhancedProject(updates as any) ? 
      updates as Partial<EnhancedProject> :
      {
        ...updates,
        total_budget: updates.total_budget || (updates as any).budget,
        project_type: (updates as any).project_type || 'fixed'
      }
    
    // Here you would call your actual update function
    // This is a placeholder for the actual implementation
    throw new Error('Update function not implemented - integrate with your actual API')
  }
  
  /**
   * Safely create a project with proper format conversion
   */
  static async createProject(
    projectData: Partial<EnhancedProject | CompatibleProject>
  ): Promise<EnhancedProject> {
    // Normalize to enhanced format
    const enhancedData = isEnhancedProject(projectData as any) ?
      projectData as Partial<EnhancedProject> :
      toEnhancedProject(projectData as CompatibleProject)
    
    // Here you would call your actual create function
    // This is a placeholder for the actual implementation
    throw new Error('Create function not implemented - integrate with your actual API')
  }
}