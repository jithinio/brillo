import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { claudeProvider } from "@/lib/ai/claude-provider"
import { BusinessFunctionHandler } from "@/lib/ai/function-handlers"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await request.json()
    const { message, conversation } = body

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build user context
    const userContext = await buildUserContext(user.id)

    // Convert conversation to Claude format
    const messages = [
      ...conversation.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Create a readable stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedText = ''
          
          // Stream Claude's response
          const response = await claudeProvider.streamChat(
            messages,
            userContext,
            user.id,
            (chunk) => {
              accumulatedText += chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
            }
          )

          // Handle function calls if any
          if (response.functionCall) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'function_start', name: response.functionCall.name })}\n\n`))
            
            const functionHandler = new BusinessFunctionHandler(user.id, token)
            const functionResult = await functionHandler.executeFunction(response.functionCall)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'function_result', 
              name: response.functionCall.name,
              result: functionResult.message 
            })}\n\n`))

            // Get Claude's analysis of the result
            const followUpMessages = [
              ...messages,
              { role: 'assistant' as const, content: accumulatedText },
              { role: 'user' as const, content: `Function result: ${functionResult.message}` }
            ]

            await claudeProvider.streamChat(
              followUpMessages,
              userContext,
              user.id,
              (chunk) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'analysis', content: chunk })}\n\n`))
              }
            )
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat stream API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Build user context helper (same as in main chat route)
async function buildUserContext(userId: string): Promise<string> {
  try {
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
