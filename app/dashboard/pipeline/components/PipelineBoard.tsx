"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
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
import { updateProjectStage, groupProjectsByStage, convertProjectToActive, convertProjectToLost } from "@/lib/project-pipeline"
import type { PipelineProject, PipelineStage } from "@/lib/types/pipeline"
import { toast } from "sonner"
import confetti from 'canvas-confetti'
import { History, User, DollarSign, MoreVertical, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { supabase } from "@/lib/supabase"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { EditProjectDialog } from "./EditProjectDialog"

interface PipelineBoardProps {
  projects: PipelineProject[]
  stages: PipelineStage[]
  onProjectUpdate: () => void
  onRemoveProject?: (projectId: string) => void
  onUpdateProject?: (projectId: string, updates: Partial<PipelineProject>) => void
  onRevertChanges?: () => void
  loading?: boolean
}

// Combined Closed Column Component
function ClosedColumn({ isDragging, onShowLostClients }: { isDragging: boolean, onShowLostClients: () => void }) {
  const { isOver: isOverWon, setNodeRef: setNodeRefWon } = useDroppable({
    id: 'closed-won',
    data: {
      type: "column",
      stage: "closed-won",
    },
  })

  const { isOver: isOverLost, setNodeRef: setNodeRefLost } = useDroppable({
    id: 'closed-lost',
    data: {
      type: "column",
      stage: "closed-lost",
    },
  })

  return (
    <div className="w-32 flex-shrink-0 h-full flex flex-col">
      {/* Closed Won - Top Half */}
      <div className="flex-1">
        <div 
          ref={setNodeRefWon}
          className={`h-full bg-green-50 dark:bg-green-950/20 border border-dashed rounded-none flex items-center justify-center relative transition-colors ${
            isOverWon ? 'border-green-500 dark:border-green-400 bg-green-100 dark:bg-green-900/30' : 'border-green-300 dark:border-green-600'
          }`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="transform -rotate-90 text-green-700 dark:text-green-300 font-medium text-xs whitespace-nowrap text-center px-1">
              {isDragging && isOverWon ? (
                "DRAG HERE TO CLOSE AS WON"
              ) : (
                "WON"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Closed Lost - Bottom Half */}
      <div className="flex-1 flex flex-col">
        <div 
          ref={setNodeRefLost}
          className={`flex-1 bg-red-50 dark:bg-red-950/20 border border-dashed rounded-none flex items-center justify-center relative transition-colors ${
            isOverLost ? 'border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/30' : 'border-red-300 dark:border-red-600'
          }`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="transform -rotate-90 text-red-700 dark:text-red-300 font-medium text-xs whitespace-nowrap text-center px-1">
              {isDragging && isOverLost ? (
                "DRAG HERE TO MARK AS LOST"
              ) : (
                "LOST"
              )}
            </div>
          </div>
        </div>
        
        {/* History Button */}
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowLostClients}
            className="w-full h-6 text-xs text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 border-none"
          >
            <History className="h-3 w-3 mr-1" />
            History
          </Button>
        </div>
      </div>
    </div>
  )
}

// Lost Client Card Component
function LostClientCard({ project, onRestore, onEdit, onProjectUpdate, onRefreshLostClients }: { 
  project: PipelineProject, 
  onRestore: (projectId: string, stage: string) => void,
  onEdit: (project: PipelineProject) => void,
  onProjectUpdate: () => void,
  onRefreshLostClients: () => void
}) {
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleRestore = (stage: string) => {
    onRestore(project.id, stage)
  }

  const handleCardClick = () => {
    setShowEditDialog(true)
  }

  return (
    <>
      <Card className="group transition-all border bg-white dark:bg-gray-800 hover:shadow-md cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Status Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 
                  className="font-medium text-sm truncate cursor-pointer hover:text-blue-600 transition-colors text-gray-900 dark:text-gray-100"
                  onClick={handleCardClick}
                >
                  {project.name}
                </h3>
                <Badge variant="destructive" className="text-xs">
                  Lost
                </Badge>
              </div>
              {project.clients && (
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate">{project.clients.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCardClick}>
                    <MoreVertical className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleRestore('lead')}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore to Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRestore('pitched')}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore to Pitched
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRestore('in discussion')}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore to Discussion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>



          {/* Budget */}
          {project.budget && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <DollarSign className="w-3 h-3 mr-1" />
                <span>Budget</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatLargeNumber(project.budget || 0, getCurrencySymbol())}
              </span>
            </div>
          )}

          {/* Deal Probability */}
          {project.deal_probability !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Deal Probability</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {project.deal_probability}%
                </span>
              </div>
              <Progress 
                value={project.deal_probability} 
                className="h-2" 
              />
            </div>
          )}

          {/* Notes */}
          {project.pipeline_notes && (
                      <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border text-gray-600 dark:text-gray-400">
            {project.pipeline_notes}
          </div>
        )}

        {/* Lost Date */}
        <div className="text-xs text-red-600 dark:text-red-400 border-t pt-2">
          Lost on: {new Date(project.updated_at).toLocaleDateString()}
        </div>
      </div>
    </CardContent>
  </Card>

  <EditProjectDialog
    open={showEditDialog}
    onOpenChange={setShowEditDialog}
    onProjectUpdate={() => {
      onProjectUpdate()
      onRefreshLostClients() // Refresh lost clients after edit
    }}
    project={project}
  />
</>
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
  const [showLostClients, setShowLostClients] = useState(false)
  const [lostClients, setLostClients] = useState<PipelineProject[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingLostClients, setLoadingLostClients] = useState(false)
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

  // Fetch lost clients from Supabase
  const fetchLostClients = useCallback(async () => {
    setLoadingLostClients(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            company,
            country
          )
        `)
        .eq('pipeline_stage', 'lost')
        .is('status', null) // Only fetch projects with null status (lost projects)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching lost clients:', error)
        toast.error('Failed to load lost clients')
        return
      }

      setLostClients(data || [])
    } catch (error) {
      console.error('Error fetching lost clients:', error)
      toast.error('Failed to load lost clients')
    } finally {
      setLoadingLostClients(false)
    }
  }, [])

  // Open lost clients sidebar
  const handleShowLostClients = useCallback(() => {
    setShowLostClients(true)
    fetchLostClients()
  }, [fetchLostClients])

  // Filter lost clients based on search query
  const filteredLostClients = useMemo(() => {
    if (!searchQuery.trim()) return lostClients
    
    const query = searchQuery.toLowerCase()
    return lostClients.filter(project => 
      project.name?.toLowerCase().includes(query) ||
      project.clients?.name?.toLowerCase().includes(query) ||
      project.clients?.company?.toLowerCase().includes(query) ||
      project.clients?.email?.toLowerCase().includes(query)
    )
  }, [lostClients, searchQuery])

  // Handle restoring lost clients to pipeline
  const handleRestoreLostClient = useCallback(async (projectId: string, stage: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'pipeline', // Set to 'pipeline' so it shows in pipeline view
          pipeline_stage: stage,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (error) {
        console.error('Error restoring project:', error)
        toast.error('Failed to restore project')
        return
      }

      // Remove from lost clients list
      setLostClients(prev => prev.filter(p => p.id !== projectId))
      
      // Refresh pipeline data
      onProjectUpdate()

      toast.success(`Project restored to ${stage} successfully`)
    } catch (error) {
      console.error('Error restoring project:', error)
      toast.error('Failed to restore project')
    }
  }, [onProjectUpdate])

  // Handle editing lost clients (now handled directly in LostClientCard)

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
    const fromLostClients = active.data.current?.fromLostClients as boolean

    if (!activeProject || !overStage) return

    // Skip logic for lost clients since they no longer support drag

    // Handle closed-won column conversion
    if (overStage === 'closed-won') {
      try {
        // Optimistically remove project from pipeline
        if (onRemoveProject) {
          onRemoveProject(activeProject.id)
        }

        const success = await convertProjectToActive(activeProject.id)
        if (success) {
          toast.success(`${activeProject.name} closed as WON! 🎉`, {
            description: "Project converted to active and moved to Projects page"
          })
          // Trigger minimal celebration confetti
          triggerMinimalConfetti()
        } else {
          toast.error("Failed to close project as won", {
            description: "Changes not saved - please try again"
          })
          // Revert optimistic changes on failure
          if (onRevertChanges) {
            onRevertChanges()
          }
        }
      } catch (error) {
        console.error('Error closing project as won:', error)
        toast.error("Failed to close project as won")
        // Revert optimistic changes on failure
        if (onRevertChanges) {
          onRevertChanges()
        }
      }
      return
    }

    // Handle closed-lost column conversion
    if (overStage === 'closed-lost') {
      try {
        // Optimistically remove project from pipeline
        if (onRemoveProject) {
          onRemoveProject(activeProject.id)
        }

        const success = await convertProjectToLost(activeProject.id)
        if (success) {
          toast.success(`${activeProject.name} marked as lost`, {
            description: "Project closed as lost opportunity"
          })
        } else {
          toast.error("Failed to mark project as lost", {
            description: "Changes not saved - please try again"
          })
          // Revert optimistic changes on failure
          if (onRevertChanges) {
            onRevertChanges()
          }
        }
      } catch (error) {
        console.error('Error marking project as lost:', error)
        toast.error("Failed to mark project as lost")
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
                <Loader size="xs" variant="default" />
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
          <ClosedColumn isDragging={isDragging} onShowLostClients={handleShowLostClients} />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeProject ? (
            <div className="transform-gpu will-change-transform">
              <PipelineCard 
                project={activeProject} 
                onProjectUpdate={onProjectUpdate}
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lost Clients Sidebar */}
      <Sheet open={showLostClients} onOpenChange={setShowLostClients}>
        <SheetContent side="right" className="w-[400px] sm:w-[500px] transform-gpu will-change-transform">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-red-600" />
              Lost Clients History
            </SheetTitle>
          </SheetHeader>
          
          {/* Only render content when sidebar is open for better performance */}
          {showLostClients && (
            <div className="mt-6 space-y-4">
              {/* Search Bar */}
              <Input
                placeholder="Search lost clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              
              {/* Lost Clients List */}
              <ScrollArea className="h-[calc(100vh-240px)] transform-gpu">
                {loadingLostClients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading lost clients...</div>
                  </div>
                ) : filteredLostClients.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      {searchQuery ? 'No clients found matching your search.' : 'No lost clients found.'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLostClients.map((project) => (
                      <LostClientCard
                        key={project.id}
                        project={project}
                        onRestore={handleRestoreLostClient}
                        onEdit={() => {}} // Not used anymore
                        onProjectUpdate={onProjectUpdate}
                        onRefreshLostClients={fetchLostClients}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 