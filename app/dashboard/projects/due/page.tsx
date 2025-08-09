"use client"

import * as React from "react"
import { Loader } from "@/components/ui/loader"
import { ProjectsTableWrapper } from "@/components/projects/ProjectsTableWrapper"

export default function DueProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader size="lg" variant="primary" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading due projects...</p>
          </div>
        </div>
      </div>
    }>
      <ProjectsTableWrapper
        pageTitle="Due Projects"
        defaultFilters={{
          status: ["due"]
        }}
        lockedFilters={{
          status: true
        }}
        defaultStatus="due"
        showSummaryCards={true}
        showStatusFilter={false}
      />
    </React.Suspense>
  )
}
