"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PackageIcon, Calendar01Icon } from '@hugeicons/core-free-icons'

interface SubscriptionSkeletonProps {
  showUsageOverview?: boolean
}

export function SubscriptionSkeleton({ showUsageOverview = true }: SubscriptionSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Current Plan Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={PackageIcon} className="w-5 h-5"  />
                Current Plan
              </CardTitle>
              <CardDescription>Loading subscription information...</CardDescription>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview Skeleton - Only show for free users */}
      {showUsageOverview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon icon={Calendar01Icon} className="w-5 h-5" />
                  Usage Overview
                </CardTitle>
                <CardDescription>Current usage against your plan limits</CardDescription>
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="w-full h-2 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function SidebarUsageSkeleton() {
  return (
    <Card className="mb-2">
      <CardContent className="p-3 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
        </div>
        
        {/* Clients Usage Skeleton */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="w-full h-2 rounded-full" />
        </div>

        {/* Projects Usage Skeleton */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="w-full h-2 rounded-full" />
        </div>

        {/* Upgrade Button Skeleton */}
        <Skeleton className="w-full h-7 rounded" />
      </CardContent>
    </Card>
  )
}

export function PricingCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-4 pt-8">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t">
          <Skeleton className="w-full h-10" />
        </div>
      </CardContent>
    </Card>
  )
}
