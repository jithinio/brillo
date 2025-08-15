"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Send,
  Calendar,
  Clock,
  Mail,
  ChevronRight,
  Loader2,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import RecurringProjectReminder from '@/emails/recurring-project-reminder'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Project {
  id: string
  name: string
  client_name: string
  project_type: string
  recurring_frequency?: string
  recurring_amount?: number
  currency?: string
  start_date?: string
  due_date?: string
  status: string
}

interface Reminder {
  id: string
  project_id: string
  reminder_date: string
  period_start: string
  period_end: string
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
  email_id?: string
  error_message?: string
  created_at: string
  updated_at: string
  // From the view joins
  project_name?: string
  client_name?: string
  recurring_frequency?: string
  recurring_amount?: number
  currency?: string
  user_email?: string
}

interface SystemLog {
  id: string
  type: string
  status: string
  details: any
  created_at: string
}

export default function TestRemindersPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadProjects(),
      loadReminders(),
      loadSystemLogs()
    ])
    setLoading(false)
  }

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          project_type,
          recurring_frequency,
          recurring_amount,
          currency,
          start_date,
          due_date,
          status,
          clients (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('project_type', 'recurring')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedProjects = data?.map(p => ({
        ...p,
        client_name: p.clients?.name || 'Unknown Client'
      })) || []

      setProjects(formattedProjects)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const loadReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('recurring_project_reminders')
        .select(`
          *,
          projects (
            name,
            recurring_frequency,
            recurring_amount,
            currency,
            clients (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedReminders = data?.map(r => ({
        ...r,
        project_name: r.projects?.name,
        client_name: r.projects?.clients?.name,
        recurring_frequency: r.projects?.recurring_frequency,
        recurring_amount: r.projects?.recurring_amount,
        currency: r.projects?.currency
      })) || []

      setReminders(formattedReminders)
    } catch (error) {
      console.error('Error loading reminders:', error)
      toast.error('Failed to load reminders')
    }
  }

  const loadSystemLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('type', 'recurring_reminders_job')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setSystemLogs(data || [])
    } catch (error) {
      console.error('Error loading system logs:', error)
      // Not critical, don't show error toast
    }
  }

  const checkProjects = async () => {
    setChecking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in to check projects')
        return
      }

      const response = await fetch('/api/recurring-reminders/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check projects')
      }

      toast.success('Projects checked successfully', {
        description: `Processed ${result.results?.processed || 0} projects, created ${result.results?.remindersCreated || 0} reminders`
      })

      // Reload data
      await loadReminders()
    } catch (error) {
      console.error('Error checking projects:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check projects')
    } finally {
      setChecking(false)
    }
  }

  const sendReminders = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/recurring-reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reminders')
      }

      toast.success('Reminders sent successfully', {
        description: `Sent ${result.results?.sent || 0}, failed ${result.results?.failed || 0}`
      })

      // Reload data
      await loadReminders()
    } catch (error) {
      console.error('Error sending reminders:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send reminders')
    } finally {
      setSending(false)
    }
  }

  const triggerFullProcess = async () => {
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

      toast.success('Full process triggered successfully')

      // Reload all data
      await loadData()
    } catch (error) {
      console.error('Error triggering process:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to trigger process')
    } finally {
      setTriggering(false)
    }
  }

  const previewEmail = (reminder: Reminder) => {
    const { data: { user } } = supabase.auth.getUser()
    
    setPreviewData({
      projectName: reminder.project_name || 'Project Name',
      clientName: reminder.client_name || 'Client Name',
      companyName: 'Brillo', // You might want to fetch this from company settings
      dueDate: reminder.period_start,
      period: (reminder.recurring_frequency || 'monthly') as any,
      projectAmount: reminder.recurring_amount || 0,
      currency: reminder.currency || 'USD',
      projectUrl: `${window.location.origin}/dashboard/projects?project=${reminder.project_id}`
    })
    setPreviewOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'active':
        return <Badge variant="default" className="bg-blue-500">Active</Badge>
      case 'due':
        return <Badge variant="secondary" className="bg-orange-500">Due</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Recurring Reminders"
        description="Test and debug the recurring project reminder system"
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Test individual components of the reminder system</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            onClick={checkProjects}
            disabled={checking}
            variant="outline"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check Projects
          </Button>
          
          <Button
            onClick={sendReminders}
            disabled={sending}
            variant="outline"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Pending Reminders
          </Button>
          
          <Button
            onClick={triggerFullProcess}
            disabled={triggering}
          >
            {triggering ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            Trigger Full Process
          </Button>

          <Button
            onClick={loadData}
            variant="ghost"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Recurring Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="reminders">Reminders ({reminders.length})</TabsTrigger>
          <TabsTrigger value="logs">System Logs ({systemLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Projects</CardTitle>
              <CardDescription>All recurring projects in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No recurring projects</AlertTitle>
                  <AlertDescription>
                    Create some recurring projects to test the reminder system
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{project.name}</h4>
                          {getStatusBadge(project.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Client: {project.client_name}</div>
                          <div>Frequency: {project.recurring_frequency || 'N/A'}</div>
                          <div>Amount: {project.currency} {project.recurring_amount || 0}</div>
                          <div>Start: {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'N/A'}</div>
                        </div>
                        {project.due_date && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reminder History</CardTitle>
              <CardDescription>Recent and upcoming reminders</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : reminders.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No reminders found</AlertTitle>
                  <AlertDescription>
                    Run "Check Projects" to generate reminders for eligible projects
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{reminder.project_name || 'Unknown Project'}</h4>
                            <p className="text-sm text-muted-foreground">{reminder.client_name || 'Unknown Client'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => previewEmail(reminder)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {getStatusBadge(reminder.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Reminder: {format(new Date(reminder.reminder_date), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" />
                            Period: {format(new Date(reminder.period_start), 'MMM d')} - {format(new Date(reminder.period_end), 'MMM d, yyyy')}
                          </div>
                        </div>

                        {reminder.sent_at && (
                          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Sent: {format(new Date(reminder.sent_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        )}

                        {reminder.error_message && (
                          <Alert variant="destructive" className="mt-2 py-2">
                            <AlertDescription className="text-xs">
                              {reminder.error_message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Recent job execution logs</CardDescription>
            </CardHeader>
            <CardContent>
              {systemLogs.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No logs found</AlertTitle>
                  <AlertDescription>
                    System logs will appear here after running the reminder process
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {systemLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                            {log.status === 'success' ? (
                              <Badge variant="default" className="bg-green-500">Success</Badge>
                            ) : (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        </div>
                        
                        {log.details && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is how the reminder email will look
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
            {previewData && <RecurringProjectReminder {...previewData} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
