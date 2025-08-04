/**
 * Project Calculation Engine
 * Handles automatic calculation of total budgets for different project types
 * Provides enterprise-level performance with caching and batch operations
 */

import { supabase } from './supabase'
import type { 
  ProjectCalculationParams, 
  ProjectCalculationResult,
  EnhancedProject,
  RecurringProject,
  HourlyProject 
} from './types/enhanced-project'

// Cache for calculation results to improve performance
interface CalculationCache {
  [key: string]: {
    result: ProjectCalculationResult
    expiresAt: number
  }
}

class ProjectCalculationEngine {
  private cache: CalculationCache = {}
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private calculationQueue: Set<string> = new Set()
  private isProcessingQueue = false

  /**
   * Calculate total budget for a recurring project
   */
  calculateRecurringTotal(
    recurringAmount: number,
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: Date,
    endDate?: Date
  ): ProjectCalculationResult {
    const cacheKey = `recurring-${recurringAmount}-${frequency}-${startDate.getTime()}-${endDate?.getTime() || 'ongoing'}`
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    const currentDate = new Date()
    let totalPeriods: number

    if (!endDate) {
      // FOR PROJECTS WITHOUT DUE DATE: Calculate based on elapsed time since start
      const diffTime = Math.max(0, currentDate.getTime() - startDate.getTime())
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      // If project hasn't started yet, set to 1 period minimum
      if (diffDays < 0) {
        totalPeriods = 1
      } else {
        // Calculate elapsed periods based on frequency
        const daysPerPeriod = {
          'weekly': 7,
          'monthly': 30.44,
          'quarterly': 91.31,
          'yearly': 365.25
        }
        
        totalPeriods = Math.max(1, Math.ceil(diffDays / daysPerPeriod[frequency]))
      }
    } else {
      // FOR PROJECTS WITH DUE DATE: Calculate total periods from start to end
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      // Ensure we have at least 1 period
      if (diffDays <= 0) {
        totalPeriods = 1
      } else {
        // Calculate total periods based on frequency
        const daysPerPeriod = {
          'weekly': 7,
          'monthly': 30.44,
          'quarterly': 91.31,
          'yearly': 365.25
        }
        
        totalPeriods = Math.ceil(diffDays / daysPerPeriod[frequency])
      }
    }
    
    const result: ProjectCalculationResult = {
      totalBudget: recurringAmount * totalPeriods,
      periodsCount: totalPeriods,
      calculatedAt: new Date(),
      nextCalculationDate: this.getNextCalculationDate(frequency),
      isOngoing: !endDate // Flag to indicate if this is an ongoing project
    }
    
    // Cache the result
    this.setCachedResult(cacheKey, result)
    
    return result
  }

  /**
   * Calculate total budget for an hourly project
   */
  calculateHourlyTotal(
    hourlyRate: number,
    totalHours: number
  ): ProjectCalculationResult {
    const cacheKey = `hourly-${hourlyRate}-${totalHours}`
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    const result: ProjectCalculationResult = {
      totalBudget: hourlyRate * totalHours,
      calculatedAt: new Date()
    }
    
    // Cache the result
    this.setCachedResult(cacheKey, result)
    
    return result
  }

  /**
   * Calculate total budget based on project parameters
   */
  calculateProjectTotal(params: ProjectCalculationParams): ProjectCalculationResult {
    switch (params.projectType) {
      case 'recurring':
        if (!params.recurringAmount || !params.recurringFrequency || !params.startDate) {
          throw new Error('Missing required parameters for recurring project calculation')
        }
        return this.calculateRecurringTotal(
          params.recurringAmount,
          params.recurringFrequency,
          params.startDate,
          params.endDate
        )
      
      case 'hourly':
        if (!params.hourlyRate || params.totalHours === undefined) {
          throw new Error('Missing required parameters for hourly project calculation')
        }
        return this.calculateHourlyTotal(params.hourlyRate, params.totalHours)
      
      case 'fixed':
        // Fixed projects don't have automatic calculation
        throw new Error('Fixed projects do not support automatic calculation')
      
      default:
        throw new Error(`Unsupported project type: ${params.projectType}`)
    }
  }

  /**
   * Update a single project's total budget
   */
  async updateProjectTotal(projectId: string): Promise<boolean> {
    try {
      // Fetch project data
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error || !project) {
        console.error('Error fetching project for calculation:', error)
        return false
      }

      // Skip if auto-calculation is disabled
      if (!project.auto_calculate_total) {
        return true
      }

      let calculationResult: ProjectCalculationResult

      try {
        const params: ProjectCalculationParams = {
          projectType: project.project_type,
          recurringAmount: project.recurring_amount,
          recurringFrequency: project.recurring_frequency,
          startDate: project.start_date ? new Date(project.start_date) : undefined,
          endDate: project.recurring_end_date ? new Date(project.recurring_end_date) : (project.due_date ? new Date(project.due_date) : undefined),
          hourlyRate: project.hourly_rate_new,
          totalHours: (project.actual_hours && project.actual_hours > 0) 
            ? project.actual_hours 
            : (project.estimated_hours || 0)
        }

        calculationResult = this.calculateProjectTotal(params)
      } catch (calcError) {
        console.error('Calculation error for project:', projectId, calcError)
        return false
      }

      // Update the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          total_budget: calculationResult.totalBudget,
          last_recurring_calculation: calculationResult.calculatedAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (updateError) {
        console.error('Error updating project total:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateProjectTotal:', error)
      return false
    }
  }

