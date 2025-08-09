// Production-safe logging utility
// Automatically handles development vs production logging

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  context?: string
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error'
    }
    // In development, log everything
    return true
  }

  private sanitizeData(data: any): any {
    if (!data) return data
    
    // Create a deep copy to avoid mutating original data
    let sanitized = JSON.parse(JSON.stringify(data))
    
    // Remove sensitive information
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'stripe_customer_id', 'customer_id', 'payment_method', 'card',
      'ssn', 'social_security', 'credit_card', 'cvv', 'cvs'
    ]
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }
      
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase()
        if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value)
        } else {
          result[key] = value
        }
      }
      return result
    }
    
    return sanitizeObject(sanitized)
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString()
    const prefix = context ? `[${context}]` : ''
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`
  }

  debug(message: string, data?: any, context?: string): void {
    if (!this.shouldLog('debug')) return
    
    const sanitizedData = this.sanitizeData(data)
    if (sanitizedData) {
      console.debug(this.formatMessage('debug', message, context), sanitizedData)
    } else {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, data?: any, context?: string): void {
    if (!this.shouldLog('info')) return
    
    const sanitizedData = this.sanitizeData(data)
    if (sanitizedData) {
      console.info(this.formatMessage('info', message, context), sanitizedData)
    } else {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, data?: any, context?: string): void {
    if (!this.shouldLog('warn')) return
    
    const sanitizedData = this.sanitizeData(data)
    if (sanitizedData) {
      console.warn(this.formatMessage('warn', message, context), sanitizedData)
    } else {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, error?: Error | any, context?: string): void {
    if (!this.shouldLog('error')) return
    
    let errorData = error
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? '[REDACTED]' : error.stack
      }
    } else {
      errorData = this.sanitizeData(error)
    }
    
    if (errorData) {
      console.error(this.formatMessage('error', message, context), errorData)
    } else {
      console.error(this.formatMessage('error', message, context))
    }
  }

  // Convenience methods for common operations
  authLog(message: string, data?: any): void {
    this.info(message, data, 'AUTH')
  }

  apiLog(message: string, data?: any): void {
    this.info(message, data, 'API')
  }

  dbLog(message: string, data?: any): void {
    this.debug(message, data, 'DB')
  }

  stripeLog(message: string, data?: any): void {
    this.info(message, data, 'STRIPE')
  }

  paymentLog(message: string, data?: any): void {
    this.info(message, data, 'PAYMENT')
  }
}

// Export singleton instance
export const logger = new Logger()

// Export individual methods for convenience
export const { debug, info, warn, error, authLog, apiLog, dbLog, stripeLog, paymentLog } = logger
