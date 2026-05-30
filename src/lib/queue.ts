/**
 * WhatsApp Message Queue with Exponential Backoff Retry Logic
 * 
 * This module provides persistent queue management for WhatsApp messages
 * with retry logic, scheduled sending, and bulk operations support.
 */

import { WhatsAppMessageQueue, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from '@/app/api/whatsapp/messages';
import { prisma } from '@/lib/prisma';
import { evaluateOutboundPolicy } from '@/lib/messaging-policy';
import { classifyMetaError } from '@/lib/meta-errors';

/**
 * How long a `SENDING` row may sit before we consider it stranded by
 * a crashed worker and reclaim it. Real sends complete in a few
 * seconds; 10 minutes is a generous safety margin that still recovers
 * stuck rows quickly enough that downstream campaigns don't stall.
 */
export const STALE_CLAIM_THRESHOLD_MS = 10 * 60 * 1000;

// Queue status constants
export const QueueStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  DELIVERED: 'delivered',
  PAUSED: 'paused',
} as const;

// Message type constants
export const MessageType = {
  TEXT: 'text',
  TEMPLATE: 'template',
  MEDIA: 'media',
} as const;

// Retry configuration
export const RetryConfig = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 60000, // 60 seconds (1 minute)
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Atomically claim a single queue row for processing. Performs a
 * conditional update from QUEUED/PENDING -> SENDING; if another
 * worker has already claimed the row the update touches zero rows
 * and we return null. This is the *only* way the queue worker
 * obtains rows to send — no caller should set status=SENDING
 * directly.
 */
export async function claimQueueItem(
  id: string,
): Promise<WhatsAppMessageQueue | null> {
  const claimToken = crypto.randomBytes(16).toString('hex');
  const now = new Date();

  const updated = await prisma.whatsAppMessageQueue.updateMany({
    where: {
      id,
      status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] },
    },
    data: {
      status: QueueStatus.SENDING,
      claimToken,
      claimedAt: now,
      lastAttemptAt: now,
      attempts: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    return null;
  }

  // Re-read so the caller sees the post-update row, including the new
  // claimToken, status, and incremented attempts count.
  const claimed = await prisma.whatsAppMessageQueue.findUnique({
    where: { id },
  });
  return claimed;
}

/**
 * Reset rows that were claimed but never resolved — typically because
 * the worker crashed mid-send. Called once per cron tick before any
 * fan-out happens. Returns the number of rows reclaimed.
 */
export async function reclaimStaleClaims(
  staleThresholdMs: number = STALE_CLAIM_THRESHOLD_MS,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleThresholdMs);
  const result = await prisma.whatsAppMessageQueue.updateMany({
    where: {
      status: QueueStatus.SENDING,
      claimedAt: { lt: cutoff },
    },
    data: {
      status: QueueStatus.QUEUED,
      claimToken: null,
      claimedAt: null,
    },
  });
  if (result.count > 0) {
    console.warn(
      `[Queue] Reclaimed ${result.count} stale SENDING rows older than ${staleThresholdMs}ms`,
    );
  }
  return result.count;
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = RetryConfig.INITIAL_DELAY_MS * Math.pow(RetryConfig.BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, RetryConfig.MAX_DELAY_MS);
}

/**
 * Add a message to the queue
 */
export async function addToQueue(
  organizationId: string,
  recipientPhone: string,
  messageContent: string,
  options?: {
    campaignId?: string;
    contactId?: string;
    messageType?: string;
    scheduledAt?: Date;
    maxAttempts?: number;
  }
): Promise<WhatsAppMessageQueue> {
  const queueItem = await prisma.whatsAppMessageQueue.create({
    data: {
      organizationId,
      recipientPhone,
      messageContent,
      messageType: options?.messageType || MessageType.TEXT,
      campaignId: options?.campaignId,
      contactId: options?.contactId,
      scheduledAt: options?.scheduledAt,
      maxAttempts: options?.maxAttempts || RetryConfig.MAX_ATTEMPTS,
      status: options?.scheduledAt && options.scheduledAt > new Date() 
        ? QueueStatus.PENDING 
        : QueueStatus.QUEUED,
    },
  });

  console.log(`[Queue] Added message to queue: ${queueItem.id}`);
  return queueItem;
}

