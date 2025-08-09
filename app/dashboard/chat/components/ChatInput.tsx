"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, Mic, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isActive: boolean
  disabled?: boolean
}

const QUICK_ACTIONS = [
  { label: "Add new client", icon: Plus },
  { label: "Create project", icon: Plus },
  { label: "Show revenue", icon: Plus },
  { label: "Pipeline status", icon: Plus },
]

export function ChatInput({ onSendMessage, isActive, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleQuickAction = (action: string) => {
    onSendMessage(action)
  }

  useEffect(() => {
    if (!isActive && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isActive])

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Quick Actions - Only show when not active */}
      {!isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 flex flex-wrap gap-2 justify-center"
        >
          {QUICK_ACTIONS.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.label)}
              className="h-8 text-xs"
              disabled={disabled}
            >
              <action.icon className="mr-1 h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Input Container */}
      <motion.div
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Card className={cn(
          "relative",
          isActive 
            ? "border-border shadow-sm transition-all duration-200" 
            : "chat-input-large border-2 border-border/60 shadow-lg hover:shadow-xl hover:border-border",
          disabled && "opacity-60"
        )}>
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-end gap-3">
              {/* Main Input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isActive 
                      ? "Ask anything about your business..." 
                      : "What would you like to know about your business?"
                  }
                  className={cn(
                    "min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 text-base",
                    !isActive && "text-lg"
                  )}
                  disabled={disabled}
                />
                

              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Voice Input Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={disabled}
                >
                  <Mic className="h-4 w-4" />
                </Button>

                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={!message.trim() || disabled}
                  className="h-10 w-10 shrink-0"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Helpful Text */}
      {!isActive && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to send, 
          <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">Shift + Enter</kbd> for new line
        </motion.p>
      )}
    </div>
  )
}
