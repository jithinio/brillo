// Date formatting utility that supports different formats
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'MMM DD, YYYY' | 'DD MMM YYYY'

export const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', example: '12/25/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)', example: '25/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)', example: '2024-12-25' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (US with dashes)', example: '12-25-2024' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (International with dashes)', example: '25-12-2024' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (US with month name)', example: 'Dec 25, 2024' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (International with month name)', example: '25 Dec 2024' },
]

// Default date format
export const DEFAULT_DATE_FORMAT: DateFormat = 'MM/DD/YYYY'

// Format a date string or Date object according to the specified format
export function formatDate(date: string | Date | null | undefined, format: DateFormat = DEFAULT_DATE_FORMAT): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDate:', date)
    return ''
  }
  
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const monthName = monthNames[month - 1]
  
  const pad = (num: number) => num.toString().padStart(2, '0')
  
  switch (format) {
    case 'MM/DD/YYYY':
      return `${pad(month)}/${pad(day)}/${year}`
    case 'DD/MM/YYYY':
      return `${pad(day)}/${pad(month)}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${pad(month)}-${pad(day)}`
    case 'MM-DD-YYYY':
      return `${pad(month)}-${pad(day)}-${year}`
    case 'DD-MM-YYYY':
      return `${pad(day)}-${pad(month)}-${year}`
    case 'MMM DD, YYYY':
      return `${monthName} ${day}, ${year}`
    case 'DD MMM YYYY':
      return `${day} ${monthName} ${year}`
    default:
      return `${pad(month)}/${pad(day)}/${year}`
  }
}

// Parse a formatted date string back to a Date object
export function parseFormattedDate(dateString: string, format: DateFormat = DEFAULT_DATE_FORMAT): Date | null {
  if (!dateString || dateString.trim() === '') return null
  
  const cleanDate = dateString.trim()
  
  try {
    switch (format) {
      case 'MM/DD/YYYY':
      case 'MM-DD-YYYY': {
        const separator = format.includes('/') ? '/' : '-'
        const parts = cleanDate.split(separator)
        if (parts.length === 3) {
          const [month, day, year] = parts.map(Number)
          // Create date in local timezone to avoid timezone offset issues
          const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon to avoid DST issues
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date
          }
        }
        break
      }
      
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY': {
        const separator = format.includes('/') ? '/' : '-'
        const parts = cleanDate.split(separator)
        if (parts.length === 3) {
          const [day, month, year] = parts.map(Number)
          // Create date in local timezone to avoid timezone offset issues
          const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon to avoid DST issues
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date
          }
        }
        break
      }
      
      case 'YYYY-MM-DD': {
        const parts = cleanDate.split('-')
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number)
          // Create date in local timezone to avoid timezone offset issues
          const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon to avoid DST issues
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date
          }
        }
        break
      }
      
      case 'MMM DD, YYYY':
      case 'DD MMM YYYY': {
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        
        if (format === 'MMM DD, YYYY') {
          // Format: "Dec 25, 2024"
          const match = cleanDate.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/)
          if (match) {
            const [, monthStr, dayStr, yearStr] = match
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase())
            if (monthIndex !== -1) {
              const day = parseInt(dayStr)
              const year = parseInt(yearStr)
              // Create date in local timezone to avoid timezone offset issues
              const date = new Date(year, monthIndex, day, 12, 0, 0, 0) // Set to noon to avoid DST issues
              if (date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
                return date
              }
            }
          }
        } else {
          // Format: "25 Dec 2024"
          const match = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
          if (match) {
            const [, dayStr, monthStr, yearStr] = match
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase())
            if (monthIndex !== -1) {
              const day = parseInt(dayStr)
              const year = parseInt(yearStr)
              // Create date in local timezone to avoid timezone offset issues
              const date = new Date(year, monthIndex, day, 12, 0, 0, 0) // Set to noon to avoid DST issues
              if (date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
                return date
              }
            }
          }
        }
        break
      }
    }
    
    // Fallback to native Date parsing
    const date = new Date(cleanDate)
    if (!isNaN(date.getTime())) {
      return date
    }
  } catch (error) {
    console.warn('Error parsing date:', error)
  }
  
  return null
}

// Get date format from localStorage or use default
export function getDateFormat(): DateFormat {
  if (typeof window === 'undefined') return DEFAULT_DATE_FORMAT
  
  const stored = localStorage.getItem('setting_dateFormat')
  if (stored) {
    try {
      const format = JSON.parse(stored) as DateFormat
      if (DATE_FORMAT_OPTIONS.some(option => option.value === format)) {
        return format
      }
    } catch (error) {
      console.warn('Invalid date format in localStorage:', error)
    }
  }
  
  return DEFAULT_DATE_FORMAT
}

// Set date format in localStorage
export function setDateFormat(format: DateFormat): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('setting_dateFormat', JSON.stringify(format))
}

// Format date using the current user's preferred format
export function formatDateWithUserPreference(date: string | Date | null | undefined, userFormat?: DateFormat): string {
  const format = userFormat || getDateFormat()
  return formatDate(date, format)
}

// Convert Date to local YYYY-MM-DD string (timezone-safe)
// This function prevents the timezone offset issues that occur with toISOString().split('T')[0]
export function formatDateForDatabase(date: Date | null | undefined): string | null {
  if (!date) return null
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
} 