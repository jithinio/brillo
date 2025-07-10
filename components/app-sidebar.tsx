"use client"

import type * as React from "react"
import { Bot, Gauge, GalleryVerticalEnd, PieChart, ReceiptText, Settings2 } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
      title: "Projects",
      url: "/dashboard/projects",
      icon: GalleryVerticalEnd,
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: ReceiptText,
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
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: Bot,
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">Suitebase</span>
                  <span className="truncate text-xs text-foreground">Business Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
