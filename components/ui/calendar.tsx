"use client"

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react"
import * as React from "react"
import { DayFlag, DayPicker, SelectionState, UI, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  captionLayout?: "dropdown" | "label"
  buttonVariant?: "default" | "outline" | "outline-solid" | "ghost"
}

export const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  ...props
}: CalendarProps) => {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...props.formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10 pointer-events-none h-9",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center relative",
          defaultClassNames.month_caption
        ),
        dropdowns: "flex items-center justify-center gap-1.5 text-sm font-medium",
        dropdown_root: "relative has-focus:border-ring border border-input shadow-sm has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
        dropdown: "absolute inset-0 opacity-0 cursor-pointer",
        caption_label: captionLayout === "dropdown" ? "select-none font-medium rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8" : "text-sm font-medium",
        table: "w-full border-collapse space-y-1",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          defaultClassNames.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary hover:text-primary-foreground",
          defaultClassNames.day_button
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation = "left" }) => {
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
              return <ChevronLeftIcon className="h-4 w-4" />
          }
        },
        CaptionLabel: ({ children, ...props }) => {
          if (captionLayout === "dropdown") {
            return (
              <span {...props} aria-hidden="true">
                {children}
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </span>
            )
          }
          return <span {...props}>{children}</span>
        },
      }}
      {...props}
    />
  )
}
