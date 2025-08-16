"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import * as React from "react"
import { format } from "date-fns"
import { Calendar01Icon } from '@hugeicons/core-free-icons'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useSettings } from "@/components/settings-provider"
import { formatDateWithUserPreference } from "@/lib/date-format"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  size?: "default" | "sm"
  disableFuture?: boolean
  fromYear?: number
  toYear?: number
}

export function DatePicker({ 
  date, 
  onSelect, 
  placeholder = "Pick a date", 
  disabled,
  size = "default",
  disableFuture = false,
  fromYear = 2004,
  toYear = new Date().getFullYear() + (disableFuture ? 0 : 10)
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { formatDate } = useSettings()

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate)
    setOpen(false) // Close popover after selection
  }

  // Format the displayed date using user's preferred format
  const displayDate = date ? formatDate(date) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn(
            "flex justify-start text-left font-normal w-full min-w-0",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
                        <HugeiconsIcon icon={Calendar01Icon} className="mr-2 h-4 w-4" />
          {displayDate ? <span>{displayDate}</span> : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date} // Preserve the month of the selected date when opening
          disabled={disableFuture ? (date) => date > new Date() || date < new Date("1900-01-01") : undefined}
          initialFocus
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  )
} 