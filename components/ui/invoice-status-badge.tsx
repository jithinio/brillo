"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ribbon"
}

const statusConfig = {
  draft: {
    label: "Draft",
    colors: {
      bg: "bg-slate-50 dark:bg-slate-900",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-700",
      ribbon: "bg-slate-500"
    }
  },
  sent: {
    label: "Sent",
    colors: {
      bg: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
      ribbon: "bg-blue-500"
    }
  },
  partially_paid: {
    label: "Partially Paid",
    colors: {
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      ribbon: "bg-amber-500"
    }
  },
  paid: {
    label: "Paid",
    colors: {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      ribbon: "bg-emerald-500"
    }
  },
  overdue: {
    label: "Overdue",
    colors: {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
      ribbon: "bg-red-500"
    }
  },
  cancelled: {
    label: "Cancelled",
    colors: {
      bg: "bg-gray-50 dark:bg-gray-900",
      text: "text-gray-500 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-700",
      ribbon: "bg-gray-400"
    }
  }
}

export function InvoiceStatusBadge({ 
  status, 
  className, 
  size = "md",
  variant = "default" 
}: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
  
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs font-medium",
    md: "px-3 py-1.5 text-sm font-medium",
    lg: "px-4 py-2 text-base font-medium"
  }

  if (variant === "ribbon") {
    const ribbonSizeClasses = {
      sm: "px-3 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    }

    return (
      <div className={cn("relative inline-block", className)}>
        {/* Ribbon */}
        <div className={cn(
          "relative z-10 font-semibold text-white transform rotate-12 shadow-lg",
          "uppercase tracking-wide select-none",
          "border border-white/20",
          config.colors.ribbon,
          ribbonSizeClasses[size]
        )}>
          <div className="relative z-20">
            {config.label}
          </div>
          {/* Ribbon fold effect */}
          <div className={cn(
            "absolute -left-1 top-0 h-full w-2 transform -skew-y-12",
            config.colors.ribbon,
            "opacity-60"
          )} />
          <div className={cn(
            "absolute -right-1 top-0 h-full w-2 transform skew-y-12", 
            config.colors.ribbon,
            "opacity-60"
          )} />
          {/* Shadow underneath */}
          <div className="absolute inset-0 transform translate-x-1 translate-y-1 bg-black/20 -z-10 rounded-sm" />
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border shadow-sm",
        "backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90",
        "transition-all duration-200 hover:shadow-md",
        config.colors.bg,
        config.colors.text,
        config.colors.border,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
