"use client"

import { useState, useCallback, useRef } from "react"
import { nanoid } from "nanoid"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"

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

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export function useChat() {
  const { user } = useAuth()
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: nanoid(),
      content,
      role: "user",
      timestamp: new Date(),
    }

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }))

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content,
          conversation: state.messages,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      let actions = data.actions || []
      
      // Add follow-up actions based on function execution
      if (data.functionExecuted) {
        switch (data.functionExecuted.name) {
          case 'create_client':
            actions.push({
              type: "button",
              label: "Create project for this client",
              action: () => sendMessage(`Create a new project for ${data.functionExecuted.data?.name}`),
              variant: "outline"
            })
            break
          case 'create_project':
            actions.push({
              type: "button", 
              label: "Generate invoice",
              action: () => sendMessage(`Generate an invoice for project ${data.functionExecuted.data?.name}`),
              variant: "outline"
            })
            break
          case 'get_revenue_analytics':
            actions.push({
              type: "button",
              label: "View client breakdown", 
              action: () => sendMessage("Show me client analytics with revenue breakdown"),
              variant: "outline"
            })
            break
        }
      }
      
      const assistantMessage: Message = {
        id: nanoid(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
        actions,
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }))

    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was aborted, ignore
        return
      }

      console.error("Chat error:", error)
      
      const errorMessage: Message = {
        id: nanoid(),
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }))
    }
  }, [state.messages])

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    })
  }, [])

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = state.messages
      .filter(m => m.role === "user")
      .pop()
    
    if (lastUserMessage) {
      // Remove the last assistant message if it exists and there was an error
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => 
          !(m.role === "assistant" && m.timestamp > lastUserMessage.timestamp)
        ),
      }))
      
      // Retry with the last user message
      sendMessage(lastUserMessage.content)
    }
  }, [state.messages, sendMessage])

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearMessages,
    retryLastMessage,
  }
}
