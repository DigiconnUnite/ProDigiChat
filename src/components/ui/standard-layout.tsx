"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StandardLayoutProps {
  children: ReactNode
  className?: string
  showBorder?: boolean
  maxWidth?: "full" | "4xl" | "6xl" | "7xl"
}

export function StandardLayout({ 
  children, 
  className, 
  showBorder = true,
  maxWidth = "full"
}: StandardLayoutProps) {
  const containerClasses = cn(
    "bg-transparent px-2.5 lg:px-0",
    showBorder && "border h-full",
    className
  )

  const innerContainerClasses = cn(
    "max-w-[1440px] mx-auto relative px-5 py-6 space-y-6",
    showBorder && "border-l border-r border-slate-300",
    maxWidth === "4xl" && "max-w-4xl",
    maxWidth === "6xl" && "max-w-6xl", 
    maxWidth === "7xl" && "max-w-7xl"
  )

  return (
    <div className={containerClasses}>
      <div className={innerContainerClasses}>
        {children}
      </div>
    </div>
  )
}

interface StandardCardProps {
  children: ReactNode
  className?: string
  noBorder?: boolean
  noRounded?: boolean
}

export function StandardCard({ 
  children, 
  className,
  noBorder = false,
  noRounded = false
}: StandardCardProps) {
  return (
    <div className={cn(
      "bg-white border",
      noBorder && "border-transparent",
      className
    )}>
      {children}
    </div>
  )
}

interface StandardPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: ReactNode
}

export function StandardPageHeader({ 
  title, 
  description, 
  actions,
  breadcrumbs
}: StandardPageHeaderProps) {
  return (
    <div className="space-y-4">
      {breadcrumbs && (
        <div className="flex items-center text-sm text-muted-foreground">
          {breadcrumbs}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-gray-500 text-sm">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface StandardFilterBarProps {
  children: ReactNode
  className?: string
  theme?: "green" | "blue" | "gray"
}

export function StandardFilterBar({ 
  children, 
  className,
  theme = "green"
}: StandardFilterBarProps) {
  const themeClasses = {
    green: "bg-green-950 border-green-800",
    blue: "bg-blue-950 border-blue-800", 
    gray: "bg-gray-950 border-gray-800"
  }

  return (
    <div className={cn(
      "rounded-t-3xl rounded-b-lg pt-4 pb-1 px-1 space-y-4 border",
      themeClasses[theme],
      className
    )}>
      <div className="flex flex-row flex-wrap justify-between items-center px-2 gap-2 sm:gap-4">
        {children}
      </div>
    </div>
  )
}
