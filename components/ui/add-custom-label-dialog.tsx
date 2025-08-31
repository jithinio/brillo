"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from '@/components/ui/loader'
import { toast } from 'sonner'

interface AddCustomLabelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (label: string) => Promise<void>
}

export function AddCustomLabelDialog({ open, onOpenChange, onAdd }: AddCustomLabelDialogProps) {
  const [label, setLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!label.trim()) {
      toast.error('Label is required')
      return
    }

    if (label.length > 50) {
      toast.error('Label must be 50 characters or less')
      return
    }

    try {
      setIsSubmitting(true)
      await onAdd(label.trim())
      
      // Reset form
      setLabel('')
      onOpenChange(false)
      toast.success('Custom label added successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add custom label')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setLabel('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Quantity Label</DialogTitle>
          <DialogDescription>
            Create a custom label for your invoice quantity columns. This will be available only to you.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customLabel">Label</Label>
            <Input
              id="customLabel"
              placeholder="e.g., Sessions, Months, Pieces"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={50}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              {label.length}/50 characters
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Adding...
                </>
              ) : (
                'Add Label'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}