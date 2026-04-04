/**
 * WhatsApp Message Queue with Exponential Backoff Retry Logic
 * 
 * This module provides persistent queue management for WhatsApp messages
 * with retry logic, scheduled sending, and bulk operations support.
 */

import { WhatsAppMessageQueue, Prisma } from '@prisma/client';
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from '@/app/api/whatsapp/messages';
import { prisma } from '@/lib/prisma';

// Queue status constants
export const QueueStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  DELIVERED: 'delivered',
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
    whatsappAccountId?: string; // BUG FIX: Store the WhatsApp account ID for each message
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
      whatsappAccountId: msg.whatsappAccountId || whatsappAccountId, // BUG FIX: Store account ID
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
  const messages = await prisma.whatsAppMessageQueue.findMany({
    where: {
      organizationId: organizationId || undefined,
      status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] },
      AND: [
        {
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: now } },
          ],
        },
        {
          OR: [
            { nextRetryAt: null },
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
 * Process a single message from the queue
 */
export async function processQueueItem(queueItem: WhatsAppMessageQueue): Promise<{
  success: boolean;
  whatsappMessageId?: string;
  error?: string;
}> {
  // BUG FIX: Extract whatsappAccountId from queue item (convert null to undefined)
  const { id, organizationId, recipientPhone, messageContent, messageType, attempts, whatsappAccountId } = queueItem;
  const accountId = whatsappAccountId || undefined;

  console.log(`[Queue] Processing message ${id} (attempt ${attempts + 1}), accountId: ${whatsappAccountId}`);

  // Update status to sending
  await prisma.whatsAppMessageQueue.update({
    where: { id },
    data: {
      status: QueueStatus.SENDING,
      attempts: attempts + 1,
      lastAttemptAt: new Date(),
    },
  });

  console.log(`[Queue] Processing message ${id} (attempt ${attempts + 1})`);

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
    };
    
    try {
      parsedContent = JSON.parse(messageContent);
    } catch {
      parsedContent = { text: messageContent };
    }

    let result: any;

    // BUG FIX: Pass whatsappAccountId to all send functions
    // Send based on message type
    switch (messageType) {
      case MessageType.TEMPLATE:
        result = await sendTemplateMessage(
          recipientPhone,
          parsedContent.templateName || 'default',
          parsedContent.components || [],
          organizationId,
          parsedContent.language || 'en_US',
          accountId // BUG FIX: Pass account ID
        );
        break;
        
      case MessageType.MEDIA:
        result = await sendMediaMessage(
          recipientPhone,
          parsedContent.mediaUrl || '',
          parsedContent.caption || '',
          organizationId,
          accountId // BUG FIX: Pass account ID
        );
        break;
        
      case MessageType.TEXT:
      default:
        // BUG FIX: Also check for freeformMessage property
        result = await sendTextMessage(
          recipientPhone,
          parsedContent.text || parsedContent.freeformMessage || messageContent,
          organizationId,
          accountId // BUG FIX: Pass account ID
        );
        break;
    }

    // Extract WhatsApp message ID from response
    const whatsappMessageId = result?.messages?.[0]?.id;

    // Update queue item as sent
    await prisma.whatsAppMessageQueue.update({
      where: { id },
      data: {
        status: QueueStatus.SENT,
        whatsappMessageId,
        sentAt: new Date(),
        errorMessage: null,
        errorCode: null,
      },
    });

    // Persist outgoing message row so webhook status updates can be matched by whatsappMessageId.
    if (whatsappMessageId && queueItem.contactId && queueItem.campaignId) {
      await prisma.message.create({
        data: {
          contactId: queueItem.contactId,
          campaignId: queueItem.campaignId,
          organizationId: queueItem.organizationId,
          direction: 'outgoing',
          status: 'sent',
          content: JSON.stringify({ text: queueItem.messageContent }),
          whatsappMessageId,
        },
      }).catch((e) => {
        console.error('[Queue] Failed to create Message record:', e);
      });
    }

    console.log(`[Queue] Message ${id} sent successfully`);
    return { success: true, whatsappMessageId };

  } catch (error: any) {
    console.error(`[Queue] Failed to send message ${id}:`, error);

    // Calculate if we should retry
    const newAttempts = attempts + 1;
    const canRetry = newAttempts < queueItem.maxAttempts;
    
    let nextRetryAt: Date | null = null;
    let errorMessage = error.message || 'Unknown error';
    let errorCode = error.code || error.response?.data?.error?.code || 'UNKNOWN';

    if (canRetry) {
      let delay = calculateBackoffDelay(attempts);

      // Special handling for Meta API rate limits (error code 130429)
      if (errorCode === '130429' || errorCode === 130429) {
        // Meta rate limit - pause ALL messages for this account for 1 hour
        delay = 60 * 60 * 1000; // 1 hour
        console.log(`[Queue] Meta rate limit detected for account ${queueItem.whatsappAccountId}, pausing all messages for 1 hour`);

        // Update all queued messages for this account with longer delay
        await prisma.whatsAppMessageQueue.updateMany({
          where: {
            whatsappAccountId: queueItem.whatsappAccountId,
            status: { in: [QueueStatus.QUEUED, QueueStatus.PENDING] }
          },
          data: {
            nextRetryAt: new Date(Date.now() + delay)
          }
        });
      }

      nextRetryAt = new Date(Date.now() + delay);
      console.log(`[Queue] Message ${id} will retry at ${nextRetryAt} (attempt ${newAttempts + 1})`);
    }

    // Update queue item with error
    await prisma.whatsAppMessageQueue.update({
      where: { id },
      data: {
        status: canRetry ? QueueStatus.QUEUED : QueueStatus.FAILED,
        nextRetryAt,
        errorMessage: errorMessage.substring(0, 1000), // Limit error message length
        errorCode,
      },
    });

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

  // Get messages ready to process
  const messages = await getReadyMessages(organizationId, limit);
  console.log(`[Queue] Found ${messages.length} messages to process`);

  // Check for rate-limited accounts and skip their messages
  const now = new Date();
  const rateLimitedAccounts = new Set<string>();
  
  console.log(`[Queue] Processing ${messages.length} ready messages for org ${organizationId}`);

  for (const message of messages) {
    // BUG FIX: Check if nextRetryAt is ACTUALLY in the future. 
    // getReadyMessages should already filter these out, but we check again for safety.
    if (message.whatsappAccountId && message.nextRetryAt && new Date(message.nextRetryAt).getTime() > now.getTime()) {
      rateLimitedAccounts.add(message.whatsappAccountId);
    }
  }

  if (rateLimitedAccounts.size > 0) {
    console.log(`[Queue] Rate-limited accounts detected: ${Array.from(rateLimitedAccounts).join(', ')} - skipping messages for 60 minutes`);
  }

  for (const message of messages) {
    // Skip messages from rate-limited accounts (130429 cooldown)
    if (message.whatsappAccountId && rateLimitedAccounts.has(message.whatsappAccountId)) {
      console.log(`[Queue] Skipping message ${message.id} - account ${message.whatsappAccountId} is in rate limit cooldown`);
      result.skipped++;
      result.results.push({
        queueItemId: message.id,
        success: false,
        error: 'Account rate limited (130429) - skipped for cooldown period',
      });
      continue;
    }

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
  await updateCampaignStatsFromQueue(messages, result.results);

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

  // Update each campaign's stats
  for (const [campaignId, stats] of campaignResults) {
    try {
      // Get current campaign stats
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { stats: true }
      });

      if (!campaign) continue;

      let currentStats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 };
      try {
        currentStats = JSON.parse(campaign.stats || '{}');
      } catch (e) {
        // Keep default stats
      }

      // Update stats with new results
      const updatedStats = {
        ...currentStats,
        totalSent: currentStats.totalSent + stats.succeeded,
        failed: currentStats.failed + stats.failed,
      };

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          stats: JSON.stringify(updatedStats)
        }
      });

      console.log(`[Queue] Updated campaign ${campaignId} stats: +${stats.succeeded} sent, +${stats.failed} failed`);
    } catch (error) {
      console.error(`[Queue] Error updating campaign ${campaignId} stats:`, error);
    }
  }
}

