import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { processQueue, retryMessage, retryAllFailed, cancelMessage, cleanupOldMessages } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // BUG FIX: Parse body once - request.json() can only be read once in Next.js
    const body = await request.json().catch(() => ({}));
    const action = searchParams.get('action') || body.action;
    
    // Get organization ID from session or body
    let organizationId = searchParams.get('organizationId') || session.user.organizationId || body.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    switch (action) {
      case 'process': {
        // Process messages in the queue
        const limit = parseInt(searchParams.get('limit') || body.limit || '50');
        const result = await processQueue(organizationId, limit);
        
        return NextResponse.json({
          success: true,
          action: 'process',
          ...result,
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
