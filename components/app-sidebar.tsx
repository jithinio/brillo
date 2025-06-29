"use client"

import type * as React from "react"
import { BookOpen, Bot, Frame, GalleryVerticalEnd, PieChart, Settings2, SquareTerminal } from "lucide-react"

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
  user: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: Bot,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: BookOpen,
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: Frame,
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
                  <span className="truncate font-semibold">Suitebase</span>
                  <span className="truncate text-xs">Business Platform</span>
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
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
