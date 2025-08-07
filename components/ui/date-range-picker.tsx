"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { useSettings } from "@/components/settings-provider"

export function DateRangePicker({
  className,
  date,
  onDateChange,
  disableFuture = false,
  fromYear = 2004,
  toYear = new Date().getFullYear() + (disableFuture ? 0 : 10)
}: {
  className?: string
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  disableFuture?: boolean
  fromYear?: number
  toYear?: number
}) {
  const { formatDate } = useSettings()

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline-solid"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDate(date.from)} - {formatDate(date.to)}
                </>
              ) : (
                formatDate(date.from)
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            disabled={disableFuture ? (date) => date > new Date() || date < new Date("1900-01-01") : undefined}
            numberOfMonths={2}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 