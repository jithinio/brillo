"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchPipelineProjects, fetchPipelineStages, groupProjectsByStage } from "@/lib/project-pipeline"
import type { PipelineProject, PipelineStage } from "@/lib/types/pipeline"

export function PipelineDebug() {
  const [isVisible, setIsVisible] = useState(false)
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [projectsData, stagesData] = await Promise.all([
        fetchPipelineProjects(),
        fetchPipelineStages()
      ])
      setProjects(projectsData)
      setStages(stagesData)
    } catch (error) {
      console.error('Error loading debug data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      loadData()
    }
  }, [isVisible])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
        >
          🔧 Debug Pipeline
        </Button>
      </div>
    )
  }

  const columns = groupProjectsByStage(projects, stages)

  return (
    <div className="fixed inset-4 z-50 bg-white/95 backdrop-blur border rounded-lg shadow-xl overflow-auto">
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Pipeline Debug Information</CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadData} disabled={loading} size="sm" variant="outline">
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={() => setIsVisible(false)} size="sm" variant="outline">
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Pipeline Stages */}
          <div>
            <h3 className="font-semibold mb-3">📂 Pipeline Stages ({stages.length})</h3>
            {stages.length === 0 ? (
              <div className="text-red-600 bg-red-50 p-3 rounded border">
                ❌ No pipeline stages found! Run migration scripts to create stages.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stages.map(stage => (
                  <div key={stage.id} className="p-3 border rounded bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Order: {stage.order_index}, Probability: {stage.default_probability}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Projects */}
          <div>
            <h3 className="font-semibold mb-3">📋 Pipeline Projects ({projects.length})</h3>
            {projects.length === 0 ? (
              <div className="text-amber-600 bg-amber-50 p-3 rounded border">
                💡 No pipeline projects found. Change a project status to "Pipeline" to test.
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <div key={project.id} className="p-3 border rounded bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{project.name}</span>
                        {project.clients && (
                          <span className="text-sm text-gray-600 ml-2">
                            ({project.clients.name})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{project.pipeline_stage}</Badge>
                        <Badge variant="secondary">{project.deal_probability}%</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grouped Projects */}
          <div>
            <h3 className="font-semibold mb-3">🏗️ Projects Grouped by Stage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map(column => (
                <div key={column.id} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-medium">{column.title}</span>
                    <Badge variant="outline">{column.projects.length}</Badge>
                  </div>
                  
                  {column.projects.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No projects</div>
                  ) : (
                    <div className="space-y-2">
                      {column.projects.map(project => (
                        <div key={project.id} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{project.name}</div>
                          <div className="text-gray-600">
                            Stage: "{project.pipeline_stage}" | {project.deal_probability}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stage Matching Debug */}
          <div>
            <h3 className="font-semibold mb-3">🔍 Stage Matching Debug</h3>
            {projects.length > 0 && stages.length > 0 ? (
              <div className="space-y-2">
                {projects.map(project => {
                  const matchingStage = stages.find(stage => 
                    stage.name.toLowerCase() === project.pipeline_stage?.toLowerCase()
                  )
                  return (
                    <div 
                      key={project.id} 
                      className={`p-2 rounded border ${
                        matchingStage ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="text-sm">
                        <span className="font-medium">{project.name}</span>
                        <span className="mx-2">has stage:</span>
                        <code className="bg-gray-100 px-1 rounded">"{project.pipeline_stage}"</code>
                        {matchingStage ? (
                          <span className="text-green-600 ml-2">✅ Matches "{matchingStage.name}"</span>
                        ) : (
                          <span className="text-red-600 ml-2">❌ No match found</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-gray-500 italic">No data to analyze</div>
            )}
          </div>

          {/* Raw Data */}
          <details className="border rounded p-3">
            <summary className="cursor-pointer font-medium">🔧 Raw Data (Click to expand)</summary>
            <div className="mt-3 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Stages:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(stages, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">Projects:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(projects, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
} 