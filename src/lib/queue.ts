/**
 * WhatsApp Message Queue with Exponential Backoff Retry Logic
 * 
 * This module provides persistent queue management for WhatsApp messages
 * with retry logic, scheduled sending, and bulk operations support.
 */

import { PrismaClient, WhatsAppMessageQueue, Prisma } from '@prisma/client';
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from '@/app/api/whatsapp/messages';

// Initialize Prisma client
const prisma = new PrismaClient();

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
  }>
): Promise<WhatsAppMessageQueue[]> {
  if (messages.length === 0) {
    return [];
  }

  const now = new Date();
  
  // Use createMany for bulk insert - much faster than sequential inserts
  await prisma.whatsAppMessageQueue.createMany({
    data: messages.map(msg => ({
      organizationId,
      recipientPhone: msg.recipientPhone,
      messageContent: msg.messageContent,
      messageType: msg.messageType || MessageType.TEXT,
      campaignId: msg.campaignId,
      contactId: msg.contactId,
      scheduledAt: msg.scheduledAt,
      maxAttempts: RetryConfig.MAX_ATTEMPTS,
      status: msg.scheduledAt && msg.scheduledAt > now
        ? QueueStatus.PENDING
        : QueueStatus.QUEUED,
    })),
  });

  // Fetch the created records to return
  // Use campaignId if available, otherwise use a time-based filter
  const campaignId = messages[0]?.campaignId;
  const queueItems = await prisma.whatsAppMessageQueue.findMany({
    where: campaignId
      ? { campaignId, organizationId }
      : {
          organizationId,
          createdAt: { gte: new Date(now.getTime() - 60000) }, // Last minute
        },
    orderBy: { createdAt: 'asc' },
    take: messages.length,
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
  
  // Get messages that are queued or pending AND (no scheduled time OR scheduled time passed) AND (no retry time OR retry time passed)
  return prisma.whatsAppMessageQueue.findMany({
    where: {
      organizationId,
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
}

/**
 * Process a single message from the queue
 */
export async function processQueueItem(queueItem: WhatsAppMessageQueue): Promise<{
  success: boolean;
  whatsappMessageId?: string;
  error?: string;
}> {
  const { id, organizationId, recipientPhone, messageContent, messageType, attempts } = queueItem;

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

    // Send based on message type
    switch (messageType) {
      case MessageType.TEMPLATE:
        result = await sendTemplateMessage(
          recipientPhone,
          parsedContent.templateName || 'default',
          parsedContent.components || [],
          organizationId,
          parsedContent.language || 'en_US'
        );
        break;
        
      case MessageType.MEDIA:
        result = await sendMediaMessage(
          recipientPhone,
          parsedContent.mediaUrl || '',
          parsedContent.caption || '',
          organizationId
        );
        break;
        
      case MessageType.TEXT:
      default:
        result = await sendTextMessage(
          recipientPhone,
          parsedContent.text || messageContent,
          organizationId
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
      // Calculate next retry with exponential backoff
      const delay = calculateBackoffDelay(attempts);
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
 */
export async function processQueue(
  organizationId: string,
  limit: number = 50
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ queueItemId: string; success: boolean; error?: string }>;
}> {
  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    results: [] as Array<{ queueItemId: string; success: boolean; error?: string }>,
  };

  // Get messages ready to process
  const messages = await getReadyMessages(organizationId, limit);
  console.log(`[Queue] Found ${messages.length} messages to process`);

  for (const message of messages) {
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

  return result;
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