/**
 * Add multiple messages to the queue (bulk operation)
 * Uses createMany for efficient bulk insert - much faster than sequential inserts
 */
export async function addBulkToQueue(
  organizationId: string,
  messages: Array<{
    recipientPhone: string;
    messageContent: string;
    campaignId?: string;
    contactId?: string;
    messageType?: string;
    scheduledAt?: Date;
    whatsappAccountId?: string;
  }>,
  whatsappAccountId?: string // Default account ID for all messages
): Promise<WhatsAppMessageQueue[]> {
  if (messages.length === 0) {
    return [];
  }

  const now = new Date();
  // Generate a unique batch ID for this bulk insert
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[Queue:addBulkToQueue] orgId: "${organizationId}", messageCount: ${messages.length}, accountId: ${whatsappAccountId}, batchId: ${batchId}`);
  console.log(`[Queue:addBulkToQueue] First message sample:`, JSON.stringify(messages[0]).substring(0, 200));

  // Use createMany for bulk insert - much faster than sequential inserts
  await prisma.whatsAppMessageQueue.createMany({
    data: messages.map(msg => ({
      organizationId,
      recipientPhone: msg.recipientPhone,
      messageContent: msg.messageContent,
      messageType: msg.messageType || MessageType.TEXT,
      campaignId: msg.campaignId,
      contactId: msg.contactId,
      whatsappAccountId: msg.whatsappAccountId || whatsappAccountId,
      batchId, // Add batch ID for reliable identification
      scheduledAt: msg.scheduledAt,
      maxAttempts: RetryConfig.MAX_ATTEMPTS,
      status: msg.scheduledAt && msg.scheduledAt > now
        ? QueueStatus.PENDING
        : QueueStatus.QUEUED,
    })),
  });

  // Fetch the created records using the batchId for reliable identification
  const queueItems = await prisma.whatsAppMessageQueue.findMany({
    where: { batchId },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[Queue] Added ${queueItems.length} messages to queue`);
  return queueItems;
}

/**
 * Get queue status and statistics for an organization
 */
export async function getQueueStats(organizationId: string): Promise<{
  pending: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  delivered: number;
  total: number;
}> {
  const stats = await prisma.whatsAppMessageQueue.groupBy({
    by: ['status'],
    where: { organizationId },
    _count: true,
  });

  const result = {
    pending: 0,
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    delivered: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    const key = stat.status as keyof typeof result;
    if (key in result) {
      result[key] = stat._count;
    }
    result.total += stat._count;
  });

  return result;
}

/**
 * Get queue items by status
 */
