"use client"

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react"
import * as React from "react"
import { DayFlag, DayPicker, SelectionState, UI } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) => {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        [UI.Months]: "flex flex-row space-y-0 relative",
        [UI.Month]: "space-y-4",
        [UI.MonthCaption]: "flex justify-center items-center h-9 pt-1 relative",
        [UI.CaptionLabel]: "text-sm font-medium",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline-solid" }),
          "absolute left-1 top-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline-solid" }),
          "absolute right-1 top-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        [UI.Week]: "flex w-full mt-2",
        [UI.Day]:
          "h-9 w-9 text-center rounded-md text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary hover:text-primary-foreground",
        ),
        [SelectionState.range_end]: "day-range-end",
        [SelectionState.selected]:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        [SelectionState.range_middle]:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        [DayFlag.today]: "bg-accent text-accent-foreground",
        [DayFlag.outside]:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        [DayFlag.disabled]: "text-muted-foreground opacity-50",
        [DayFlag.hidden]: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => <Chevron {...props} />,
        Dropdown: ({ options, value, onChange, ...props }) => {
          // Determine if this is a month or year dropdown based on the first option
          const isMonthDropdown = options && options.length > 0 && options[0]?.value >= 0 && options[0]?.value <= 11
          const isYearDropdown = options && options.length > 0 && options[0]?.value >= 2020 && options[0]?.value <= 2030
          
          // Format month names to short form
          const formatOptions = (options: any[]) => {
            if (isMonthDropdown) {
              return options.map(option => ({
                ...option,
                label: new Date(2024, option.value, 1).toLocaleDateString('en-US', { month: 'short' })
              }))
            }
            return options
          }
          
          const formattedOptions = formatOptions(options || [])
          
          return (
            <select
              value={value?.toString()}
              onChange={(e) => {
                const event = {
                  target: { value: e.target.value }
                } as React.ChangeEvent<HTMLSelectElement>
                onChange?.(event)
              }}
              className={cn(
                "flex h-10 items-center justify-center rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-ring focus:ring-ring/50 focus:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive appearance-none cursor-pointer [&>span]:line-clamp-1",
                isMonthDropdown ? "w-16" : "w-20" // Month dropdown narrower (short names), year dropdown wider
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1rem 1rem',
                paddingRight: '1.5rem'
              }}
            >
              {formattedOptions?.map((option) => (
                <option key={option.value} value={option.value.toString()}>
                  {option.label}
                </option>
              ))}
            </select>
          )
        },
        DropdownNav: ({ children, className, ...props }) => (
          <div className={cn("flex items-center justify-center gap-2 w-full px-8", className)} {...props}>
            {children}
          </div>
        ),
      }}
      {...props}
    />
  )
}

const Chevron = ({ orientation = "left" }) => {
  switch (orientation) {
    case "left":
      return <ChevronLeftIcon className="h-4 w-4" />
    case "right":
      return <ChevronRightIcon className="h-4 w-4" />
    case "up":
      return <ChevronUpIcon className="h-4 w-4" />
    case "down":
      return <ChevronDownIcon className="h-4 w-4" />
    default:
      return null
  }
}
