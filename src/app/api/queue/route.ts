import { NextRequest, NextResponse } from 'next/server';
import { addToQueue, addBulkToQueue, getQueueStats, getQueueByStatus } from '@/lib/queue';
import { requireOrg } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Authorization: caller must be an active member of an organization
  // and have role >= member to enqueue messages. The organizationId is
  // always derived from the JWT — never from the request body.
  const auth = await requireOrg(request, 'member');
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  try {
    const body = await request.json();
    const {
      recipientPhone,
      messageContent,
      messageType,
      campaignId,
      contactId,
      scheduledAt,
      bulkMessages,
    } = body;

    // Handle bulk message addition
    if (bulkMessages && Array.isArray(bulkMessages)) {
      const queueItems = await addBulkToQueue(
        organizationId,
        bulkMessages.map((msg: any) => ({
          recipientPhone: msg.recipientPhone,
          messageContent: msg.messageContent,
          campaignId: msg.campaignId || campaignId,
          contactId: msg.contactId || contactId,
          messageType: msg.messageType || messageType,
          scheduledAt: msg.scheduledAt ? new Date(msg.scheduledAt) : scheduledAt ? new Date(scheduledAt) : undefined,
        }))
      );

      return NextResponse.json({
        success: true,
        count: queueItems.length,
        queueItems,
      });
    }

    // Handle single message addition
    if (!recipientPhone || !messageContent) {
      return NextResponse.json(
        { error: 'recipientPhone and messageContent are required' },
        { status: 400 }
      );
    }

    const queueItem = await addToQueue(
      organizationId,
      recipientPhone,
      messageContent,
      {
        campaignId,
        contactId,
        messageType,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      queueItem,
    });
  } catch (error: any) {
    console.error('[Queue API] Error adding to queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add to queue' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Read access is open to all org members; we still ignore any
  // organizationId in the query string and use the session-derived value.
  const auth = await requireOrg(request, 'viewer');
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // If status is provided, get queue items by status
    if (status) {
      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      const queueItems = await getQueueByStatus(organizationId, status, limit, offset);
      
      return NextResponse.json({
        success: true,
        status,
        count: queueItems.length,
        queueItems,
      });
    }

    // Otherwise, get queue statistics
    const stats = await getQueueStats(organizationId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[Queue API] Error getting queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue' },
      { status: 500 }
    );
  }
}
