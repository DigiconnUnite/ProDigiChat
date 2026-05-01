"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Loader2,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  info: "text-blue-500 bg-blue-50 border-blue-200",
  warning: "text-amber-500 bg-amber-50 border-amber-200",
  error: "text-red-500 bg-red-50 border-red-200",
  success: "text-green-500 bg-green-50 border-green-200",
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
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return then.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  })
}

interface NotificationCardProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
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
        "flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer",
        notification.isRead 
          ? "bg-background border-border hover:border-muted-foreground/20" 
          : "bg-blue-50/30 border-blue-200 hover:border-blue-300"
      )}
      onClick={handleClick}
    >
      <div className={cn("p-3 rounded-full shrink-0", colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-semibold",
              !notification.isRead && "text-foreground"
            )}>
              {notification.title}
            </h3>
            {!notification.isRead && (
              <Badge variant="default" className="h-2 w-2 rounded-full p-0 bg-blue-500" />
            )}
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {notification.message}
        </p>
        {notification.actionUrl && (
          <div className="flex items-center gap-1 mt-3 text-sm text-primary hover:underline w-fit">
            <ExternalLink className="w-3 h-3" />
            <span>View details</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
          >
            <Check className="w-3 h-3 mr-1" />
            Mark read
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground hover:text-destructive"
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

export default function NotificationsPage() {
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
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.isRead)
    : notifications

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    fetchNotifications()
  }

  const handleClearRead = async () => {
    await clearAllRead()
    fetchNotifications()
  }

  return (
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
          {notifications.filter(n => n.isRead).length > 0 && (
            <Button variant="outline" onClick={handleClearRead}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear read
            </Button>
          )}
        </div>
      </div>



      {/* Filter Tabs */}
      <Tabs defaultValue="all" value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading && notifications.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-muted-foreground">
            {filter === "unread" 
              ? "You have no unread notifications." 
              : "You don't have any notifications yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markAsRead([id])}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
