"use client"

import * as React from "react"
import { Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Wifi, WifiOff, Activity, Database, TrendingUp, RefreshCw, AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { OptimizedDataTable } from "@/components/projects/data-table-optimized"
import { createColumns, type Project } from "@/components/projects/columns"
import { ProjectFiltersV2 } from "@/components/projects/project-filters-v2"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { formatCurrency } from "@/lib/currency"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useRealtimeProjects } from "@/hooks/use-realtime-projects"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Real-time status indicator
function RealtimeStatus({ connected, lastUpdate, optimisticUpdateCount }: {
  connected: boolean
  lastUpdate: Date | null
  optimisticUpdateCount: number
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        {connected ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? 'Real-time Active' : 'Disconnected'}
        </span>
        {connected && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {lastUpdate && (
        <div className="text-xs text-muted-foreground">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {optimisticUpdateCount > 0 && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {optimisticUpdateCount} pending
        </Badge>
      )}
    </div>
  )
}

// Advanced analytics component
function AdvancedAnalytics() {
  const [analytics, setAnalytics] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAnalytics = React.useCallback(async () => {
    if (!isSupabaseConfigured()) return

    setLoading(true)
    setError(null)

    try {
      // Call Supabase Edge Function for complex analytics
      const { data, error } = await supabase.functions.invoke('project-analytics', {
        body: {
          includePerformance: true,
          includeForecasting: true,
          includeFinancials: true,
        }
      })

      if (error) throw error

      setAnalytics(data.data)
    } catch (err: any) {
      console.error('Analytics error:', err)
      setError(err.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Advanced analytics unavailable: {error}
          <Button variant="link" onClick={fetchAnalytics} className="ml-2 p-0 h-auto">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.overview?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview?.completionRate?.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics.performance?.profitMargin?.toFixed(1)}%
              </div>
              <Progress 
                value={analytics.performance?.profitMargin || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics.overview?.averageDuration || 0} days
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.performance?.onTimeCompletionRate?.toFixed(1)}% on-time
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Predicted Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(analytics.forecasting?.predictedRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.forecasting?.estimatedCompletions || 0} due next month
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Risk Projects */}
      {analytics.forecasting?.riskProjects?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Risk Projects</span>
            </CardTitle>
            <CardDescription>
              Projects that need attention based on AI risk analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.forecasting.riskProjects.slice(0, 3).map((risk: any, index: number) => (
                <motion.div
                  key={risk.projectId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{risk.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {risk.reasons.join(', ')}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-3",
                      risk.riskScore > 70 ? "bg-red-100 text-red-800" :
                      risk.riskScore > 40 ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    )}
                  >
                    {risk.riskScore}% risk
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Main realtime projects content
function RealtimeProjectsContent() {
  const {
    projects,
    totalCount,
    loading,
    error,
    connected,
    lastUpdate,
    hasOptimisticUpdates,
    optimisticUpdateCount,
    updateProjectOptimistic,
    refetch,
    reconnect,
  } = useRealtimeProjects()

  const [tableInstance, setTableInstance] = React.useState<any>(null)
  const [clients, setClients] = React.useState<any[]>([])

  // Fetch clients for filters
  React.useEffect(() => {
    const fetchClients = async () => {
      if (!isSupabaseConfigured()) return

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, company, email, avatar_url')
          .order('name', { ascending: true })

        if (error) throw error
        setClients(data || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
      }
    }

    fetchClients()
  }, [])

  const handleStatusChange = React.useCallback(async (project: Project, newStatus: string) => {
    await updateProjectOptimistic(
      project.id,
      { status: newStatus },
      async () => {
        if (isSupabaseConfigured()) {
          const { error } = await supabase
            .from('projects')
            .update({ status: newStatus })
            .eq('id', project.id)

          if (error) {
            throw error
          }
        }
      }
    )
  }, [updateProjectOptimistic])

  const handleDateChange = React.useCallback(async (
    project: Project, 
    field: 'start_date' | 'due_date', 
    date: Date | undefined
  ) => {
    const dateString = date ? date.toISOString().split('T')[0] : null
    
    await updateProjectOptimistic(
      project.id,
      { [field]: dateString },
      async () => {
        if (isSupabaseConfigured()) {
          const { error } = await supabase
            .from('projects')
            .update({ [field]: dateString })
            .eq('id', project.id)

          if (error) {
            throw error
          }
        }
      }
    )
  }, [updateProjectOptimistic])

  const columns = React.useMemo(() => createColumns({
    onStatusChange: handleStatusChange,
    onDateChange: handleDateChange,
    onEditProject: (project: Project) => toast.success(`Editing ${project.name}`),
    onCreateInvoice: (project: Project) => toast.success(`Creating invoice for ${project.name}`),
    onDeleteProject: (project: Project) => toast.success(`Deleting ${project.name}`),
  }), [handleStatusChange, handleDateChange])

  const contextActions = React.useMemo(() => ({
    onEditProject: (project: Project) => {
      toast.success(`Editing ${project.name}`)
    },
    onCreateInvoice: (project: Project) => {
      toast.success(`Creating invoice for ${project.name}`)
    },
    onDeleteProject: (project: Project) => {
      toast.success(`Deleting ${project.name}`)
    },
    onStatusChange: handleStatusChange,
  }), [handleStatusChange])

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Zap className="h-3 w-3 mr-1" />
            Real-time
          </Badge>
          <Badge variant="outline" className="text-xs">
            Phase 3 Complete
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <RealtimeStatus 
            connected={connected}
            lastUpdate={lastUpdate}
            optimisticUpdateCount={optimisticUpdateCount}
          />
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {!connected && (
              <Button variant="outline" size="sm" onClick={reconnect}>
                <Wifi className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Real-time Updates</p>
            <p className="text-xs text-muted-foreground">Live data synchronization</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Database className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Optimized Queries</p>
            <p className="text-xs text-muted-foreground">Materialized views & indexes</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Edge Analytics</p>
            <p className="text-xs text-muted-foreground">AI-powered insights</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects">Projects Table</TabsTrigger>
          <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          {/* Filters */}
          <ProjectFiltersV2 clients={clients} />

          {/* Optimistic Updates Indicator */}
          <AnimatePresence>
            {hasOptimisticUpdates && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-700">
                    {optimisticUpdateCount} optimistic update{optimisticUpdateCount !== 1 ? 's' : ''} pending...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Projects Table */}
          <OptimizedDataTable
            columns={columns}
            data={projects}
            loading={loading}
            error={error}
            totalCount={totalCount}
            contextActions={contextActions}
            updateProjectOptimistic={updateProjectOptimistic}
            onTableReady={setTableInstance}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitor />
        </TabsContent>
      </Tabs>

      {/* Performance Stats Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Real-time: </span>
            <span className={connected ? 'text-green-600' : 'text-red-600'}>
              {connected ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium">Projects: </span>
            <span>{totalCount}</span>
          </div>
          <div>
            <span className="font-medium">Updates: </span>
            <span>{optimisticUpdateCount} pending</span>
          </div>
          <div>
            <span className="font-medium">Generated: </span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense
export default function RealtimeProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Suspense fallback={
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
          <div className="h-96 bg-gray-100 rounded animate-pulse" />
        </div>
      }>
        <RealtimeProjectsContent />
      </Suspense>
    </div>
  )
} 