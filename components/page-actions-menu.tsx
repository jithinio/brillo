"use client"

import { MoreHorizontal, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface PageActionsMenuProps {
  entityType: 'clients' | 'projects' | 'invoices'
  onExport?: () => void
}

export function PageActionsMenu({ entityType, onExport }: PageActionsMenuProps) {
  const router = useRouter()

  const handleImport = () => {
    router.push(`/dashboard/${entityType}/import`)
  }

  const handleExport = () => {
    onExport?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 