/**
 * Optimistic updates for analytics
 * Provides immediate UI feedback when projects change before the server responds
 */

import { useCallback } from 'react'
import type { Project } from '@/lib/analytics-calculations'

interface ProjectChange {
  id: string
  changes: Partial<Project>
  operation: 'create' | 'update' | 'delete'
}

interface OptimisticAnalyticsOptions {
  onOptimisticUpdate?: (change: ProjectChange) => void
  onRevert?: (change: ProjectChange) => void
}

export function useAnalyticsOptimistic(options: OptimisticAnalyticsOptions = {}) {
  const { onOptimisticUpdate, onRevert } = options

  // Apply optimistic project update
  const applyOptimisticUpdate = useCallback((change: ProjectChange) => {
    console.log('⚡ Analytics: Applying optimistic update', change.operation, change.id)
    onOptimisticUpdate?.(change)
  }, [onOptimisticUpdate])

  // Revert optimistic update (if server operation fails)
  const revertOptimisticUpdate = useCallback((change: ProjectChange) => {
    console.log('↩️ Analytics: Reverting optimistic update', change.operation, change.id)
    onRevert?.(change)
  }, [onRevert])

  // Helper functions for common operations
  const optimisticCreateProject = useCallback((project: Partial<Project>) => {
    if (!project.id) return
    
    applyOptimisticUpdate({
      id: project.id,
      changes: project,
      operation: 'create'
    })
  }, [applyOptimisticUpdate])

  const optimisticUpdateProject = useCallback((id: string, changes: Partial<Project>) => {
    applyOptimisticUpdate({
      id,
      changes,
      operation: 'update'
    })
  }, [applyOptimisticUpdate])

  const optimisticDeleteProject = useCallback((id: string) => {
    applyOptimisticUpdate({
      id,
      changes: {},
      operation: 'delete'
    })
  }, [applyOptimisticUpdate])

  return {
    optimisticCreateProject,
    optimisticUpdateProject,
    optimisticDeleteProject,
    revertOptimisticUpdate
  }
}
