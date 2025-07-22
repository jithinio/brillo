export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-transparent text-card-foreground p-3 h-16 flex items-center">
          <div className="flex items-center gap-2 w-full">
            <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProjectsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
        <div className="flex space-x-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="text-center">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-48 mx-auto" />
      </div>
    </div>
  )
}

export function FiltersSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
        </div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
      </div>

      {/* Filter Controls Skeleton */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Skeleton */}
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Status Filters Skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-12" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-14" />
          </div>

          {/* Client Filter Skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-10" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="text-center">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-64 mx-auto" />
      </div>
    </div>
  )
} 