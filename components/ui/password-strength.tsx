"use client"

import { calculatePasswordStrength } from "@/lib/password-strength"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthIndicatorProps {
  password: string
  showDetails?: boolean
}

export function PasswordStrengthIndicator({ 
  password, 
  showDetails = true 
}: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password)

  if (!password) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength.score === 0 && "text-red-600",
            strength.score === 1 && "text-orange-600", 
            strength.score === 2 && "text-yellow-600",
            strength.score === 3 && "text-blue-600",
            strength.score === 4 && "text-green-600"
          )}>
            {strength.label}
          </span>
        </div>
        
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              strength.color
            )}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showDetails && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Requirements:</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <RequirementItem 
              met={strength.checks.length} 
              text="At least 8 characters"
            />
            <RequirementItem 
              met={strength.checks.uppercase} 
              text="One uppercase letter"
            />
            <RequirementItem 
              met={strength.checks.lowercase} 
              text="One lowercase letter"
            />
            <RequirementItem 
              met={strength.checks.number} 
              text="One number"
            />
            <RequirementItem 
              met={strength.checks.special} 
              text="One special character"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface RequirementItemProps {
  met: boolean
  text: string
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex h-4 w-4 items-center justify-center rounded-full text-xs",
        met 
          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
          : "bg-muted text-muted-foreground"
      )}>
        {met ? (
          <Check className="h-2.5 w-2.5" />
        ) : (
          <X className="h-2.5 w-2.5" />
        )}
      </div>
      <span className={cn(
        "text-xs",
        met ? "text-foreground" : "text-muted-foreground"
      )}>
        {text}
      </span>
    </div>
  )
}
