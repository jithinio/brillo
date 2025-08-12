"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, Building } from "lucide-react"
import { formatLargeNumber } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import type { TopClient } from "@/lib/analytics-calculations"

interface TopClientsCardProps {
  clients: TopClient[]
  isLoading?: boolean
  title?: string
  showCLTV?: boolean
  limit?: number
}

export function TopClientsCard({
  clients,
  isLoading = false,
  title = "Top Paying Clients",
  showCLTV = false,
  limit = 5
}: TopClientsCardProps) {
  const displayClients = clients.slice(0, limit)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-3 bg-muted rounded animate-pulse w-20" />
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-3 bg-muted rounded animate-pulse w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (displayClients.length === 0) {
    return (
      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pt-0 pb-6">
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No client data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate total value and average project value across all clients
  const totalValue = displayClients.reduce((sum, client) => sum + client.totalValue, 0)
  const totalProjects = displayClients.reduce((sum, client) => sum + client.projectCount, 0)
  const averageValue = totalProjects > 0 ? totalValue / totalProjects : 0

  return (
    <Card className="border bg-transparent">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="h-4 px-1 text-xs font-normal bg-muted text-muted-foreground">
            {displayClients.length} clients
          </Badge>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold">
              {formatLargeNumber(totalValue, getCurrencySymbol())}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Project Value</p>
            <p className="text-lg font-semibold">
              {formatLargeNumber(averageValue, getCurrencySymbol())}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pt-0 pb-6">
        <div className="space-y-4">
          {displayClients.map((client, index) => (
            <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              {/* Rank and Avatar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs">
                    {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium truncate">{client.name}</h4>
                  {client.company && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="w-3 h-3" />
                      <span className="truncate max-w-20">{client.company}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {client.projectCount} project{client.projectCount !== 1 ? 's' : ''}
                  </span>
                  
                  {/* Trend Indicator */}
                  {client.trendPercentage > 0 && (
                    <div className="flex items-center gap-1">
                      {client.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`text-xs ${
                        client.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {client.trendPercentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Values */}
              <div className="text-right space-y-1">
                <p className="text-sm font-semibold">
                  {formatLargeNumber(client.totalValue, getCurrencySymbol())}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatLargeNumber(client.avgProjectValue, getCurrencySymbol())}
                </p>
                {showCLTV && (
                  <p className="text-xs text-blue-600 font-medium">
                    CLTV: {formatLargeNumber(client.totalValue * 1.5, getCurrencySymbol())}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {/* Show more indicator if there are more clients */}
          {clients.length > limit && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                +{clients.length - limit} more clients
              </p>
            </div>
          )}
        </div>
        
        {/* Client Distribution */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Value Distribution</h4>
          <div className="space-y-2">
            {displayClients.map((client, index) => {
              const percentage = totalValue > 0 ? (client.totalValue / totalValue) * 100 : 0
              return (
                <div key={client.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-20 truncate">
                    {client.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 