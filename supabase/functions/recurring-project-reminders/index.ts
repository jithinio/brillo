import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://brillo.app'

    // Step 1: Check and generate reminders for all projects
    console.log('Checking recurring projects for reminders...')
    
    const checkResponse = await fetch(`${appUrl}/api/recurring-reminders/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!checkResponse.ok) {
      throw new Error(`Failed to check projects: ${await checkResponse.text()}`)
    }

    const checkResult = await checkResponse.json()
    console.log('Check result:', checkResult)

    // Step 2: Send all pending reminders
    console.log('Sending pending reminders...')
    
    const sendResponse = await fetch(`${appUrl}/api/recurring-reminders/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!sendResponse.ok) {
      throw new Error(`Failed to send reminders: ${await sendResponse.text()}`)
    }

    const sendResult = await sendResponse.json()
    console.log('Send result:', sendResult)

    // Log activity
    await supabase
      .from('system_logs')
      .insert({
        type: 'recurring_reminders_job',
        status: 'success',
        details: {
          checkResult,
          sendResult,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recurring project reminders processed successfully',
        checkResult,
        sendResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in recurring reminders job:', error)

    // Log error
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase
      .from('system_logs')
      .insert({
        type: 'recurring_reminders_job',
        status: 'error',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
