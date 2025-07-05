"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function DebugPreferences() {
  const { user } = useAuth()
  const { preferences, isLoading, updateTablePreference } = useTablePreferences()
  const [testResult, setTestResult] = useState<string | null>(null)

  const testSavePreference = async () => {
    setTestResult("Testing...")
    try {
      await updateTablePreference("debug-table", "test_setting", { timestamp: new Date().toISOString() })
      setTestResult("✅ Save successful! (Using localStorage fallback)")
    } catch (error) {
      setTestResult(`❌ Save failed: ${error}`)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Alert className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Debug: Table Preferences</AlertTitle>
      <AlertDescription>
        <div className="space-y-3 mt-2">
          <p className="text-sm">
            Development mode debug information - Currently using localStorage fallback to avoid database errors
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Supabase Status:</strong>
              <Badge variant={isSupabaseConfigured() ? "default" : "destructive"} className="ml-2">
                {isSupabaseConfigured() ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            
            <div>
              <strong>User Type:</strong>
              <Badge variant={user?.id === 'mock-user-id' ? "secondary" : "default"} className="ml-2">
                {user?.id === 'mock-user-id' ? "Mock User" : "Real User"}
              </Badge>
            </div>
            
            <div>
              <strong>User ID:</strong>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {user?.id || 'None'}
              </code>
            </div>
            
            <div>
              <strong>Preferences Loading:</strong>
              <Badge variant={isLoading ? "secondary" : "default"} className="ml-2">
                {isLoading ? "Loading..." : "Loaded"}
              </Badge>
            </div>
            
            <div className="col-span-2">
              <strong>Current Preferences:</strong>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto max-h-32">
                {JSON.stringify(preferences, null, 2)}
              </pre>
            </div>
            
            <div className="col-span-2">
              <strong>localStorage Backup:</strong>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto max-h-24">
                {JSON.stringify(
                  typeof window !== 'undefined' 
                    ? JSON.parse(localStorage.getItem('table-preferences') || '{}')
                    : {},
                  null, 2
                )}
              </pre>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
} 