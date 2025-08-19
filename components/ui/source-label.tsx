"use client"

import { Badge } from "@/components/ui/badge"
import { useCustomSources } from "@/hooks/use-custom-sources"

interface SourceLabelProps {
  value: string
  className?: string
}

export function SourceLabel({ value, className }: SourceLabelProps) {
  const { getSourceLabel, isLoading } = useCustomSources()
  
  if (!value) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  
  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs">
        {value}
      </Badge>
    )
  }
  
  const displayLabel = getSourceLabel(value)
  
  return (
    <Badge variant="outline" className={`text-xs ${className || ''}`}>
      {displayLabel}
    </Badge>
  )
}
