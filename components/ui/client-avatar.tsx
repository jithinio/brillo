"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ClientAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeMap = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-12 w-12",
  xl: "h-16 w-16"
}

const textSizeMap = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base"
}

export function ClientAvatar({ name, avatarUrl, size = "md", className }: ClientAvatarProps) {
  const generateInitials = (fullName: string) => {
    if (!fullName) return "CL"
    
    const words = fullName.trim().split(" ")
    if (words.length === 1) {
      // Single word: take first two characters
      return words[0].slice(0, 2).toUpperCase()
    }
    
    // Multiple words: take first character of first and last word
    const firstInitial = words[0]?.[0] || ""
    const lastInitial = words[words.length - 1]?.[0] || ""
    return (firstInitial + lastInitial).toUpperCase()
  }

  const initials = generateInitials(name)

  return (
    <Avatar className={cn(sizeMap[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={name} />
      )}
      <AvatarFallback 
        className={cn(
          "bg-card text-muted-foreground font-medium border border-border",
          textSizeMap[size]
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
} 