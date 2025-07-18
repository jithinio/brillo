"use client"

import { useState, useEffect } from "react"
import { PageHeader, PageContent } from "@/components/page-header"
import { PipelineMetrics } from "./components/PipelineMetrics"
import { PipelineBoard } from "./components/PipelineBoard"
import { fetchPipelineProjects, fetchPipelineStages, calculateProjectPipelineMetrics } from "@/lib/project-pipeline"
import type { PipelineProject, PipelineStage } from "@/lib/types/pipeline"

export default function PipelinePage() {
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  const metrics = calculateProjectPipelineMetrics(projects, stages)

  const handleProjectUpdate = () => {
    loadPipelineData()
  }

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
        height: calc(100svh - 1rem) !important;
        max-height: calc(100svh - 1rem) !important;
        min-height: calc(100svh - 1rem) !important;
        margin-bottom: 1rem !important;
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
      
      <div className="flex-1 flex flex-col px-8 pt-4 pb-4 min-h-0 overflow-hidden">
        {/* Metrics Section */}
        <div className="flex-shrink-0 mb-6">
          <PipelineMetrics metrics={metrics} />
        </div>

        {/* Kanban Board - takes remaining height with scroll */}
        <div className="flex-1 min-h-0">
          <PipelineBoard 
            projects={projects}
            stages={stages}
            onProjectUpdate={handleProjectUpdate}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
} 