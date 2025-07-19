"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseFiltersFromSearchParams } from '@/lib/project-filters-v2'
import { ProjectFiltersV2 } from '@/components/projects/project-filters-v2'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function TestContent() {
  const searchParams = useSearchParams()
  const filters = parseFiltersFromSearchParams(searchParams)

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Filter System Test</h1>
        <Link href="/dashboard/projects">
          <Button variant="outline">← Back to Projects</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Filter Component</h2>
          <ProjectFiltersV2 
            clients={[
              { id: '1', name: 'John Doe', company: 'Acme Corp' },
              { id: '2', name: 'Jane Smith', company: 'Tech Inc' },
              { id: '3', name: 'Bob Wilson' },
            ]}
            showStatusFilter={true}
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <h2 className="text-xl font-semibold mb-4">Current Filter State</h2>
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <h2 className="text-xl font-semibold mb-4">URL Search Params</h2>
          <code className="text-sm">
            {searchParams.toString() || '(empty)'}
          </code>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Performance Improvements</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
            <li>✅ URL-based state management (shareable links, browser history)</li>
            <li>✅ Debounced search input (300ms delay)</li>
            <li>✅ Server-side filtering (reduced client processing)</li>
            <li>✅ Pagination support (load only what's needed)</li>
            <li>✅ Query result caching (5-minute cache)</li>
            <li>✅ Real-time cache invalidation</li>
            <li>✅ Optimistic UI updates</li>
            <li>✅ No localStorage/database sync overhead</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function TestFiltersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestContent />
    </Suspense>
  )
} 