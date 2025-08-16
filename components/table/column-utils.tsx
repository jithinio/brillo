import { HugeiconsIcon } from '@hugeicons/react';
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ArrowUp01Icon, ArrowDown01Icon, ReloadIcon } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"

interface SortableHeaderProps {
  column: any
  children: React.ReactNode
  icon?: any
  className?: string
}

export function SortableHeader({ 
  column, 
  children, 
  icon: Icon,
  className 
}: SortableHeaderProps) {
  const sortDirection = column.getIsSorted()
  
  return (
    <div className={cn("py-1 w-full overflow-hidden", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto p-0 font-normal text-sm hover:bg-transparent focus:outline-none flex items-center justify-start w-full max-w-full overflow-hidden"
            style={{ gap: '6px' }}
          >
            {Icon && (
              <HugeiconsIcon 
                icon={Icon}
                className="flex-shrink-0 text-muted-foreground" 
                style={{ 
                  width: '14px', 
                  height: '14px',
                  minWidth: '14px',
                  minHeight: '14px'
                }} 
              />
            )}
            <span className="text-sm font-normal truncate min-w-0 flex-1 text-left">{children}</span>
            {sortDirection && (
              <span className="ml-1 flex-shrink-0">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-32 p-1" 
          align="start" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => column.toggleSorting(false)}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="mr-2 h-3 w-3"  />
              Asc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => column.toggleSorting(true)}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="mr-2 h-3 w-3"  />
              Desc
            </Button>
            {sortDirection && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7"
                onClick={() => column.clearSorting()}
              >
                <HugeiconsIcon icon={ReloadIcon} className="mr-2 h-3 w-3"  />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 