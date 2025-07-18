// Input validation and sanitization utilities for security

export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: string
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }

  const sanitizedEmail = email.trim().toLowerCase()
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // Length validation
  if (sanitizedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' }
  }

  return { isValid: true, sanitizedValue: sanitizedEmail }
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' }
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' }
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein']
  if (weakPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common' }
  }

  return { isValid: true, sanitizedValue: password }
}

// Name validation
export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` }
  }

  const sanitizedName = name.trim()
  
  if (sanitizedName.length < 1) {
    return { isValid: false, error: `${fieldName} cannot be empty` }
  }

  if (sanitizedName.length > 100) {
    return { isValid: false, error: `${fieldName} is too long` }
  }

  // Remove potentially dangerous characters
  const cleanName = sanitizedName.replace(/[<>\"'&]/g, '')
  
  return { isValid: true, sanitizedValue: cleanName }
}

// Phone number validation
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' }
  }

  const sanitizedPhone = phone.trim()
  
  // Basic phone format validation (allows various formats)
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  const cleanPhone = sanitizedPhone.replace(/[\s\-\(\)\.]/g, '')
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Invalid phone number format' }
  }

  return { isValid: true, sanitizedValue: sanitizedPhone }
}

// Currency amount validation
export function validateAmount(amount: string | number): ValidationResult {
  if (amount === null || amount === undefined || amount === '') {
    return { isValid: false, error: 'Amount is required' }
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Invalid amount format' }
  }

  if (numAmount < 0) {
    return { isValid: false, error: 'Amount cannot be negative' }
  }

  if (numAmount > 999999999.99) {
    return { isValid: false, error: 'Amount is too large' }
  }

  return { isValid: true, sanitizedValue: numAmount.toString() }
}

// Text content sanitization
export function sanitizeText(text: string, maxLength: number = 1000): ValidationResult {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Text content is required' }
  }

  const sanitizedText = text.trim()
  
  if (sanitizedText.length > maxLength) {
    return { isValid: false, error: `Text is too long (max ${maxLength} characters)` }
  }

  // Remove potentially dangerous HTML/script content
  const cleanText = sanitizedText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')

  return { isValid: true, sanitizedValue: cleanText }
}

// File validation
export function validateFile(file: File, allowedTypes: string[], maxSizeMB: number = 5): ValidationResult {
  if (!file) {
    return { isValid: false, error: 'File is required' }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File size too large. Maximum size: ${maxSizeMB}MB` }
  }

  // Check file name
  if (file.name.length > 255) {
    return { isValid: false, error: 'File name is too long' }
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = /[<>:"/\\|?*\x00-\x1f]/
  if (dangerousPatterns.test(file.name)) {
    return { isValid: false, error: 'File name contains invalid characters' }
  }

  return { isValid: true }
}

// CSV file validation
export function validateCSVFile(file: File): ValidationResult {
  const allowedTypes = ['text/csv', 'application/csv']
  const maxSizeMB = 10

  const fileValidation = validateFile(file, allowedTypes, maxSizeMB)
  if (!fileValidation.isValid) {
    return fileValidation
  }

  // Additional CSV-specific validation
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { isValid: false, error: 'File must have .csv extension' }
  }

  return { isValid: true }
}

// URL validation
export function validateURL(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' }
  }

  const sanitizedURL = url.trim()
  
  try {
    const urlObj = new URL(sanitizedURL)
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' }
    }

    // Check URL length
    if (sanitizedURL.length > 2048) {
      return { isValid: false, error: 'URL is too long' }
    }

    return { isValid: true, sanitizedValue: sanitizedURL }
  } catch {
    return { isValid: false, error: 'Invalid URL format' }
  }
}

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  private maxAttempts: number
  private windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (attempt.count >= this.maxAttempts) {
      return false
    }

    attempt.count++
    return true
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
} 