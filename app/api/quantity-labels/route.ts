import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET - Fetch user's custom quantity labels
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's custom quantity labels
    const { data: customLabels, error } = await supabase
      .from('custom_quantity_labels')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching custom labels:', error)
      return NextResponse.json({ error: 'Failed to fetch custom labels' }, { status: 500 })
    }

    return NextResponse.json({ customLabels: customLabels || [] })

  } catch (error) {
    console.error('Custom labels API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch custom labels',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Add new custom quantity label
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { label } = await request.json()

    if (!label || label.trim().length === 0) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    if (label.length > 50) {
      return NextResponse.json({ error: 'Label must be 50 characters or less' }, { status: 400 })
    }

    // Check if label already exists for this user
    const { data: existing } = await supabase
      .from('custom_quantity_labels')
      .select('id')
      .eq('user_id', user.id)
      .eq('label', label.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Label already exists' }, { status: 409 })
    }

    // Insert new custom label
    const { data: newLabel, error } = await supabase
      .from('custom_quantity_labels')
      .insert({
        user_id: user.id,
        label: label.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom label:', error)
      return NextResponse.json({ error: 'Failed to create custom label' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      customLabel: newLabel
    })

  } catch (error) {
    console.error('Custom label creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create custom label',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove custom quantity label
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const labelId = searchParams.get('id')

    if (!labelId) {
      return NextResponse.json({ error: 'Label ID is required' }, { status: 400 })
    }

    // Delete the custom label (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('custom_quantity_labels')
      .delete()
      .eq('id', labelId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting custom label:', error)
      return NextResponse.json({ error: 'Failed to delete custom label' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Custom label deletion error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete custom label',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
