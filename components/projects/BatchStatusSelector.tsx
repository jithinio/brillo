"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from '@hugeicons/react'
import { 
  ClockIcon, 
  CheckmarkCircleIcon, 
  PauseIcon, 
  CancelCircleIcon, 
  FilterIcon,
  ArrowDown01Icon 
} from '@hugeicons/core-free-icons'

interface BatchStatusSelectorProps {
  onStatusChange: (status: string) => void
  disabled?: boolean
}

const statusOptions = [
  {
    value: "active",
    label: "Active",
    icon: ClockIcon,
    iconClassName: "text-blue-500",
  },
  {
    value: "completed",
    label: "Completed", 
    icon: CheckmarkCircleIcon,
    iconClassName: "text-green-500",
  },
  {
    value: "on_hold",
    label: "On Hold",
    icon: PauseIcon,
    iconClassName: "text-amber-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: CancelCircleIcon,
    iconClassName: "text-rose-500",
  },
  {
    value: "pipeline",
    label: "Pipeline",
    icon: FilterIcon,
    iconClassName: "text-purple-500",
  },
]

export function BatchStatusSelector({ onStatusChange, disabled = false }: BatchStatusSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 px-3 text-xs hover:bg-muted"
        >
          Status
          <HugeiconsIcon icon={ArrowDown01Icon} className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => onStatusChange(status.value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <HugeiconsIcon
              icon={status.icon}
              className={`h-4 w-4 ${status.iconClassName}`}
            />
            <span>{status.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
