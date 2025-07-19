"use client"

import * as React from "react"
import { useState } from "react"
import { PageHeader, PageContent } from "@/components/page-header"
import { DataTable } from "@/components/projects/data-table"
import { createColumns, type Project } from "@/components/projects/columns"
import { ProjectFilters } from "@/components/projects/project-filters"
import { formatCurrency } from "@/lib/currency"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useProjectFilters } from "@/hooks/use-project-filters"

// Client interface
interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  avatar_url?: string
}

export default function ActiveProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const { filters } = useProjectFilters()

  // Fetch projects when filters change
  React.useEffect(() => {
    fetchProjects()
  }, [filters])

  // Fetch clients only once on mount
  React.useEffect(() => {
    fetchClients()
  }, [])

  // Fetch projects from database
  const fetchProjects = async () => {
    try {
      setLoading(true)
      let allProjects: Project[] = []
      
      if (isSupabaseConfigured()) {
        let query = supabase
          .from('projects')
          .select(`
            *,
            clients (
              name,
              company,
              avatar_url
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        // Apply additional filters
        if (filters.client.length > 0) {
          query = query.in('client_id', filters.client)
        }
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start)
        }
        if (filters.dateRange.end) {
          query = query.lte('created_at', filters.dateRange.end)
        }
        if (filters.budget.min) {
          query = query.gte('budget', filters.budget.min)
        }
        if (filters.budget.max) {
          query = query.lte('budget', filters.budget.max)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching projects:', error)
          throw error
        }

        // Transform the data to match our Project interface
        const dbProjects = (data || []).map(project => ({
          id: project.id,
          name: project.name,
          client: project.clients?.name || 'Unknown Client',
          client_company: project.clients?.company || '',
          client_avatar: project.clients?.avatar_url || '',
          status: project.status,
          budget: project.budget || 0,
          expenses: project.expenses || 0,
          received: project.payment_received || 0,
          pending: project.payment_pending || 0,
          start_date: project.start_date,
          due_date: project.due_date,
          created_at: project.created_at,
          description: project.description || '',
        }))

        allProjects = dbProjects
      }

      // Force state update with new reference to trigger re-renders
      setProjects([...allProjects])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch clients from database
  const fetchClients = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, company')
          .order('name')

        if (error) {
          console.error('Error fetching clients:', error)
          return
        }

        setClients(data || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  // Memoize projects for better performance
  const memoizedProjects = React.useMemo(() => projects, [projects])

  // Memoize columns to prevent unnecessary re-creations
  const columns = React.useMemo(() => createColumns({
    onEditProject: () => {},
    onCreateInvoice: () => {},
    onDeleteProject: () => {},
    onStatusChange: () => {},
    onDateChange: () => {},
  }), [])

  // Calculate metrics for active projects
  const calculateMetrics = () => {
    const totalProjects = memoizedProjects.length
    const totalBudget = memoizedProjects.reduce((sum, project) => sum + (project.budget || 0), 0)
    const totalReceived = memoizedProjects.reduce((sum, project) => sum + (project.received || 0), 0)
    const totalPending = memoizedProjects.reduce((sum, project) => sum + (project.pending || 0), 0)

    return {
      totalProjects,
      totalBudget,
      totalReceived,
      totalPending
    }
  }

  const metrics = calculateMetrics()

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Active Projects" />
      
      <PageContent>
                {/* Metrics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6">
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Active Projects</h3>
              <div className="text-lg font-semibold text-blue-600 ml-auto">{metrics.totalProjects}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Budget</h3>
              <div className="text-lg font-semibold ml-auto">{formatCurrency(metrics.totalBudget)}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Received</h3>
              <div className="text-lg font-semibold text-green-600 ml-auto">{formatCurrency(metrics.totalReceived)}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-xs font-medium text-muted-foreground leading-none whitespace-nowrap">Total Pending</h3>
              <div className="text-lg font-semibold text-yellow-600 ml-auto">{formatCurrency(metrics.totalPending)}</div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <DataTable 
          key={`active-projects-${memoizedProjects.length}-${JSON.stringify(filters)}`} // Simple key for re-renders
          columns={columns} 
          data={memoizedProjects}
          filterComponent={
            <ProjectFilters 
              clients={clients}
              showStatusFilter={false}
            />
          }
        />
      </PageContent>
    </div>
  )
} 