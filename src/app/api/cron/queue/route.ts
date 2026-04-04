import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/queue';
import { prisma } from '@/lib/prisma';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Background job endpoint for processing WhatsApp message queue
 * 
 * This endpoint should be called periodically (e.g., every minute) via cron job
 * to process queued messages and handle retries with exponential backoff.
 * 
 * Cron URL: /api/cron/queue (requires Bearer token auth)
 * 
 * Recommended cron schedule: Every 1-5 minutes
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret via Bearer token for security
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron Queue] Unauthorized cron attempt');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startTime = Date.now();
    console.log('[Cron Queue] Starting queue processing...');

    // Get all organizations with queued/pending work or retryable failures
    const retryCutoff = new Date(Date.now() - RETRY_WINDOW_MS);
    const organizationsWithQueues = await prisma.whatsAppMessageQueue.findMany({
      where: {
        OR: [
          {
            status: { in: ['queued', 'pending'] },
            AND: [
              {
                OR: [
                  { scheduledAt: null },
                  { scheduledAt: { lte: new Date() } },
                ],
              },
              {
                OR: [
                  { nextRetryAt: null },
                  { nextRetryAt: { lte: new Date() } },
                ],
              },
            ],
          },
          {
            status: 'failed',
            attempts: { lt: MAX_RETRY_ATTEMPTS },
            updatedAt: { gte: retryCutoff },
          },
        ],
      },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    console.log(`[Cron Queue] Found ${organizationsWithQueues.length} organizations with pending messages`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      organizationsProcessed: 0,
      errors: [] as string[],
    };

    // Process each organization's queue
    for (const org of organizationsWithQueues) {
      try {
        // Retry only recent failures that still have attempts remaining.
        const retried = await prisma.whatsAppMessageQueue.updateMany({
          where: {
            organizationId: org.organizationId,
            status: 'failed',
            attempts: { lt: MAX_RETRY_ATTEMPTS },
            updatedAt: { gte: retryCutoff },
          },
          data: {
            status: 'queued',
            nextRetryAt: null,
          },
        });
        results.retried += retried.count;

        // Then process the queue
        const processResult = await processQueue(org.organizationId, 50);
        
        results.processed += processResult.processed;
        results.succeeded += processResult.succeeded;
        results.failed += processResult.failed;
        results.organizationsProcessed++;

        console.log(`[Cron Queue] Organization ${org.organizationId}: ${processResult.succeeded}/${processResult.processed} succeeded`);

      } catch (error: any) {
        console.error(`[Cron Queue] Error processing org ${org.organizationId}:`, error);
        results.errors.push(`Org ${org.organizationId}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron Queue] Completed in ${duration}ms. Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    });

  } catch (error: any) {
    console.error('[Cron Queue] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Queue processing failed' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
