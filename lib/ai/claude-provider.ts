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
          enum: ["current-month", "last-month", "current-quarter", "current-year", "last-year"],
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
  },
  {
    name: "get_expense_analytics",
    description: "Get expense analytics and breakdown by category or period",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current-month", "last-month", "current-quarter", "current-year", "last-year"],
          description: "Time period for expense analysis"
        },
        category: {
          type: "string",
          description: "Filter by expense category (optional)"
        },
        includeBreakdown: {
          type: "boolean",
          description: "Include detailed category breakdown"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_profit_analytics",
    description: "Get profit/loss analysis (revenue minus expenses)",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current-month", "last-month", "current-quarter", "current-year", "last-year"],
          description: "Time period for profit analysis"
        },
        includeMargins: {
          type: "boolean",
          description: "Include profit margin calculations"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_overdue_invoices",
    description: "Get list of overdue/unpaid invoices",
    parameters: {
      type: "object",
      properties: {
        includePending: {
          type: "boolean",
          description: "Include pending (not yet due) invoices"
        },
        clientId: {
          type: "string",
          description: "Filter by specific client (optional)"
        },
        sortBy: {
          type: "string",
          enum: ["age", "amount", "client"],
          description: "Sort order for results"
        }
      },
      required: []
    }
  },
  {
    name: "get_cash_flow",
    description: "Get cash flow analysis (money in vs money out)",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current-month", "last-month", "current-quarter", "next-month", "next-quarter"],
          description: "Time period for cash flow analysis"
        },
        includeProjections: {
          type: "boolean",
          description: "Include projections based on pipeline and pending invoices"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_project_deadlines",
    description: "Get upcoming project deadlines and overdue projects",
    parameters: {
      type: "object",
      properties: {
        daysAhead: {
          type: "number",
          description: "Number of days to look ahead (default: 30)"
        },
        includeOverdue: {
          type: "boolean",
          description: "Include overdue projects"
        },
        status: {
          type: "string",
          enum: ["active", "all"],
          description: "Filter by project status"
        }
      },
      required: []
    }
  },
  {
    name: "get_payment_status",
    description: "Get payment status summary for projects",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["all-time", "current-month", "current-quarter", "current-year"],
          description: "Time period for payment status"
        },
        groupBy: {
          type: "string",
          enum: ["client", "project", "status"],
          description: "Group results by client, project, or payment status"
        }
      },
      required: ["period"]
    }
  }
]

export class ClaudeProvider {
  private buildSystemPrompt(userContext?: string): string {
    return `You are Brillo AI, a concise and efficient business assistant. You have direct access to real-time business data through functions.

CRITICAL RULES:
1. BE CONCISE: Give direct answers. For simple queries (like "what's my revenue"), provide ONLY the requested information.
2. When users ask for specific metrics, respond with just the number/data they asked for, not analysis unless requested.
3. Use functions to get real data - never make up information.
4. Only provide analysis, insights, or recommendations when explicitly asked or when the query clearly requires it.

RESPONSE GUIDELINES:
• Revenue query → "Your [period] revenue is ₹X" (specify time period)
• Project count → "You have X active projects"
• Client search → List matching results concisely
• Creation tasks → Confirm completion with essential details only
• Revenue = total project value (budgets) for the period
• Payment received = actual money collected

For complex questions or when users ask for analysis:
• Break down the information clearly
• Provide actionable insights
• Suggest relevant next steps

CURRENT CONTEXT:
${userContext || 'User is accessing the business management dashboard.'}

AVAILABLE FUNCTIONS:
- search_projects: Find projects
- create_client: Add clients
- create_project: Create projects
- get_revenue_analytics: Get revenue data (total project value)
- get_expense_analytics: Track expenses
- get_profit_analytics: Revenue minus expenses
- get_pipeline_status: View pipeline
- get_client_analytics: Client metrics
- update_project_status: Update status
- generate_invoice: Create invoices
- get_overdue_invoices: Unpaid/overdue invoices
- get_cash_flow: Money in vs out
- get_project_deadlines: Due dates & overdue
- get_payment_status: Payment tracking

Remember: Default to brevity. Expand only when the user's question requires it.`
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
