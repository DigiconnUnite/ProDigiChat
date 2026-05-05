import { NextRequest, NextResponse } from 'next/server';
import { processQueue, retryMessage, retryAllFailed, cancelMessage, cleanupOldMessages } from '@/lib/queue';
import { requireOrg } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { withLock } from '@/lib/distributed-lock';

export async function POST(request: NextRequest) {
  // All actions on the queue require manager+; the organizationId is
  // always derived from the JWT, never from the body or query string.
  const auth = await requireOrg(request, 'manager');
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  try {
    const searchParams = request.nextUrl.searchParams;
    const body = await request.json().catch(() => ({}));
    const action = searchParams.get('action') || body.action;

    switch (action) {
      case 'process': {
        // Process messages in the queue. Uses the same per-org lock
        // as the cron tick so manual triggers cannot fan out
        // duplicate sends if a cron run is already in progress.
        const limit = parseInt(searchParams.get('limit') || body.limit || '50');
        const lockResult = await withLock(
          `cron:queue:${organizationId}`,
          2 * 60 * 1000,
          async () => processQueue(organizationId, limit),
        );
        if (!lockResult.ran) {
          return NextResponse.json(
            {
              success: false,
              error: 'Queue is already being processed by another worker. Try again in a few seconds.',
            },
            { status: 409 },
          );
        }
        return NextResponse.json({
          success: true,
          action: 'process',
          ...lockResult.value,
        });
      }

      case 'retry': {
        // Retry a specific failed message
        const queueItemId = body.queueItemId;

        if (!queueItemId) {
          return NextResponse.json(
            { error: 'queueItemId is required' },
            { status: 400 }
          );
        }

        // Ensure the queue item belongs to the caller's organization
        const owned = await prisma.whatsAppMessageQueue.findFirst({
          where: { id: queueItemId, organizationId },
          select: { id: true },
        });
        if (!owned) {
          return NextResponse.json(
            { error: 'Queue item not found in this organization' },
            { status: 404 }
          );
        }

        const result = await retryMessage(queueItemId);
        
        if (!result) {
          return NextResponse.json(
            { error: 'Failed to retry message - not found or not in failed status' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'retry',
          queueItem: result,
        });
      }

      case 'retryAll': {
        // Retry all failed messages
        const count = await retryAllFailed(organizationId);
        
        return NextResponse.json({
          success: true,
          action: 'retryAll',
          count,
        });
      }

      case 'cancel': {
        // Cancel a queued message
        const queueItemId = body.queueItemId;

        if (!queueItemId) {
          return NextResponse.json(
            { error: 'queueItemId is required' },
            { status: 400 }
          );
        }

        // Ensure the queue item belongs to the caller's organization
        const owned = await prisma.whatsAppMessageQueue.findFirst({
          where: { id: queueItemId, organizationId },
          select: { id: true },
        });
        if (!owned) {
          return NextResponse.json(
            { error: 'Queue item not found in this organization' },
            { status: 404 }
          );
        }

        const result = await cancelMessage(queueItemId);
        
        if (!result) {
          return NextResponse.json(
            { error: 'Failed to cancel message - not found or already sent' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'cancel',
          queueItem: result,
        });
      }

      case 'cleanup': {
        // Cleanup old processed messages
        const daysOld = parseInt(searchParams.get('daysOld') || body.daysOld || '30');
        const count = await cleanupOldMessages(organizationId, daysOld);
        
        return NextResponse.json({
          success: true,
          action: 'cleanup',
          deletedCount: count,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process, retry, retryAll, cancel, cleanup' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Queue Process API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process queue' },
      { status: 500 }
    );
  }
}
