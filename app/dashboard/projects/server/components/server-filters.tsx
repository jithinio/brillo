"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, Plus } from "lucide-react"

interface Client {
  id: string
  name: string
  company?: string
  email?: string
  avatar_url?: string
}

interface ServerFiltersProps {
  clients: Client[]
}

export function ServerFilters({ clients }: ServerFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
          <Badge variant="outline" className="text-xs">
            Server Rendered
          </Badge>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        {/* Search */}
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
            Active
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
            Pipeline
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
            Completed
          </Badge>
        </div>

        {/* Client Filters */}
        {clients.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Clients:</span>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
              {clients.length} available
            </Badge>
          </div>
        )}
      </div>

      {/* Performance Note */}
      <div className="text-xs text-muted-foreground text-center">
        Filters are server-rendered and cached • {clients.length} clients loaded
      </div>
    </div>
  )
} 