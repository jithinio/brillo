"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core"
import { PipelineColumn } from "./PipelineColumn"
import { PipelineCard } from "./PipelineCard"
import { updateProjectStage, groupProjectsByStage, convertProjectToActive } from "@/lib/project-pipeline"
import type { PipelineProject, PipelineStage } from "@/lib/types/pipeline"
import { toast } from "sonner"
import confetti from 'canvas-confetti'

interface PipelineBoardProps {
  projects: PipelineProject[]
  stages: PipelineStage[]
  onProjectUpdate: () => void
  onRemoveProject?: (projectId: string) => void
  onUpdateProject?: (projectId: string, updates: Partial<PipelineProject>) => void
  onRevertChanges?: () => void
  loading?: boolean
}

// Closed Column Component
function ClosedColumn({ isDragging }: { isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'closed',
    data: {
      type: "column",
      stage: "closed",
    },
  })

  return (
    <div className="w-32 flex-shrink-0 h-full">
      <div 
        ref={setNodeRef}
        className={`h-full bg-green-50 dark:bg-green-950/20 border border-dashed rounded-none flex items-center justify-center relative transition-colors ${
          isOver ? 'border-green-500 dark:border-green-400 bg-green-100 dark:bg-green-900/30' : 'border-green-300 dark:border-green-600'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform -rotate-90 text-green-700 dark:text-green-300 font-medium text-xs whitespace-nowrap text-center px-1">
            {isDragging && isOver ? (
              "DRAG HERE TO MARK AS CLOSED"
            ) : (
              "CLOSED"
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Minimal confetti animation function for project completion
const triggerMinimalConfetti = () => {
  // Simple success colors - green theme
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#059669']
  
  // Single gentle burst from center
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.5, y: 0.6 },
    colors: colors,
    shapes: ['circle'],
    scalar: 1.0,
    gravity: 0.8,
    startVelocity: 25,
    ticks: 60,
    zIndex: 1000
  })

  // Small follow-up burst after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 25,
      spread: 40,
      origin: { x: 0.5, y: 0.7 },
      colors: colors,
      shapes: ['circle'],
      scalar: 0.8,
      gravity: 0.9,
      startVelocity: 20,
      ticks: 50,
      zIndex: 1000
    })
  }, 200)
}

export function PipelineBoard({ 
  projects, 
  stages, 
  onProjectUpdate, 
  onRemoveProject,
  onUpdateProject,
  onRevertChanges,
  loading = false 
}: PipelineBoardProps) {
  const [activeProject, setActiveProject] = useState<PipelineProject | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [optimisticProjects, setOptimisticProjects] = useState<PipelineProject[]>(projects)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Even smaller distance for instant responsiveness
      },
    })
  )

  // Update optimistic projects when props change
  useEffect(() => {
    setOptimisticProjects(projects)
  }, [projects])

  const columns = groupProjectsByStage(optimisticProjects, stages)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const project = active.data.current?.project as PipelineProject
    
    if (project) {
      setActiveProject(project)
      setIsDragging(true)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveProject(null)
    setIsDragging(false)

    if (!over) return

    const activeProject = active.data.current?.project as PipelineProject
    const overStage = over.data.current?.stage as string

    if (!activeProject || !overStage) return

    // Handle closed column conversion
    if (overStage === 'closed') {
      try {
        // Optimistically remove project from pipeline
        if (onRemoveProject) {
          onRemoveProject(activeProject.id)
        }

        const success = await convertProjectToActive(activeProject.id)
        if (success) {
          toast.success(`${activeProject.name} converted to active project`, {
            description: "Project moved to Projects page and saved to database"
          })
          // Trigger minimal celebration confetti
          triggerMinimalConfetti()
          // Don't call onProjectUpdate() - optimistic update already handled UI
        } else {
          toast.error("Failed to convert project to active", {
            description: "Changes not saved - please try again"
          })
          // Revert optimistic changes on failure
          if (onRevertChanges) {
            onRevertChanges()
          }
        }
      } catch (error) {
        console.error('Error converting project to active:', error)
        toast.error("Failed to convert project to active")
        // Revert optimistic changes on failure
        if (onRevertChanges) {
          onRevertChanges()
        }
      }
      return
    }

    // Don't update if dropped on the same stage
    if (activeProject.pipeline_stage?.toLowerCase() === overStage.toLowerCase()) return

    // Store original stage for undo functionality
    const originalStage = activeProject.pipeline_stage
    const originalProbability = activeProject.deal_probability

    // Find the stage to get default probability
    const targetStage = stages.find(s => s.name.toLowerCase() === overStage.toLowerCase())
    const newProbability = targetStage?.default_probability || activeProject.deal_probability

    // Optimistic update - update UI immediately
    const updatedOptimisticProjects = optimisticProjects.map(project => 
      project.id === activeProject.id 
        ? { ...project, pipeline_stage: overStage, deal_probability: newProbability }
        : project
    )
    setOptimisticProjects(updatedOptimisticProjects)

    // Update the project stage in background
    try {
      const success = await updateProjectStage(activeProject.id, overStage, newProbability)
      if (success) {
        toast.success(`Moved ${activeProject.name} to ${overStage}`, {
          description: "Changes saved to database",
          action: {
            label: "Undo",
            onClick: async () => {
              // Revert optimistically first
              const revertedOptimisticProjects = optimisticProjects.map(project => 
                project.id === activeProject.id 
                  ? { ...project, pipeline_stage: originalStage, deal_probability: originalProbability }
                  : project
              )
              setOptimisticProjects(revertedOptimisticProjects)
              
              // Then update database
              try {
                const revertSuccess = await updateProjectStage(activeProject.id, originalStage || 'lead', originalProbability || 10)
                if (revertSuccess) {
                  toast.success(`Reverted ${activeProject.name} to ${originalStage || 'lead'}`, {
                    description: "Changes undone successfully"
                  })
                } else {
                  // If revert fails, reload from server
                  if (onRevertChanges) {
                    onRevertChanges()
                  }
                  toast.error("Failed to undo - reloading current state")
                }
              } catch (error) {
                // If revert fails, reload from server
                if (onRevertChanges) {
                  onRevertChanges()
                }
                toast.error("Failed to undo - reloading current state")
              }
            },
          },
        })
        // Don't call onProjectUpdate here - let the optimistic update handle the UI
      } else {
        toast.error("Failed to update project stage", {
          description: "Changes not saved - please try again"
        })
        // Revert optimistic update on failure
        setOptimisticProjects(projects)
      }
    } catch (error) {
      console.error('Error updating project stage:', error)
      toast.error("Failed to update project stage")
      // Revert optimistic update on failure
      setOptimisticProjects(projects)
    }
  }, [optimisticProjects, projects, stages, onProjectUpdate, onRemoveProject, onRevertChanges])

  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden">
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="flex gap-0 h-full max-h-full overflow-x-auto overflow-y-hidden relative">
          {/* Loading Overlay - Badge loader like tables */}
          {loading && (
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
              <Badge 
                variant="secondary" 
                className="flex items-center gap-2 text-xs shadow-md border bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                <div className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading pipeline...</span>
              </Badge>
            </div>
          )}

          {/* Render stage columns */}
          {columns.length > 0 && (
            columns.map((column) => (
              <PipelineColumn
                key={column.id}
                column={column}
                onProjectUpdate={onProjectUpdate}
                isDragging={isDragging}
              />
            ))
          )}
          
          {/* Closed Column - always at the end */}
          <ClosedColumn isDragging={isDragging} />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeProject ? (
            <div className="transform-gpu">
              <PipelineCard 
                project={activeProject} 
                onProjectUpdate={onProjectUpdate}
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
} 