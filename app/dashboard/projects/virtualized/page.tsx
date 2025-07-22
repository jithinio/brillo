"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { 
  Settings2, 
  Layers3, 
  Gauge, 
  Monitor,
  Zap,
  Database,
  MemoryStick,
  Timer,
  Users,
  TrendingUp,
  Eye,
  EyeOff
} from "lucide-react"

import { useAdvancedProjects } from "@/hooks/use-advanced-projects"
import { useProjectFiltersV2 } from "@/hooks/use-project-filters-v2"
import { VirtualizedDataTable } from "@/components/projects/data-table-virtualized"
import { createColumns } from "@/components/projects/columns"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

// Generate mock data for testing virtualization
function generateMockProjects(count: number) {
  const statuses = ['active', 'pipeline', 'completed', 'on_hold', 'cancelled']
  const companies = ['TechCorp', 'DataViz Inc', 'CloudSync', 'DevTools', 'AppFlow', 'CodeBase', 'WebPro', 'SoftLab']
  const projectTypes = ['Website', 'Mobile App', 'Dashboard', 'API', 'Database', 'Integration', 'Analytics', 'Platform']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i + 1}`,
    name: `${projectTypes[i % projectTypes.length]} Project ${i + 1}`,
    status: statuses[i % statuses.length],
    start_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budget: Math.floor(Math.random() * 100000) + 10000,
    expenses: Math.floor(Math.random() * 50000),
    received: Math.floor(Math.random() * 80000),
    pending: Math.floor(Math.random() * 20000),
    created_at: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    clients: {
      id: `client-${i % 8 + 1}`,
      name: `Client ${i % 8 + 1}`,
      company: companies[i % companies.length],
      avatar_url: null
    }
  }))
}

// Virtualization settings component
function VirtualizationSettings({
  enableVirtualization,
  setEnableVirtualization,
  rowHeight,
  setRowHeight,
  overscan,
  setOverscan,
  datasetSize,
  setDatasetSize,
}: {
  enableVirtualization: boolean
  setEnableVirtualization: (value: boolean) => void
  rowHeight: number
  setRowHeight: (value: number) => void
  overscan: number
  setOverscan: (value: number) => void
  datasetSize: number
  setDatasetSize: (value: number) => void
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="w-5 h-5" />
          Virtualization Settings
        </CardTitle>
        <CardDescription>
          Configure table virtualization parameters and test with different dataset sizes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Enable Virtualization */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers3 className="w-4 h-4" />
              Enable Virtualization
            </Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={enableVirtualization}
                onCheckedChange={setEnableVirtualization}
              />
              <span className="text-sm text-muted-foreground">
                {enableVirtualization ? 'On' : 'Off'}
              </span>
            </div>
          </div>

          {/* Dataset Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Dataset Size: {datasetSize.toLocaleString()} rows
            </Label>
            <Select
              value={datasetSize.toString()}
              onValueChange={(value) => setDatasetSize(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 rows (Small)</SelectItem>
                <SelectItem value="500">500 rows (Medium)</SelectItem>
                <SelectItem value="1000">1,000 rows (Large)</SelectItem>
                <SelectItem value="5000">5,000 rows (X-Large)</SelectItem>
                <SelectItem value="10000">10,000 rows (XX-Large)</SelectItem>
                <SelectItem value="25000">25,000 rows (Massive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row Height */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Row Height: {rowHeight}px
            </Label>
            <Slider
              value={[rowHeight]}
              onValueChange={(value) => setRowHeight(value[0])}
              min={40}
              max={120}
              step={5}
              className="w-full"
            />
          </div>

          {/* Overscan */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Overscan: {overscan} rows
            </Label>
            <Slider
              value={[overscan]}
              onValueChange={(value) => setOverscan(value[0])}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* Performance Info */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700">
                {enableVirtualization 
                  ? `Rendering ~${Math.min(Math.ceil(600 / rowHeight) + overscan, datasetSize)} of ${datasetSize.toLocaleString()} rows`
                  : `Rendering all ${datasetSize.toLocaleString()} rows`
                }
              </span>
            </div>
            <div className="flex space-x-4 text-xs text-blue-600">
              <span>💾 Memory: {enableVirtualization ? 'Low' : 'High'}</span>
              <span>⚡ Performance: {enableVirtualization ? 'Optimal' : 'Variable'}</span>
              <span>🔄 Scroll: {enableVirtualization ? 'Smooth' : 'May lag'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Performance comparison component
function PerformanceComparison({
  datasetSize,
  enableVirtualization,
  rowHeight,
  overscan,
}: {
  datasetSize: number
  enableVirtualization: boolean
  rowHeight: number
  overscan: number
}) {
  const renderedRows = enableVirtualization 
    ? Math.min(Math.ceil(600 / rowHeight) + overscan, datasetSize)
    : datasetSize

  const estimatedMemory = enableVirtualization
    ? renderedRows * 0.5 // KB per row
    : datasetSize * 0.5

  const scrollPerformance = enableVirtualization
    ? 'Smooth (constant time)'
    : datasetSize > 1000 ? 'May lag (linear time)' : 'Good'

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {renderedRows.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Rendered Rows
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <MemoryStick className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                {estimatedMemory.toFixed(1)}KB
              </div>
              <div className="text-xs text-muted-foreground">
                Est. Memory
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-purple-600">
                {enableVirtualization ? 'O(1)' : 'O(n)'}
              </div>
              <div className="text-xs text-muted-foreground">
                Complexity
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-sm font-bold text-orange-600">
                {scrollPerformance.split(' ')[0]}
              </div>
              <div className="text-xs text-muted-foreground">
                Scroll Perf
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main virtualized projects content
function VirtualizedProjectsContent() {
  const { filters, updateFilter } = useProjectFiltersV2()
  
  // Virtualization settings
  const [enableVirtualization, setEnableVirtualization] = React.useState(true)
  const [rowHeight, setRowHeight] = React.useState(60)
  const [overscan, setOverscan] = React.useState(10)
  const [datasetSize, setDatasetSize] = React.useState(1000)

  // Generate mock data based on dataset size
  const mockData = React.useMemo(() => 
    generateMockProjects(datasetSize), 
    [datasetSize]
  )

  // Filter mock data based on current filters
  const filteredData = React.useMemo(() => {
    let filtered = mockData

    if (filters.search) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
        project.clients?.company?.toLowerCase().includes(filters.search!.toLowerCase())
      )
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(project => filters.status!.includes(project.status as any))
    }

    return filtered
  }, [mockData, filters])

  const columns = React.useMemo(() => createColumns({
    onEditProject: () => {},
    onCreateInvoice: () => {},
    onDeleteProject: () => {},
    onStatusChange: () => {},
    onDateChange: () => {},
  }), [])

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold">Projects - Virtualized Tables</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            High Performance
          </Badge>
          <Badge variant="outline" className="text-xs">
            Phase 5 - Virtualization
          </Badge>
        </div>
      </div>

      {/* Virtualization Features Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">
              Table Virtualization • Memory Efficient • Infinite Scroll • High Performance
            </span>
          </div>
          <div className="flex space-x-2 text-xs text-green-600">
            <span>🚀 Virtual</span>
            <span>💾 Memory Safe</span>
            <span>⚡ Fast Scroll</span>
            <span>🎯 Scalable</span>
          </div>
        </div>
      </div>

      {/* Virtualization Settings */}
      <VirtualizationSettings
        enableVirtualization={enableVirtualization}
        setEnableVirtualization={setEnableVirtualization}
        rowHeight={rowHeight}
        setRowHeight={setRowHeight}
        overscan={overscan}
        setOverscan={setOverscan}
        datasetSize={datasetSize}
        setDatasetSize={setDatasetSize}
      />

      {/* Performance Comparison */}
      <PerformanceComparison
        datasetSize={datasetSize}
        enableVirtualization={enableVirtualization}
        rowHeight={rowHeight}
        overscan={overscan}
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            value={filters.search || ""}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
        
        <Select
          value={filters.status?.[0] || "all"}
                     onValueChange={(value) => updateFilter('status', value === 'all' ? [] : [value as any])}
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

      {/* Virtualized Data Table */}
      <VirtualizedDataTable 
        columns={columns}
        data={filteredData}
        totalCount={filteredData.length}
        estimateSize={rowHeight}
        overscan={overscan}
        enableVirtualization={enableVirtualization}
        showOptimisticUpdates={false}
      />

      {/* Navigation to other phases */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-3">🧪 Compare All Performance Phases</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
          <a href="/dashboard/projects" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Original</div>
            <div className="text-xs text-gray-600">Baseline</div>
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
          <a href="/dashboard/projects/advanced" className="p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
            <div className="font-medium">Phase 4</div>
            <div className="text-xs text-gray-600">Advanced caching</div>
          </a>
          <a href="/dashboard/projects/virtualized" className="p-3 bg-green-100 border-2 border-green-300 rounded">
            <div className="font-medium text-green-800">Phase 5 (Current)</div>
            <div className="text-xs text-green-600">Virtualization</div>
          </a>
        </div>
      </div>

      {/* Virtualization Benefits */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MemoryStick className="w-5 h-5 text-green-600" />
              Memory Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Only renders visible rows, keeping memory usage constant regardless of dataset size.
            </p>
            <div className="text-xs space-y-1">
              <div>✅ Constant memory usage</div>
              <div>✅ No DOM bloat</div>
              <div>✅ Better garbage collection</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-blue-600" />
              Scroll Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Smooth scrolling through millions of rows with consistent 60fps performance.
            </p>
            <div className="text-xs space-y-1">
              <div>✅ Smooth scrolling</div>
              <div>✅ Consistent FPS</div>
              <div>✅ No scroll lag</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-purple-600" />
              Scalability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Handles datasets from hundreds to millions of rows with identical performance.
            </p>
            <div className="text-xs space-y-1">
              <div>✅ Linear data growth</div>
              <div>✅ Constant render time</div>
              <div>✅ Enterprise ready</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main page component
export default function VirtualizedProjectsPage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading virtualization system...</p>
          </div>
        </div>
      </div>
    }>
      <VirtualizedProjectsContent />
    </React.Suspense>
  )
} 