"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useSettings } from '@/components/settings-provider'
import { getCompanySettings, upsertCompanySettings } from '@/lib/company-settings'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function TestSettingsPage() {
  const { settings, updateSetting, isLoading } = useSettings()
  const [testResults, setTestResults] = useState<Array<{
    name: string
    status: 'PASSED' | 'FAILED' | 'RUNNING'
    error?: string
  }>>([])
  const [isRunning, setIsRunning] = useState(false)

  const [testData, setTestData] = useState({
    companyName: 'Test Company Inc.',
    defaultCurrency: 'USD',
    taxRate: 8.5,
    taxName: 'Sales Tax',
    invoicePrefix: 'TEST'
  })

  const logTest = (name: string, status: 'PASSED' | 'FAILED' | 'RUNNING', error?: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name)
      if (existing) {
        return prev.map(r => r.name === name ? { name, status, error } : r)
      }
      return [...prev, { name, status, error }]
    })
  }

  const runTest = async (testName: string, testFunction: () => Promise<void>) => {
    logTest(testName, 'RUNNING')
    try {
      await testFunction()
      logTest(testName, 'PASSED')
    } catch (error) {
      logTest(testName, 'FAILED', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const testDatabaseConnection = async () => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('count')
      .limit(1)
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
  }

  const testAuthStatus = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw new Error(`Auth check failed: ${error.message}`)
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }
  }

  const testLoadSettings = async () => {
    const dbSettings = await getCompanySettings()
    
    if (!dbSettings) {
      // This might be OK if no settings exist yet
      console.log('No settings found in database (this might be OK for new users)')
      return
    }
    
    console.log('Settings loaded from database:', dbSettings)
  }

  const testSaveSettings = async () => {
    const settingsUpdate = {
      company_name: testData.companyName,
      default_currency: testData.defaultCurrency,
      tax_rate: testData.taxRate,
      tax_name: testData.taxName,
      invoice_prefix: testData.invoicePrefix
    }
    
    const result = await upsertCompanySettings(settingsUpdate)
    
    if (!result) {
      throw new Error('Failed to save settings to database')
    }
    
    console.log('Settings saved to database:', result)
  }

  const testUpdateSettings = async () => {
    const originalName = testData.companyName
    const updatedName = `${originalName} - Updated`
    
    // Update through the provider
    await updateSetting('companyName', updatedName)
    
    // Wait a moment for the update to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if the setting was updated in the database
    const dbSettings = await getCompanySettings()
    if (!dbSettings || dbSettings.company_name !== updatedName) {
      throw new Error('Settings not updated in database')
    }
    
    console.log('Settings updated successfully:', dbSettings)
  }

  const testSettingsProvider = async () => {
    if (isLoading) {
      throw new Error('Settings still loading')
    }
    
    if (!settings) {
      throw new Error('Settings not loaded')
    }
    
    // Test that settings have reasonable defaults
    if (!settings.companyName) {
      throw new Error('Company name not set')
    }
    
    if (!settings.defaultCurrency) {
      throw new Error('Default currency not set')
    }
    
    console.log('Settings provider working correctly:', settings)
  }

  const testRLSPolicies = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Try to access settings - this should work
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      throw new Error(`RLS policy test failed: ${error.message}`)
    }
    
    console.log('RLS policies working correctly')
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    try {
      await runTest('Database Connection', testDatabaseConnection)
      await runTest('Authentication Status', testAuthStatus)
      await runTest('Settings Provider', testSettingsProvider)
      await runTest('Load Settings', testLoadSettings)
      await runTest('Save Settings', testSaveSettings)
      await runTest('Update Settings', testUpdateSettings)
      await runTest('RLS Policies', testRLSPolicies)
      
      toast.success('All tests completed!')
    } catch (error) {
      toast.error('Test suite failed to run')
      console.error('Test suite error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const resetTestData = () => {
    setTestData({
      companyName: 'Test Company Inc.',
      defaultCurrency: 'USD',
      taxRate: 8.5,
      taxName: 'Sales Tax',
      invoicePrefix: 'TEST'
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings Database Test</h1>
      
      <div className="grid gap-6">
        {/* Current Settings Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
            <CardDescription>
              These are the current settings loaded from the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Company Name:</strong> {settings.companyName}
              </div>
              <div>
                <strong>Currency:</strong> {settings.defaultCurrency}
              </div>
              <div>
                <strong>Tax Rate:</strong> {settings.taxRate}%
              </div>
              <div>
                <strong>Tax Name:</strong> {settings.taxName}
              </div>
              <div>
                <strong>Invoice Prefix:</strong> {settings.invoicePrefix}
              </div>
              <div>
                <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Data Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Data Configuration</CardTitle>
            <CardDescription>
              Configure the test data that will be used for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={testData.companyName}
                  onChange={(e) => setTestData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Input
                  id="defaultCurrency"
                  value={testData.defaultCurrency}
                  onChange={(e) => setTestData(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.1"
                  value={testData.taxRate}
                  onChange={(e) => setTestData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="taxName">Tax Name</Label>
                <Input
                  id="taxName"
                  value={testData.taxName}
                  onChange={(e) => setTestData(prev => ({ ...prev, taxName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={testData.invoicePrefix}
                  onChange={(e) => setTestData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={resetTestData} variant="outline">
                Reset Test Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Run tests to verify database functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={runAllTests} disabled={isRunning}>
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results of the database tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{result.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          result.status === 'PASSED' ? 'default' :
                          result.status === 'FAILED' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {result.status}
                      </Badge>
                      {result.error && (
                        <span className="text-sm text-red-500">{result.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Test Actions</CardTitle>
            <CardDescription>
              Test specific functions individually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => runTest('Database Connection', testDatabaseConnection)}
                variant="outline"
                size="sm"
              >
                Test Database Connection
              </Button>
              <Button
                onClick={() => runTest('Auth Status', testAuthStatus)}
                variant="outline"
                size="sm"
              >
                Test Authentication
              </Button>
              <Button
                onClick={() => runTest('Load Settings', testLoadSettings)}
                variant="outline"
                size="sm"
              >
                Test Load Settings
              </Button>
              <Button
                onClick={() => runTest('Save Settings', testSaveSettings)}
                variant="outline"
                size="sm"
              >
                Test Save Settings
              </Button>
              <Button
                onClick={() => runTest('Update Settings', testUpdateSettings)}
                variant="outline"
                size="sm"
              >
                Test Update Settings
              </Button>
              <Button
                onClick={() => runTest('RLS Policies', testRLSPolicies)}
                variant="outline"
                size="sm"
              >
                Test RLS Policies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 