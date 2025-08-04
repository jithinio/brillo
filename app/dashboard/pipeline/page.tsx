"use client"

import { useState, useEffect } from "react"
import { PageHeader, PageContent } from "@/components/page-header"
import { PipelineMetrics } from "./components/PipelineMetrics"
import { PipelineBoard } from "./components/PipelineBoard"
import { EnhancedAddProjectDialog } from "@/components/projects/EnhancedAddProjectDialog"
import { fetchPipelineProjects, fetchPipelineStages, calculateProjectPipelineMetrics } from "@/lib/project-pipeline"
import type { PipelineProject, PipelineStage, PipelineMetrics as PipelineMetricsType } from "@/lib/types/pipeline"
import { Search, X, Plus, Crown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCanPerformAction } from "@/components/over-limit-alert"
import Link from "next/link"

export default function PipelinePage() {
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Over-limit validation
  const { canCreateResource, getActionBlockedReason } = useCanPerformAction()
  const [metrics, setMetrics] = useState<PipelineMetricsType>({
    totalValue: 0,
    leadCount: 0,
    pitchedCount: 0,
    discussionCount: 0,
    weightedValue: 0,
    conversionRate: 0,
    winRate: 0
  })

  useEffect(() => {
    loadPipelineData()
  }, [])

  const loadPipelineData = async () => {
    try {
      setLoading(true)
      
      const [projectsData, stagesData] = await Promise.all([
        fetchPipelineProjects(),
        fetchPipelineStages()
      ])
      
      setProjects(projectsData)
      setStages(stagesData)
      
      // Calculate metrics after loading data
      await calculateMetrics(projectsData, stagesData)
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = async (projectsData: PipelineProject[], stagesData: PipelineStage[]) => {
    try {
      const calculatedMetrics = await calculateProjectPipelineMetrics(projectsData, stagesData)
      setMetrics(calculatedMetrics)
    } catch (error) {
      console.error('Error calculating metrics:', error)
    }
  }

  // Optimistic project management functions
  const addProjectOptimistically = (newProject: PipelineProject) => {
    setProjects(prevProjects => {
      const updatedProjects = [...prevProjects, newProject]
      // Recalculate metrics with new project
      calculateMetrics(updatedProjects, stages)
      return updatedProjects
    })
  }

  const removeProjectOptimistically = (projectId: string) => {
    setProjects(prevProjects => {
      const updatedProjects = prevProjects.filter(p => p.id !== projectId)
      // Recalculate metrics after removing project
      calculateMetrics(updatedProjects, stages)
      return updatedProjects
    })
  }

  const updateProjectOptimistically = (projectId: string, updates: Partial<PipelineProject>) => {
    setProjects(prevProjects => {
      const updatedProjects = prevProjects.map(p => p.id === projectId ? { ...p, ...updates } : p)
      // Recalculate metrics with updated project
      calculateMetrics(updatedProjects, stages)
      return updatedProjects
    })
  }

  const revertOptimisticChanges = () => {
    // Reload from server if optimistic update fails
    loadPipelineData()
  }

  const handleProjectUpdate = () => {
    loadPipelineData()
  }

  // Filter projects based on search query
  const filteredProjects = searchQuery.trim() 
    ? projects.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.clients?.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects

  // Add CSS to constrain the entire layout to viewport height for pipeline page
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* Force exact viewport height for pipeline page */
      body:has([data-pipeline-page]) {
        height: 100svh !important;
        max-height: 100svh !important;
        overflow: hidden !important;
      }
      
      body:has([data-pipeline-page]) .group\\/sidebar-wrapper {
        height: 100svh !important;
        max-height: 100svh !important;
        min-height: 100svh !important;
        overflow: hidden !important;
      }
      
      body:has([data-pipeline-page]) main {
        height: 100svh !important;
        max-height: 100svh !important;
        min-height: 100svh !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      /* Ensure our pipeline content respects the constraints */
      [data-pipeline-page] {
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="h-full max-h-full flex flex-col overflow-hidden" data-pipeline-page>
      <PageHeader title="Pipeline" />
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Metrics Section - styled like other pages */}
        <div className="flex-shrink-0">
          <PipelineMetrics metrics={metrics} />
        </div>

        {/* Search Bar Container */}
        <div className="flex-shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative w-[200px]">
                {isSearching ? (
                  <div className="absolute left-3 top-2 h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search projects..."
                  className={`h-8 pl-9 pr-8 text-sm font-normal transition-colors ${
                    isSearching 
                      ? "border-primary/50 bg-primary/5 text-foreground placeholder:text-muted-foreground/60" 
                      : "text-muted-foreground placeholder:text-muted-foreground/60"
                  }`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsSearching(true)
                    setTimeout(() => setIsSearching(false), 300)
                  }}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Clear Search Button */}
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-8 text-sm font-normal text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Clear
                </Button>
              )}

              {/* New Lead Button */}
              <div className="ml-auto flex items-center gap-2">
                {!canCreateResource('projects') && (
                  <Button asChild variant="outline" size="sm" className="h-8">
                    <Link href="/pricing">
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Link>
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddDialog(true)}
                  size="sm"
                  className="h-8"
                  disabled={!canCreateResource('projects')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Lead
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board - takes remaining height */}
        <div className="flex-1 min-h-0">
          <PipelineBoard 
            projects={filteredProjects}
            stages={stages}
            onProjectUpdate={handleProjectUpdate}
            onRemoveProject={removeProjectOptimistically}
            onUpdateProject={updateProjectOptimistically}
            onRevertChanges={revertOptimisticChanges}
            loading={loading}
          />
        </div>
      </div>

      {/* Enhanced Add Project Dialog */}
      <EnhancedAddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProjectUpdate={handleProjectUpdate}
        onAddProject={addProjectOptimistically}
        onRevertChanges={revertOptimisticChanges}
        defaultType="fixed"
        context="pipeline"
      />
    </div>
  )
} 