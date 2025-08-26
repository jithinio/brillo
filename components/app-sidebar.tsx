"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from "react"
import { UserAccountIcon, DashboardCircleIcon, FilterIcon, Archive02Icon, Invoice01Icon, PieChart01Icon } from '@hugeicons/core-free-icons'
import Link from "next/link"

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

// Create icon components that wrap HugeiconsIcon
const DashboardIcon = () => <HugeiconsIcon icon={DashboardCircleIcon} />
const ClientsIcon = () => <HugeiconsIcon icon={UserAccountIcon} />
const PipelineIcon = () => <HugeiconsIcon icon={FilterIcon} />
const ProjectsIcon = () => <HugeiconsIcon icon={Archive02Icon} />
const InvoicesIcon = () => <HugeiconsIcon icon={Invoice01Icon} />
const AnalyticsIcon = () => <HugeiconsIcon icon={PieChart01Icon} />

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: DashboardIcon,
    },

    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: ClientsIcon,
    },
    {
      title: "Pipeline",
      url: "/dashboard/pipeline",
      icon: PipelineIcon,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: ProjectsIcon,
      items: [
        {
          title: "All Projects",
          url: "/dashboard/projects",
        },
        {
          title: "Active",
          url: "/dashboard/projects/active",
        },
        {
          title: "Completed",
          url: "/dashboard/projects/completed",
        },
        {
          title: "Due",
          url: "/dashboard/projects/due",
        },
        {
          title: "On Hold",
          url: "/dashboard/projects/on-hold",
        },
        {
          title: "Cancelled",
          url: "/dashboard/projects/cancelled",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: InvoicesIcon,
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
      icon: AnalyticsIcon,
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
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                  <img 
                    src="/logo_mark.svg" 
                    alt="Brillo Logo" 
                    className="h-7 w-7 object-contain"
                  />
                </div>
              </Link>
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