export async function getQueueByStatus(
  organizationId: string,
  status: string,
  limit: number = 100,
  offset: number = 0
): Promise<WhatsAppMessageQueue[]> {
  return prisma.whatsAppMessageQueue.findMany({
    where: {
      organizationId,
      status,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get messages ready to be processed (queued or pending and scheduled time passed)
 */
export async function getReadyMessages(
  organizationId: string,
  limit: number = 50
): Promise<WhatsAppMessageQueue[]> {
  const now = new Date();
  
  console.log(`[Queue:getReadyMessages] called with orgId: "${organizationId}", limit: ${limit}`);
  
  // Debug: Check what statuses exist for this org
  try {
    const statusCounts = await prisma.whatsAppMessageQueue.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });
    console.log(`[Queue:getReadyMessages] Status distribution for org:`, statusCounts);
  } catch (e) {
    console.error(`[Queue:getReadyMessages] Error getting status counts:`, e);
  }
  
  // Debug: Check if any queued messages exist at all
  try {
    const totalQueued = await prisma.whatsAppMessageQueue.count({
      where: {
        organizationId: organizationId || undefined, // Support both null and string search
        status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] },
      },
    });
    console.log(`[Queue:getReadyMessages] Total queued/pending messages for org "${organizationId}": ${totalQueued}`);
  } catch (e) {
    console.error(`[Queue:getReadyMessages] Error counting queued:`, e);
  }
  
  // Get messages that are queued or pending AND (no scheduled time OR scheduled time passed) AND (no retry time OR retry time passed)
  // Note: paused items are excluded since they're not in the status array
  const messages = await prisma.whatsAppMessageQueue.findMany({
    where: {
      organizationId: organizationId || undefined,
      status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] },
      AND: [
        {
          OR: [
            { scheduledAt: null },
            { scheduledAt: { isSet: false } },
            { scheduledAt: { lte: now } },
          ],
        },
        {
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { isSet: false } },
            { nextRetryAt: { lte: now } },
          ],
        },
      ],
    },
    orderBy: [
      { scheduledAt: 'asc' },
      { createdAt: 'asc' },
    ],
    take: limit,
  });

  return messages;
}

/**
 * Categorize WhatsApp API errors into human-readable failure reasons
 */
function categorizeError(
  errorCode?: string | number | null,
  errorMessage?: string | null
): string {
  const msg = (errorMessage || '').toLowerCase()
  const code = Number(errorCode)

  // WhatsApp API error codes
  if (code === 100) return 'INVALID_RECIPIENT'
  if (code === 131026) return 'RECIPIENT_NOT_ON_WHATSAPP'
  if (code === 131047) return 'RECIPIENT_BLOCKED_BUSINESS'
  if (code === 131052) return 'TEMPLATE_NOT_APPROVED'
  if (code === 131013) return 'DAILY_LIMIT_EXCEEDED'
  if (code === 4) return 'RATE_LIMITED'
  if (code === 10) return 'PERMISSION_DENIED'

  // String-based categorization
  if (msg.includes('not on whatsapp')) return 'RECIPIENT_NOT_ON_WHATSAPP'
  if (msg.includes('invalid phone') || msg.includes('invalid recipient')) return 'INVALID_PHONE_NUMBER'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'RATE_LIMITED'
  if (msg.includes('template') && msg.includes('not approved')) return 'TEMPLATE_NOT_APPROVED'
  if (msg.includes('blocked')) return 'RECIPIENT_BLOCKED_BUSINESS'
  if (msg.includes('opted out') || msg.includes('opt-out')) return 'RECIPIENT_OPTED_OUT'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'TIMEOUT'
  if (msg.includes('network') || msg.includes('connection')) return 'NETWORK_ERROR'

  return 'UNKNOWN_ERROR'
}

/**
 * Process a single message from the queue
 */
