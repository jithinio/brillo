# 🤖 Claude AI Integration Guide

## 🚀 Quick Setup

### 1. Environment Variables
Create a `.env.local` file in your project root:

```bash
# Claude AI Configuration
ANTHROPIC_API_KEY=your_claude_api_key_here

# Your existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Get Claude API Key
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up/login to your account
3. Go to "API Keys" section
4. Create a new API key
5. Copy the key to your `.env.local` file

### 3. Restart Development Server
```bash
npm run dev
```

## 🎯 Available AI Functions

The Claude AI can now perform these business operations:

### 👥 Client Management
- **Create Client**: "Add client John Smith from ABC Corp with email john@abc.com"
- **Client Analytics**: "Show me analytics for my top clients"

### 📊 Project Management  
- **Create Project**: "Create a project called Website Redesign with budget $5000"
- **Update Status**: "Mark project ID abc123 as completed"
- **Project Analytics**: "Show me project performance metrics"

### 💰 Revenue & Analytics
- **Revenue Analysis**: "Show me revenue for this month"
- **Pipeline Status**: "What's my sales pipeline looking like?"

### 📄 Invoice Management
- **Generate Invoice**: "Create an invoice for project ABC123 for $2500"

## 🧪 Testing

### Test Basic Chat
1. Navigate to `/dashboard/chat`
2. Try: "Hello, what can you help me with?"

### Test Function Calling
1. Try: "Add a client named Sarah Johnson from Tech Corp with email sarah@techcorp.com"
2. Try: "Show me this month's revenue breakdown"
3. Try: "Create a project called Mobile App for $10000"

### Test Business Context
Claude knows about your:
- Recent projects and their status
- Recent clients
- Revenue data
- Pipeline information

## 🛠 Architecture

### Core Components
- **claude-provider.ts**: Main AI service interface
- **function-handlers.ts**: Business operation executors  
- **/api/chat/route.ts**: API endpoint with Claude integration
- **useChat.ts**: Frontend state management

### Function Flow
1. User sends message
2. Claude analyzes and determines if function needed
3. Function executed with real database operations
4. Claude responds with results and context
5. Follow-up actions suggested automatically

## 🔧 Customization

### Adding New Functions
1. Add function definition to `BUSINESS_FUNCTIONS` in `claude-provider.ts`
2. Implement handler in `BusinessFunctionHandler` class
3. Claude will automatically use new functions

### Modifying AI Personality
Edit the system prompt in `claude-provider.ts` → `buildSystemPrompt()`

## 📊 Token Usage Tracking
Response includes usage information:
```json
{
  "response": "...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 75
  }
}
```

## 🚨 Error Handling
- Invalid API key → Check environment variables
- Function errors → Check database permissions
- Rate limits → Implemented with exponential backoff

## 💡 Pro Tips
1. Be specific in requests: "Add client John from ABC Corp" vs "Add client"
2. Use natural language: "What's my revenue this month?"
3. Chain operations: After creating client, ask to create project
4. Claude remembers conversation context

## 🔒 Security
- All functions validate user ownership
- Service role key used for database operations
- Rate limiting implemented
- Input validation on all parameters

Your Claude integration is now ready! 🎉
