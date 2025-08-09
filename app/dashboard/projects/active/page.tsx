"use client"

import * as React from "react"
import { Loader } from "@/components/ui/loader"
import { ProjectsTableWrapper } from "@/components/projects/ProjectsTableWrapper"

export default function ActiveProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader size="lg" variant="primary" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading active projects...</p>
          </div>
        </div>
      </div>
    }>
      <ProjectsTableWrapper
        pageTitle="Active Projects"
        defaultFilters={{
          status: ["active"]
        }}
        lockedFilters={{
          status: true
        }}
        defaultStatus="active"
        showSummaryCards={true}
              showStatusFilter={false}
            />
    </React.Suspense>
  )
} 