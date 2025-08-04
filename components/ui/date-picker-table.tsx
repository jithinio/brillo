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

interface DatePickerTableProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePickerTable({ 
  date, 
  onSelect, 
  placeholder = "Pick a date", 
  disabled
}: DatePickerTableProps) {
  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "cursor-pointer text-left font-normal w-full min-w-0 text-sm",
            !date && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="truncate min-w-0">
            {date ? format(date, "MMM d, yy") : placeholder}
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
          onSelect={onSelect}
          initialFocus
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  )
} 