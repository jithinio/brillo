"use client"

import { useState, useEffect } from "react"
import { useDashboardData } from "@/hooks/use-unified-projects"
import { useSettings } from "@/components/settings-provider"
import { addDays, format, isAfter, parseISO } from "date-fns"

interface RevenueWidget {
  current: number
  previous: number
  trend: 'up' | 'down' | 'neutral'
  percentage: number
  currency: string
}

interface PaymentsWidget {
  amount: number
  dueCount: number
  overdueCount: number
  nextDueIn: number
  currency: string
}

interface PipelineWidget {
  totalValue: number
  activeDeals: number
  conversionRate: number
  hotLeads: number
  currency: string
}

interface ChatWidgetsData {
  revenue: RevenueWidget
  payments: PaymentsWidget
  pipeline: PipelineWidget
  isLoading: boolean
}

export function useChatWidgets(): ChatWidgetsData {
  const { projects, isLoading: projectsLoading } = useDashboardData()
  const { settings } = useSettings()
  const [isLoading, setIsLoading] = useState(true)

  // Calculate revenue data
  const calculateRevenue = (): RevenueWidget => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const currentMonthRevenue = projects
      .filter(p => {
        const createdAt = new Date(p.created_at)
        return createdAt.getMonth() === currentMonth && 
               createdAt.getFullYear() === currentYear &&
               p.payment_received > 0
      })
      .reduce((sum, p) => sum + (p.payment_received || 0), 0)

    const lastMonthRevenue = projects
      .filter(p => {
        const createdAt = new Date(p.created_at)
        return createdAt.getMonth() === lastMonth && 
               createdAt.getFullYear() === lastMonthYear &&
               p.payment_received > 0
      })
      .reduce((sum, p) => sum + (p.payment_received || 0), 0)

    const percentage = lastMonthRevenue > 0 
      ? Math.abs(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0

    const trend = currentMonthRevenue > lastMonthRevenue 
      ? 'up' 
      : currentMonthRevenue < lastMonthRevenue 
        ? 'down' 
        : 'neutral'

    return {
      current: currentMonthRevenue,
      previous: lastMonthRevenue,
      trend,
      percentage: Math.round(percentage),
      currency: settings.currency || 'USD',
    }
  }

  // Calculate payments data
  const calculatePayments = (): PaymentsWidget => {
    const now = new Date()
    const upcomingProjects = projects.filter(p => {
      if (!p.due_date || p.status === 'completed') return false
      const dueDate = parseISO(p.due_date)
      return isAfter(dueDate, now)
    })

    const overdueProjects = projects.filter(p => {
      if (!p.due_date || p.status === 'completed') return false
      const dueDate = parseISO(p.due_date)
      return !isAfter(dueDate, now)
    })

    const totalUpcomingAmount = upcomingProjects
      .reduce((sum, p) => sum + ((p.budget || p.total_budget || 0) - (p.payment_received || 0)), 0)

    const nextProject = upcomingProjects
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]

    const nextDueIn = nextProject 
      ? Math.ceil((parseISO(nextProject.due_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return {
      amount: totalUpcomingAmount,
      dueCount: upcomingProjects.length,
      overdueCount: overdueProjects.length,
      nextDueIn,
      currency: settings.currency || 'USD',
    }
  }

  // Calculate pipeline data
  const calculatePipeline = (): PipelineWidget => {
    const pipelineProjects = projects.filter(p => 
      p.pipeline_stage && 
      p.pipeline_stage !== 'won' && 
      p.pipeline_stage !== 'lost'
    )

    const totalValue = pipelineProjects
      .reduce((sum, p) => sum + (p.budget || p.total_budget || 0), 0)

    const hotLeads = pipelineProjects.filter(p => 
      p.pipeline_stage === 'proposal' || p.pipeline_stage === 'negotiation'
    ).length

    // Calculate conversion rate based on won vs lost projects
    const wonProjects = projects.filter(p => p.pipeline_stage === 'won' || p.status === 'completed').length
    const lostProjects = projects.filter(p => p.pipeline_stage === 'lost').length
    const totalClosed = wonProjects + lostProjects
    const conversionRate = totalClosed > 0 ? Math.round((wonProjects / totalClosed) * 100) : 0

    return {
      totalValue,
      activeDeals: pipelineProjects.length,
      conversionRate,
      hotLeads,
      currency: settings.currency || 'USD',
    }
  }

  useEffect(() => {
    if (!projectsLoading) {
      setIsLoading(false)
    }
  }, [projectsLoading])

  const revenue = calculateRevenue()
  const payments = calculatePayments()
  const pipeline = calculatePipeline()

  return {
    revenue,
    payments,
    pipeline,
    isLoading: isLoading || projectsLoading,
  }
}
