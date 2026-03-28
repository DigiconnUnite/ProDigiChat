"use client"

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

// Types
export interface Notification {
  id: string
  userId: string
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  actionUrl?: string | null
  isRead: boolean
  createdAt: Date
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  inboxUnreadCount: number
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  fetchUnreadCount: () => Promise<void>
  fetchInboxUnreadCount: () => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  clearAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch unread count on session load
  useEffect(() => {
    if (status === "authenticated") {
      fetchUnreadCount()
      fetchInboxUnreadCount()
    }
  }, [status])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (status !== "authenticated") return

    const interval = setInterval(() => {
      fetchUnreadCount()
      fetchInboxUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [status])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }, [])

  const fetchInboxUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox/unread-count")
      if (response.ok) {
        const data = await response.json()
        setInboxUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching inbox unread count:", error)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return
    
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications?limit=20")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error("Error marking as read:", error)
      toast.error("Failed to mark notifications as read")
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all as read")
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }, [notifications])

  const clearAllRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?deleteAllRead=true", {
        method: "DELETE",
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.isRead))
        toast.success("Read notifications cleared")
      }
    } catch (error) {
      console.error("Error clearing read notifications:", error)
      toast.error("Failed to clear notifications")
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        inboxUnreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        fetchInboxUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

// Hook to get just the unread count (lighter weight)
export function useUnreadCount() {
  const { unreadCount, fetchUnreadCount } = useNotifications()
  return { unreadCount, refresh: fetchUnreadCount }
}

// Hook to get inbox unread count
export function useInboxUnreadCount() {
  const { inboxUnreadCount, fetchInboxUnreadCount } = useNotifications()
  return { inboxUnreadCount, refresh: fetchInboxUnreadCount }
}
