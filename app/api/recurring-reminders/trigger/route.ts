import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Check authorization - this endpoint should only be accessible by admins
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Optional: Add admin check here if needed
    // For now, any authenticated user can trigger their own reminders

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('recurring-project-reminders', {
      body: { userId: user.id }
    })

    if (error) {
      console.error('Error triggering reminders:', error)
      return NextResponse.json(
        { error: 'Failed to trigger reminders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminders triggered successfully',
      data
    })

  } catch (error) {
    console.error('Error in trigger endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
