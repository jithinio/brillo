# Recurring Project Reminders Setup Guide

This guide explains how to set up and configure the recurring project reminders feature in Brillo.

## Overview

The recurring project reminders feature automatically sends email notifications to users before their recurring projects are due for invoicing. This helps users remember to create invoices for their recurring clients on time.

## Features

- **Intelligent Timing**: Reminders are sent:
  - 3 days before for weekly projects
  - 7 days before for monthly projects
  - 10 days before for quarterly and yearly projects

- **Automatic Scheduling**: Once a reminder is sent, the system automatically schedules the next reminder based on the project's recurring frequency

- **Status-Based Control**: Reminders are only sent for projects with status "Active" or "Due"

- **Beautiful Email Template**: Professional, Stripe-inspired email design with all relevant project information

## Setup Instructions

### 1. Database Migration

Run the following migrations in order:

```sql
-- First, run the reminder tracking table migration
supabase migration new add_recurring_project_reminders
-- Copy contents from: supabase/migrations/add_recurring_project_reminders.sql

-- Then, run the system logs table migration  
supabase migration new add_system_logs_table
-- Copy contents from: supabase/migrations/add_system_logs_table.sql

-- Apply migrations
supabase db push
```

### 2. Deploy Edge Function

Deploy the recurring reminders edge function:

```bash
# From your project root
supabase functions deploy recurring-project-reminders
```

### 3. Schedule the Edge Function

In your Supabase dashboard:

1. Go to **Edge Functions** > **recurring-project-reminders**
2. Click on **Schedule**
3. Add a cron schedule: `0 9 * * *` (runs daily at 9 AM UTC)
4. Save the schedule

Alternative cron expressions:
- `0 */6 * * *` - Every 6 hours
- `0 9,15 * * *` - Twice daily at 9 AM and 3 PM UTC
- `0 9 * * 1-5` - Weekdays only at 9 AM UTC

### 4. Environment Variables

Ensure these environment variables are set:

```env
# In your .env.local (Next.js app)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# In Supabase Edge Functions (set in dashboard)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

### 5. Test the System

1. **Manual Trigger**: Use the trigger endpoint to test immediately:
   ```javascript
   // In your app, authenticated users can trigger a check
   await fetch('/api/recurring-reminders/trigger', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${session.access_token}`
     }
   })
   ```

2. **Check Logs**: Monitor the system logs table:
   ```sql
   SELECT * FROM system_logs 
   WHERE type = 'recurring_reminders_job' 
   ORDER BY created_at DESC;
   ```

3. **View Reminders**: Check scheduled reminders:
   ```sql
   SELECT * FROM upcoming_recurring_reminders;
   ```

## How It Works

1. **Daily Check**: The cron job runs daily to check all recurring projects
2. **Reminder Generation**: For each active recurring project, it calculates when the next invoice is due
3. **Scheduling**: Creates reminder records based on the project's frequency and configured lead time
4. **Email Sending**: Sends beautiful HTML emails to users with project details and a call-to-action
5. **Status Updates**: Marks reminders as sent and schedules the next reminder
6. **Cleanup**: Automatically removes old reminder records after 6 months

## User Experience

Users will receive emails like this:

```
Subject: Invoice Reminder: [Project Name] due on [Date]

Content:
- Project name and client information
- Due date and billing period
- Amount to be invoiced
- Direct link to create invoice
- Instructions to stop reminders if needed
```

## Stopping Reminders

Users can stop receiving reminders by:
1. Changing the project status to anything other than "Active" or "Due"
2. Setting a project end date
3. Marking the project as completed or cancelled

## Troubleshooting

### Reminders Not Sending

1. Check if the edge function is scheduled correctly
2. Verify environment variables are set
3. Check system logs for errors
4. Ensure projects have all required fields (start_date, recurring_frequency, recurring_amount)

### Email Delivery Issues

1. Verify Resend API key is valid
2. Check Resend dashboard for bounce/spam reports
3. Ensure email addresses are valid
4. Check rate limits

### Database Issues

1. Verify RLS policies are correctly set
2. Check if service role key has proper permissions
3. Monitor Supabase logs for database errors

## Monitoring

Add monitoring for:
- Edge function execution success rate
- Email delivery rates
- Number of reminders sent per day
- Failed reminder attempts

## Future Enhancements

Consider adding:
- User preferences for reminder timing
- Multiple reminder notifications
- SMS reminders
- In-app notifications
- Reminder snooze functionality
