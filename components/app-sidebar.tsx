"use client"

import type * as React from "react"
import { Bot, Gauge, GalleryVerticalEnd, PieChart, ReceiptText, TrendingUp } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SidebarUsageOverview } from "@/components/sidebar-usage-overview"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Gauge,
    },
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: Bot,
    },
    {
      title: "Pipeline",
      url: "/dashboard/pipeline",
      icon: TrendingUp,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: GalleryVerticalEnd,
      items: [
        {
          title: "Active",
          url: "/dashboard/projects/active",
        },
        {
          title: "Completed",
          url: "/dashboard/projects/completed",
        },
        {
          title: "On Hold",
          url: "/dashboard/projects/on-hold",
        },
        {
          title: "Cancelled",
          url: "/dashboard/projects/cancelled",
        },
        {
          title: "All Projects",
          url: "/dashboard/projects",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: ReceiptText,
      proFeature: "invoicing",
      items: [
        {
          title: "All Invoices",
          url: "/dashboard/invoices",
        },
        {
          title: "Generate Invoice",
          url: "/dashboard/invoices/generate",
        },
        {
          title: "Customize Template",
          url: "/dashboard/invoices/customize",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: PieChart,
      proFeature: "advanced_analytics",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex w-32 h-8 items-center justify-start rounded-lg">
                  <img 
                    src="/brillo_logo.svg" 
                    alt="Brillo Logo" 
                    className="h-6 w-auto object-contain"
                  />
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUsageOverview />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
