"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Check, Sparkles, Zap, Shield, BarChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpgradeLoaderProps {
  isVisible: boolean
  onComplete?: () => void
}

const features = [
  { icon: Crown, text: "Unlocking Pro features", delay: 0.5 },
  { icon: Sparkles, text: "Enabling AI enhancements", delay: 1 },
  { icon: Shield, text: "Activating advanced security", delay: 1.5 },
  { icon: BarChart, text: "Setting up analytics", delay: 2 },
  { icon: Zap, text: "Optimizing performance", delay: 2.5 },
]

export function UpgradeLoader({ isVisible, onComplete }: UpgradeLoaderProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setCurrentFeature(0)
      setIsCompleting(false)
      return
    }

    // Animate through features
    const interval = setInterval(() => {
      setCurrentFeature((prev) => {
        if (prev >= features.length - 1) {
          setIsCompleting(true)
          clearInterval(interval)
          
          // Complete after a short delay
          setTimeout(() => {
            onComplete?.()
          }, 1000)
          
          return prev
        }
        return prev + 1
      })
    }, 600)

    return () => clearInterval(interval)
  }, [isVisible, onComplete])

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative max-w-md w-full mx-4"
          >
            {/* Main content */}
            <div className="bg-card border rounded-lg shadow-2xl p-8 text-center space-y-6">
              {/* Animated icon */}
              <div className="relative mx-auto w-20 h-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-r from-primary/20 to-primary/10" />
                </motion.div>
                <div className="absolute inset-2 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {isCompleting ? "You're all set!" : "Upgrading to Pro"}
                </h2>
                <p className="text-muted-foreground">
                  {isCompleting 
                    ? "Your Pro features are now active" 
                    : "Setting up your enhanced experience..."
                  }
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-3 text-left">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  const isActive = index <= currentFeature
                  const isComplete = index < currentFeature || isCompleting

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: isActive ? 1 : 0.3, 
                        x: 0 
                      }}
                      transition={{ delay: feature.delay * 0.2 }}
                      className={cn(
                        "flex items-center gap-3 transition-all duration-300",
                        isActive && "text-foreground",
                        !isActive && "text-muted-foreground/50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                        isComplete && "bg-green-500 text-white",
                        isActive && !isComplete && "bg-primary/20 text-primary",
                        !isActive && "bg-muted text-muted-foreground"
                      )}>
                        {isComplete ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Loading indicator */}
              {!isCompleting && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-10 -left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
