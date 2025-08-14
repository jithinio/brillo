import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, password, isGoogleUser } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    logger.info('🗑️ Account deletion started', { userId, isGoogleUser })

    // For non-Google users, verify password before deletion
    if (!isGoogleUser && password) {
      try {
        // Get user email first
        const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(userId)
        
        if (getUserError || !user?.email) {
          logger.error('Failed to get user for password verification:', getUserError)
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Verify password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        })

        if (signInError) {
          logger.error('Password verification failed:', signInError)
          return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
        }
      } catch (verificationError) {
        logger.error('Password verification error:', verificationError)
        return NextResponse.json({ error: 'Password verification failed' }, { status: 401 })
      }
    }

    // Delete user profile and related data first
    try {
      // Delete from profiles table (this will cascade to related data if foreign keys are set up)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) {
        logger.warn('Failed to delete profile (may not exist):', profileError)
      }

      // Delete user projects
      const { error: projectsError } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', userId)

      if (projectsError) {
        logger.warn('Failed to delete projects:', projectsError)
      }

      // Delete user clients
      const { error: clientsError } = await supabase
        .from('clients')
        .delete()
        .eq('user_id', userId)

      if (clientsError) {
        logger.warn('Failed to delete clients:', clientsError)
      }

      // Delete user invoices
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('user_id', userId)

      if (invoicesError) {
        logger.warn('Failed to delete invoices:', invoicesError)
      }

      // Delete pipeline stages
      const { error: pipelineError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('user_id', userId)

      if (pipelineError) {
        logger.warn('Failed to delete pipeline stages:', pipelineError)
      }

      logger.info('✅ User data cleanup completed', { userId })
    } catch (cleanupError) {
      logger.error('Error during data cleanup:', cleanupError)
      // Continue with user deletion even if cleanup fails
    }

    // Finally, delete the user from Supabase Auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      logger.error('Failed to delete user from auth:', deleteUserError)
      return NextResponse.json({ 
        error: 'Failed to delete user account',
        details: deleteUserError.message 
      }, { status: 500 })
    }

    logger.info('✅ Account deletion completed successfully', { userId })

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })

  } catch (error) {
    logger.error('Unexpected error during account deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error during account deletion' 
    }, { status: 500 })
  }
}
