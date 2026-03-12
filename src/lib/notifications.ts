import { prisma } from "@/lib/prisma"

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
}

/**
 * Create a new notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        isRead: false,
      },
    })
    return { success: true, notification }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    })
  } catch (error) {
    console.error("Error getting unread count:", error)
    return 0
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    console.error("Error marking all as read:", error)
    return { success: false, error }
  }
}

/**
 * Notification helpers for different event types
 */
export const NotificationHelpers = {
  /**
   * Campaign completed notification
   */
  campaignCompleted: async (userId: string, campaignName: string, recipientCount: number) => {
    return createNotification({
      userId,
      type: 'success',
      title: 'Campaign Completed',
      message: `Your "${campaignName}" campaign has finished sending to ${recipientCount} contacts.`,
      actionUrl: '/dashboard/campaigns',
    })
  },

  /**
   * Campaign failed notification
   */
  campaignFailed: async (userId: string, campaignName: string, error: string) => {
    return createNotification({
      userId,
      type: 'error',
      title: 'Campaign Failed',
      message: `Your "${campaignName}" campaign failed: ${error}`,
      actionUrl: '/dashboard/campaigns',
    })
  },

  /**
   * New message received notification
   */
  newMessage: async (userId: string, contactName: string, messagePreview: string) => {
    return createNotification({
      userId,
      type: 'info',
      title: 'New Message',
      message: `${contactName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      actionUrl: '/dashboard/inbox',
    })
  },

  /**
   * New inbox messages count notification
   */
  inboxUpdate: async (userId: string, count: number) => {
    return createNotification({
      userId,
      type: 'info',
      title: 'New Messages',
      message: `You have ${count} new message${count > 1 ? 's' : ''} in your inbox.`,
      actionUrl: '/dashboard/inbox',
    })
  },

  /**
   * Automation triggered notification
   */
  automationTriggered: async (userId: string, automationName: string, contactCount: number) => {
    return createNotification({
      userId,
      type: 'info',
      title: 'Automation Triggered',
      message: `${automationName} started for ${contactCount} new contact${contactCount > 1 ? 's' : ''}.`,
      actionUrl: '/dashboard/automation',
    })
  },

  /**
   * WhatsApp connection status notification
   */
  whatsappConnected: async (userId: string) => {
    return createNotification({
      userId,
      type: 'success',
      title: 'WhatsApp Connected',
      message: 'Your WhatsApp Business account has been connected successfully.',
      actionUrl: '/dashboard/settings/whatsapp',
    })
  },

  /**
   * WhatsApp disconnected notification
   */
  whatsappDisconnected: async (userId: string) => {
    return createNotification({
      userId,
      type: 'warning',
      title: 'WhatsApp Disconnected',
      message: 'Your WhatsApp Business account has been disconnected. Please reconnect.',
      actionUrl: '/dashboard/settings/whatsapp',
    })
  },

  /**
   * Token expiring notification
   */
  tokenExpiring: async (userId: string, daysUntilExpiry: number) => {
    return createNotification({
      userId,
      type: 'warning',
      title: 'Token Expiring Soon',
      message: `Your WhatsApp access token will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Please refresh it.`,
      actionUrl: '/dashboard/settings/whatsapp',
    })
  },

  /**
   * Template approved notification
   */
  templateApproved: async (userId: string, templateName: string) => {
    return createNotification({
      userId,
      type: 'success',
      title: 'Template Approved',
      message: `Your template "${templateName}" has been approved and is ready to use.`,
      actionUrl: '/dashboard/templates',
    })
  },

  /**
   * Template rejected notification
   */
  templateRejected: async (userId: string, templateName: string, reason: string) => {
    return createNotification({
      userId,
      type: 'error',
      title: 'Template Rejected',
      message: `Your template "${templateName}" was rejected: ${reason}`,
      actionUrl: '/dashboard/templates',
    })
  },

  /**
   * Contact imported notification
   */
  contactsImported: async (userId: string, count: number) => {
    return createNotification({
      userId,
      type: 'success',
      title: 'Contacts Imported',
      message: `Successfully imported ${count} contact${count > 1 ? 's' : ''}.`,
      actionUrl: '/dashboard/contacts',
    })
  },

  /**
   * Message failed notification
   */
  messageFailed: async (userId: string, recipientPhone: string, error: string) => {
    return createNotification({
      userId,
      type: 'error',
      title: 'Message Failed',
      message: `Failed to send message to ${recipientPhone}: ${error}`,
      actionUrl: '/dashboard/inbox',
    })
  },
}