export async function processQueueItem(queueItem: WhatsAppMessageQueue): Promise<{
  success: boolean;
  whatsappMessageId?: string;
  error?: string;
}> {
  const { id, organizationId, recipientPhone, messageContent, messageType, attempts, whatsappAccountId } = queueItem;
  const accountId = whatsappAccountId || undefined;

  // The caller (`processQueue`) is responsible for atomically claiming
  // the row via `claimQueueItem` before invoking us. The row's
  // `attempts` is therefore already the post-increment value; we do
  // not increment it again here.
  console.log(`[Queue] Processing message ${id} (attempt ${attempts}), accountId: ${whatsappAccountId}`);

  async function resolveContact(): Promise<{ id: string; organizationId: string | null } | null> {
    if (queueItem.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: queueItem.contactId,
          organizationId,
        },
        select: { id: true, organizationId: true },
      }) as { id: string; organizationId: string | null } | null;

      if (contact) {
        return {
          id: contact.id,
          organizationId: contact.organizationId || organizationId,
        };
      }
    }

    const normalizedRecipient = recipientPhone.replace(/[^\d+]/g, '');
    const contact = await prisma.contact.findFirst({
      where: {
        organizationId,
        OR: [
          { phoneNumber: recipientPhone },
          { phoneNumber: normalizedRecipient },
          { phoneNumber: { endsWith: normalizedRecipient.replace(/^\+/, '') } },
        ],
      },
      select: { id: true, organizationId: true },
    }) as { id: string; organizationId: string | null } | null;

    if (!contact) {
      return null;
    }

    return {
      id: contact.id,
      organizationId: contact.organizationId || organizationId,
    };
  }

  try {
    // Parse message content
    let parsedContent: {
      text?: string;
      freeformMessage?: string;
      templateName?: string;
      components?: any[];
      mediaUrl?: string;
      caption?: string;
      language?: string;
      mediaType?: string;
    };

    try {
      parsedContent = JSON.parse(messageContent);
    } catch {
      parsedContent = { text: messageContent };
    }

    // Messaging-policy gate: opt-in for all messages, plus the 24-hour
    // customer-care window for freeform / non-template messages. We do
    // this once here, before any Meta API call, so policy denials never
    // count against rate limits and never produce orphan Message rows.
    const isTemplate = messageType === MessageType.TEMPLATE;
    const policy = await evaluateOutboundPolicy({
      organizationId,
      contactId: queueItem.contactId,
      phoneNumber: recipientPhone,
      isTemplate,
    });

    if (!policy.ok) {
      console.warn(
        `[Queue] Policy denial for message ${id}: ${policy.reason} - ${policy.message}`,
      );
      await prisma.whatsAppMessageQueue.update({
        where: { id },
        data: {
          status: QueueStatus.FAILED,
          errorMessage: `policy:${policy.reason}: ${policy.message}`,
          errorCode: `POLICY_${policy.reason.toUpperCase()}`,
          nextRetryAt: null,
          claimToken: null,
          claimedAt: null,
        },
      });
      return { success: false, error: policy.message };
    }

    let result: any;

    // Send based on message type
    switch (messageType) {
      case MessageType.TEMPLATE:
        result = await sendTemplateMessage(
          recipientPhone,
          parsedContent.templateName || 'default',
          parsedContent.components || [],
          organizationId,
          parsedContent.language || 'en_US',
          accountId
        );
        break;
        
      case MessageType.MEDIA:
        result = await sendMediaMessage(
          recipientPhone,
          parsedContent.mediaUrl || '',
          parsedContent.caption || '',
          organizationId,
          accountId,
          parsedContent.mediaType || 'image'
        );
        break;
        
      case MessageType.TEXT:
      default:
        result = await sendTextMessage(
          recipientPhone,
          parsedContent.text || parsedContent.freeformMessage || messageContent,
          organizationId,
          accountId
        );
        break;
    }

    // Extract WhatsApp message ID from response
    const whatsappMessageId = result?.messages?.[0]?.id;

    // Update queue item as sent. Clear the claim so it won't be
    // mistaken for a stranded SENDING row by stale-claim recovery.
    await prisma.whatsAppMessageQueue.update({
      where: { id },
      data: {
        status: QueueStatus.SENT,
        whatsappMessageId,
        sentAt: new Date(),
        errorMessage: null,
        errorCode: null,
        claimToken: null,
        claimedAt: null,
      },
    });

    // Stamp the contact's lastOutboundAt so we have an accurate record
    // of the most recent successful send. Currently used only for
    // analytics; future PRs may use it to suppress duplicate sends.
    if (queueItem.contactId) {
      await prisma.contact.update({
        where: { id: queueItem.contactId },
        data: { lastOutboundAt: new Date() },
      }).catch((err) => {
        console.error('[Queue] Failed to stamp lastOutboundAt:', err);
      });
    }

    // Create Message record for successful send
    const contact = await resolveContact();
    if (contact) {
      await prisma.message.create({
        data: {
          contactId: contact.id,
          campaignId: queueItem.campaignId || undefined,
          organizationId: contact.organizationId || organizationId,
          direction: 'outgoing',
          status: 'sent',
          content: queueItem.messageContent,
          whatsappMessageId,
          stats: JSON.stringify({ totalSent: 1, delivered: 0, read: 0, failed: 0, clicked: 0 }),
        },
      }).catch((e) => {
        console.error('[Queue] Failed to create Message record:', e);
      });
    } else {
      console.warn(`[Queue] Could not resolve contact for message ${id}; skipping Message row creation`);
    }

    console.log(`[Queue] Message ${id} sent successfully`);
    return { success: true, whatsappMessageId };

  } catch (error: any) {
    // Classify the Meta error so we can decide retry vs. no_retry,
    // detect rate-limit cooldowns, and surface auth failures to the
    // operator (rather than silently retrying with a dead token).
    const classification = classifyMetaError(error);
    const errorMessage = classification.reason;
    const errorCode = String(
      error?.response?.data?.error?.code ?? error?.code ?? 'UNKNOWN',
    );

    console.error(
      `[Queue] Send failed for ${id} (${classification.category}): ${errorMessage}`,
    );

    let nextRetryAt: Date | null = null;
    let nextStatus: typeof QueueStatus[keyof typeof QueueStatus] = QueueStatus.FAILED;

    switch (classification.category) {
      case 'rate_limited': {
        // Meta rate limit — pause ALL messages for this account for the
        // suggested cooldown. The row itself goes back to QUEUED so it
        // will be picked up after the cooldown expires.
        const cooldown = classification.cooldownMs ?? 60 * 60 * 1000;
        const resumeAt = new Date(Date.now() + cooldown);
        nextRetryAt = resumeAt;
        nextStatus = QueueStatus.QUEUED;
        if (queueItem.whatsappAccountId) {
          await prisma.whatsAppMessageQueue.updateMany({
            where: {
              whatsappAccountId: queueItem.whatsappAccountId,
              status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] },
            },
            data: { nextRetryAt: resumeAt },
          });
          console.warn(
            `[Queue] Account ${queueItem.whatsappAccountId} rate limited; ` +
              `pausing all queued/pending sends until ${resumeAt.toISOString()}`,
          );
        }
        break;
      }

      case 'reconnect_auth': {
        // Meta access token is dead. Retrying won't help; the operator
        // needs to reconnect the account in the WhatsApp settings UI.
        // Don't retry, mark FAILED, and surface the reason for UI use.
        nextStatus = QueueStatus.FAILED;
        nextRetryAt = null;
        break;
      }

      case 'no_retry': {
        nextStatus = QueueStatus.FAILED;
        nextRetryAt = null;
        break;
      }

      case 'retry':
      default: {
        const canRetry = attempts < queueItem.maxAttempts;
        if (canRetry) {
          // `attempts` is already incremented (claim did it). Use
          // attempts-1 as the backoff exponent so the first retry
          // waits INITIAL_DELAY_MS, second waits 2x, etc.
          const delay = calculateBackoffDelay(Math.max(0, attempts - 1));
          nextRetryAt = new Date(Date.now() + delay);
          nextStatus = QueueStatus.QUEUED;
          console.log(
            `[Queue] Message ${id} will retry at ${nextRetryAt.toISOString()} (attempt ${attempts + 1}/${queueItem.maxAttempts})`,
          );
        } else {
          nextStatus = QueueStatus.FAILED;
          nextRetryAt = null;
        }
        break;
      }
    }

    await prisma.whatsAppMessageQueue.update({
      where: { id },
      data: {
        status: nextStatus,
        nextRetryAt,
        errorMessage: errorMessage.substring(0, 1000),
        errorCode,
        // Drop the claim now that we've finished handling this
        // attempt; the next retry will mint a fresh claimToken.
        claimToken: null,
        claimedAt: null,
      },
    });

    // ✅ CREATE MESSAGE RECORD FOR FAILED MESSAGE
    // Only create a Message record if this is a final failure (no more retries)
    if (nextStatus === QueueStatus.FAILED) {
      const contact = await resolveContact();
      if (contact) {
        const classification = classifyMetaError(error);
        const failureReason = classification.reason;
        const errorMessage = error?.message || error?.response?.data?.error?.message || 'Unknown error';
        
        await prisma.message.create({
          data: {
            contactId: contact.id,
            campaignId: queueItem.campaignId || undefined,
            organizationId: contact.organizationId || organizationId,
            direction: 'outgoing',
            status: 'failed',
            content: queueItem.messageContent,
            failureReason,
            errorMessage,
            sentAt: null,
            failedAt: new Date(),
          },
        } as any).catch((e) => {
          console.error('[Queue] Failed to create failure Message record:', e);
        });
      } else {
        console.warn(`[Queue] Could not resolve contact for failed message ${id}; skipping Message row creation`);
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process all pending messages in the queue
 * Includes cooldown check for rate-limited accounts (130429)
 */
export async function processQueue(
  organizationId: string,
  limit: number = 50
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<{ queueItemId: string; success: boolean; error?: string }>;
}> {
  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [] as Array<{ queueItemId: string; success: boolean; error?: string }>,
  };

  // Reclaim any rows stranded by a previous worker crash. Cheap, runs
  // once per tick.
  await reclaimStaleClaims();

  // Find candidates that *look* ready. We then race to claim each one.
  const candidates = await getReadyMessages(organizationId, limit);
  console.log(`[Queue] Found ${candidates.length} candidate messages for org ${organizationId}`);

  const claimedMessages: WhatsAppMessageQueue[] = [];

  for (const candidate of candidates) {
    // Atomic claim: if another worker has already grabbed this row,
    // claimQueueItem returns null and we skip without bumping
    // attempts or producing an error row.
    const claimed = await claimQueueItem(candidate.id);
    if (!claimed) {
      console.log(`[Queue] Lost race on ${candidate.id}; another worker has it.`);
      continue;
    }
    claimedMessages.push(claimed);
  }

  for (const message of claimedMessages) {
    const processResult = await processQueueItem(message);
    result.processed++;

    if (processResult.success) {
      result.succeeded++;
    } else {
      result.failed++;
    }

    result.results.push({
      queueItemId: message.id,
      success: processResult.success,
      error: processResult.error,
    });
  }

  // Roll up campaign stats from queue processing results
  await updateCampaignStatsFromQueue(claimedMessages, result.results);

  return result;
}

/**
 * Update campaign stats based on queue processing results
 */
async function updateCampaignStatsFromQueue(
  processedMessages: WhatsAppMessageQueue[],
  results: Array<{ queueItemId: string; success: boolean; error?: string }>
): Promise<void> {
  // Group results by campaignId
  const campaignResults = new Map<string, { succeeded: number; failed: number }>();

  processedMessages.forEach((message, index) => {
    if (!message.campaignId) return;

    const result = results[index];
    const campaignId = message.campaignId;

    if (!campaignResults.has(campaignId)) {
      campaignResults.set(campaignId, { succeeded: 0, failed: 0 });
    }

    const stats = campaignResults.get(campaignId)!;
    if (result.success) {
      stats.succeeded++;
    } else {
      stats.failed++;
    }
  });

  if (campaignResults.size === 0) return;

  const campaignIds = Array.from(campaignResults.keys());

  // Single fetch for all affected campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true, stats: true, status: true, organizationId: true, createdBy: true }
  });

  const campaignMap = new Map(campaigns.map(c => [c.id, c]));

  // Check remaining queue counts in one query per campaign (still needed per campaign)
  const remainingCounts = await Promise.all(
    campaignIds.map(cid =>
      prisma.whatsAppMessageQueue.count({
        where: { campaignId: cid, status: { in: ['queued', 'pending', 'sending'] } }
      }).then(count => ({ campaignId: cid, count }))
    )
  );
  const remainingMap = new Map(remainingCounts.map(r => [r.campaignId, r.count]));

  // Campaigns that transition running -> completed in this tick, so we
  // can fire a "campaign completed" notification once the queue drains.
  const justCompleted: Array<{
    id: string;
    name: string;
    organizationId: string | null;
    createdBy: string | null;
    totalSent: number;
    failed: number;
  }> = [];

  // Build batch updates
  const updates = campaignIds.map(campaignId => {
    const campaign = campaignMap.get(campaignId);
    if (!campaign) return null;

    const delta = campaignResults.get(campaignId)!;
    let currentStats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 };
    try {
      const parsed = JSON.parse(campaign.stats || '{}');
      if (parsed && typeof parsed === 'object') currentStats = { ...currentStats, ...parsed };
    } catch {
      // use defaults
    }

    const updatedStats = {
      ...currentStats,
      totalSent: (currentStats.totalSent || 0) + delta.succeeded,
      failed: (currentStats.failed || 0) + delta.failed,
    };

    const shouldComplete = campaign.status === 'running' && (remainingMap.get(campaignId) ?? 1) === 0;

    if (shouldComplete) {
      justCompleted.push({
        id: campaign.id,
        name: campaign.name,
        organizationId: campaign.organizationId,
        createdBy: campaign.createdBy,
        totalSent: updatedStats.totalSent,
        failed: updatedStats.failed,
      });
    }

    return prisma.campaign.update({
      where: { id: campaignId },
      data: {
        stats: JSON.stringify(updatedStats),
        ...(shouldComplete ? { status: 'completed' } : {}),
      }
    });
  }).filter((u): u is Exclude<typeof u, null> => u !== null);

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  // Fire campaign-completion notifications (in-app + optional email).
  // Best-effort: notification failures must never break queue stats.
  if (justCompleted.length > 0) {
    const { NotificationHelpers } = await import('@/lib/notifications');
    await Promise.all(
      justCompleted.map((c) => {
        if (!c.organizationId) return Promise.resolve();
        // If every recipient failed, this was effectively a failed
        // campaign — surface it as such.
        if (c.totalSent === 0 && c.failed > 0) {
          return NotificationHelpers.campaignFailed(
            c.organizationId,
            c.name,
            `All ${c.failed} message(s) failed to send. Check recipient opt-in status and template approval.`,
            c.createdBy,
          ).catch((e) => console.error('[Queue] campaignFailed notification error:', e));
        }
        return NotificationHelpers.campaignCompleted(
          c.organizationId,
          c.name,
          c.totalSent,
          c.createdBy,
        ).catch((e) => console.error('[Queue] campaignCompleted notification error:', e));
      }),
    );
  }

  for (const [campaignId, delta] of campaignResults) {
    console.log(`[Queue] Updated campaign ${campaignId} stats: +${delta.succeeded} sent, +${delta.failed} failed`);
    if ((remainingMap.get(campaignId) ?? 1) === 0 && campaignMap.get(campaignId)?.status === 'running') {
      console.log(`[Queue] Campaign ${campaignId} marked as completed`);
    }
  }
}

