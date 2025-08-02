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
import { BadgeCheck, ChevronsUpDown, LogOut, Sparkles, Moon, Sun, Monitor, Palette, Settings2, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useTheme } from "next-themes"

export function NavUser() {
  const { user, signOut } = useAuth()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  // Fallback user data if no user is available
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
              <ChevronsUpDown className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={currentUser.avatar || "/placeholder-user.jpg"} alt={currentUser.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{currentUser.name}</span>
                  <span className="truncate text-xs text-foreground">{currentUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
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
