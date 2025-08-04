/**
 * Enhanced Project Types for Multi-Project Type System
 * This file extends the existing project types to support Fixed, Recurring, and Hourly projects
 * while maintaining full backwards compatibility with existing code.
 */

// Re-export existing types for compatibility
export type { PipelineClient, PipelineProject, PipelineMetrics } from './pipeline'

// Base project type - extends the existing Project interface
export interface BaseProject {
  id: string
  name: string
  description?: string
  client_id?: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled' | 'pipeline'
  start_date?: string
  due_date?: string
  created_at: string
  updated_at?: string
  
  // Financial fields (existing)
  expenses?: number
  revenue?: number
  profit_margin?: number
  currency?: string
  payment_status?: string
  invoice_amount?: number
  payment_received?: number
  payment_pending?: number
  
  // Currency conversion fields (existing)
  original_currency?: string
  conversion_rate?: number
  conversion_date?: string
  
  // Legacy time tracking fields (preserved for compatibility)
  hourly_rate?: number
  estimated_hours?: number
  actual_hours?: number
  progress?: number
  notes?: string
  
  // Client relationship
  clients?: {
    id: string
    name: string
    company?: string
    email?: string
    phone?: string
    avatar_url?: string | null
  }
}

// Enhanced project with multi-type support
export interface EnhancedProject extends BaseProject {
  // New multi-project type fields
  project_type: 'fixed' | 'recurring' | 'hourly'
  total_budget: number // Replaces budget in new system
  auto_calculate_total: boolean
  
  // Recurring project specific fields
  recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_amount?: number
  recurring_end_date?: string
  last_recurring_calculation?: string
  
  // Hourly project specific fields
  hourly_rate_new?: number // New dedicated field separate from legacy hourly_rate
  estimated_hours?: number
  actual_hours?: number
  
  // Backwards compatibility: keep budget field as alias
  budget?: number // Will be derived from total_budget
}

// Backwards compatible project type (for existing code)
export interface CompatibleProject extends BaseProject {
  budget?: number // Original budget field maintained
  project_type?: 'fixed' | 'recurring' | 'hourly' // Optional for existing projects
  total_budget?: number // Optional for backwards compatibility
}

// Form data types for different project types
export interface BaseProjectFormData {
  name: string
  description?: string
  client_id: string
  currency: string
  start_date?: string
  due_date?: string
  notes?: string
  // Financial fields
  expenses?: number
  payment_received?: number
}

export interface FixedProjectFormData extends BaseProjectFormData {
  project_type: 'fixed'
  total_budget: number
}

export interface RecurringProjectFormData extends BaseProjectFormData {
  project_type: 'recurring'
  recurring_frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_amount: number
}

export interface HourlyProjectFormData extends BaseProjectFormData {
  project_type: 'hourly'
  hourly_rate_new: number
  estimated_hours?: number
  actual_hours?: number
}

// Union type for all project form data
export type ProjectFormData = FixedProjectFormData | RecurringProjectFormData | HourlyProjectFormData

// Project creation data that can be sent to API
export interface CreateProjectData {
  name: string
  description?: string
  client_id: string
  project_type: 'fixed' | 'recurring' | 'hourly'
  currency: string
  start_date?: string
  due_date?: string
  notes?: string
  
  // Type-specific fields (only relevant ones will be used)
  total_budget?: number // For fixed projects
  recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_amount?: number
  recurring_end_date?: string
  hourly_rate_new?: number
  estimated_hours?: number // For hourly projects - estimated hours
  actual_hours?: number // For hourly projects - actual logged hours
  
  // Configuration
  auto_calculate_total?: boolean
}

// Project update data
export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string
}

// Project metrics interface for analytics
export interface ProjectMetrics {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  cancelledProjects: number
  pipelineProjects: number
  
  // Financial metrics
  totalBudget: number
  totalExpenses: number
  totalReceived: number
  totalPending: number
  
  // Type-specific metrics
  fixedProjectsCount: number
  recurringProjectsCount: number
  hourlyProjectsCount: number
  
  fixedProjectsValue: number
  recurringProjectsValue: number
  hourlyProjectsValue: number
}

// Calculation engine interfaces
export interface ProjectCalculationParams {
  projectType: 'fixed' | 'recurring' | 'hourly'
  
  // For recurring projects
  recurringAmount?: number
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate?: Date
  endDate?: Date
  
  // For hourly projects
  hourlyRate?: number
  totalHours?: number
}

export interface ProjectCalculationResult {
  totalBudget: number
  periodsCount?: number // For recurring projects
  calculatedAt: Date
  nextCalculationDate?: Date // For recurring projects
  isOngoing?: boolean // Flag for recurring projects without end date
}

// Filter interfaces (extends existing ones)
export interface EnhancedProjectFilters {
  search?: string
  status?: string[]
  client?: string[]
  projectType?: ('fixed' | 'recurring' | 'hourly')[]
  budgetRange?: {
    min?: number
    max?: number
  }
  timePeriod?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Utility type for project type guards
export type ProjectTypeGuard<T extends 'fixed' | 'recurring' | 'hourly'> = 
  T extends 'fixed' ? FixedProject :
  T extends 'recurring' ? RecurringProject :
  T extends 'hourly' ? HourlyProject :
  never

// Specific project type interfaces
export interface FixedProject extends EnhancedProject {
  project_type: 'fixed'
  total_budget: number
}

export interface RecurringProject extends EnhancedProject {
  project_type: 'recurring'
  recurring_frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_amount: number
  recurring_end_date?: string
  last_recurring_calculation?: string
}

export interface HourlyProject extends EnhancedProject {
  project_type: 'hourly'
  hourly_rate_new: number
  estimated_hours: number
  actual_hours?: number
}

// Type guards for runtime type checking
export const isFixedProject = (project: EnhancedProject): project is FixedProject => {
  return project.project_type === 'fixed'
}

export const isRecurringProject = (project: EnhancedProject): project is RecurringProject => {
  return project.project_type === 'recurring'
}

export const isHourlyProject = (project: EnhancedProject): project is HourlyProject => {
  return project.project_type === 'hourly'
}

// Migration helper types
export interface ProjectMigrationData {
  originalProject: CompatibleProject
  enhancedProject: EnhancedProject
  migrationNotes: string[]
}

// API response types
export interface ProjectsResponse {
  projects: EnhancedProject[]
  total: number
  page?: number
  pageSize?: number
  hasMore?: boolean
}

export interface ProjectOperationResult {
  success: boolean
  project?: EnhancedProject
  error?: string
  warnings?: string[]
}

// Export default enhanced project type
export type Project = EnhancedProject

// For backwards compatibility, also export the old interface name
export type LegacyProject = CompatibleProject