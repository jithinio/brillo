"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react'
import { AlertCircleIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error | null; reset: () => void }>
}

export class TableErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Table Error:', error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />
      }

      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <Alert className="max-w-lg">
            <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4"  />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm text-muted-foreground mb-4">
                The table encountered an error while rendering. This might be due to invalid data or a temporary issue.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={this.reset}
                  size="sm"
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="ghost"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
} 