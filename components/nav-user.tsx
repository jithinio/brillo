"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BadgeCheck, MoreVertical, LogOut, Sparkles, Moon, Sun, Monitor, Palette, Settings2, User, CreditCard, Crown, MessageSquare } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useSubscription } from "@/components/providers/subscription-provider"
import { isProPlan } from "@/lib/subscription-plans"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader } from "@/components/ui/loader"

export function NavUser() {
  const { user, signOut, loading: authLoading } = useAuth()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { subscription, isLoading, getCachedPlanId } = useSubscription()

  // Use the provider's cached plan ID for immediate rendering
  const optimisticPlanId = getCachedPlanId()

  // Show loading state during auth loading to prevent "Demo User" flash
  if (authLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="border border-border opacity-60">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
            </div>
            <div className="ml-auto h-4 w-4 bg-muted rounded animate-pulse" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Fallback user data if no user is available after loading
  const currentUser = user
    ? {
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        email: user.email || "user@example.com",
        avatar: user.user_metadata?.avatar_url || null,
      }
    : {
        name: "Demo User",
        email: "demo@example.com",
        avatar: null,
      }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const getThemeIcon = (theme: string | undefined) => {
    switch (theme) {
      case "light":
        return <Sun className="h-3 w-3" />
      case "dark":
        return <Moon className="h-3 w-3" />
      case "system":
        return <Monitor className="h-3 w-3" />
      default:
        return <Monitor className="h-3 w-3" />
    }
  }

  const getThemeLabel = (theme: string | undefined) => {
    switch (theme) {
      case "light":
        return "Light"
      case "dark":
        return "Dark"
      case "system":
        return "System"
      default:
        return "System"
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-border"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={currentUser.avatar || "/placeholder-user.jpg"} alt={currentUser.name} />
                <AvatarFallback className="rounded-lg">{getInitials(currentUser.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">{currentUser.name}</span>
                <span className="truncate text-xs text-foreground">{currentUser.email}</span>
              </div>
              <MoreVertical className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >

            <DropdownMenuGroup>
              {/* Always show subscription button - use optimistic plan ID for immediate rendering */}
              {isProPlan(optimisticPlanId) ? (
                <DropdownMenuItem asChild>
                  <a href="/dashboard/settings?tab=subscription" className="cursor-pointer flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span className="flex-1">Manage Subscription</span>
                    {isLoading && <Loader size="xs" variant="muted" className="opacity-30" />}
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <a href="/pricing" className="cursor-pointer flex items-center">
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span className="flex-1">Upgrade to Pro</span>
                    {isLoading && <Loader size="xs" variant="muted" className="opacity-30" />}
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/feedback" className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Feedback
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <Palette className="h-4 w-4" />
                <span className="flex-1">Theme</span>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <div className="flex items-center gap-1">
                      {getThemeIcon(theme)}
                      <span className="text-xs">{getThemeLabel(theme)}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-3 w-3" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-3 w-3" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
