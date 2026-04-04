"use client"

import { useSession, signOut } from "next-auth/react"
import { use } from "react"
import Image from "next/image"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge" 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationDropdown, NotificationDropdownMobile } from "@/components/notifications/notification-dropdown"
import {
  LayoutDashboard,
  Megaphone,
  Workflow,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  FileText,
  Home,
  Plus,
  Zap,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WhatsAppStatusIndicator } from "@/components/whatsapp"

// Navigation item type
export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

// Navigation items for dashboard
const dashboardNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Inbox", href: "/dashboard/inbox", icon: MessageSquare },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
]

// Bottom navigation items for mobile dashboard
const dashboardBottomNavItems: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Inbox", href: "/dashboard/inbox", icon: MessageSquare },
]

// Navigation items for public pages
const publicNavigation: NavItem[] = [
  { name: "Home", href: "/landing", icon: Home },
  { name: "Features", href: "/features", icon: LayoutDashboard },
  { name: "Pricing", href: "/pricing", icon: Megaphone },
  { name: "Blog", href: "/blog", icon: FileText },
  { name: "Support", href: "/support", icon: Users },
]

export type HeaderVariant = "dashboard" | "public"

export interface HeaderProps {
  variant?: HeaderVariant
  className?: string
}

export function Header({ variant = "public", className }: HeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isDashboard = variant === "dashboard"
  const navigation = isDashboard ? dashboardNavigation : publicNavigation

  return (
    <>
      {/* Desktop Header - Hidden on mobile */}
      <header
        className={cn(
          "hidden md:flex py-4 items-center justify-between rounded-b-4xl",
          isDashboard ? "bg-green-950" : "bg-green-950",
          className,
        )}
      >
        <div className="container mx-auto px-4 sm:px-0 flex items-center justify-between w-full">
        {/* Logo and Nav Links */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo.svg"
                alt="Prodigichat Logo"
                width={40}
                height={40}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg"
              />
              <span className="text-xl sm:text-2xl font-bold text-white">Prodigichat</span>
            </Link>
        </div>

        {/* Right side - Navigation Links and Actions */}
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav
            className={cn(
              "flex items-center p-0.5 rounded-full border overflow-hidden gap-1",
              "bg-white/10 border border-white/20"
            )}
          >
            {navigation.map((item) => {
              const isActive = isDashboard
                ? pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                : pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-colors",
                    isActive
                      ? "bg-white text-green-950"
                      : "text-white/80 hover:text-white hover:bg-white/10",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  {item.badge && isDashboard && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 rounded-full px-1.5 text-xs font-medium"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {isDashboard ? (
            // Dashboard: Show user-specific items
            <>
              {/* WhatsApp Status Indicator
              <WhatsAppStatusIndicator
                organizationId="default"
                onConnect={() => window.location.href = '/dashboard/connect'}
                onViewSettings={() => window.location.href = '/dashboard/settings?tab=whatsapp'}
                onRefresh={() => window.location.href = '/api/whatsapp/token/refresh'}
              /> */}

              {/* Settings */}
              <div className="p-0 rounded-full bg-white/10 border border-white/20">
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    "flex items-center gap-2 justify-center h-10 w-10 text-sm font-medium rounded-full transition-colors",
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-white text-green-950"
                      : "text-white/80 hover:text-white hover:bg-white/10",
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
              {/* Notifications - Functional */}
              <NotificationDropdown />

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      {session?.user?.image ? (
                        <AvatarImage
                          src={session.user.image}
                          alt={session.user.name || "User"}
                        />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {session?.user?.name
                            ? session.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {session?.user?.name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session?.user?.email || "No email"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Public: Show sign in and get started buttons OR user avatar if authenticated
            <>
              {session?.user ? (
                // Authenticated: Show user avatar with dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar className="h-10 w-10">
                        {session.user?.image ? (
                          <AvatarImage
                            src={session.user.image}
                            alt={session.user.name || "User"}
                          />
                        ) : (
                          <AvatarFallback className="bg-white text-green-950 font-semibold">
                            {session.user?.name
                              ? session.user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email || "No email"}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard"
                        className="flex items-center"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => signOut({ callbackUrl: "/landing" })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Not authenticated: Show sign in and get started buttons
                <>
                  {/* Sign In Button */}
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="bg-white text-green-950 hover:bg-white/90  rounded-full font-medium"
                    >
                      Sign In
                    </Button>
                  </Link>

                  {/* Get Started Button */}
                  <Link href="/signup">
                    <Button className="bg-white text-green-950 hover:bg-white/90  rounded-full font-medium">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isDashboard ? (
        <>
          <MobileDashboardTopHeader
            session={session}
            pathname={pathname}
          />
          <MobileBottomNavigation
            items={dashboardBottomNavItems}
            pathname={pathname}
          />
        </>
      ) : (
        <MobilePublicNavigation session={session} />
      )}
    </>
  );
}

// Mobile Top Header for Dashboard
function MobileDashboardTopHeader({
  session,
  pathname,
}: {
  session: typeof useSession extends () => infer R ? R extends { data: infer T } ? T : never : never
  pathname: string
}) {
  return (
    <div className="md:hidden fixed top-0 left-0 rounded-b-2xl right-0 bg-green-950 border-none shadow z-50 flex items-center justify-between h-14 px-4">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2"
      >
        <Image
          src="/logo.svg"
          alt="Prodigichat Logo"
          width={32}
          height={32}
          className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
        />
        <span className="text-base sm:text-lg font-bold text-white">Prodigichat</span>
      </Link>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1">
        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-full transition-colors",
            pathname.startsWith("/dashboard/settings")
              ? "bg-white text-green-950"
              : "text-white/80 hover:text-white hover:bg-white/10",
          )}
        >
          <Settings className="h-4 w-4" />
        </Link>

        {/* Notifications - Functional */}
        <NotificationDropdownMobile />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0"
            >
              <Avatar className="h-9 w-9">
                {session?.user?.image ? (
                  <AvatarImage
                    src={session.user.image}
                    alt={session.user.name || "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {session?.user?.name
                      ? session.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email || "No email"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <User className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Mobile Bottom Navigation Component for Dashboard
function MobileBottomNavigation({ 
  items, 
  pathname 
}: { 
  items: typeof dashboardBottomNavItems
  pathname: string 
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-green-950 border-none shadow-lg z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-green-950 bg-white border-t-4 border-white"
                  : "text-white/80 border-t-4 border-transparent hover:text-white",
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
        {/* Quick Add Button */}
        <Link
          href="/dashboard/campaigns/new"
          className="flex flex-col items-center justify-center flex-1 h-full text-white/80 hover:text-white"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1">New</span>
        </Link>
      </div>
    </div>
  )
}

// Mobile Public Navigation
function MobilePublicNavigation({
  session,
}: {
  session: typeof useSession extends () => infer R ? R extends { data: infer T } ? T : never : never
}) {
  return (
    <nav className="md:hidden fixed top-0 left-0 rounded-b-2xl right-0 bg-green-950 border-none shadow z-50 flex items-center justify-between h-14 px-4">
      <div className="container mx-auto flex h-16 items-center justify-between ">
        <Link href="/landing" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="ProDigi Chat Logo"
            width={36}
            height={36}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
          />
          <span className="text-lg sm:text-xl font-bold text-white">Prodigichat</span>
        </Link>
        <div className="flex items-center gap-2">
          {session?.user ? (
            // Authenticated: Show user avatar with dropdown
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0"
                >
                  <Avatar className="h-9 w-9">
                    {session.user?.image ? (
                      <AvatarImage
                        src={session.user.image}
                        alt={session.user.name || "User"}
                      />
                    ) : (
                      <AvatarFallback className="bg-white text-green-950 font-semibold text-sm">
                        {session.user?.name
                          ? session.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {session.user?.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email || "No email"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => signOut({ callbackUrl: "/landing" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Not authenticated: Show sign in and get started buttons
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-white text-green-950 hover:bg-white/90"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
