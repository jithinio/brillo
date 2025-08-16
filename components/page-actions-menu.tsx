"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from "react"
import { MoreHorizontalIcon, FileImportIcon, FileExportIcon, ReloadIcon, CalculateIcon } from '@hugeicons/core-free-icons'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { CurrencyConverterWidget } from "@/components/currency-converter-widget"

interface PageActionsMenuProps {
  entityType: 'clients' | 'projects' | 'invoices'
  onExport?: () => void
  onResetColumns?: () => void
  showResetColumns?: boolean
}

export function PageActionsMenu({ entityType, onExport, onResetColumns, showResetColumns = false }: PageActionsMenuProps) {
  const router = useRouter()
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false)

  const handleImport = () => {
    router.push(`/dashboard/${entityType}/import`)
  }

  const handleExport = () => {
    onExport?.()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Currency Converter for Projects and Invoices */}
      {(entityType === 'projects' || entityType === 'invoices') && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCurrencyConverter(true)}
            className="h-7 px-2"
          >
                            <HugeiconsIcon icon={CalculateIcon} className="h-3.5 w-3.5 mr-1.5"  />
            Converter
          </Button>
          <CurrencyConverterWidget
            isOpen={showCurrencyConverter}
            onClose={() => setShowCurrencyConverter(false)}
          />
        </>
      )}
      
      {/* Actions Menu */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4"  />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleImport}>
          <HugeiconsIcon icon={FileImportIcon} className="mr-2 h-4 w-4"  />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport}>
          <HugeiconsIcon icon={FileExportIcon} className="mr-2 h-4 w-4"  />
          Export
        </DropdownMenuItem>
        {showResetColumns && onResetColumns && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onResetColumns}>
              <HugeiconsIcon icon={ReloadIcon} className="mr-2 h-4 w-4"  />
              Reset Column Settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
} 