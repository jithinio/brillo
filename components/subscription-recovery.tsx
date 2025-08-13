"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export function SubscriptionRecovery() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleRecover = async () => {
    try {
      setIsRecovering(true)
      setResult(null)

      const response = await fetch('/api/polar/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: email || user?.email
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Recovery failed')
        setResult({ error: data.error, details: data.details })
      } else {
        toast.success('Subscription recovered successfully!')
        setResult(data)
        
        // Reload the page after a short delay to refresh subscription state
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Recovery error:', error)
      toast.error('Failed to recover subscription')
      setResult({ error: 'Failed to recover subscription' })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">
          Subscription Recovery
        </CardTitle>
        <CardDescription>
          If your Pro subscription was incorrectly marked as inactive, use this tool to recover it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool will search for your active Polar subscription and restore your Pro access.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email">Email (optional - uses your account email if blank)</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <Button
          onClick={handleRecover}
          disabled={isRecovering}
          variant="destructive"
          className="w-full"
        >
          {isRecovering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recovering...
            </>
          ) : (
            'Recover Subscription'
          )}
        </Button>

        {result && (
          <Alert variant={result.error ? "destructive" : "default"}>
            {result.error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.error ? (
                <div>
                  <p className="font-semibold">{result.error}</p>
                  {result.details && <p className="text-sm mt-1">{result.details}</p>}
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Recovery Successful!</p>
                  <div className="text-sm mt-2 space-y-1">
                    <p>Plan: {result.recovered?.planId}</p>
                    <p>Status: {result.recovered?.status}</p>
                    <p>Customer ID: {result.recovered?.customerId}</p>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
