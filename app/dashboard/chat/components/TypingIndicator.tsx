"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Bot } from "lucide-react"

const dot = {
  initial: { y: 0 },
  animate: { y: -10 },
}

const dotTransition = {
  duration: 0.5,
  ease: "easeInOut",
  repeat: Infinity,
  repeatType: "reverse" as const,
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-4 max-w-4xl mr-auto"
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Typing Animation */}
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="font-medium">AI Assistant</span>
          <span>•</span>
          <span>typing...</span>
        </div>

        <div className="inline-block">
          <Card className="bg-muted/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                  variants={dot}
                  initial="initial"
                  animate="animate"
                  transition={{ ...dotTransition, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                  variants={dot}
                  initial="initial"
                  animate="animate"
                  transition={{ ...dotTransition, delay: 0.1 }}
                />
                <motion.div
                  className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                  variants={dot}
                  initial="initial"
                  animate="animate"
                  transition={{ ...dotTransition, delay: 0.2 }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
