"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

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
}

export function DatePicker({ 
  date, 
  onSelect, 
  placeholder = "Pick a date", 
  disabled,
  size = "default"
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
          <CalendarIcon className="mr-2 h-4 w-4" />
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
          initialFocus
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  )
} 