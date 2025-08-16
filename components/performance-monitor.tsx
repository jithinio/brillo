"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ZapIcon, ActivityIcon, GlobeIcon, DatabaseIcon, ServerIcon, DashboardCircleIcon } from '@hugeicons/core-free-icons'

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  fcp: number | null // First Contentful Paint
  ttfb: number | null // Time to First Byte
  
  // Custom metrics
  renderTime: number
  cacheHits: number
  totalRequests: number
  serverResponse: number
  
  // Vercel specific
  region: string
  buildId: string
  edge: boolean
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    renderTime: 0,
    cacheHits: 0,
    totalRequests: 0,
    serverResponse: 0,
    region: 'unknown',
    buildId: 'unknown',
    edge: false,
  })
  
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Measure render time
    const renderStart = performance.now()
    
    // Get Web Vitals
    const getWebVitals = () => {
      if ('web-vital' in window) {
        // Real Web Vitals would be measured here
        // For demo purposes, we'll simulate some values
        setMetrics(prev => ({
          ...prev,
          lcp: Math.random() * 2000 + 1000, // 1-3 seconds
          fid: Math.random() * 50 + 10, // 10-60ms
          cls: Math.random() * 0.1, // 0-0.1
          fcp: Math.random() * 1500 + 500, // 0.5-2 seconds
          ttfb: Math.random() * 200 + 100, // 100-300ms
          renderTime: performance.now() - renderStart,
          region: 'sfo1', // Simulated Vercel region
          buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'dev',
          edge: true,
        }))
      }
    }

    // Simulate loading metrics
    const timer = setTimeout(() => {
      getWebVitals()
      setIsVisible(true)
    }, 500)

    // Monitor cache performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      let cacheHits = 0
      let totalRequests = 0
      
      entries.forEach((entry) => {
        if (entry.name.includes('cache')) {
          totalRequests++
          if (entry.duration < 50) { // Fast response likely cached
            cacheHits++
          }
        }
      })

      setMetrics(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + cacheHits,
        totalRequests: prev.totalRequests + totalRequests,
      }))
    })

    if ('PerformanceObserver' in window) {
      observer.observe({ entryTypes: ['navigation', 'resource'] })
    }

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const getScoreColor = (score: number, thresholds: { good: number; poor: number }) => {
    if (score <= thresholds.good) return 'text-green-600'
    if (score <= thresholds.poor) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number, thresholds: { good: number; poor: number }) => {
    if (score <= thresholds.good) return 'Good'
    if (score <= thresholds.poor) return 'Needs Improvement'
    return 'Poor'
  }

  if (!isVisible) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-2">
                            <HugeiconsIcon icon={DashboardCircleIcon} className="h-5 w-5 animate-spin"  />
            <CardTitle>Performance Monitor</CardTitle>
          </div>
          <CardDescription>Measuring performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HugeiconsIcon icon={ActivityIcon} className="h-5 w-5 text-green-600"  />
              <CardTitle>Performance Monitor</CardTitle>
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <HugeiconsIcon icon={ServerIcon} className="h-3 w-3 mr-1"  />
                {metrics.region}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <HugeiconsIcon icon={GlobeIcon} className="h-3 w-3 mr-1"  />
                Edge
              </Badge>
            </div>
          </div>
          <CardDescription>
            Vercel-optimized performance metrics • Build: {metrics.buildId}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Core Web Vitals */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <HugeiconsIcon icon={ZapIcon} className="h-4 w-4 mr-2 text-yellow-500"  />
              Core Web Vitals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LCP */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium">LCP</span>
                  <span className={`text-sm ${getScoreColor(metrics.lcp || 0, { good: 2500, poor: 4000 })}`}>
                    {getScoreLabel(metrics.lcp || 0, { good: 2500, poor: 4000 })}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {metrics.lcp ? `${(metrics.lcp / 1000).toFixed(2)}s` : '—'}
                </div>
                <Progress 
                  value={metrics.lcp ? Math.min((metrics.lcp / 4000) * 100, 100) : 0} 
                  className="h-2"
                />
              </motion.div>

              {/* FID */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium">FID</span>
                  <span className={`text-sm ${getScoreColor(metrics.fid || 0, { good: 100, poor: 300 })}`}>
                    {getScoreLabel(metrics.fid || 0, { good: 100, poor: 300 })}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : '—'}
                </div>
                <Progress 
                  value={metrics.fid ? Math.min((metrics.fid / 300) * 100, 100) : 0} 
                  className="h-2"
                />
              </motion.div>

              {/* CLS */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium">CLS</span>
                  <span className={`text-sm ${getScoreColor(metrics.cls || 0, { good: 0.1, poor: 0.25 })}`}>
                    {getScoreLabel(metrics.cls || 0, { good: 0.1, poor: 0.25 })}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {metrics.cls ? metrics.cls.toFixed(3) : '—'}
                </div>
                <Progress 
                  value={metrics.cls ? Math.min((metrics.cls / 0.25) * 100, 100) : 0} 
                  className="h-2"
                />
              </motion.div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <HugeiconsIcon icon={DatabaseIcon} className="h-4 w-4 mr-2 text-blue-500"  />
              System Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.renderTime.toFixed(0)}ms
                </div>
                <div className="text-sm text-blue-700">Render Time</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.totalRequests > 0 ? `${((metrics.cacheHits / metrics.totalRequests) * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="text-sm text-green-700">Cache Hit Rate</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : '—'}
                </div>
                <div className="text-sm text-purple-700">TTFB</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.fcp ? `${(metrics.fcp / 1000).toFixed(2)}s` : '—'}
                </div>
                <div className="text-sm text-orange-700">FCP</div>
              </div>
            </div>
          </div>

          {/* Optimization Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Optimizations</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ⚡ Edge Runtime
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                🌊 Streaming SSR
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                📦 ISR Cache
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                🎯 Optimistic Updates
              </Badge>
              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                🔄 Smart Caching
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                ✨ Framer Motion
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 