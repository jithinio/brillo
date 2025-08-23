import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { projectId, field, value } = await request.json()

    if (!projectId || !field || value === undefined) {
      return NextResponse.json(
        { error: 'Project ID, field, and value are required' },
        { status: 400 }
      )
    }

    // Validate field
    const allowedFields = ['total_budget', 'expenses', 'received', 'actual_hours', 'due_date', 'start_date']
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: `Field must be one of: ${allowedFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Map frontend field names to database column names
    const fieldMap: Record<string, string> = {
      'total_budget': 'total_budget',
      'expenses': 'expenses', 
      'received': 'payment_received', // Map 'received' to 'payment_received' in database
      'actual_hours': 'actual_hours',
      'due_date': 'due_date',
      'start_date': 'start_date'
    }
    const dbField = fieldMap[field] || field

    // Validate value based on field type
    if (['due_date', 'start_date'].includes(field)) {
      // For dates, value should be a string in ISO format or null
      if (value !== null && typeof value !== 'string') {
        return NextResponse.json(
          { error: 'Date value must be a string in ISO format or null' },
          { status: 400 }
        )
      }
      // Validate date format if not null
      if (value && typeof value === 'string') {
        const dateValue = new Date(value)
        if (isNaN(dateValue.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          )
        }
      }
    } else {
      // For numeric fields
      if (typeof value !== 'number' || value < 0) {
        return NextResponse.json(
          { error: 'Value must be a non-negative number' },
          { status: 400 }
        )
      }
    }

    // Additional validation for numeric fields
    if (['total_budget', 'expenses', 'received'].includes(field)) {
      if (typeof value === 'number' && value > 999999999.99) { // Reasonable max value
        return NextResponse.json(
          { error: 'Value is too large' },
          { status: 400 }
        )
      }
    }

    if (field === 'actual_hours' && typeof value === 'number' && value > 99999) { // Reasonable max hours
      return NextResponse.json(
        { error: 'Hours value is too large' },
        { status: 400 }
      )
    }

    // Update the project
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        [dbField]: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating project:', error)
      console.error('Field being updated:', dbField)
      console.error('Value:', value)
      console.error('Project ID:', projectId)
      return NextResponse.json(
        { error: `Failed to update project: ${error.message}` },
        { status: 500 }
      )
    }

    // Note: Recalculation is now handled automatically by the database trigger
    // The master_project_calculation() function triggers on all project updates
    if (['due_date', 'start_date'].includes(field) && 
        data && 
        data.auto_calculate_total && 
        ['recurring', 'hourly'].includes(data.project_type)) {
      console.log(`Date ${field} updated for ${data.project_type} project ${projectId} - recalculation handled by database trigger`)
    }

    return NextResponse.json({
      success: true,
      project: data
    })

  } catch (error) {
    console.error('Project update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
