"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader } from '@/components/ui/loader'
import { SparklesIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

interface UpgradeLoaderProps {
  isVisible: boolean
  onComplete: () => void
  className?: string
}

const features = [
  "Unlocking unlimited projects...",
  "Activating advanced analytics...", 
  "Enabling premium integrations...",
  "Setting up pro features...",
  "Finalizing your upgrade..."
]

export function UpgradeLoader({ isVisible, onComplete, className }: UpgradeLoaderProps) {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const featureInterval = setInterval(() => {
      setCurrentFeatureIndex((prev) => {
        const next = prev + 1
        if (next >= features.length) {
          setIsComplete(true)
          clearInterval(featureInterval)
          // Show checkmark animation
          setTimeout(() => {
            setShowCheckmark(true)
            // Complete after showing checkmark
            setTimeout(() => {
              onComplete()
            }, 1200)
          }, 500)
          return prev
        }
        return next
      })
    }, 800)

    return () => clearInterval(featureInterval)
  }, [isVisible, onComplete])

  // Reset state when loader becomes visible
  useEffect(() => {
    if (isVisible) {
      setCurrentFeatureIndex(0)
      setIsComplete(false)
      setShowCheckmark(false)
    }
  }, [isVisible])

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeOut"
            }}
            className={cn(
              "fixed inset-0 flex items-center justify-center p-4",
              className
            )}
          >
            <div className="max-w-md w-full text-center">
              <div className="space-y-6">
                {/* Loader Icon with Crown/Checkmark */}
                <div className="flex justify-center relative h-12 w-12 mx-auto">
                  {/* Static loader circle container to prevent layout shift */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {showCheckmark ? (
                        <motion.div
                          key="checkmark-loader"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative h-12 w-12 flex items-center justify-center"
                        >
                          {/* Orange gradient circle background */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                              duration: 0.4,
                              ease: "easeOut"
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          />
                          {/* White checkmark inside */}
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                              delay: 0.2,
                              type: "spring",
                              stiffness: 400,
                              damping: 20
                            }}
                            className="relative z-10 flex items-center justify-center"
                          >
                            <HugeiconsIcon icon={Tick02Icon} className="h-6 w-6 text-white stroke-[3]"  />
                          </motion.div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="crown-loader"
                          initial={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="relative h-12 w-12 flex items-center justify-center"
                        >
                          {/* Primary loader circle */}
                          <Loader size="xl" variant="primary" className="absolute" />
                          {/* Sparkles inside */}
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="relative z-10"
                          >
                            <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6 text-primary fill-primary"  />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Animated Content */}
                <div className="space-y-2 min-h-[4rem] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {showCheckmark ? (
                      <motion.div
                        key="complete"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-center"
                      >
                        <h2 className="text-xl font-semibold text-orange-600">
                          Upgrade Complete!
                        </h2>
                        <p className="text-muted-foreground mt-1">
                          Welcome to Brillo Pro! 🎉
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-center"
                      >
                        <h2 className="text-xl font-semibold text-foreground">
                          Upgrading to Pro
                        </h2>
                        <div className="h-6 flex items-center justify-center mt-1">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={currentFeatureIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: "easeInOut"
                              }}
                              className="text-muted-foreground"
                            >
                              {features[currentFeatureIndex]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Progress indicator */}
                <div className="min-h-[2.5rem] flex flex-col justify-center">
                  {!showCheckmark && (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex justify-center space-x-1">
                        {features.map((_, index) => (
                          <div
                            key={index}
                            className="h-1.5 w-8 rounded-full bg-muted overflow-hidden"
                          >
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ 
                                width: index <= currentFeatureIndex ? "100%" : "0%"
                              }}
                              transition={{ 
                                duration: 0.4,
                                ease: "easeInOut",
                                delay: index <= currentFeatureIndex ? index * 0.1 : 0
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentFeatureIndex + 1} of {features.length}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
