"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SettingsCardProps {
  title?: ReactNode
  description?: string
  children: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  noPadding?: boolean
}

export function SettingsCard({ 
  title, 
  description, 
  children, 
  className,
  headerClassName,
  contentClassName,
  noPadding = false
}: SettingsCardProps) {
  return (
    <Card className={cn("rounded-none border shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className={cn("pb-4", headerClassName)}>
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsSection({ 
  title, 
  description, 
  children, 
  className 
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
