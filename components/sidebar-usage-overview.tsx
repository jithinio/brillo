"use client"

import { Crown, Users, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { useSubscription } from "@/components/providers/subscription-provider"
import Link from "next/link"

export function SidebarUsageOverview() {
  const { subscription, usage, plan } = useSubscription()
  
  // Only show for free plan users
  if (subscription.planId !== 'free') {
    return null
  }

  const clientsUsed = usage.clients.current
  const clientsLimit = usage.clients.limit as number
  const projectsUsed = usage.projects.current  
  const projectsLimit = usage.projects.limit as number

  const clientsPercentage = (clientsUsed / clientsLimit) * 100
  const projectsPercentage = (projectsUsed / projectsLimit) * 100

  return (
    <Card className="mb-2">
      <CardContent className="p-3 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Free Plan</span>
        </div>
        
        {/* Clients Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Clients</span>
            </div>
            <span className="font-medium">{clientsUsed}/{clientsLimit}</span>
          </div>
          <Progress value={clientsPercentage} className="h-1.5 rounded-full [&>div]:bg-gray-400 dark:[&>div]:bg-gray-300 [&>div]:rounded-full" />
        </div>

        {/* Projects Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Projects</span>
            </div>
            <span className="font-medium">{projectsUsed}/{projectsLimit}</span>
          </div>
          <Progress value={projectsPercentage} className="h-1.5 rounded-full [&>div]:bg-gray-400 dark:[&>div]:bg-gray-300 [&>div]:rounded-full" />
        </div>

        {/* Upgrade Button */}
        <Button 
          asChild 
          size="sm" 
          className="w-full h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
        >
          <Link href="/pricing">
            <Crown className="w-3 h-3 mr-1" />
            Upgrade to Pro
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}