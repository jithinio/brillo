"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ArrowUp01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isActive: boolean
  disabled?: boolean
}

const QUICK_ACTIONS = [
  { label: "Add new client", icon: PlusSignIcon },
  { label: "Create project", icon: PlusSignIcon },
  { label: "Show revenue", icon: PlusSignIcon },
  { label: "Pipeline status", icon: PlusSignIcon },
]

export function ChatInput({ onSendMessage, isActive, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const baseHeightRef = useRef<number>(40) // default to 40px to match h-10

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = `${baseHeightRef.current}px`
        textareaRef.current.style.lineHeight = `${baseHeightRef.current}px`
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
    
    // Auto-resize: keep at one-line height until content wraps to 2 lines
    const textarea = e.target
    const baseHeight = baseHeightRef.current
    textarea.style.height = `${baseHeight}px`
    textarea.style.lineHeight = `${baseHeight}px`
    const nextHeight = Math.min(textarea.scrollHeight, 120)
    if (nextHeight > baseHeight + 1) {
      textarea.style.height = `${nextHeight}px`
      textarea.style.lineHeight = `1.25rem`
    }
  }

  const handleQuickAction = (action: string) => {
    onSendMessage(action)
  }

  useEffect(() => {
    // Sync base height to the send button height if available
    const buttonHeight = sendButtonRef.current?.clientHeight
    if (buttonHeight && buttonHeight > 0) {
      baseHeightRef.current = buttonHeight
    }
    if (!isActive && textareaRef.current) {
      textareaRef.current.style.height = `${baseHeightRef.current}px`
      textareaRef.current.style.lineHeight = `${baseHeightRef.current}px`
      textareaRef.current.focus()
    }
  }, [isActive])

  // Ensure initial height matches the send button on first mount
  useEffect(() => {
    const buttonHeight = sendButtonRef.current?.clientHeight
    if (buttonHeight && buttonHeight > 0) {
      baseHeightRef.current = buttonHeight
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = `${baseHeightRef.current}px`
      textareaRef.current.style.lineHeight = `${baseHeightRef.current}px`
    }
  }, [])

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
              <HugeiconsIcon icon={action.icon} className="mr-1 h-3 w-3" />
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
          "relative bg-background",
          isActive 
            ? "border-border shadow-sm transition-all duration-200" 
            : "border border-border/60 shadow-md",
          disabled && "opacity-60"
        )}>
          <form onSubmit={handleSubmit} className="p-3">
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
                    "h-auto min-h-0 max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:border-transparent outline-none shadow-none bg-transparent text-base px-0 py-0"
                  )}
                  disabled={disabled}
                />
                

              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={!message.trim() || disabled}
                  className="h-10 w-10 shrink-0 rounded-full"
                  size="icon"
                  ref={sendButtonRef}
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} className="h-4 w-4"  />
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
