import { HugeiconsIcon } from '@hugeicons/react';
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Alert01Icon } from '@hugeicons/core-free-icons'

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
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-md font-normal tracking-tight">{title}</h1>
        {breadcrumbs.length > 0 && (
          <>
            <Separator orientation="vertical" className="mx-2 h-4" />
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
          </>
        )}
      </div>
      <div className="ml-auto px-6 flex items-center gap-2">
        {action}
      </div>
    </header>
  )
}

export function PageContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col gap-4 px-6 pb-4 pt-4 max-w-full overflow-hidden">{children}</div>
}

export function PageTitle({
  title,
  error,
}: { title: string; error?: string | null }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-normal tracking-tight">{title}</h1>
      {error && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <HugeiconsIcon icon={Alert01Icon} className="h-4 w-4 text-yellow-600"  />
          <AlertDescription className="text-yellow-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