/**
 * Cancel a queued message
 */
export async function cancelMessage(queueItemId: string): Promise<WhatsAppMessageQueue | null> {
  const queueItem = await prisma.whatsAppMessageQueue.findUnique({
    where: { id: queueItemId },
  });

  if (!queueItem) {
    return null;
  }

  if (queueItem.status === QueueStatus.SENT || queueItem.status === QueueStatus.DELIVERED) {
    console.error(`[Queue] Cannot cancel message ${queueItemId} - already sent`);
    return null;
  }

  return prisma.whatsAppMessageQueue.update({
    where: { id: queueItemId },
    data: {
      status: QueueStatus.FAILED,
      errorMessage: 'Cancelled by user',
    },
  });
}

/**
 * Mark a message as delivered (called from webhook processing)
 */
export async function markAsDelivered(
  queueItemId: string,
  whatsappMessageId: string
): Promise<WhatsAppMessageQueue | null> {
  return prisma.whatsAppMessageQueue.update({
    where: { id: queueItemId },
    data: {
      status: QueueStatus.DELIVERED,
      deliveredAt: new Date(),
      whatsappMessageId,
    },
  });
}

/**
 * Get a queue item by WhatsApp message ID
 */
export async function getQueueItemByWhatsAppMessageId(
  whatsappMessageId: string
): Promise<WhatsAppMessageQueue | null> {
  return prisma.whatsAppMessageQueue.findFirst({
    where: { whatsappMessageId },
  });
}

