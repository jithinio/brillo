"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"


// Create a client with optimized configuration
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh (10 minutes)
      staleTime: 10 * 60 * 1000,
      // Cache time - how long unused data stays in cache (30 minutes)
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Disable refetch on window focus to prevent "refresh" behavior
      refetchOnWindowFocus: false,
      // Refetch when connection is restored
      refetchOnReconnect: true,
      // Disable background refetching to reduce unnecessary requests
      refetchInterval: false,
      // Only refetch in background when page is visible
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Network mode - fail fast when offline
      networkMode: 'online',
    },
  },
})

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create client instance only once
  const [queryClient] = React.useState(() => createQueryClient())

  // Listen for logout events to clear React Query cache
  React.useEffect(() => {
    const handleLogout = () => {
      console.log('🔄 React Query: Clearing all caches due to logout')
      queryClient.clear()
      queryClient.invalidateQueries()
    }

    window.addEventListener('auth-logout', handleLogout)
    
    return () => {
      window.removeEventListener('auth-logout', handleLogout)
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}

    </QueryClientProvider>
  )
}

// Custom hook for accessing query client
export const useQueryClient = () => {
  const queryClient = React.useContext(QueryClientProvider as any)
  if (!queryClient) {
    throw new Error('useQueryClient must be used within QueryProvider')
  }
  return queryClient
}

// Query keys factory for consistent cache management
export const queryKeys = {
  // Projects
  projects: ['projects'] as const,
  projectsList: (filters?: any) => [...queryKeys.projects, 'list', filters] as const,
  projectsInfinite: (filters?: any) => [...queryKeys.projects, 'infinite', filters] as const,
  project: (id: string) => [...queryKeys.projects, 'detail', id] as const,
  
  // Clients
  clients: ['clients'] as const,
  clientsList: () => [...queryKeys.clients, 'list'] as const,
  client: (id: string) => [...queryKeys.clients, 'detail', id] as const,
  
  // Analytics
  analytics: ['analytics'] as const,
  analyticsData: (filters?: any) => [...queryKeys.analytics, 'data', filters] as const,
  projectAnalytics: (filters?: any) => [...queryKeys.analytics, 'projects', filters] as const,
  dashboardMetrics: () => [...queryKeys.analytics, 'dashboard'] as const,
  
  // Real-time
  realtime: ['realtime'] as const,
  realtimeProjects: () => [...queryKeys.realtime, 'projects'] as const,
} as const

// Cache invalidation helpers
export const cacheUtils = {
  // Invalidate all project-related queries
  invalidateProjects: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects })
  },
  
  // Invalidate specific project
  invalidateProject: (queryClient: QueryClient, id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(id) })
  },
  
  // Invalidate all analytics
  invalidateAnalytics: (queryClient: QueryClient) => {
    console.log('♻️ Cache: Invalidating analytics queries')
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
  },
  
  // Invalidate analytics data specifically 
  invalidateAnalyticsData: (queryClient: QueryClient, filters?: any) => {
    console.log('♻️ Cache: Invalidating analytics data', filters ? 'with filters' : 'all')
    queryClient.invalidateQueries({ queryKey: queryKeys.analyticsData(filters) })
  },
  
  // Update project in cache optimistically
  updateProjectInCache: (queryClient: QueryClient, projectId: string, updater: (old: any) => any) => {
    queryClient.setQueryData(queryKeys.project(projectId), updater)
    // Also update in lists
    queryClient.setQueriesData(
      { queryKey: queryKeys.projects }, 
      (old: any) => {
        if (!old) return old
        if (old.pages) {
          // Infinite query
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data?.map((item: any) => 
                item.id === projectId ? updater(item) : item
              )
            }))
          }
        } else if (old.data) {
          // Regular query
          return {
            ...old,
            data: old.data.map((item: any) => 
              item.id === projectId ? updater(item) : item
            )
          }
        }
        return old
      }
    )
  },
  
  // Prefetch project details
  prefetchProject: (queryClient: QueryClient, id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.project(id),
      queryFn: () => {
        // This would fetch individual project details
        // Implementation depends on your API structure
        return Promise.resolve(null)
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
  },
  
  // Clear all caches - useful for logout
  clearAllCaches: (queryClient: QueryClient) => {
    console.log('🔄 Cache Utils: Clearing all React Query caches')
    queryClient.clear()
    queryClient.invalidateQueries()
  },
  
  // Reset all caches to initial state
  resetCaches: (queryClient: QueryClient) => {
    console.log('🔄 Cache Utils: Resetting all React Query caches')
    queryClient.resetQueries()
  },
} 