  /**
   * Batch update multiple projects with optimized database operations
   */
  async updateProjectTotalsBatch(projectIds: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = []
    const failed: string[] = []

    // Process in batches of 10 for optimal performance
    const batchSize = 10
    for (let i = 0; i < projectIds.length; i += batchSize) {
      const batch = projectIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (id) => {
        const result = await this.updateProjectTotal(id)
        return { id, success: result }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        const projectId = batch[index]
        if (result.status === 'fulfilled' && result.value.success) {
          success.push(projectId)
        } else {
          failed.push(projectId)
        }
      })

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < projectIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { success, failed }
  }

  /**
   * Queue a project for calculation (for background processing)
   */
  queueCalculation(projectId: string): void {
    this.calculationQueue.add(projectId)
    
    if (!this.isProcessingQueue) {
      // Process queue asynchronously
      setTimeout(() => this.processCalculationQueue(), 1000)
    }
  }

  /**
   * Process the calculation queue in the background
   */
  private async processCalculationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.calculationQueue.size === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      const projectIds = Array.from(this.calculationQueue)
      this.calculationQueue.clear()

      await this.updateProjectTotalsBatch(projectIds)
    } catch (error) {
      console.error('Error processing calculation queue:', error)
    } finally {
      this.isProcessingQueue = false
      
      // If more items were added while processing, schedule another round
      if (this.calculationQueue.size > 0) {
        setTimeout(() => this.processCalculationQueue(), 2000)
      }
    }
  }

  /**
   * Get next calculation date based on frequency
   */
  private getNextCalculationDate(frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Date {
    const now = new Date()
    
    switch (frequency) {
      case 'weekly':
        return new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    }
  }

  /**
   * Cache management methods
   */
  private getCachedResult(key: string): ProjectCalculationResult | null {
    const cached = this.cache[key]
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result
    }
    
    // Clean up expired cache entry
    if (cached) {
      delete this.cache[key]
    }
    
    return null
  }

  private setCachedResult(key: string, result: ProjectCalculationResult): void {
    this.cache[key] = {
      result,
      expiresAt: Date.now() + this.CACHE_TTL
    }
  }

  /**
   * Clear cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache = {}
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number, memoryUsage: string } {
    const entries = Object.keys(this.cache).length
    const memoryUsage = `${Math.round(JSON.stringify(this.cache).length / 1024)}KB`
    
    return { entries, memoryUsage }
  }

  /**
   * Validate project data for calculations
   */
  validateProjectForCalculation(project: EnhancedProject): { isValid: boolean, errors: string[] } {
    const errors: string[] = []

    if (!project.auto_calculate_total) {
      return { isValid: true, errors: [] }
    }

    switch (project.project_type) {
      case 'recurring':
        if (!project.recurring_amount) errors.push('Recurring amount is required')
        if (!project.recurring_frequency) errors.push('Recurring frequency is required')
        if (!project.start_date) errors.push('Start date is required for recurring projects')
        break
      
      case 'hourly':
        if (!project.hourly_rate_new) errors.push('Hourly rate is required')
        
        // Either estimated_hours or actual_hours should be provided
        const hasEstimatedHours = project.estimated_hours !== undefined && project.estimated_hours > 0
        const hasActualHours = project.actual_hours !== undefined && project.actual_hours > 0
        
        if (!hasEstimatedHours && !hasActualHours) {
          errors.push('Either estimated hours or actual hours must be provided')
        }
        break
      
      case 'fixed':
        // Fixed projects don't need validation for auto-calculation
        break
    }

    return { isValid: errors.length === 0, errors }
  }
}

// Create and export singleton instance
export const projectCalculationEngine = new ProjectCalculationEngine()

// Export utility functions
export const calculateRecurringTotal = (
  amount: number,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: Date,
  endDate?: Date
): number => {
  return projectCalculationEngine.calculateRecurringTotal(amount, frequency, startDate, endDate).totalBudget
}

export const calculateHourlyTotal = (hourlyRate: number, totalHours: number): number => {
  return projectCalculationEngine.calculateHourlyTotal(hourlyRate, totalHours).totalBudget
}

// Export types
export type { ProjectCalculationParams, ProjectCalculationResult }