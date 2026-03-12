import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addToQueue, addBulkToQueue, getQueueStats, getQueueByStatus, QueueStatus } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      recipientPhone, 
      messageContent, 
      messageType,
      campaignId,
      contactId,
      scheduledAt,
      bulkMessages 
    } = body;

    // Get organization ID from session or body
    const organizationId = body.organizationId || session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

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
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId') || session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

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
