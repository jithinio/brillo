import type React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  action?: React.ReactNode
  error?: string | null
}

export function PageHeader({ title, description, breadcrumbs = [], action, error }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-4 flex items-center gap-2">
        <ThemeToggle />
        {action}
      </div>
    </header>
  )
}

export function PageContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
}

export function PageTitle({
  title,
  description,
  error,
}: { title: string; description?: string; error?: string | null }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-yellow-600">⚠️ {error}</p>}
    </div>
  )
}
