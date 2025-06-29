"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/overview"
import { RecentSales } from "@/components/recent-sales"
import { SectionCards } from "@/components/section-cards"
import { DataTable } from "@/components/data-table"
import data from "./data.json"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<any>(null)

  return (
    <>
      {/* Section Cards */}
      <SectionCards />

      {/* Chart Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>You made 265 sales this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>
      </div>

      {/* Data Table Section */}
      <DataTable data={data} />
    </>
  )
}
