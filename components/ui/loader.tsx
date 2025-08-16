"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon as LoaderCircle } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "default" | "primary" | "muted" | "light"
  className?: string
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4", 
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

const variantClasses = {
  default: "text-muted-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
  light: "text-muted-foreground/60"
}

function Loader({ 
  size = "md", 
  variant = "default", 
  className 
}: LoaderProps) {
  return (
    <HugeiconsIcon icon={LoaderCircle} className={cn(
        "animate-spin",
        sizeClasses[size],
        variantClasses[variant],
        className
      )} />
  )
}

export { Loader, type LoaderProps }
