export interface PipelineStage {
  id: string
  user_id: string
  name: string
  order_index: number
  color: string
  default_probability: number
  created_at: string
  updated_at: string
}

export interface PipelineClient {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  avatar_url?: string
  status: 'active' | 'pipeline' | 'closed'
  pipeline_stage: string
  potential_value?: number
  deal_probability: number
  pipeline_notes?: string
  created_at: string
  updated_at?: string
}

export interface PipelineProject {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled' | 'pipeline'
  pipeline_stage: string
  budget?: number
  currency?: string
  deal_probability: number
  pipeline_notes?: string
  client_id?: string
  start_date?: string
  due_date?: string
  created_at: string
  updated_at?: string
  // Currency conversion fields
  original_currency?: string
  conversion_rate?: number
  conversion_date?: string
  clients?: {
    id: string
    name: string
    company?: string
    email?: string
    phone?: string
    avatar_url?: string | null
  }
}

export interface PipelineMetrics {
  totalValue: number
  leadCount: number
  pitchedCount: number
  discussionCount: number
  weightedValue: number
  conversionRate: number
  winRate: number
}

export interface DragEndEvent {
  active: {
    id: string
    data: {
      current?: {
        type: string
        client: PipelineClient
      }
    }
  }
  over: {
    id: string
    data: {
      current?: {
        type: string
        stage: string
      }
    }
  } | null
}

export interface StageColumn {
  id: string
  title: string
  color: string
  clients: PipelineClient[]
  defaultProbability: number
}

export interface ProjectStageColumn {
  id: string
  title: string
  color: string
  projects: PipelineProject[]
  defaultProbability: number
} 