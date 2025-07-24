"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Activity, Zap, Database, Clock } from "lucide-react"

interface PerformanceMetrics {
  renderTime: number
  rowCount: number
  visibleRows: number
  lastUpdate: Date
  cacheHitRate: number
  isStale: boolean
}

interface TablePerformanceMonitorProps {
  metrics: PerformanceMetrics
  className?: string
}

export function TablePerformanceMonitor({ metrics, className }: TablePerformanceMonitorProps) {
  const [show, setShow] = React.useState(false)
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className={className}>
      <button
        onClick={() => setShow(!show)}
        className="fixed bottom-4 right-4 p-2 bg-gray-900 text-white rounded-full shadow-lg z-50 hover:bg-gray-800 transition-colors"
      >
        <Activity className="h-4 w-4" />
      </button>
      
      {show && (
        <div className="fixed bottom-16 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Table Performance
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Render Time
              </span>
              <Badge variant={metrics.renderTime < 16 ? "default" : "destructive"} className="text-xs">
                {metrics.renderTime.toFixed(2)}ms
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Rows
              </span>
              <span className="font-mono">
                {metrics.visibleRows} / {metrics.rowCount}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Cache Hit
              </span>
              <Badge variant={metrics.cacheHitRate > 80 ? "default" : "secondary"} className="text-xs">
                {metrics.cacheHitRate.toFixed(0)}%
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data Status</span>
              <Badge variant={metrics.isStale ? "secondary" : "default"} className="text-xs">
                {metrics.isStale ? "Stale" : "Fresh"}
              </Badge>
            </div>
            
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="text-muted-foreground">Last Update</span>
              <div className="font-mono text-xs">
                {metrics.lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 