/**
 * Delete processed messages older than specified days
 */
export async function cleanupOldMessages(organizationId: string, daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.whatsAppMessageQueue.deleteMany({
    where: {
      organizationId,
      status: { in: [QueueStatus.SENT, QueueStatus.DELIVERED, QueueStatus.FAILED] },
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(`[Queue] Cleaned up ${result.count} old messages`);
  return result.count;
}

/**
 * Retry a single failed message
 */
export async function retryMessage(queueItemId: string): Promise<WhatsAppMessageQueue | null> {
  const queueItem = await prisma.whatsAppMessageQueue.findUnique({
    where: { id: queueItemId },
  });

  if (!queueItem) {
    return null;
  }

  if (queueItem.status !== QueueStatus.FAILED) {
    console.error(`[Queue] Cannot retry message ${queueItemId} - not failed`);
    return null;
  }

  return prisma.whatsAppMessageQueue.update({
    where: { id: queueItemId },
    data: {
      status: QueueStatus.PENDING,
      attempts: 0,
      nextRetryAt: new Date(),
    },
  });
}

/**
 * Retry all failed messages for an organization
 */
export async function retryAllFailed(orgId?: string): Promise<{ retried: number; errors: string[] }> {
  console.log(`[Queue] Retrying all failed messages for org: ${orgId || 'all'}`);
  
  const orgFilter = orgId ? { organizationId: orgId } : {};
  
  // Get all failed messages, but exclude permanent policy failures
  const failedMessages = await prisma.whatsAppMessageQueue.findMany({
    where: {
      ...orgFilter,
      status: QueueStatus.FAILED,
      // Exclude messages that failed due to permanent policy violations
      // These should never be retried as they will always fail
      NOT: [
        {
          errorMessage: {
            contains: 'opted_out',
          },
        },
        {
          errorMessage: {
            contains: 'policy_violation',
          },
        },
        {
          errorMessage: {
            contains: 'blocked',
          },
        },
        {
          errorMessage: {
            contains: 'spam',
          },
        },
      ],
    },
  });

  console.log(`[Queue] Found ${failedMessages.length} failed messages to retry (excluding permanent failures)`);

  let retried = 0;
  const errors: string[] = [];

  for (const message of failedMessages) {
    try {
      // Reset retry count and next retry time
      const updatedMessage = await prisma.whatsAppMessageQueue.update({
        where: { id: message.id },
        data: {
          status: QueueStatus.PENDING,
          attempts: 0,
          nextRetryAt: new Date(),
        },
      });

      if (updatedMessage) {
        retried++;
        console.log(`[Queue] Retrying message ${message.id} for ${message.recipientPhone}`);
      } else {
        errors.push(`Failed to reset retry for message ${message.id}`);
      }
    } catch (error) {
      errors.push(`Error retrying message ${message.id}: ${error}`);
    }
  }

  return { retried, errors };
}

export type { WhatsAppMessageQueue };
