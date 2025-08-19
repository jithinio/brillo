"use client"

import * as React from "react"
import { HugeiconsIcon } from '@hugeicons/react'
import { ZapIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useCustomSources } from "@/hooks/use-custom-sources"
import { cn } from "@/lib/utils"

interface SearchableSourceFilterProps {
  selectedSources: string[]
  onSourcesChange: (sources: string[]) => void
}

export function SearchableSourceFilter({ selectedSources, onSourcesChange }: SearchableSourceFilterProps) {
  const [open, setOpen] = React.useState(false)
  const { allSources, isLoading } = useCustomSources()

  const handleSourceToggle = (sourceValue: string) => {
    const isSelected = selectedSources.includes(sourceValue)
    if (isSelected) {
      onSourcesChange(selectedSources.filter(s => s !== sourceValue))
    } else {
      onSourcesChange([...selectedSources, sourceValue])
    }
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground"
        disabled
      >
        <HugeiconsIcon icon={ZapIcon} className="mr-1 h-3 w-3" />
        Loading...
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
            selectedSources.length > 0 && "border-muted-foreground bg-muted text-muted-foreground"
          )}
        >
          <HugeiconsIcon icon={ZapIcon} className={cn("mr-1 h-3 w-3", selectedSources.length > 0 ? "text-muted-foreground" : "text-muted-foreground")} />
          {selectedSources.length > 0 ? `Source (${selectedSources.length})` : "Source"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search sources..." />
          <CommandList>
            <CommandEmpty>No sources found.</CommandEmpty>
            <CommandGroup>
              {allSources.map((source) => {
                const isSelected = selectedSources.includes(source.value)
                return (
                  <CommandItem
                    key={source.value}
                    onSelect={() => handleSourceToggle(source.value)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <div className="flex items-center justify-center w-4 h-4">
                        {isSelected && (
                          <HugeiconsIcon icon={Tick02Icon} className="h-3 w-3 text-foreground" />
                        )}
                      </div>
                      <span className="flex-1">{source.label}</span>
                      {source.isCustom && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
