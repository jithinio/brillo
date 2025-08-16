"use client"


import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import * as React from "react"
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

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
import { ProBadge } from "@/components/gates/pro-badge"

// Separate component for collapsible items to avoid conditional hooks
function NavItemWithCollapse({
  item,
  isActive,
  isRouteActive,
}: {
  item: {
    title: string
    url: string
    icon?: React.ComponentType<{ className?: string }>
    proFeature?: string
    items?: { title: string; url: string; proFeature?: string }[]
  }
  isActive: boolean
  isRouteActive: (url: string) => boolean
}) {
  const [isOpen, setIsOpen] = React.useState(isActive)
  
  // Update open state when route changes
  React.useEffect(() => {
    setIsOpen(isActive)
  }, [isActive])
  
  return (
    <Collapsible 
      asChild 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.proFeature && (
              <ProBadge 
                feature={item.proFeature as any} 
                size="sm" 
                variant="minimal"
                className="ml-1"
              />
            )}
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 800, 
                damping: 35,
                duration: 0.1
              }}
              className="ml-auto"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
            </motion.div>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: 1, 
                height: "auto",
                transition: {
                  height: { type: "tween", ease: "easeOut", duration: 0.15 },
                  opacity: { duration: 0.1, delay: 0.02 },
                  staggerChildren: 0.02,
                  delayChildren: 0.05
                }
              }}
              exit={{ 
                opacity: 0, 
                height: 0,
                transition: {
                  height: { type: "tween", ease: "easeIn", duration: 0.12 },
                  opacity: { duration: 0.05 },
                  staggerChildren: 0.015,
                  staggerDirection: -1
                }
              }}
              style={{ 
                overflow: "hidden",
                willChange: "height, opacity"
              }}
            >
              <SidebarMenuSub>
                {item.items?.map((subItem, index) => (
                  <motion.div
                    key={subItem.title}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        type: "spring", 
                        stiffness: 800, 
                        damping: 35 
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      y: -2,
                      transition: { 
                        type: "spring", 
                        stiffness: 800, 
                        damping: 35,
                        duration: 0.05
                      }
                    }}
                  >
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isRouteActive(subItem.url)}>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                          {subItem.proFeature && (
                            <ProBadge 
                              feature={subItem.proFeature as any} 
                              size="sm" 
                              variant="minimal"
                              className="ml-1"
                            />
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </motion.div>
                ))}
              </SidebarMenuSub>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ComponentType<{ className?: string }>
    isActive?: boolean
    proFeature?: string
    items?: {
      title: string
      url: string
      proFeature?: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  // Check if a route is active
  const isRouteActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard"
    }
    // Special case for main pages with sub-pages - only match exact path
    if (url === "/dashboard/projects" || url === "/dashboard/invoices") {
      return pathname === url
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
          
          // Only use collapsible behavior for items with sub-items
          if (item.items?.length) {
            return (
              <NavItemWithCollapse
                key={item.title}
                item={item}
                isActive={isActive}
                isRouteActive={isRouteActive}
              />
            )
          } else {
            // Simple menu item without collapsible behavior
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={isRouteActive(item.url)} asChild>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.proFeature && (
                      <ProBadge 
                        feature={item.proFeature as any} 
                        size="sm" 
                        variant="minimal"
                        className="ml-1"
                      />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
