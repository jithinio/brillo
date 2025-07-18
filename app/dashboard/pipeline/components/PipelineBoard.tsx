"use client"

import { useState, useCallback, useEffect } from "react"
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
import { successConfetti, cannonConfetti, fireworksConfetti, projectConversionConfetti } from '@/lib/confetti-variations'

interface PipelineBoardProps {
  projects: PipelineProject[]
  stages: PipelineStage[]
  onProjectUpdate: () => void
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
    <div className="w-20 flex-shrink-0 h-full">
      <div 
        ref={setNodeRef}
        className={`h-full bg-green-50 border-2 border-dashed rounded-lg flex items-center justify-center relative transition-colors ${
          isOver ? 'border-green-500 bg-green-100' : 'border-green-300'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform -rotate-90 text-green-700 font-medium text-xs whitespace-nowrap text-center px-1">
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

// Confetti animation function
const triggerConfetti = () => {
  const duration = 3000 // 3 seconds
  const animationEnd = Date.now() + duration
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 9999,
    colors: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7', '#a7f3d0']
  }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  // First burst from center
  confetti({
    ...defaults,
    particleCount: 150,
    spread: 60,
    origin: { x: 0.5, y: 0.6 },
    shapes: ['circle', 'square'],
    scalar: 1.4,
  })

  // Left side burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      spread: 80,
      origin: { x: 0.2, y: 0.7 },
      drift: 1,
      gravity: 0.8,
      shapes: ['star', 'circle'],
      scalar: 1.2,
    })
  }, 200)

  // Right side burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      spread: 80,
      origin: { x: 0.8, y: 0.7 },
      drift: -1,
      gravity: 0.8,
      shapes: ['star', 'circle'],
      scalar: 1.2,
    })
  }, 400)

  // Continuous small bursts
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    
    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)
    
    // Random positions across the top
    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount),
      spread: randomInRange(50, 100),
      origin: { 
        x: randomInRange(0.1, 0.9), 
        y: randomInRange(0.4, 0.8) 
      },
      drift: randomInRange(-2, 2),
      gravity: randomInRange(0.6, 1.2),
      shapes: ['circle', 'square', 'star'],
      scalar: randomInRange(0.8, 1.6),
    })
  }, 250)

  // Final big burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 200,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      shapes: ['star', 'circle', 'square'],
      scalar: 1.8,
      gravity: 0.9,
      drift: 0,
    })
  }, 1000)
}

export function PipelineBoard({ projects, stages, onProjectUpdate }: PipelineBoardProps) {
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
        const success = await convertProjectToActive(activeProject.id)
        if (success) {
          toast.success(`${activeProject.name} converted to active project`, {
            description: "Project moved to Projects page and saved to database"
          })
          // Trigger celebration confetti with random variation
          const celebrations = [successConfetti, cannonConfetti, fireworksConfetti, projectConversionConfetti]
          const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)]
          randomCelebration()
          onProjectUpdate()
        } else {
          toast.error("Failed to convert project to active", {
            description: "Changes not saved - please try again"
          })
        }
      } catch (error) {
        console.error('Error converting project to active:', error)
        toast.error("Failed to convert project to active")
      }
      return
    }

    // Don't update if dropped on the same stage
    if (activeProject.pipeline_stage?.toLowerCase() === overStage.toLowerCase()) return

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
          description: "Changes saved to database"
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
  }, [optimisticProjects, projects, stages, onProjectUpdate])

  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden">
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="flex gap-6 h-full max-h-full overflow-x-auto overflow-y-hidden">
          {columns.map((column) => (
            <PipelineColumn
              key={column.id}
              column={column}
              onProjectUpdate={onProjectUpdate}
              isDragging={isDragging}
            />
          ))}
          
          {/* Closed Column */}
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