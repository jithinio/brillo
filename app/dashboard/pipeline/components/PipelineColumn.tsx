"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PipelineCard } from "./PipelineCard"
import { AddProjectDialog } from "./AddProjectDialog"
import type { ProjectStageColumn } from "@/lib/types/pipeline"

interface PipelineColumnProps {
  column: ProjectStageColumn
  onProjectUpdate: () => void
  isDragging: boolean
}

export function PipelineColumn({ column, onProjectUpdate, isDragging }: PipelineColumnProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      stage: column.title.toLowerCase(),
    },
  })

  const isFirstColumn = column.title.toLowerCase() === 'lead'

  return (
    <>
      <Card 
        ref={setNodeRef}
        className={`flex-1 min-w-80 h-full max-h-full flex flex-col border bg-transparent transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: column.color }}
              />
              {column.title}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {column.projects.length}
              </span>
            </CardTitle>
            {isFirstColumn && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddDialog(true)}
                className="h-8 w-8 p-0 hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 min-h-0 max-h-full overflow-y-auto space-y-3 pb-4">
          {column.projects.map((project) => (
            <PipelineCard
              key={project.id}
              project={project}
              onProjectUpdate={onProjectUpdate}
              isDragging={false}
            />
          ))}
          
          {column.projects.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              {isFirstColumn ? "Add your first project" : `No ${column.title.toLowerCase()} yet`}
            </div>
          )}

          {/* Drop zone indicator */}
          {isDragging && (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center text-muted-foreground text-sm">
              Drop here to move to {column.title}
            </div>
          )}
        </CardContent>
      </Card>

      <AddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProjectUpdate={onProjectUpdate}
      />
    </>
  )
} 