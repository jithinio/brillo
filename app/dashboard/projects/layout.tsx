import { ReactNode } from "react"

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="h-full">
      {children}
    </div>
  )
} 