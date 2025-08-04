/**
 * Recurring Project Updater
 * 
 * This utility provides functions to automatically update recurring projects
 * without due dates, ensuring their total budgets reflect elapsed time.
 * 
 * Usage:
 * - Call updateAllRecurringProjects() periodically (e.g., daily via cron job)
 * - Call updateRecurringProject(projectId) for individual project updates
 */

import { supabase } from './supabase'
import { ProjectCalculationEngine } from './project-calculation-engine'

interface RecurringProject {
  id: string
  recurring_amount: number
  recurring_frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  recurring_end_date?: string
  due_date?: string
  total_budget: number
  last_recurring_calculation?: string
  auto_calculate_total: boolean
}

export class RecurringProjectUpdater {
  private calculationEngine: ProjectCalculationEngine

  constructor() {
    this.calculationEngine = new ProjectCalculationEngine()
  }

  /**
   * Update all recurring projects without due dates
   * This should be called periodically (e.g., daily) to keep ongoing projects up to date
   */
  async updateAllRecurringProjects(): Promise<{
    success: boolean
    updated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let updated = 0

    try {
      // Fetch all recurring projects without due dates that have auto-calculation enabled
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_type', 'recurring')
        .eq('auto_calculate_total', true)
        .is('recurring_end_date', null)
        .is('due_date', null)
        .not('recurring_amount', 'is', null)
        .not('recurring_frequency', 'is', null)

      if (error) {
        errors.push(`Database error: ${error.message}`)
        return { success: false, updated: 0, errors }
      }

      if (!projects || projects.length === 0) {
        return { success: true, updated: 0, errors: [] }
      }

      // Update each project
      for (const project of projects as RecurringProject[]) {
        try {
          const result = await this.updateRecurringProject(project.id)
          if (result.success) {
            updated++
          } else {
            errors.push(`Project ${project.id}: ${result.error}`)
          }
        } catch (err) {
          errors.push(`Project ${project.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        updated,
        errors
      }
    } catch (err) {
      errors.push(`System error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      return { success: false, updated: 0, errors }
    }
  }

  /**
   * Update a specific recurring project
   */
  async updateRecurringProject(projectId: string): Promise<{
    success: boolean
    error?: string
    oldTotal?: number
    newTotal?: number
  }> {
    try {
      // Fetch the specific project
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('project_type', 'recurring')
        .single()

      if (error || !project) {
        return { success: false, error: `Project not found or not recurring: ${error?.message}` }
      }

      const typedProject = project as RecurringProject

      // Skip if auto-calculation is disabled
      if (!typedProject.auto_calculate_total) {
        return { success: true, error: 'Auto-calculation disabled' }
      }

      // Skip if project has an end date (these are handled by normal triggers)
      if (typedProject.recurring_end_date || typedProject.due_date) {
        return { success: true, error: 'Project has end date - handled by triggers' }
      }

      // Skip if missing required fields
      if (!typedProject.recurring_amount || !typedProject.recurring_frequency || !typedProject.start_date) {
        return { success: false, error: 'Missing required recurring project fields' }
      }

      // Calculate new total
      const startDate = new Date(typedProject.start_date)
      const calculationResult = this.calculationEngine.calculateRecurringTotal(
        typedProject.recurring_amount,
        typedProject.recurring_frequency,
        startDate
      )

      const oldTotal = typedProject.total_budget
      const newTotal = calculationResult.totalBudget

      // Only update if the total has changed
      if (Math.abs(newTotal - oldTotal) < 0.01) {
        return { success: true, error: 'No change needed', oldTotal, newTotal }
      }

      // Update the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          total_budget: newTotal,
          last_recurring_calculation: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (updateError) {
        return { success: false, error: `Update failed: ${updateError.message}` }
      }

      return { success: true, oldTotal, newTotal }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  /**
   * Check which recurring projects need updates (without actually updating them)
   */
  async getProjectsNeedingUpdate(): Promise<{
    success: boolean
    projects: Array<{
      id: string
      name: string
      currentTotal: number
      calculatedTotal: number
      difference: number
    }>
    error?: string
  }> {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, recurring_amount, recurring_frequency, start_date, total_budget')
        .eq('project_type', 'recurring')
        .eq('auto_calculate_total', true)
        .is('recurring_end_date', null)
        .is('due_date', null)
        .not('recurring_amount', 'is', null)
        .not('recurring_frequency', 'is', null)

      if (error) {
        return { success: false, projects: [], error: error.message }
      }

      const needingUpdate = []

      for (const project of projects || []) {
        if (!project.start_date || !project.recurring_amount || !project.recurring_frequency) {
          continue
        }

        const startDate = new Date(project.start_date)
        const calculationResult = this.calculationEngine.calculateRecurringTotal(
          project.recurring_amount,
          project.recurring_frequency,
          startDate
        )

        const difference = Math.abs(calculationResult.totalBudget - (project.total_budget || 0))
        
        if (difference >= 0.01) {
          needingUpdate.push({
            id: project.id,
            name: project.name || 'Unnamed Project',
            currentTotal: project.total_budget || 0,
            calculatedTotal: calculationResult.totalBudget,
            difference
          })
        }
      }

      return { success: true, projects: needingUpdate }
    } catch (err) {
      return { 
        success: false, 
        projects: [], 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get statistics about recurring projects
   */
  async getRecurringProjectStats(): Promise<{
    total: number
    withoutEndDate: number
    withAutoCalculation: number
    needingUpdate: number
    lastUpdateCheck: Date
  }> {
    try {
      // Get total recurring projects
      const { count: total } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('project_type', 'recurring')

      // Get projects without end date
      const { count: withoutEndDate } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('project_type', 'recurring')
        .is('recurring_end_date', null)
        .is('due_date', null)

      // Get projects with auto-calculation
      const { count: withAutoCalculation } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('project_type', 'recurring')
        .eq('auto_calculate_total', true)

      // Get projects needing update
      const updateCheck = await this.getProjectsNeedingUpdate()
      const needingUpdate = updateCheck.success ? updateCheck.projects.length : 0

      return {
        total: total || 0,
        withoutEndDate: withoutEndDate || 0,
        withAutoCalculation: withAutoCalculation || 0,
        needingUpdate,
        lastUpdateCheck: new Date()
      }
    } catch (err) {
      console.error('Error getting recurring project stats:', err)
      return {
        total: 0,
        withoutEndDate: 0,
        withAutoCalculation: 0,
        needingUpdate: 0,
        lastUpdateCheck: new Date()
      }
    }
  }
}

// Export a singleton instance
export const recurringProjectUpdater = new RecurringProjectUpdater()

// Export utility functions for direct use
export async function updateAllRecurringProjects() {
  return recurringProjectUpdater.updateAllRecurringProjects()
}

export async function updateRecurringProject(projectId: string) {
  return recurringProjectUpdater.updateRecurringProject(projectId)
}

export async function getRecurringProjectStats() {
  return recurringProjectUpdater.getRecurringProjectStats()
}

export async function getProjectsNeedingUpdate() {
  return recurringProjectUpdater.getProjectsNeedingUpdate()
}