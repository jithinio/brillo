"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Reminder {
  id: string
  reminder_date: string
  period_start: string
  period_end: string
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
  error_message?: string
}

interface RecurringRemindersStatusProps {
  projectId: string
  projectName: string
  recurringFrequency?: string
  isActive: boolean
}

export function RecurringRemindersStatus({
  projectId,
  projectName,
  recurringFrequency,
  isActive
}: RecurringRemindersStatusProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    fetchReminders()
  }, [projectId])

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_project_reminders')
        .select('*')
        .eq('project_id', projectId)
        .order('reminder_date', { ascending: false })
        .limit(5)

      if (error) throw error
      setReminders(data || [])
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast.error('Failed to load reminder status')
    } finally {
      setLoading(false)
    }
  }

  const triggerReminder = async () => {
    setTriggering(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in to trigger reminders')
        return
      }

      const response = await fetch('/api/recurring-reminders/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger reminders')
      }

      toast.success('Reminders triggered successfully')
      fetchReminders() // Refresh the list
    } catch (error) {
      console.error('Error triggering reminders:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to trigger reminders')
    } finally {
      setTriggering(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!recurringFrequency) {
    return null // Don't show for non-recurring projects
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Invoice Reminders
            </CardTitle>
            <CardDescription>
              Automatic reminders for recurring invoices
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerReminder}
            disabled={triggering || !isActive}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${triggering ? 'animate-spin' : ''}`} />
            Trigger Check
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!isActive && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Reminders are paused. Change project status to Active or Due to resume reminders.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No reminders scheduled yet</p>
            <p className="text-sm mt-1">Reminders will be created automatically based on your project schedule</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Period: {format(new Date(reminder.period_start), 'MMM d, yyyy')} - {format(new Date(reminder.period_end), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reminder date: {format(new Date(reminder.reminder_date), 'MMM d, yyyy')}
                    </p>
                    {reminder.sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Sent: {format(new Date(reminder.sent_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {reminder.error_message && (
                      <p className="text-xs text-red-500 mt-1">
                        Error: {reminder.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div>{getStatusBadge(reminder.status)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Reminders are sent automatically {recurringFrequency === 'monthly' ? '7 days' : recurringFrequency === 'weekly' ? '3 days' : '10 days'} before each billing period.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
