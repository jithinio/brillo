// Password strength calculation utility

export interface PasswordStrengthResult {
  score: number // 0-4 (0: very weak, 4: very strong)
  label: string
  color: string
  percentage: number
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
  feedback: string[]
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }

  // Calculate score based on criteria met
  const criteriaCount = Object.values(checks).filter(Boolean).length
  
  // Bonus points for length
  let score = criteriaCount
  if (password.length >= 12) score += 0.5
  if (password.length >= 16) score += 0.5
  
  // Penalty for very short passwords
  if (password.length < 6) score = Math.min(score, 1)
  
  // Cap at 4
  score = Math.min(Math.floor(score), 4)

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = [
    'bg-red-500',     // Very Weak
    'bg-orange-500',  // Weak  
    'bg-yellow-500',  // Fair
    'bg-blue-500',    // Good
    'bg-green-500'    // Strong
  ]

  const percentage = Math.max((score / 4) * 100, password.length > 0 ? 20 : 0)

  // Generate feedback
  const feedback: string[] = []
  if (!checks.length) feedback.push('At least 8 characters')
  if (!checks.uppercase) feedback.push('One uppercase letter')
  if (!checks.lowercase) feedback.push('One lowercase letter') 
  if (!checks.number) feedback.push('One number')
  if (!checks.special) feedback.push('One special character')

  if (feedback.length === 0) {
    if (password.length >= 12) {
      feedback.push('Excellent! Very secure password')
    } else {
      feedback.push('Good! Consider making it longer for extra security')
    }
  }

  return {
    score,
    label: labels[score],
    color: colors[score],
    percentage,
    checks,
    feedback
  }
}
