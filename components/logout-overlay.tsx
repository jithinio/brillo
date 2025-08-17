"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { motion, AnimatePresence } from 'framer-motion'
import { Loading03Icon } from '@hugeicons/core-free-icons'

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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-4"
          >
            {/* Title */}
            <div>
              <h2 className="text-lg font-medium mb-2">Signing Out</h2>
              <p className="text-muted-foreground text-sm">
                Please wait while we securely log you out...
              </p>
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center gap-3">
              <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clearing session data</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}