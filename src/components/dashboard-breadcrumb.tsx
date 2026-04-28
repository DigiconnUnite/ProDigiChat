"use client"

import React from "react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, ChevronLeft } from "lucide-react"

const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  campaigns: "Campaigns",
  contacts: "Contacts",
  templates: "Templates",
  inbox: "Inbox",
  analytics: "Analytics",
  settings: "Settings",
  automation: "Automation",
  create: "Create",
  edit: "Edit",
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const router = useRouter()

  // Remove leading slash and split by /
  const segments = pathname.split("/").filter(Boolean)

  // Don't show breadcrumb on main dashboard
  if (segments.length === 1 && segments[0] === "dashboard") {
    return null
  }

  // Get the parent path for the back button
  const parentPath = "/" + segments.slice(0, -1).join("/") || "/dashboard"

  // Generate breadcrumb items
  const breadcrumbItems = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1
    const label = breadcrumbLabels[segment] || segment

    return {
      href,
      label,
      isLast,
    }
  })

  return (
    <div className="flex container mx-auto items-center justify-between mb-4 md:hidden fixed top-14 left-0 right-0 z-40 bg-background text-xs py-0 px-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <button
        onClick={() => router.push(parentPath)}
        className="flex items-center cursor-pointer gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-md transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  );
}
