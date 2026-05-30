import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings-storage"
import { sendEmail, renderEmailLayout } from "@/lib/email"

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

/**
 * Canonical event keys used to gate email delivery against the
 * organization's notification preferences
 * (`settings.notifications.email.events`). In-app notifications are
 * always created; email is only sent when the org has email enabled and
 * the event is in its subscribed list.
 */
export type NotificationEvent =
  | 'campaign.completed'
  | 'campaign.failed'
  | 'message.failed'
  | 'template.approved'
  | 'template.rejected'
  | 'contacts.imported'
  | 'whatsapp.connected'
  | 'whatsapp.disconnected'
  | 'token.expiring'
  | 'inbox.message'
  | 'automation.triggered'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Create a new in-app notification for a user.
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
 * Whether the organization wants an email for the given event. Reads
 * the org notification preferences and fails open to "no email" so a
 * settings read error never blocks the in-app notification.
 */
async function orgWantsEmail(
  organizationId: string | undefined,
  event: NotificationEvent,
): Promise<boolean> {
  if (!organizationId) return false
  try {
    const settings = await getSettings(organizationId)
    const email = (settings.notifications as any)?.email
    if (!email?.enabled) return false
    // If no explicit event list is configured, default to sending for
    // the high-signal events only.
    const events: string[] = Array.isArray(email.events) ? email.events : []
    if (events.length === 0) {
      return (
        event === 'campaign.completed' ||
        event === 'campaign.failed' ||
        event === 'message.failed'
      )
    }
    return events.includes(event)
  } catch (error) {
    console.error('[Notifications] Failed to read org email prefs:', error)
    return false
  }
}

/**
 * Core emitter: always creates an in-app notification, and — when the
 * organization has opted into email for this event — also sends an
 * email to the user. Never throws.
 */
export async function emitNotification(params: {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  event?: NotificationEvent
  organizationId?: string
  /** Force email regardless of org prefs (e.g. security-critical mail). */
  forceEmail?: boolean
}) {
  const { userId, type, title, message, actionUrl, event, organizationId, forceEmail } =
    params

  const result = await createNotification({ userId, type, title, message, actionUrl })

  // Decide on email.
  const wantsEmail =
    forceEmail || (event ? await orgWantsEmail(organizationId, event) : false)

  if (wantsEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      if (user?.email) {
        const ctaUrl = actionUrl
          ? actionUrl.startsWith('http')
            ? actionUrl
            : `${APP_URL}${actionUrl}`
          : undefined
        await sendEmail({
          to: user.email,
          subject: title,
          html: renderEmailLayout({
            heading: title,
            bodyHtml: `<p>${escapeHtml(message)}</p>`,
            ctaLabel: ctaUrl ? 'Open ProDigiChat' : undefined,
            ctaUrl,
            footnote:
              'You are receiving this because email notifications are enabled for your organization. Manage these in Settings → Notifications.',
          }),
        })
      }
    } catch (error) {
      console.error('[Notifications] Email send failed:', error)
    }
  }

  return result
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Resolve the users who should receive an organization-level
 * notification. Defaults to owners/admins/managers (the people who care
 * about campaign and account health), falling back to all active
 * members if no privileged roles exist.
 */
export async function getOrgNotificationRecipients(
  organizationId: string,
  roles: string[] = ['owner', 'admin', 'manager'],
): Promise<Array<{ userId: string; email: string | null }>> {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId, isActive: true },
      include: { user: { select: { id: true, email: true } } },
    })
    const privileged = members.filter((m) => roles.includes(m.role))
    const chosen = privileged.length > 0 ? privileged : members
    return chosen.map((m) => ({ userId: m.userId, email: m.user?.email ?? null }))
  } catch (error) {
    console.error('[Notifications] Failed to resolve org recipients:', error)
    return []
  }
}

/**
 * Notify an organization-level event. If `preferredUserId` is given
 * (e.g. the campaign creator) and is an active member, only that user
 * is notified; otherwise the org's owners/admins/managers are notified.
 */
