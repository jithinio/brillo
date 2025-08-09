// Usage tracking API route
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create supabase client with request context for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if we have recent cached usage data
    const { data: cachedUsage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const now = new Date()
    const cacheThreshold = 5 * 60 * 1000 // 5 minutes cache for usage data
    const lastUpdated = cachedUsage?.last_updated ? new Date(cachedUsage.last_updated) : null
    
    // Check if force refresh is requested via query parameter
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('force') === 'true'
    
    const isCacheValid = !forceRefresh && lastUpdated && (now.getTime() - lastUpdated.getTime()) < cacheThreshold

    let usage: { projects: number; clients: number; invoices: number }

    if (isCacheValid && cachedUsage) {
      // Use cached data
      usage = {
        projects: cachedUsage.projects_count || 0,
        clients: cachedUsage.clients_count || 0,
        invoices: cachedUsage.invoices_count || 0
      }
    } else {
      // Use direct table queries since the RPC function doesn't exist
      const [projectsResult, clientsResult, invoicesResult] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('clients').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('invoices').select('id', { count: 'exact' }).eq('user_id', user.id)
      ])

      usage = {
        projects: projectsResult.count || 0,
        clients: clientsResult.count || 0,
        invoices: invoicesResult.count || 0
      }

      // Update cache
      await supabase
        .from('user_usage')
        .upsert({
          user_id: user.id,
          projects_count: usage.projects,
          clients_count: usage.clients,
          invoices_count: usage.invoices,
          last_updated: now.toISOString()
        }, {
          onConflict: 'user_id'
        })
    }

    return NextResponse.json({ usage })

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create supabase client with request context for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, action } = await request.json() // type: 'project'|'client'|'invoice', action: 'increment'|'decrement'

    if (!type || !action || !['project', 'client', 'invoice'].includes(type) || !['increment', 'decrement'].includes(action)) {
      return NextResponse.json({ error: 'Invalid type or action' }, { status: 400 })
    }

    // Get current usage
    const { data: currentUsage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const columnMap = {
      project: 'projects_count',
      client: 'clients_count',
      invoice: 'invoices_count'
    }

    const column = columnMap[type as keyof typeof columnMap]
    const currentCount = currentUsage?.[column] || 0
    const newCount = action === 'increment' 
      ? Math.max(0, currentCount + 1)
      : Math.max(0, currentCount - 1)

    // Update usage
    await supabase
      .from('user_usage')
      .upsert({
        user_id: user.id,
        [column]: newCount,
        last_updated: new Date().toISOString(),
        ...(currentUsage || {})
      }, {
        onConflict: 'user_id'
      })

    return NextResponse.json({ 
      success: true,
      newCount,
      type,
      action
    })

  } catch (error) {
    console.error('Usage update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}