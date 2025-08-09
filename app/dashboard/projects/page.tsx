"use client"

import * as React from "react"
import { Loader } from "@/components/ui/loader"
import { ProjectsTableWrapper } from "@/components/projects/ProjectsTableWrapper"

export default function ProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader size="lg" variant="primary" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
              </div>
            </div>
          </div>
    }>
      <ProjectsTableWrapper
        pageTitle="All Projects"
        showSummaryCards={true}
          showStatusFilter={true}
      />
    </React.Suspense>
  )
}
