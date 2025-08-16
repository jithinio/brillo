import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    logger.info('🔐 Password reset requested', { email })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/reset-password`,
    })

    if (error) {
      logger.error('Password reset failed:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    logger.info('✅ Password reset email sent successfully', { email })
    
    return NextResponse.json({ 
      message: 'Password reset email sent successfully',
      email 
    })

  } catch (error: any) {
    logger.error('Password reset API error:', error)
    return NextResponse.json({ 
      error: 'Failed to send password reset email' 
    }, { status: 500 })
  }
}
