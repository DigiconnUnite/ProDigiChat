"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Megaphone,
  Workflow,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  FileText,
  Layers,
  TestTube,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useNotifications } from "@/components/notification-provider"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "Automation", href: "/dashboard/automation", icon: Workflow },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Inbox", href: "/dashboard/inbox", icon: MessageSquare },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Testing", href: "/dashboard/testing", icon: TestTube },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { unreadCount } = useNotifications()

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo section */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <MessageSquare className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            WhatsApp CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            // Use dynamic badge for Inbox based on actual notification count
            const showBadge = item.name === "Inbox" && unreadCount > 0
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {showBadge && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] rounded-full px-1.5 text-xs font-medium"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <Separator className="my-4" />

        {/* Quick actions */}
        <div className="px-3">
          <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
            Quick Actions
          </p>
          <nav className="space-y-1">
            <Link
              href="/dashboard/campaigns/new"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <Layers className="h-5 w-5" />
              New Campaign
            </Link>
            <Link
              href="/dashboard/automation/new"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <Workflow className="h-5 w-5" />
              New Automation
            </Link>
          </nav>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs font-semibold text-sidebar-foreground">
            WhatsApp Business API
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect your number to get started
          </p>
        </div>
      </div>
    </div>
  )
}
