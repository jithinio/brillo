"use client"

import { useEffect } from "react"
import { ChatInterface } from "./components/ChatInterface"
import { PageHeader } from "@/components/page-header"

export default function ChatPage() {
  // Override main background for this page only
  useEffect(() => {
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.style.background = 'transparent'
    }
    
    // Cleanup function to restore original background when leaving page
    return () => {
      const mainElement = document.querySelector('main')
      if (mainElement) {
        mainElement.style.background = ''
      }
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col h-full max-w-full overflow-hidden">
      {/* Header - will be hidden when chat is active */}
      <div className="chat-header">
        <PageHeader
          title="AI Assistant"
          description="Ask questions, get insights, and manage your business with AI."
        />
      </div>
      
      {/* Main Chat Interface */}
      <div className="flex-1 relative overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  )
}
