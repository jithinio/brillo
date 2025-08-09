import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { claudeProvider } from "@/lib/ai/claude-provider"
import { BusinessFunctionHandler } from "@/lib/ai/function-handlers"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatRequest {
  message: string
  conversation: ChatMessage[]
}

// Build user context for Claude
const buildUserContext = async (userId: string): Promise<string> => {
  try {
    // Get user's recent data for context
    const [projectsRes, clientsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('name, status, budget, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('clients')
        .select('name, company, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    const recentProjects = projectsRes.data || []
    const recentClients = clientsRes.data || []

    let context = "User's Recent Business Activity:\n\n"
    
    if (recentProjects.length > 0) {
      context += "Recent Projects:\n"
      recentProjects.forEach(p => {
        context += `- ${p.name} (${p.status}, $${p.budget || 0})\n`
      })
      context += "\n"
    }

    if (recentClients.length > 0) {
      context += "Recent Clients:\n"
      recentClients.forEach(c => {
        context += `- ${c.name}${c.company ? ` (${c.company})` : ''}\n`
      })
    }

    return context
  } catch (error) {
    console.error('Error building user context:', error)
    return 'User is accessing the business management dashboard.'
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChatRequest = await request.json()
    const { message, conversation } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build user context for Claude
    const userContext = await buildUserContext(user.id)

    // Convert conversation to Claude format
    const messages = [
      ...conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Check if Claude API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback: try to answer simple questions about projects/clients
                if (message.toLowerCase().includes('bruno')) {
            try {
              const functionHandler = new BusinessFunctionHandler(user.id, token)
              const result = await functionHandler.executeFunction({
                name: 'search_projects',
                arguments: { clientName: 'bruno' }
              })
          
          return NextResponse.json({
            response: `🔧 **AI Service Unavailable** - Using fallback search:\n\n${result.message}\n\n*Note: To get full AI capabilities, please add your ANTHROPIC_API_KEY to .env.local*`,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Fallback search error:', error)
        }
      }
      
      return NextResponse.json({
        response: "I'm sorry, but the AI service is not properly configured. Please ensure the ANTHROPIC_API_KEY environment variable is set in your .env.local file.\n\nTo get your API key:\n1. Visit console.anthropic.com\n2. Sign up or log in\n3. Go to API Keys section\n4. Create a new key\n5. Add it to your .env.local file as ANTHROPIC_API_KEY=your_key_here\n6. Restart the development server",
        timestamp: new Date().toISOString(),
      })
    }

    // Remove forced function calls - let Claude handle it intelligently

    // Get Claude response
    const claudeResponse = await claudeProvider.chat(messages, userContext, user.id)
    
    // Debug logging
    console.log('Claude response:', {
      content: claudeResponse.content,
      hasFunctionCall: !!claudeResponse.functionCall,
      functionCall: claudeResponse.functionCall
    })

    // Handle function calls if any
    if (claudeResponse.functionCall) {
      const functionHandler = new BusinessFunctionHandler(user.id, token)
      const functionResult = await functionHandler.executeFunction(claudeResponse.functionCall)
      
      // Build context based on success/failure
      const functionContext = functionResult.success
        ? `Function ${claudeResponse.functionCall.name} executed successfully. Result: ${functionResult.message}`
        : `Function ${claudeResponse.functionCall.name} failed. Error: ${functionResult.message}`
      
      // Get Claude's analysis of the function result
      const followUpMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: claudeResponse.content || `I'll ${claudeResponse.functionCall.name.replace(/_/g, ' ')} for you.`
        },
        {
          role: 'user' as const,
          content: functionContext
        }
      ]

      const finalResponse = await claudeProvider.chat(followUpMessages, userContext, user.id)
      
      // For failed functions, prioritize Claude's helpful response
      let combinedResponse: string
      if (!functionResult.success) {
        combinedResponse = finalResponse.content
      } else {
        combinedResponse = claudeResponse.content 
          ? `${claudeResponse.content}\n\n${functionResult.message}\n\n${finalResponse.content}`
          : `${functionResult.message}\n\n${finalResponse.content}`
      }
      
      return NextResponse.json({
        response: combinedResponse,
        functionExecuted: {
          name: claudeResponse.functionCall.name,
          success: functionResult.success,
          data: functionResult.data,
          error: functionResult.error
        },
        usage: {
          inputTokens: (claudeResponse.usage?.inputTokens || 0) + (finalResponse.usage?.inputTokens || 0),
          outputTokens: (claudeResponse.usage?.outputTokens || 0) + (finalResponse.usage?.outputTokens || 0)
        },
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      response: claudeResponse.content,
      usage: claudeResponse.usage,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Check if this is an API key issue
    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json(
        { error: 'Claude API authentication failed. Please check your ANTHROPIC_API_KEY.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
