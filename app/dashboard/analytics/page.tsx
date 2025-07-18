"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Overview } from "@/components/overview"
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Clock } from "lucide-react"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"

// Types for project data
interface Project {
  id: string
  name: string
  budget?: number
  revenue?: number
  expenses?: number
  payment_received?: number
  payment_pending?: number
  start_date?: string
  due_date?: string
  created_at: string
  status: string
}

// Data fetching function
const fetchProjects = async (): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

// Calculate metrics from real data
const calculateMetrics = (projects: Project[]) => {
  // Filter out pipeline projects
  const activeProjects = projects.filter(project => project.status !== 'pipeline')
  
  // Calculate total revenue (using same logic as dashboard)
  const totalRevenue = activeProjects.reduce((sum, project) => {
    let amount = 0
    
    // For on hold and canceled projects, use received amount as budget
    if (project.status === 'on hold' || project.status === 'canceled') {
      amount = project.payment_received || 0
    } else {
      // Use budget as primary, revenue as fallback, then 0
      amount = project.budget || project.revenue || 0
    }
    
    return sum + amount
  }, 0)

  // Count active projects (excluding pipeline, canceled, and on hold)
  const activeProjectCount = activeProjects.filter(project => 
    !['canceled', 'on hold'].includes(project.status)
  ).length

  // Calculate average project time (simplified - using days since creation)
  const now = new Date()
  const projectTimes = activeProjects
    .filter(project => project.status === 'completed')
    .map(project => {
      const created = new Date(project.created_at)
      const completed = project.due_date ? new Date(project.due_date) : now
      return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    })
  
  const avgProjectTime = projectTimes.length > 0 
    ? Math.round(projectTimes.reduce((sum, time) => sum + time, 0) / projectTimes.length)
    : 14

  // Calculate client satisfaction (simplified - based on completed projects)
  const completedProjects = activeProjects.filter(project => project.status === 'completed').length
  const totalProjects = activeProjects.length
  const satisfactionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 98.2

  return {
    totalRevenue,
    activeProjectCount,
    satisfactionRate,
    avgProjectTime
  }
}

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProjects = async () => {
      const data = await fetchProjects()
      setProjects(data)
      setIsLoading(false)
    }

    loadProjects()
  }, [])

  const metrics = calculateMetrics(projects)

  const metricsData = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      change: "+12.5%",
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      title: "Active Projects",
      value: metrics.activeProjectCount.toString(),
      change: "+3",
      trend: "up" as const,
      icon: FileText,
    },
    {
      title: "Client Satisfaction",
      value: `${metrics.satisfactionRate.toFixed(1)}%`,
      change: "+2.1%",
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Avg. Project Time",
      value: `${metrics.avgProjectTime} days`,
      change: "-2 days",
      trend: "down" as const,
      icon: Clock,
    },
  ]

  return (
    <>
      <PageHeader
        title="Analytics"
        action={
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
            <Button size="sm">Export Report</Button>
          </div>
        }
      />
      <PageContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {metricsData.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {metric.trend === "up" ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>{metric.change}</span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue for the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <Overview />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status Distribution</CardTitle>
              <CardDescription>Current status of all projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const statusCounts = projects.reduce((acc, project) => {
                  acc[project.status] = (acc[project.status] || 0) + 1
                  return acc
                }, {} as Record<string, number>)

                const total = projects.length
                const statuses = [
                  { status: 'completed', label: 'Completed', color: 'bg-green-500' },
                  { status: 'in progress', label: 'In Progress', color: 'bg-blue-500' },
                  { status: 'planning', label: 'Planning', color: 'bg-orange-500' },
                  { status: 'on hold', label: 'On Hold', color: 'bg-red-500' },
                  { status: 'pipeline', label: 'Pipeline', color: 'bg-purple-500' },
                  { status: 'canceled', label: 'Canceled', color: 'bg-gray-500' },
                ]

                return statuses.map(({ status, label, color }) => {
                  const count = statusCounts[status] || 0
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0'
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${color} rounded-full`}></div>
                        <span className="text-sm">{label}</span>
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  )
                })
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>Clients by revenue contribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Group projects by client and calculate revenue
                const clientRevenue = projects.reduce((acc, project) => {
                  // For now, using project name as client (you might want to join with clients table)
                  const clientName = project.name.split(' - ')[0] || 'Unknown Client'
                  
                  let amount = 0
                  if (project.status === 'on hold' || project.status === 'canceled') {
                    amount = project.payment_received || 0
                  } else {
                    amount = project.budget || project.revenue || 0
                  }
                  
                  acc[clientName] = (acc[clientName] || 0) + amount
                  return acc
                }, {} as Record<string, number>)

                // Sort by revenue and take top 4
                const topClients = Object.entries(clientRevenue)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 4)

                return topClients.map(([client, revenue]) => (
                  <div key={client} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{client}</span>
                    <span className="text-sm">{formatCurrency(revenue)}</span>
                  </div>
                ))
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Milestones</CardTitle>
              <CardDescription>Key achievements this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const milestones = []
                
                // Check for revenue milestone
                const totalRevenue = projects.reduce((sum, project) => {
                  let amount = 0
                  if (project.status === 'on hold' || project.status === 'canceled') {
                    amount = project.payment_received || 0
                  } else {
                    amount = project.budget || project.revenue || 0
                  }
                  return sum + amount
                }, 0)
                
                if (totalRevenue >= 50000) {
                  milestones.push({
                    text: `Reached ${formatCurrency(totalRevenue)} revenue milestone`,
                    date: new Date().toLocaleDateString(),
                    color: 'bg-green-500'
                  })
                }

                // Check for completed projects
                const completedCount = projects.filter(p => p.status === 'completed').length
                if (completedCount >= 10) {
                  milestones.push({
                    text: `Completed ${completedCount} projects`,
                    date: new Date().toLocaleDateString(),
                    color: 'bg-blue-500'
                  })
                }

                // Check for new projects this month
                const thisMonth = new Date().getMonth()
                const thisYear = new Date().getFullYear()
                const newProjectsThisMonth = projects.filter(project => {
                  const created = new Date(project.created_at)
                  return created.getMonth() === thisMonth && created.getFullYear() === thisYear
                }).length

                if (newProjectsThisMonth > 0) {
                  milestones.push({
                    text: `Added ${newProjectsThisMonth} new projects this month`,
                    date: new Date().toLocaleDateString(),
                    color: 'bg-orange-500'
                  })
                }

                return milestones.length > 0 ? milestones.map((milestone, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 ${milestone.color} rounded-full mt-2`}></div>
                    <div>
                      <p className="text-sm font-medium">{milestone.text}</p>
                      <p className="text-xs text-muted-foreground">{milestone.date}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">No recent milestones</div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
