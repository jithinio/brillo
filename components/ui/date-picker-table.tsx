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

interface DatePickerTableProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  disableFuture?: boolean
  fromYear?: number
  toYear?: number
}

export function DatePickerTable({ 
  date, 
  onSelect, 
  placeholder = "Pick a date", 
  disabled,
  disableFuture = false,
  fromYear = 2004,
  toYear = new Date().getFullYear() + (disableFuture ? 0 : 10)
}: DatePickerTableProps) {
  const [open, setOpen] = React.useState(false)
  const { formatDate } = useSettings()

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate)
    setOpen(false) // Close popover after selection
  }

  // Format the displayed date using user's preferred format (compact for tables)
  const displayDate = date ? formatDate(date) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "cursor-pointer text-left font-normal w-full min-w-0 text-sm",
            !date && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="truncate min-w-0">
            {displayDate || placeholder}
          </span>
        </div>
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