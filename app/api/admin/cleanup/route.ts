import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Create authenticated client to verify user
    const authClient = createClient(
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

    // Check if this is being called by an authenticated user
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Additional admin check - you should implement your own admin role checking logic
    // For example, checking a user role in your profiles table
    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Create service role client for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Perform admin cleanup operations
    const results = await Promise.allSettled([
      // Clean up expired invoice reservations
      supabase.rpc('admin_cleanup_expired_reservations'),
      
      // Update overdue invoices
      supabase.rpc('admin_update_overdue_invoices'),
      
      // Clean up old reminders (existing function is safe)
      supabase.rpc('cleanup_old_reminders')
    ])

    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason)

    if (errors.length > 0) {
      console.error('Admin cleanup errors:', errors)
      return NextResponse.json({ 
        error: 'Some cleanup operations failed',
        details: errors 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Admin cleanup operations completed successfully'
    })

  } catch (error) {
    console.error('Admin cleanup error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