export async function notifyOrg(params: {
  organizationId: string
  preferredUserId?: string | null
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  event?: NotificationEvent
}) {
  const { organizationId, preferredUserId, ...rest } = params

  let recipientIds: string[] = []
  if (preferredUserId) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: preferredUserId, isActive: true },
      select: { userId: true },
    })
    if (member) recipientIds = [member.userId]
  }
  if (recipientIds.length === 0) {
    const recipients = await getOrgNotificationRecipients(organizationId)
    recipientIds = recipients.map((r) => r.userId)
  }

  await Promise.all(
    recipientIds.map((userId) =>
      emitNotification({ userId, organizationId, ...rest }),
    ),
  )
  return { success: true, recipients: recipientIds.length }
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
 * Notification helpers for different event types.
 *
 * Org-scoped events (campaign, template, contacts, whatsapp, token)
 * accept an `organizationId` and notify the relevant org members,
 * sending email when the org has opted in. Per-user events accept a
 * `userId` directly.
 */
export const NotificationHelpers = {
  campaignCompleted: (organizationId: string, campaignName: string, recipientCount: number, preferredUserId?: string | null) =>
    notifyOrg({
      organizationId,
      preferredUserId,
      type: 'success',
      title: 'Campaign Completed',
      message: `Your "${campaignName}" campaign has finished sending to ${recipientCount} contacts.`,
      actionUrl: '/dashboard/campaigns',
      event: 'campaign.completed',
    }),

  campaignFailed: (organizationId: string, campaignName: string, error: string, preferredUserId?: string | null) =>
    notifyOrg({
      organizationId,
      preferredUserId,
      type: 'error',
      title: 'Campaign Failed',
      message: `Your "${campaignName}" campaign failed: ${error}`,
      actionUrl: '/dashboard/campaigns',
      event: 'campaign.failed',
    }),

  newMessage: (userId: string, contactName: string, messagePreview: string, organizationId?: string) =>
    emitNotification({
      userId,
      organizationId,
      type: 'info',
      title: 'New Message',
      message: `${contactName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      actionUrl: '/dashboard/inbox',
      event: 'inbox.message',
    }),

  automationTriggered: (organizationId: string, automationName: string, contactCount: number) =>
    notifyOrg({
      organizationId,
      type: 'info',
      title: 'Automation Triggered',
      message: `${automationName} started for ${contactCount} new contact${contactCount > 1 ? 's' : ''}.`,
      actionUrl: '/dashboard/automation',
      event: 'automation.triggered',
    }),

  whatsappConnected: (organizationId: string) =>
    notifyOrg({
      organizationId,
      type: 'success',
      title: 'WhatsApp Connected',
      message: 'Your WhatsApp Business account has been connected successfully.',
      actionUrl: '/dashboard/settings/whatsapp',
      event: 'whatsapp.connected',
    }),

  whatsappDisconnected: (organizationId: string) =>
    notifyOrg({
      organizationId,
      type: 'warning',
      title: 'WhatsApp Disconnected',
      message: 'Your WhatsApp Business account has been disconnected. Please reconnect.',
      actionUrl: '/dashboard/settings/whatsapp',
      event: 'whatsapp.disconnected',
    }),

  tokenExpiring: (organizationId: string, daysUntilExpiry: number) =>
    notifyOrg({
      organizationId,
      type: 'warning',
      title: 'WhatsApp Token Expiring Soon',
      message: `Your WhatsApp access token will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Reconnect to avoid interrupted sending.`,
      actionUrl: '/dashboard/settings/whatsapp',
      event: 'token.expiring',
    }),

  templateApproved: (organizationId: string, templateName: string) =>
    notifyOrg({
      organizationId,
      type: 'success',
      title: 'Template Approved',
      message: `Your template "${templateName}" has been approved and is ready to use.`,
      actionUrl: '/dashboard/templates',
      event: 'template.approved',
    }),

  templateRejected: (organizationId: string, templateName: string, reason: string) =>
    notifyOrg({
      organizationId,
      type: 'error',
      title: 'Template Rejected',
      message: `Your template "${templateName}" was rejected: ${reason}`,
      actionUrl: '/dashboard/templates',
      event: 'template.rejected',
    }),

  contactsImported: (userId: string, count: number, organizationId?: string) =>
    emitNotification({
      userId,
      organizationId,
      type: 'success',
      title: 'Contacts Imported',
      message: `Successfully imported ${count} contact${count > 1 ? 's' : ''}.`,
      actionUrl: '/dashboard/contacts',
      event: 'contacts.imported',
    }),

  messageFailed: (organizationId: string, recipientPhone: string, error: string, preferredUserId?: string | null) =>
    notifyOrg({
      organizationId,
      preferredUserId,
      type: 'error',
      title: 'Message Failed',
      message: `Failed to send message to ${recipientPhone}: ${error}`,
      actionUrl: '/dashboard/inbox',
      event: 'message.failed',
    }),
}