/**
 * Retry a failed message
 */
export async function retryMessage(queueItemId: string): Promise<WhatsAppMessageQueue | null> {
  const queueItem = await prisma.whatsAppMessageQueue.findUnique({
    where: { id: queueItemId },
  });

  if (!queueItem) {
    console.error(`[Queue] Queue item not found: ${queueItemId}`);
    return null;
  }

  if (queueItem.status !== QueueStatus.FAILED) {
    console.error(`[Queue] Cannot retry message ${queueItemId} - status is ${queueItem.status}`);
    return null;
  }

  // Reset for retry
  const updated = await prisma.whatsAppMessageQueue.update({
    where: { id: queueItemId },
    data: {
      status: QueueStatus.QUEUED,
      attempts: 0,
      nextRetryAt: null,
      errorMessage: null,
      errorCode: null,
    },
  });

  console.log(`[Queue] Message ${queueItemId} queued for retry`);
  return updated;
}

/**
 * Retry all failed messages for an organization
 */
export async function retryAllFailed(organizationId: string): Promise<number> {
  const result = await prisma.whatsAppMessageQueue.updateMany({
    where: {
      organizationId,
      status: QueueStatus.FAILED,
    },
    data: {
      status: QueueStatus.QUEUED,
      attempts: 0,
      nextRetryAt: null,
      errorMessage: null,
      errorCode: null,
    },
  });

  console.log(`[Queue] Reset ${result.count} failed messages for retry`);
  return result.count;
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

export type { WhatsAppMessageQueue };
