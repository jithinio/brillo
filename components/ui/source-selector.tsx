"use client"

import { useState } from "react"
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Delete02Icon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface SourceSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SourceSelector({ 
  value, 
  onValueChange, 
  placeholder = "How did they find you?",
  className,
  disabled = false
}: SourceSelectorProps) {
  const { allSources, customSources, addCustomSource, removeCustomSource, isLoading } = useCustomSources()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newSourceName, setNewSourceName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return

    setIsAdding(true)
    const success = addCustomSource(newSourceName)
    
    if (success) {
      setNewSourceName("")
      setShowAddDialog(false)
    }
    setIsAdding(false)
  }

  const handleRemoveCustomSource = (sourceValue: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeCustomSource(sourceValue)
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("h-9", className)}>
          <SelectValue placeholder="Loading sources..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn("h-9", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allSources.map((source) => (
            <SelectItem key={source.value} value={source.value} className="relative group">
              <div className="flex items-center w-full pr-8">
                <span className="flex-1">{source.label}</span>
              </div>
              {source.isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
                  onClick={(e) => handleRemoveCustomSource(source.value, e)}
                  title="Delete custom source"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                </Button>
              )}
            </SelectItem>
          ))}
          <div className="border-t mt-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs font-normal"
              onClick={() => setShowAddDialog(true)}
              disabled={disabled}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3 mr-2" />
              Add new source
            </Button>
          </div>
        </SelectContent>
      </Select>

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
