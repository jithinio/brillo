"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatInput } from "./ChatInput"
import { ChatMessage } from "./ChatMessage"
import { ChatWidgets } from "./ChatWidgets"
import { TypingIndicator } from "./TypingIndicator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChat } from "../hooks/useChat"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isTyping?: boolean
}

export function ChatInterface() {
  const [isActive, setIsActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, isLoading } = useChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (message: string) => {
    if (!isActive) {
      setIsActive(true)
    }
    await sendMessage(message)
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Chat Messages Area */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                  />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Content Area - Widgets */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl mx-auto px-6">
              {/* Welcome Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl font-bold mb-4">
                  What can I help you with today?
                </h1>
                <p className="text-muted-foreground text-lg">
                  Ask about your business, create projects, manage clients, or analyze your data.
                </p>
              </motion.div>

              {/* Dashboard Widgets */}
              <ChatWidgets />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input - Always visible */}
      <motion.div
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`${
          isActive 
            ? "p-4 border-t bg-background/80 backdrop-blur-sm" 
            : "p-6"
        }`}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          isActive={isActive}
          disabled={isLoading}
        />
      </motion.div>
    </div>
  )
}
