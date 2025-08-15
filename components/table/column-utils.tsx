import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableHeaderProps {
  column: any
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
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
              <Icon 
                className="flex-shrink-0" 
                style={{ 
                  width: '12px', 
                  height: '12px',
                  minWidth: '12px',
                  minHeight: '12px'
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
              <ArrowUp className="mr-2 h-3 w-3" />
              Asc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => column.toggleSorting(true)}
            >
              <ArrowDown className="mr-2 h-3 w-3" />
              Desc
            </Button>
            {sortDirection && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7"
                onClick={() => column.clearSorting()}
              >
                <ChevronsUpDown className="mr-2 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 