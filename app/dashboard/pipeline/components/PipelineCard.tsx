"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreVertical, User, DollarSign, CheckCircle, Trash2 } from "lucide-react"
import { convertProjectToActive, deletePipelineProject } from "@/lib/project-pipeline"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import type { PipelineProject } from "@/lib/types/pipeline"
import { toast } from "sonner"
import { EditProjectDialog } from "./EditProjectDialog"

interface PipelineCardProps {
  project: PipelineProject
  onProjectUpdate: () => void
  isDragging: boolean
}

export function PipelineCard({ project, onProjectUpdate, isDragging }: PipelineCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCardDragging,
  } = useDraggable({
    id: project.id,
    data: {
      type: "project",
      project,
    },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleConvertToActive = async () => {
    const success = await convertProjectToActive(project.id)
    if (success) {
      toast.success(`${project.name} converted to active project`)
      onProjectUpdate()
    } else {
      toast.error("Failed to convert project")
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const success = await deletePipelineProject(project.id)
      if (success) {
        toast.success(`${project.name} deleted successfully`)
        onProjectUpdate()
        setShowDeleteDialog(false)
      } else {
        toast.error("Failed to delete project")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error("Failed to delete project")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent drag from starting
    setShowEditDialog(true)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            ref={setNodeRef}
            style={isCardDragging ? undefined : style}
            className={`group cursor-grab transition-all border ${
              isCardDragging 
                ? 'opacity-50 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed shadow-lg' 
                : isDragging 
                  ? 'opacity-90 bg-white dark:bg-gray-800' 
                  : 'bg-white dark:bg-gray-800'
            }`}
            {...listeners}
            {...attributes}
          >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 
                  className={`font-medium text-sm truncate ${
                    isCardDragging ? 'text-gray-500' : 'text-gray-900'
                  }`}
                >
                  <span 
                    className="cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={handleTitleClick}
                  >
                    {project.name}
                  </span>
                </h3>
                {project.clients && (
                  <div className="flex items-center text-xs text-gray-600 mt-1">
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
                      disabled={isCardDragging}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTitleClick}>
                      <MoreVertical className="mr-2 h-4 w-4" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleConvertToActive}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Convert to Active
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Budget / Potential Value */}
            {project.budget && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-3 h-3 mr-1" />
                  <span>Budget</span>
                </div>
                <span className={`font-medium ${
                  isCardDragging ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {formatLargeNumber(project.budget, getCurrencySymbol())}
                </span>
              </div>
            )}

            {/* Deal Probability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Deal Probability</span>
                <span className={`font-medium ${
                  isCardDragging ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {project.deal_probability}%
                </span>
              </div>
              <Progress 
                value={project.deal_probability} 
                className={`h-2 ${isCardDragging ? 'opacity-50' : ''}`} 
              />
            </div>

            {/* Notes */}
            {project.pipeline_notes && (
              <div className={`text-xs bg-gray-50/50 p-2 rounded border ${
                isCardDragging ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {project.pipeline_notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <ContextMenuItem onClick={handleTitleClick}>
            <MoreVertical className="mr-2 h-4 w-4" />
            Edit Project
          </ContextMenuItem>
          <ContextMenuItem onClick={handleConvertToActive}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Convert to Active
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Project
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <EditProjectDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProjectUpdate={onProjectUpdate}
        project={project}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone and will permanently remove the project from your pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 