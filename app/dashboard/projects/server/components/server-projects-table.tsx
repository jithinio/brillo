"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { ClientAvatar } from "@/components/ui/client-avatar"
import { Button } from "@/components/ui/button"
import { Edit, FileText, Trash2 } from "lucide-react"

interface Project {
  id: string
  name: string
  status: string
  start_date?: string
  due_date?: string
  budget?: number
  expenses?: number
  received?: number
  pending?: number
  created_at: string
  clients?: {
    id: string
    name: string
    company?: string
    avatar_url?: string
  } | null
}

interface ServerProjectsTableProps {
  projects: Project[]
  totalCount: number
  initialFilters: any
}

const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  pipeline: { label: "Pipeline", color: "bg-purple-100 text-purple-800" },
  "on_hold": { label: "On Hold", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
}

export function ServerProjectsTable({ projects, totalCount, initialFilters }: ServerProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border bg-transparent text-card-foreground p-8 text-center">
        <p className="text-muted-foreground">No projects found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {projects.length} of {totalCount} projects
        </p>
        <div className="flex items-center space-x-2 text-xs text-blue-600">
          <span>🚀 Server Rendered</span>
          <span>⚡ Cached</span>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Received
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Pending
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project, index) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {project.clients ? (
                      <div className="flex items-center space-x-2">
                        <ClientAvatar
                          name={project.clients.name}
                          avatarUrl={project.clients.avatar_url}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">{project.clients.name}</p>
                          {project.clients.company && (
                            <p className="text-xs text-muted-foreground">{project.clients.company}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No client</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={statusConfig[project.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800"}
                    >
                      {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">
                      {project.budget ? formatCurrency(project.budget) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-green-600">
                      {project.received ? formatCurrency(project.received) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-yellow-600">
                      {project.pending ? formatCurrency(project.pending) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Server Info */}
      <div className="text-center text-xs text-muted-foreground">
        Server-side rendered • Updated every 60 seconds
      </div>
    </div>
  )
} 