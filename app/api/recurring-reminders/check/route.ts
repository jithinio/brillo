import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Get all active recurring projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        user_id,
        name,
        project_type,
        recurring_frequency,
        recurring_amount,
        start_date,
        due_date,
        status,
        clients (
          name,
          email
        )
      `)
      .eq('project_type', 'recurring')
      .in('status', ['active', 'due'])

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recurring projects found',
        processed: 0
      })
    }

    const results = {
      processed: 0,
      remindersCreated: 0,
      errors: [] as string[]
    }

    // Process each project
    for (const project of projects) {
      try {
        // Generate reminders for this project
        const { error } = await supabase.rpc('generate_project_reminders', {
          p_project_id: project.id,
          p_user_id: project.user_id
        })

        if (error) {
          console.error(`Error generating reminders for project ${project.id}:`, error)
          results.errors.push(`Project ${project.name}: ${error.message}`)
        } else {
          results.processed++
        }
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error)
        results.errors.push(`Project ${project.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Count how many reminders were created
    const { count } = await supabase
      .from('recurring_project_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Created in last 5 minutes

    results.remindersCreated = count || 0

    // Clean up old reminders
    await supabase.rpc('cleanup_old_reminders')

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} projects`,
      results
    })

  } catch (error) {
    console.error('Error checking recurring projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
