"use client"

import * as React from "react"
import { ProjectsTableWrapper } from "@/components/projects/ProjectsTableWrapper"

export default function CompletedProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading completed projects...</p>
          </div>
        </div>
      </div>
    }>
      <ProjectsTableWrapper
        pageTitle="Completed Projects"
        defaultFilters={{
          status: ["completed"]
        }}
        lockedFilters={{
          status: true
        }}
        showSummaryCards={true}
        showStatusFilter={false}
      />
    </React.Suspense>
  )
} 