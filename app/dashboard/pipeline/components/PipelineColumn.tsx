"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PipelineCard } from "./PipelineCard"
import type { ProjectStageColumn } from "@/lib/types/pipeline"

interface PipelineColumnProps {
  column: ProjectStageColumn
  onProjectUpdate: () => void
  isDragging: boolean
}

export function PipelineColumn({ column, onProjectUpdate, isDragging }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      stage: column.title.toLowerCase(),
    },
  })

  const isFirstColumn = column.title.toLowerCase() === 'lead'

  // Convert hex color to RGB for transparency
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgb = hexToRgb(column.color)
  const hoverBgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)` : 'rgba(59, 130, 246, 0.05)'
  const hoverBorderColor = column.color

  return (
    <Card 
      ref={setNodeRef}
      className={`flex-1 min-w-80 h-full max-h-full flex flex-col bg-transparent transition-colors rounded-none border-y border-r border-gray-200 dark:border-gray-700 border-l-0 first:border-l ${
        isOver ? 'shadow-sm' : ''
      }`}
      style={{
        ...(isOver && {
          backgroundColor: hoverBgColor
        })
      }}
    >
      <CardHeader className="flex-col space-y-1.5 p-6 px-6 py-0 flex-shrink-0 border-b border-border h-[60px] flex items-left justify-center">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color }}
          />
          <CardTitle className="text-sm font-medium">
            {column.title}
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {column.projects.length}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-6 flex-1 min-h-0 max-h-full overflow-y-auto pb-4">
        {column.projects.map((project, index) => (
          <div key={project.id} className={index > 0 ? "mt-4" : ""}>
            <PipelineCard
              project={project}
              onProjectUpdate={onProjectUpdate}
              isDragging={false}
            />
          </div>
        ))}
        
        {column.projects.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {isFirstColumn ? "Add your first project" : `No ${column.title.toLowerCase()} yet`}
          </div>
        )}

        {/* Drop zone indicator */}
        {isDragging && (
          <div className="mt-6 mb-4 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
            Drop here to move to {column.title}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 