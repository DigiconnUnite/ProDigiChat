"use client"

import { useEffect, useState, useRef } from "react"
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2,
  ExternalLink,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
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
import { useNotifications, Notification } from "@/components/notification-provider"
import { cn } from "@/lib/utils"

// Icon mapping for notification types
const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
}

// Color mapping for notification types
const typeColors = {
  info: "text-blue-500 bg-blue-50",
  warning: "text-amber-500 bg-amber-50",
  error: "text-red-500 bg-red-50",
  success: "text-green-500 bg-green-50",
}

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return then.toLocaleDateString()
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const router = useRouter()
  const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info
  const colorClass = typeColors[notification.type as keyof typeof typeColors] || typeColors.info

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        notification.isRead 
          ? "bg-transparent hover:bg-muted/50" 
          : "bg-blue-50/50 hover:bg-blue-50"
      )}
      onClick={handleClick}
    >
      <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-medium text-sm truncate",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {notification.message}
        </p>
        {notification.actionUrl && (
          <div className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" />
            <span>View details</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
          >
            <Check className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const router = useRouter()
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    clearAllRead
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const initialized = useRef(false)

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && !initialized.current) {
      fetchNotifications()
      initialized.current = true
    }
  }, [isOpen, fetchNotifications])

  // Reset on close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      initialized.current = false
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleClearAll = async () => {
    await clearAllRead()
  }

  const handleViewAll = () => {
    router.push("/dashboard/notifications")
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative flex bg-white/10 border border-white/20 p-3 h-10 w-10 items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-colors hover:bg-white/20",
            className
          )}
        >
          <Bell className="h-5 w-5 text-white" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markAsRead([id])}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        
        <div className="flex items-center justify-between p-3">
          {notifications.filter(n => n.isRead).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={handleClearAll}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs ml-auto"
            onClick={handleViewAll}
          >
            View all notifications
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Mobile version with smaller badge
export function NotificationDropdownMobile({ className }: NotificationDropdownProps) {
  const router = useRouter()
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    clearAllRead
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleViewAll = () => {
    router.push("/dashboard/notifications")
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex relative bg-white/10 border border-white/20 h-9 w-9 rounded-full",
            className
          )}
        >
          <Bell className="h-4 w-4 text-white" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount > 99 ? "!" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[60vh] p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-[40vh] overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.slice(0, 5).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markAsRead([id])}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={handleViewAll}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple badge-only component for sidebar/tabs
interface NotificationBadgeProps {
  count: number
  className?: string
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null

  return (
    <Badge
      variant="destructive"
      className={cn(
        "absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[10px]",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  )
}
