"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Overview } from "@/components/overview"
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Clock } from "lucide-react"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"

const metrics = [
  {
    title: "Total Revenue",
    value: "$54,231",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Active Projects",
    value: "23",
    change: "+3",
    trend: "up",
    icon: FileText,
  },
  {
    title: "Client Satisfaction",
    value: "98.2%",
    change: "+2.1%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Avg. Project Time",
    value: "14 days",
    change: "-2 days",
    trend: "down",
    icon: Clock,
  },
]

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        action={
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
            <Button size="sm">Export Report</Button>
          </div>
        }
      />
      <PageContent>
        <PageTitle title="Analytics" description="Track your business performance and key metrics" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {metric.trend === "up" ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>{metric.change}</span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue for the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <Overview />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status Distribution</CardTitle>
              <CardDescription>Current status of all projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-sm font-medium">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="text-sm font-medium">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Planning</span>
                </div>
                <span className="text-sm font-medium">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">On Hold</span>
                </div>
                <span className="text-sm font-medium">5%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>Clients by revenue contribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Acme Corporation</span>
                <span className="text-sm">$12,500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">TechStart Inc.</span>
                <span className="text-sm">$8,200</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Global Solutions</span>
                <span className="text-sm">$6,800</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Innovation Labs</span>
                <span className="text-sm">$4,500</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Milestones</CardTitle>
              <CardDescription>Key achievements this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Reached $50K revenue milestone</p>
                  <p className="text-xs text-muted-foreground">January 15, 2024</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Completed 10 projects</p>
                  <p className="text-xs text-muted-foreground">January 10, 2024</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Added 5 new clients</p>
                  <p className="text-xs text-muted-foreground">January 5, 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
