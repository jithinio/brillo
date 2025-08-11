/**
 * Standardized date filtering utilities for consistent analytics calculations
 */

export interface DateRange {
  startDate: Date
  endDate: Date
  periodLabel: string
}

/**
 * Get the relevant date for a project based on the context
 * @param project - The project object
 * @param context - The context for date selection ('revenue', 'expense', 'creation')
 */
export function getProjectRelevantDate(
  project: any,
  context: 'revenue' | 'expense' | 'creation' | 'general' = 'general'
): Date {
  switch (context) {
    case 'revenue':
      // For revenue calculations, prioritize payment_date
      if (project.payment_date) return new Date(project.payment_date)
      // Fall back to project start date for contracts
      if (project.start_date) return new Date(project.start_date)
      return new Date(project.created_at)
    
    case 'expense':
      // For expense calculations, use expense_date if available
      if (project.expense_date) return new Date(project.expense_date)
      // Fall back to project start date
      if (project.start_date) return new Date(project.start_date)
      // Otherwise use project creation date
      return new Date(project.created_at)
    
    case 'creation':
      // For project creation metrics, always use created_at
      return new Date(project.created_at)
    
    case 'general':
    default:
      // For general purposes, prioritize start_date
      if (project.start_date) return new Date(project.start_date)
      return new Date(project.created_at)
  }
}

/**
 * Get standardized date range for a given period
 * @param period - The period string
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function getDateRangeForPeriod(
  period: string,
  referenceDate: Date = new Date()
): DateRange {
  const now = referenceDate
  let startDate: Date
  let endDate: Date
  let periodLabel: string

  switch (period) {
    case 'current-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      periodLabel = 'this month'
      break
    
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      periodLabel = 'last month'
      break
    
    case 'current-quarter':
      const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), currentQuarterStart, 1)
      endDate = new Date(now.getFullYear(), currentQuarterStart + 3, 0)
      periodLabel = 'this quarter'
      break
    
    case 'last-quarter':
      const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3
      const lastQuarterYear = lastQuarterStart < 0 ? now.getFullYear() - 1 : now.getFullYear()
      const adjustedQuarterStart = lastQuarterStart < 0 ? lastQuarterStart + 12 : lastQuarterStart
      startDate = new Date(lastQuarterYear, adjustedQuarterStart, 1)
      endDate = new Date(lastQuarterYear, adjustedQuarterStart + 3, 0)
      periodLabel = 'last quarter'
      break
    
    case 'current-year':
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
      periodLabel = 'this year'
      break
    
    case 'last-year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
      periodLabel = 'last year'
      break
    
    case 'next-month':
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      periodLabel = 'next month'
      break
    
    case 'next-quarter':
      const nextQuarterStart = Math.floor(now.getMonth() / 3) * 3 + 3
      const nextQuarterYear = nextQuarterStart > 11 ? now.getFullYear() + 1 : now.getFullYear()
      const adjustedNextQuarterStart = nextQuarterStart > 11 ? nextQuarterStart - 12 : nextQuarterStart
      startDate = new Date(nextQuarterYear, adjustedNextQuarterStart, 1)
      endDate = new Date(nextQuarterYear, adjustedNextQuarterStart + 3, 0)
      periodLabel = 'next quarter'
      break
    
    case 'all-time':
      startDate = new Date(2000, 0, 1) // Arbitrary old date
      endDate = new Date(2100, 0, 1) // Arbitrary future date
      periodLabel = 'all time'
      break
    
    default:
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      periodLabel = 'this month'
  }

  return { startDate, endDate, periodLabel }
}

/**
 * Filter projects by date range with context-aware date selection
 * @param projects - Array of projects
 * @param dateRange - The date range to filter by
 * @param context - The context for date selection
 * @param excludeStatuses - Optional array of statuses to exclude
 */
export function filterProjectsByDateRange(
  projects: any[],
  dateRange: DateRange,
  context: 'revenue' | 'expense' | 'creation' | 'general' = 'general',
  excludeStatuses: string[] = []
): any[] {
  return projects.filter(project => {
    // Exclude specific statuses if provided
    if (excludeStatuses.length > 0 && excludeStatuses.includes(project.status)) {
      return false
    }
    
    const projectDate = getProjectRelevantDate(project, context)
    return projectDate >= dateRange.startDate && projectDate <= dateRange.endDate
  })
}

/**
 * Calculate the number of days between two dates
 * @param date1 - First date
 * @param date2 - Second date
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format a date range for display
 * @param dateRange - The date range to format
 */
export function formatDateRange(dateRange: DateRange): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
  
  return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
}

/**
 * Get fiscal quarter from a date
 * @param date - The date to get quarter from
 */
export function getFiscalQuarter(date: Date): { quarter: number; year: number } {
  const month = date.getMonth()
  const quarter = Math.floor(month / 3) + 1
  return {
    quarter,
    year: date.getFullYear()
  }
}

/**
 * Check if a date is in the current period
 * @param date - The date to check
 * @param period - The period type
 */
export function isInCurrentPeriod(date: Date, period: 'month' | 'quarter' | 'year'): boolean {
  const now = new Date()
  
  switch (period) {
    case 'month':
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    
    case 'quarter':
      const dateQuarter = getFiscalQuarter(date)
      const nowQuarter = getFiscalQuarter(now)
      return dateQuarter.quarter === nowQuarter.quarter && dateQuarter.year === nowQuarter.year
    
    case 'year':
      return date.getFullYear() === now.getFullYear()
    
    default:
      return false
  }
}
