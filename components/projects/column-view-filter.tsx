"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, EyeOff, GripVertical, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Column {
  id: string
  accessorKey?: string
  header: string | ((props: any) => React.ReactNode)
  visible: boolean
  canHide?: boolean
}

interface ColumnViewFilterProps {
  columns: Column[]
  onColumnReorder: (activeId: string, overId: string) => void
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void
  className?: string
}

interface SortableColumnItemProps {
  column: Column
  onVisibilityToggle: (columnId: string, visible: boolean) => void
}

function SortableColumnItem({ column, onVisibilityToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Get readable header text
  const getHeaderText = (header: string | ((props: any) => React.ReactNode)): string => {
    if (typeof header === 'string') return header
    // For function headers, try to extract meaningful text
    if (typeof header === 'function') {
      // Common header mappings for our table
      const headerMappings: Record<string, string> = {
        'select': 'Select',
        'name': 'Project Name', 
        'client': 'Client',
        'status': 'Status',
        'start_date': 'Start Date',
        'due_date': 'Due Date',
        'budget': 'Budget',
        'expenses': 'Expenses', 
        'received': 'Received',
        'pending': 'Pending',
      }
      return headerMappings[column.accessorKey || column.id] || column.id
    }
    return column.id
  }

  const headerText = getHeaderText(column.header)
  const canHide = column.canHide !== false // Default to true unless explicitly false

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
                        "flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                isDragging && "opacity-50 shadow-lg border border-gray-200 dark:border-gray-700 rounded-md"
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
                        className="cursor-grab hover:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium truncate flex-1">
          {headerText}
        </span>
      </div>
      
      {canHide && (
        <Button
          variant="ghost"
          size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => onVisibilityToggle(column.id, !column.visible)}
        >
          {column.visible ? (
                          <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
        </Button>
      )}
    </div>
  )
}

export function ColumnViewFilter({ columns, onColumnReorder, onColumnVisibilityChange, className }: ColumnViewFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = columns.findIndex(col => col.id === active.id)
      const newIndex = columns.findIndex(col => col.id === over?.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onColumnReorder(active.id as string, over?.id as string)
      }
    }
  }

  const visibleCount = columns.filter(col => col.visible).length
  const totalCount = columns.length
  const hasHiddenColumns = visibleCount < totalCount

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 border-dashed transition-colors text-sm font-normal text-muted-foreground",
            hasHiddenColumns && "border-gray-600 dark:border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
            className
          )}
        >
          <Settings className={cn("mr-1 h-3 w-3", hasHiddenColumns ? "text-gray-600 dark:text-gray-400" : "text-muted-foreground")} />
          View
          {hasHiddenColumns && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {totalCount - visibleCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-gray-200 dark:border-gray-700 p-3">
          <h4 className="font-medium text-sm">Customize columns</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Drag to reorder • Click eye to show/hide
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columns.map(col => col.id)} strategy={verticalListSortingStrategy}>
              {columns.map((column) => (
                <SortableColumnItem
                  key={column.id}
                  column={column}
                  onVisibilityToggle={onColumnVisibilityChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {visibleCount} of {totalCount} columns shown
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                // Reset all columns to visible
                columns.forEach(col => {
                  if (!col.visible && col.canHide !== false) {
                    onColumnVisibilityChange(col.id, true)
                  }
                })
              }}
            >
              Show all
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 