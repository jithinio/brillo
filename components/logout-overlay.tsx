"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Loader2 } from 'lucide-react'

interface LogoutOverlayProps {
  isVisible: boolean
}

export function LogoutOverlay({ isVisible }: LogoutOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-4"
          >
            {/* Simple icon */}
            <div className="flex justify-center">
              <LogOut className="w-6 h-6 text-muted-foreground" />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-medium mb-2">Signing Out</h2>
              <p className="text-muted-foreground text-sm">
                Please wait while we securely log you out...
              </p>
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clearing session data</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}