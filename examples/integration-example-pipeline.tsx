// EXAMPLE: Updated Pipeline Page with Enhanced Dialog
// File: app/dashboard/pipeline/page.tsx

"use client"

import { useState, useEffect } from "react"
import { PageHeader, PageContent } from "@/components/page-header"
import { PipelineMetrics } from "./components/PipelineMetrics"
import { PipelineBoard } from "./components/PipelineBoard"

// OLD: import { AddProjectDialog } from "./components/AddProjectDialog"
// NEW: Import the enhanced dialog
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
    setLoading(true)
    try {
      const [projectsData, stagesData] = await Promise.all([
        fetchPipelineProjects(),
        fetchPipelineStages()
      ])
      
      setProjects(projectsData)
      setStages(stagesData)
      
      const calculatedMetrics = calculateProjectPipelineMetrics(projectsData)
      setMetrics(calculatedMetrics)
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle project updates (same as before)
  const handleProjectUpdate = () => {
    loadPipelineData()
  }

  // Optimistic updates (same as before)
  const addProjectOptimistically = (newProject: PipelineProject) => {
    setProjects(prev => [newProject, ...prev])
    const newMetrics = calculateProjectPipelineMetrics([newProject, ...projects])
    setMetrics(newMetrics)
  }

  const removeProjectOptimistically = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
    const filteredProjects = projects.filter(p => p.id !== projectId)
    const newMetrics = calculateProjectPipelineMetrics(filteredProjects)
    setMetrics(newMetrics)
  }

  const updateProjectOptimistically = (updatedProject: PipelineProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    const newMetrics = calculateProjectPipelineMetrics(updatedProjects)
    setMetrics(newMetrics)
  }

  const revertOptimisticChanges = () => {
    loadPipelineData()
  }

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.clients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.clients?.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setIsSearching(value.length > 0)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="flex-none">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4">
            <PageHeader title="Pipeline" />
            
            {/* Metrics */}
            <div className="mt-4">
              <PipelineMetrics 
                metrics={metrics}
                isLoading={loading}
              />
            </div>

            {/* Search and Actions Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search leads and deals..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 h-8 text-sm"
                    />
                  </div>

                  {/* Search Results Count */}
                  {isSearching && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {filteredProjects.length} of {projects.length}
                    </span>
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
          />
        </div>
      </div>

      {/* UPDATED: Enhanced Add Project Dialog */}
      <EnhancedAddProjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProjectUpdate={handleProjectUpdate}
        onAddProject={addProjectOptimistically}
        onRevertChanges={revertOptimisticChanges}
        defaultType="fixed" // Start with fixed for pipeline leads
      />
    </div>
  )
}