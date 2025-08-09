"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  actions?: Array<{
    type: "button" | "link"
    label: string
    action: () => void
    variant?: "default" | "outline" | "secondary"
  }>
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-4 max-w-4xl",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={cn(
            isUser 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted"
          )}>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser ? "text-right" : "text-left"
      )}>
        {/* Message Header */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isUser ? "justify-end" : "justify-start"
        )}>
          <span className="font-medium">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span>•</span>
          <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
        </div>

        {/* Message Bubble */}
        <div className={cn(
          "inline-block max-w-[85%]",
          isUser ? "ml-auto" : "mr-auto"
        )}>
          <Card className={cn(
            "relative",
            isUser 
              ? "chat-message-user text-primary-foreground" 
              : "chat-message-assistant"
          )}>
            <CardContent className="p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "flex flex-wrap gap-2",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {message.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.action}
                className="h-8 text-xs"
              >
                {action.label}
              </Button>
            ))}
          </motion.div>
        )}

        {/* Message Actions (Copy, Like, etc.) - Only for assistant messages */}
        {!isUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyToClipboard}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
