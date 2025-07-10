"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  // Check if a route is active
  const isRouteActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(url)
  }

  // Check if any sub-item is active
  const isParentActive = (item: { url: string; items?: { url: string }[] }) => {
    if (isRouteActive(item.url)) return true
    if (item.items) {
      return item.items.some(subItem => isRouteActive(subItem.url))
    }
    return false
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = isParentActive(item)
          
          return (
            <Collapsible key={item.title} asChild defaultOpen={isActive} className="group/collapsible">
              <SidebarMenuItem>
                {item.items?.length ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton tooltip={item.title} isActive={isRouteActive(item.url)} asChild>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
                {item.items?.length ? (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isRouteActive(subItem.url)}>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
