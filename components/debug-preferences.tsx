"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useTablePreferences } from "@/hooks/use-table-preferences"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

  if (process.env.NODE_ENV === 'production') {
    return null // Hide in production
  }

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">Debug: Table Preferences</CardTitle>
        <CardDescription className="text-yellow-700">
          Development mode debug information - Currently using localStorage fallback to avoid database errors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <div className="pt-2 border-t space-y-2">
          <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
            <strong>Note:</strong> Table preferences are currently saved to localStorage only. 
            This means preferences will persist in this browser but won't sync across devices. 
            To enable full account-level persistence, run the database migration from MIGRATION_INSTRUCTIONS.md
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={testSavePreference} size="sm" variant="outline">
              Test Save Preference
            </Button>
            {testResult && (
              <span className="text-sm">{testResult}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 