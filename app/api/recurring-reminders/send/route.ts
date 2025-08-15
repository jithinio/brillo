import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'
import RecurringProjectReminder from '@/emails/recurring-project-reminder'

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

    // Initialize Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }
    const resend = new Resend(resendApiKey)

    // Get all pending reminders for today
    const { data: reminders, error: remindersError } = await supabase
      .from('upcoming_recurring_reminders')
      .select('*')
      .lte('reminder_date', new Date().toISOString().split('T')[0])
      .eq('status', 'pending')

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return NextResponse.json(
        { error: 'Failed to fetch reminders' },
        { status: 500 }
      )
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        sent: 0
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Skip if user email is not available
        if (!reminder.user_email) {
          console.error(`No email found for user ${reminder.user_id}`)
          results.failed++
          results.errors.push(`No email for reminder ${reminder.id}`)
          continue
        }

        // Prepare email data
        const emailData = {
          projectName: reminder.project_name,
          clientName: reminder.client_name,
          companyName: reminder.company_name || 'Brillo',
          dueDate: reminder.period_start,
          period: reminder.recurring_frequency as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
          projectAmount: reminder.recurring_amount,
          currency: reminder.currency,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects?project=${reminder.project_id}`
        }

        // Send email
        const emailResult = await resend.emails.send({
          from: `${reminder.company_name || 'Brillo'} <noreply@jithin.io>`,
          to: [reminder.user_email],
          subject: `Invoice Reminder: ${reminder.project_name} due on ${new Date(reminder.period_start).toLocaleDateString()}`,
          react: RecurringProjectReminder(emailData),
        })

        if (emailResult.error) {
          console.error(`Failed to send reminder ${reminder.id}:`, emailResult.error)
          
          // Update reminder status to failed
          await supabase
            .from('recurring_project_reminders')
            .update({
              status: 'failed',
              error_message: emailResult.error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id)

          results.failed++
          results.errors.push(`Reminder ${reminder.id}: ${emailResult.error.message}`)
        } else {
          // Update reminder status to sent
          await supabase
            .from('recurring_project_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              email_id: emailResult.data?.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id)

          results.sent++

          // Generate next reminder for this project
          await generateNextReminder(reminder.project_id, reminder.user_id)
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        results.failed++
        results.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${reminders.length} reminders`,
      results
    })

  } catch (error) {
    console.error('Error in recurring reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate the next reminder for a project
async function generateNextReminder(projectId: string, userId: string) {
  try {
    // Call the database function to generate next reminder
    const { error } = await supabase.rpc('generate_project_reminders', {
      p_project_id: projectId,
      p_user_id: userId
    })

    if (error) {
      console.error('Error generating next reminder:', error)
    }
  } catch (error) {
    console.error('Error in generateNextReminder:', error)
  }
}
