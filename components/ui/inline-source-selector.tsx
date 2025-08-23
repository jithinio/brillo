"use client"

import { useState, useRef, useEffect } from "react"
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Delete02Icon, Tick02Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useCustomSources } from "@/hooks/use-custom-sources"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface InlineSourceSelectorProps {
  value?: string | null
  onValueChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function InlineSourceSelector({ 
  value, 
  onValueChange, 
  className,
  disabled = false
}: InlineSourceSelectorProps) {
  const { allSources, customSources, addCustomSource, removeCustomSource, getSourceLabel, isLoading } = useCustomSources()
  const [open, setOpen] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newSourceName, setNewSourceName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const currentSource = allSources.find(source => source.value === value)
  const displayValue = currentSource?.label || (value ? getSourceLabel(value) : "—")

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return

    setIsAdding(true)
    const success = addCustomSource(newSourceName)
    
    if (success) {
      // Auto-select the newly created source
      const sourceValue = newSourceName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
      onValueChange(sourceValue)
      setNewSourceName("")
      setShowAddDialog(false)
      setOpen(false)
    }
    setIsAdding(false)
  }

  const handleRemoveCustomSource = (sourceValue: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeCustomSource(sourceValue)
    
    // If the removed source was selected, clear the selection
    if (value === sourceValue) {
      onValueChange("")
    }
  }

  const handleSelect = (sourceValue: string) => {
    onValueChange(sourceValue)
    setOpen(false)
  }

  const handleClear = () => {
    onValueChange("")
    setOpen(false)
  }

  if (isLoading) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Loading...
      </div>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {value ? (
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer hover:bg-muted transition-colors font-normal text-sm",
                className
              )}
              onClick={() => !disabled && setOpen(true)}
            >
              {displayValue}
            </Badge>
          ) : (
            <div
              className={cn(
                "w-full cursor-pointer text-sm text-muted-foreground bg-transparent hover:bg-muted/30 transition-colors py-1 px-2 rounded",
                className
              )}
              onClick={() => !disabled && setOpen(true)}
            >
              {displayValue}
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search sources..." className="h-9" />
            <CommandList>
              <CommandEmpty>No sources found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={handleClear}
                >
                  <span className="text-muted-foreground">None</span>
                  {!value && <HugeiconsIcon icon={Tick02Icon} className="ml-auto h-4 w-4" />}
                </CommandItem>
                {allSources.map((source) => (
                  <CommandItem
                    key={source.value}
                    value={source.value}
                    onSelect={() => handleSelect(source.value)}
                    className="group relative"
                  >
                    <div className="flex items-center w-full pr-2">
                      <span className="flex-1">{source.label}</span>
                      <div className="flex items-center space-x-1 ml-auto">
                        {source.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
                            onClick={(e) => handleRemoveCustomSource(source.value, e)}
                            title="Delete custom source"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                          </Button>
                        )}
                        {value === source.value && (
                          <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setShowAddDialog(true)
                  }}
                  className="text-foreground"
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                  Add new source
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Source</DialogTitle>
            <DialogDescription>
              Create a custom source option that will be available for all clients.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">Source Name</Label>
              <Input
                id="source-name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g., Trade Show, Word of Mouth, LinkedIn"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSource()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setNewSourceName("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={!newSourceName.trim() || isAdding}
            >
              {isAdding ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
