// Improved Project Filter System with URL State Management
import { z } from 'zod'
import type { ReadonlyURLSearchParams } from 'next/navigation'

// Define filter schema for validation
export const ProjectFiltersSchema = z.object({
  status: z.array(z.enum(['active', 'pipeline', 'on_hold', 'completed', 'cancelled'])).default([]),
  client: z.array(z.string()).default([]),
  timePeriod: z.enum(['this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year']).nullable().default(null),
  search: z.string().default(''),
})

// Helper function to get date range from time period
export function getDateRangeFromTimePeriod(timePeriod: string | null): { dateFrom: string | null, dateTo: string | null } {
  if (!timePeriod) return { dateFrom: null, dateTo: null }
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQuarter = Math.floor(currentMonth / 3)
  
  switch (timePeriod) {
    case 'this_month': {
      const start = new Date(currentYear, currentMonth, 1)
      const end = new Date(currentYear, currentMonth + 1, 0)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    case 'last_month': {
      const start = new Date(currentYear, currentMonth - 1, 1)
      const end = new Date(currentYear, currentMonth, 0)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    case 'this_quarter': {
      const start = new Date(currentYear, currentQuarter * 3, 1)
      const end = new Date(currentYear, (currentQuarter + 1) * 3, 0)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    case 'last_quarter': {
      const lastQuarter = currentQuarter - 1
      const year = lastQuarter < 0 ? currentYear - 1 : currentYear
      const quarter = lastQuarter < 0 ? 3 : lastQuarter
      const start = new Date(year, quarter * 3, 1)
      const end = new Date(year, (quarter + 1) * 3, 0)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    case 'this_year': {
      const start = new Date(currentYear, 0, 1)
      const end = new Date(currentYear, 11, 31)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    case 'last_year': {
      const start = new Date(currentYear - 1, 0, 1)
      const end = new Date(currentYear - 1, 11, 31)
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0]
      }
    }
    default:
      return { dateFrom: null, dateTo: null }
  }
}

export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>

// Parse filters from URL search params
export function parseFiltersFromSearchParams(searchParams: ReadonlyURLSearchParams): ProjectFilters {
  const timePeriodParam = searchParams.get('timePeriod')
  const validTimePeriods = ['this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year']
  
  const params = {
    status: searchParams.getAll('status'),
    client: searchParams.getAll('client'),
    timePeriod: validTimePeriods.includes(timePeriodParam as string) ? timePeriodParam : null,
    search: searchParams.get('search') || '',
  }

  const result = ProjectFiltersSchema.parse(params)
  if (searchParams.toString()) {
    console.log('🔍 Parsed filters from URL:', searchParams.toString())
  }
  return result
}

// Convert filters to URL search params
export function filtersToSearchParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams()

  // Add status filters
  filters.status.forEach(status => params.append('status', status))

  // Add client filters
  filters.client.forEach(client => params.append('client', client))

  // Add time period
  if (filters.timePeriod) params.set('timePeriod', filters.timePeriod)

  // Add search
  if (filters.search) params.set('search', filters.search)

  return params
}

// Build SQL where conditions from filters
export function buildFilterConditions(filters: ProjectFilters) {
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = 1

  // Status filter
  if (filters.status.length > 0) {
    conditions.push(`status = ANY($${paramIndex})`)
    values.push(filters.status)
    paramIndex++
  }

  // Client filter
  if (filters.client.length > 0) {
    conditions.push(`client_id = ANY($${paramIndex})`)
    values.push(filters.client)
    paramIndex++
  }

  // Time period filter (convert to date range)
  if (filters.timePeriod) {
    const { dateFrom, dateTo } = getDateRangeFromTimePeriod(filters.timePeriod)
    if (dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`)
      values.push(dateFrom)
      paramIndex++
    }
    if (dateTo) {
      conditions.push(`created_at <= $${paramIndex}`)
      values.push(dateTo)
      paramIndex++
    }
  }

  // Search filter
  if (filters.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
    paramIndex++
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  }
}

// Check if any filters are active
export function hasActiveFilters(filters: ProjectFilters): boolean {
  return (
    filters.status.length > 0 ||
    filters.client.length > 0 ||
    filters.timePeriod !== null ||
    filters.search !== ''
  )
}

// Count active filters
export function countActiveFilters(filters: ProjectFilters): number {
  let count = 0
  count += filters.status.length
  count += filters.client.length
  if (filters.timePeriod) count++
  if (filters.search) count++
  return count
}

// Get human-readable labels for filter values
export function getTimePeriodLabel(timePeriod: string | null): string {
  if (!timePeriod) return ''
  
  const labels = {
    this_month: 'This Month',
    last_month: 'Last Month',
    this_quarter: 'This Quarter',
    last_quarter: 'Last Quarter',
    this_year: 'This Year',
    last_year: 'Last Year'
  }
  
  return labels[timePeriod as keyof typeof labels] || timePeriod
} 