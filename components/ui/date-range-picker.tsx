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

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: {
  className?: string
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}) {
  const currentYear = new Date().getFullYear()
  const [month, setMonth] = React.useState<Date>(() => {
    return date?.from || new Date()
  })

  // Update month when date.from changes externally
  React.useEffect(() => {
    if (date?.from) {
      setMonth(date.from)
    }
  }, [date?.from])

  const handleSelect = (newDateRange: DateRange | undefined) => {
    if (newDateRange) {
      // If we're selecting a "from" date, update the month to show that date
      if (newDateRange.from && (!date?.from || newDateRange.from.getTime() !== date.from.getTime())) {
        setMonth(newDateRange.from)
      }
      // If we're completing a range selection, don't change the month
      // This prevents the left calendar from jumping when selecting "to" date
    }
    onDateChange(newDateRange)
  }

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth)
  }
  
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal border-0 bg-white dark:bg-neutral-700 shadow-none",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM dd, y")} -{" "}
                  {format(date.to, "MMM dd, y")}
                </>
              ) : (
                format(date.from, "MMM dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 z-50" 
          align="end" 
          sideOffset={4}
          avoidCollisions={true}
        >
          <Calendar
            mode="range"
            month={month}
            onMonthChange={handleMonthChange}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            captionLayout="dropdown"
            fromYear={currentYear - 10}
            toYear={currentYear + 10}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 