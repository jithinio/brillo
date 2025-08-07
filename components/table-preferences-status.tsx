"use client"

import React from "react"
import { motion } from "framer-motion"
import { Cloud, CloudOff, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SaveMetrics {
  totalSaves: number
  successfulSaves: number
  failedSaves: number
  averageSaveTime: number
  lastSaveTime?: number
}

interface TablePreferencesStatusProps {
  isSaving: boolean
  hasPendingUpdates: boolean
  saveMetrics: SaveMetrics
  onForceSave?: () => void
  className?: string
}

export function TablePreferencesStatus({
  isSaving,
  hasPendingUpdates,
  saveMetrics,
  onForceSave,
  className = ""
}: TablePreferencesStatusProps) {
  const [lastSaveText, setLastSaveText] = React.useState<string>("")

  React.useEffect(() => {
    if (saveMetrics.lastSaveTime) {
      const updateLastSaveText = () => {
        const now = Date.now()
        const diff = now - saveMetrics.lastSaveTime!
        
        if (diff < 60000) { // Less than 1 minute
          setLastSaveText(`${Math.floor(diff / 1000)}s ago`)
        } else if (diff < 3600000) { // Less than 1 hour
          setLastSaveText(`${Math.floor(diff / 60000)}m ago`)
        } else {
          setLastSaveText(`${Math.floor(diff / 3600000)}h ago`)
        }
      }

      updateLastSaveText()
      const interval = setInterval(updateLastSaveText, 1000)
      return () => clearInterval(interval)
    }
  }, [saveMetrics.lastSaveTime])

  const getStatusIcon = () => {
    if (isSaving) {
      return <Cloud className="w-3 h-3 animate-pulse text-blue-500" />
    }
    if (hasPendingUpdates) {
      return <Clock className="w-3 h-3 text-amber-500" />
    }
    if (saveMetrics.failedSaves > 0) {
      return <AlertCircle className="w-3 h-3 text-red-500" />
    }
    return <CheckCircle className="w-3 h-3 text-green-500" />
  }

  const getStatusText = () => {
    if (isSaving) return "Syncing preferences..."
    if (hasPendingUpdates) return "Changes pending"
    if (saveMetrics.failedSaves > 0) return "Sync issues detected"
    return "All changes saved"
  }

  const getTooltipContent = () => (
    <div className="text-xs space-y-1">
      <div className="font-medium">{getStatusText()}</div>
      <div className="text-muted-foreground space-y-0.5">
        <div>Total saves: {saveMetrics.totalSaves}</div>
        <div>Success rate: {saveMetrics.totalSaves > 0 ? Math.round((saveMetrics.successfulSaves / saveMetrics.totalSaves) * 100) : 100}%</div>
        {saveMetrics.averageSaveTime > 0 && (
          <div>Avg save time: {Math.round(saveMetrics.averageSaveTime)}ms</div>
        )}
        {lastSaveText && <div>Last saved: {lastSaveText}</div>}
        {hasPendingUpdates && onForceSave && (
          <button
            onClick={onForceSave}
            className="text-blue-400 hover:text-blue-300 underline mt-1"
          >
            Force sync now
          </button>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className={`flex items-center gap-1.5 cursor-pointer ${className}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {getStatusIcon()}
            <span className="text-xs text-muted-foreground">
              {isSaving ? "Syncing" : hasPendingUpdates ? "Pending" : "Saved"}
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}