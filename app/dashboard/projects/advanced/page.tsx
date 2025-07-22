"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  RefreshCw, 
  Zap, 
  Eye, 
  Clock,
  Database,
  Signal,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronDown
} from "lucide-react"

import { useInfiniteProjects } from "@/hooks/use-infinite-projects"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { OptimizedDataTable } from "@/components/projects/data-table-optimized"
import { createFixedColumns } from "@/components/projects/columns-fixed"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

// Advanced metrics display component
function AdvancedMetrics({ 
  metrics, 
  cacheInfo,
  isLoading 
}: { 
  metrics: any
  cacheInfo: {
    hitRate: number
    lastUpdated: Date
    isFresh: boolean
    staleDuration: number
    isBackgroundRefetching: boolean
  }
  isLoading: boolean 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Project Metrics */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Projects Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.totalProjects || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.activeProjects || 0} active • {metrics?.completedProjects || 0} completed
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.totalReceived || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(metrics?.totalPending || 0)} pending
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Performance */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            Cache Performance
            {cacheInfo.isBackgroundRefetching && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-3 h-3 text-blue-500" />
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {cacheInfo.hitRate}%
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {cacheInfo.isFresh ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-orange-500" />
              )}
              {cacheInfo.isFresh ? 'Fresh data' : `Stale ${Math.floor(cacheInfo.staleDuration / 1000)}s`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {navigator.onLine ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            Network Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className={cn(
              "text-2xl font-bold",
              navigator.onLine ? "text-green-600" : "text-red-600"
            )}>
              {navigator.onLine ? 'Online' : 'Offline'}
            </div>
            <div className="text-xs text-muted-foreground">
              Last sync: {cacheInfo.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Advanced filtering component with real-time feedback
function AdvancedFilters({ 
  filters, 
  updateFilter, 
  quickFilter,
  isStale 
}: { 
  filters: any
  updateFilter: any
  quickFilter: (term: string) => any[]
  isStale: boolean
}) {
  const [quickSearch, setQuickSearch] = React.useState("")
  const [quickResults, setQuickResults] = React.useState<any[]>([])

  // Real-time client-side filtering for instant feedback
  React.useEffect(() => {
    if (quickSearch.trim()) {
      const results = quickFilter(quickSearch)
      setQuickResults(results.slice(0, 5)) // Show top 5 results
    } else {
      setQuickResults([])
    }
  }, [quickSearch, quickFilter])

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Quick Search with instant results */}
        <div className="flex-1 relative">
          <Input
            placeholder="Quick search (client-side instant results)..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="pr-10"
          />
          {quickSearch && (
            <Badge 
              variant="secondary" 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            >
              {quickResults.length}
            </Badge>
          )}
          
          {/* Instant results dropdown */}
          <AnimatePresence>
            {quickResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                {quickResults.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                    onClick={() => {
                      updateFilter('search', project.name)
                      setQuickSearch("")
                      setQuickResults([])
                    }}
                  >
                    <div className="font-medium text-sm">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.clients?.name} • {project.status}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Server-side search */}
        <div className="flex-1">
          <Input
            placeholder="Server-side search (with caching)..."
            value={filters.search || ""}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.status?.[0] || "all"}
          onValueChange={(value) => updateFilter('status', value === 'all' ? [] : [value])}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data freshness indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>React Query Advanced Caching</span>
          {isStale && (
            <Badge variant="outline" className="text-xs">
              Background Refreshing
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            Background Refetch: 60s
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Stale Time: 30s
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Cache Time: 5m
          </Badge>
        </div>
      </div>
    </div>
  )
}

// Main advanced projects component
function AdvancedProjectsContent() {
  const { filters, updateFilter } = useProjectFiltersV2()
  
  const {
    projects,
    metrics,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    isStale,
    hasNextPage,
    loadMore,
    updateStatus,
    isUpdating,
    refetch,
    forceRefresh,
    // Search
    searchQuery,
    updateSearch,
    clearSearch,
    isSearching,
    hasClientResults,
    // Advanced cache info
    cacheHitRate,
    lastUpdated,
    isFresh,
    staleDuration,
    isBackgroundRefetching,
  } = useInfiniteProjects(filters)

  const columns = React.useMemo(() => createFixedColumns({
    onEditProject: () => {},
    onCreateInvoice: () => {},
    onDeleteProject: () => {},
    onStatusChange: (project, newStatus) => updateStatus({ id: project.id, status: newStatus }),
    onDateChange: () => {},
  }), [updateStatus])

  const cacheInfo = {
    hitRate: cacheHitRate,
    lastUpdated,
    isFresh,
    staleDuration,
    isBackgroundRefetching,
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
          <p className="text-muted-foreground mb-4">{error?.message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold">Projects - Advanced Caching</h1>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            React Query
          </Badge>
          <Badge variant="outline" className="text-xs">
            Phase 4 - Advanced
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
            Refetch
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => forceRefresh()}
            disabled={isFetching}
          >
            <Zap className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Features Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-purple-700">
              Advanced Caching • Background Refetching • Optimistic Updates • Request Deduplication
            </span>
          </div>
          <div className="flex space-x-2 text-xs text-purple-600">
            <span>⚡ React Query</span>
            <span>🔄 Auto Sync</span>
            <span>📈 Smart Cache</span>
            <span>🎯 Optimistic</span>
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <AdvancedMetrics 
        metrics={metrics}
        cacheInfo={cacheInfo}
        isLoading={isLoading}
      />

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        updateFilter={updateFilter}
        searchQuery={searchQuery}
        updateSearch={updateSearch}
        isSearching={isSearching}
        hasClientResults={hasClientResults}
        isStale={isStale}
      />

      {/* Data Table with Infinite Loading */}
      <div className="space-y-4">
        <OptimizedDataTable 
          columns={columns}
          data={projects}
          totalCount={totalCount}
          loading={isLoading}
          showOptimisticUpdates={true}
        />
        
        {/* Infinite Loading */}
        {hasNextPage && (
          <div className="flex justify-center py-6">
            <Button
              onClick={loadMore}
              disabled={isFetchingNextPage}
              variant="outline"
              className="min-w-[200px]"
            >
              {isFetchingNextPage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Loading more...
                </>
              ) : (
                <>
                  Load More Projects
                  <ChevronDown className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
        
        {!hasNextPage && projects.length > 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            🎉 You've reached the end! All {totalCount.toLocaleString()} projects loaded.
          </div>
        )}
      </div>

      {/* Navigation to other phases */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-3">🧪 Compare Performance Phases</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <a href="/dashboard/projects" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Original</div>
            <div className="text-xs text-gray-600">Baseline performance</div>
          </a>
          <a href="/dashboard/projects/optimized" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Phase 1</div>
            <div className="text-xs text-gray-600">Client optimizations</div>
          </a>
          <a href="/dashboard/projects/server" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Phase 2</div>
            <div className="text-xs text-gray-600">Server components</div>
          </a>
          <a href="/dashboard/projects/realtime" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Phase 3</div>
            <div className="text-xs text-gray-600">Real-time + AI</div>
          </a>
          <a href="/dashboard/projects/advanced" className="p-3 bg-purple-100 border-2 border-purple-300 rounded">
            <div className="font-medium text-purple-800">Phase 4 (Current)</div>
            <div className="text-xs text-purple-600">Advanced caching</div>
          </a>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{cacheHitRate}%</div>
          <div className="text-xs text-gray-600">Cache Hit Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {isBackgroundRefetching ? '🔄' : '✅'}
          </div>
          <div className="text-xs text-gray-600">Background Sync</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.floor(staleDuration / 1000)}s
          </div>
          <div className="text-xs text-gray-600">Data Age</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">3x</div>
          <div className="text-xs text-gray-600">Retry Logic</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">5m</div>
          <div className="text-xs text-gray-600">Cache TTL</div>
        </div>
      </div>
    </div>
  )
}

// Main page component with error boundary
export default function AdvancedProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading advanced caching system...</p>
          </div>
        </div>
      </div>
    }>
      <AdvancedProjectsContent />
    </React.Suspense>
  )
} 