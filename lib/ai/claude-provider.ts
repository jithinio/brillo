import Anthropic from '@anthropic-ai/sdk'

// Check if API key is available
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in environment variables')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface BusinessFunction {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, any>
    required: string[]
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FunctionCall {
  name: string
  arguments: Record<string, any>
}

export interface ChatResponse {
  content: string
  functionCall?: FunctionCall
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// Define available business functions for Claude
export const BUSINESS_FUNCTIONS: BusinessFunction[] = [
  {
    name: "create_client",
    description: "Create a new client in the system",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The client's full name"
        },
        company: {
          type: "string",
          description: "The client's company name"
        },
        email: {
          type: "string",
          description: "The client's email address"
        },
        phone: {
          type: "string",
          description: "The client's phone number"
        }
      },
      required: ["name", "email"]
    }
  },
  {
    name: "create_project",
    description: "Create a new project",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The project name"
        },
        description: {
          type: "string",
          description: "Project description"
        },
        budget: {
          type: "number",
          description: "Project budget amount"
        },
        clientId: {
          type: "string",
          description: "The ID of the client this project is for"
        },
        clientName: {
          type: "string",
          description: "The name of the client (alternative to clientId)"
        },
        startDate: {
          type: "string",
          description: "Project start date in ISO format"
        },
        dueDate: {
          type: "string",
          description: "Project due date in ISO format"
        }
      },
      required: ["name", "budget"]
    }
  },
  {
    name: "get_revenue_analytics",
    description: "Get revenue analytics and insights",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current-month", "last-month", "current-quarter", "current-year"],
          description: "The time period for revenue analysis"
        },
        includeProjections: {
          type: "boolean",
          description: "Whether to include revenue projections"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_pipeline_status",
    description: "Get current sales pipeline status and metrics",
    parameters: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["all", "lead", "qualified", "proposal", "negotiation", "won", "lost"],
          description: "Filter by specific pipeline stage"
        },
        includeMetrics: {
          type: "boolean",
          description: "Whether to include conversion metrics"
        }
      },
      required: []
    }
  },
  {
    name: "get_client_analytics",
    description: "Get analytics about clients and their performance",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "Specific client ID to analyze, or omit for all clients"
        },
        metricType: {
          type: "string",
          enum: ["revenue", "projects", "satisfaction", "all"],
          description: "Type of metrics to retrieve"
        }
      },
      required: ["metricType"]
    }
  },
          {
          name: "update_project_status",
          description: "Update the status of a project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the project to update"
              },
              projectName: {
                type: "string",
                description: "The name of the project to update (alternative to projectId)"
              },
              status: {
                type: "string",
                enum: ["active", "completed", "on_hold", "cancelled", "pipeline"],
                description: "The new status for the project"
              },
              notes: {
                type: "string",
                description: "Optional notes about the status change"
              }
            },
            required: ["status"]
          }
        },
  {
    name: "search_projects",
    description: "Search for projects by name or client",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term for project name"
        },
        clientName: {
          type: "string",
          description: "Name of the client to search projects for"
        }
      },
      required: []
    }
  },
  {
    name: "generate_invoice",
    description: "Generate an invoice for a project",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project to invoice"
        },
        amount: {
          type: "number",
          description: "Invoice amount"
        },
        dueDate: {
          type: "string",
          description: "Invoice due date in ISO format"
        },
        items: {
          type: "string",
          description: "JSON string of invoice line items"
        }
      },
      required: ["projectId", "amount"]
    }
  }
]

export class ClaudeProvider {
  private buildSystemPrompt(userContext?: string): string {
    return `You are Brillo AI, an intelligent business assistant integrated into a business management platform. You have access to real-time data and can perform actions through function calls.

YOUR ROLE:
You are a knowledgeable business advisor who helps users understand their business performance, manage operations, and make data-driven decisions. You have direct access to their business data through functions.

CAPABILITIES:
• Query and analyze business data (clients, projects, revenue, pipeline)
• Create and update business records (clients, projects, invoices)
• Provide insights and recommendations based on actual data
• Help with business planning and strategy

CRITICAL INSTRUCTIONS:
1. When users ask about specific data (e.g., "Bruno's projects", "revenue this month"), ALWAYS use the appropriate function to get real data. Never make up information.

2. Be conversational and helpful. Don't just execute functions - explain what you're doing and provide insights on the results.

3. After retrieving data, analyze it and provide useful insights:
   - Identify trends or patterns
   - Highlight important metrics
   - Suggest next actions
   - Answer the implicit questions behind the explicit ones

4. If a search returns no results, help the user understand why and suggest alternatives.

5. For complex queries, break them down and use multiple function calls if needed.

CURRENT CONTEXT:
${userContext || 'User is accessing the business management dashboard.'}

AVAILABLE FUNCTIONS:
- search_projects: Find projects by name or client
- create_client: Add new clients
- create_project: Create new projects
- get_revenue_analytics: Analyze revenue by period
- get_pipeline_status: View sales pipeline
- get_client_analytics: Analyze client performance
- update_project_status: Change project status
- generate_invoice: Create invoices

Remember: You're not just a function executor - you're a business advisor. Provide value through insights, not just data retrieval.`
  }

  async chat(
    messages: ChatMessage[],
    userContext?: string,
    userId?: string
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        tools: BUSINESS_FUNCTIONS.map(func => ({
          name: func.name,
          description: func.description,
          input_schema: func.parameters
        })),
        tool_choice: { type: 'auto' }
      })

      // Handle multiple content blocks (text + tool use)
      let textContent = ''
      let functionCall: FunctionCall | undefined
      
      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text
        } else if (block.type === 'tool_use') {
          functionCall = {
            name: block.name,
            arguments: block.input as Record<string, any>
          }
        }
      }
      
      return {
        content: textContent,
        functionCall,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      }
    } catch (error) {
      console.error('Claude API error:', error)
      
      // More specific error handling
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        
        // Handle specific Anthropic errors
        if (error.message.includes('401')) {
          throw new Error('Claude API authentication failed. Check your API key.')
        }
        
        if (error.message.includes('400')) {
          throw new Error('Invalid request to Claude API. Check function definitions.')
        }
        
        if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again in a moment.')
        }
        
        if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          throw new Error('Claude API is temporarily unavailable. Please try again.')
        }
      }
      
      throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async streamChat(
    messages: ChatMessage[],
    userContext?: string,
    userId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext)
      
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        tools: BUSINESS_FUNCTIONS.map(func => ({
          name: func.name,
          description: func.description,
          input_schema: func.parameters
        })),
        tool_choice: { type: 'auto' },
        stream: true
      })

      let fullContent = ''
      let functionCall: FunctionCall | undefined
      let usage = { inputTokens: 0, outputTokens: 0 }

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullContent += text
          onChunk?.(text)
        }
        
        if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
          functionCall = {
            name: chunk.content_block.name,
            arguments: chunk.content_block.input as Record<string, any>
          }
        }

        if (chunk.type === 'message_delta' && chunk.usage) {
          usage.outputTokens = chunk.usage.output_tokens
        }
      }

      return {
        content: fullContent,
        functionCall,
        usage
      }
    } catch (error) {
      console.error('Claude streaming error:', error)
      throw new Error(`AI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const claudeProvider = new ClaudeProvider()
