import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMessageContent, stringifyMessageContent } from '@/types/common';
import { findOrCreateContact } from '@/lib/whatsapp-incoming-message';

// POST /api/webhooks/whatsapp - Handle WhatsApp webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WhatsApp Webhook] Received webhook:', JSON.stringify(body, null, 2));

    // Handle webhook verification (Meta sends a GET request for verification)
    if (request.method === 'GET') {
      const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');
      const challenge = request.nextUrl.searchParams.get('hub.challenge');

      if (verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
        return new NextResponse(challenge);
      }

      return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
    }

    // Process webhook events
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'messages') {
            const messages = change.value.messages || [];

            for (const message of messages) {
              await processIncomingMessage(message, change.value.metadata);
            }
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

// GET /api/webhooks/whatsapp - Webhook verification
export async function GET(request: NextRequest) {
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge);
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

async function processIncomingMessage(message: any, metadata: any) {
  try {
    const phoneNumber = message.from;
    const organizationId = metadata.phone_number_id;

    // Find or create contact
    const contact = await findOrCreateContact(phoneNumber, organizationId);

    if (!contact) {
      console.error('[WhatsApp Webhook] Failed to find or create contact');
      return;
    }

    // Parse message content
    let content: any = { text: '' };

    if (message.type === 'text') {
      content = { text: message.text.body, type: 'text' };
    } else if (message.type === 'image') {
      content = {
        type: 'image',
        mediaUrl: message.image.id,
        caption: message.image.caption || ''
      };
    } else if (message.type === 'video') {
      content = {
        type: 'video',
        mediaUrl: message.video.id,
        caption: message.video.caption || ''
      };
    } else if (message.type === 'document') {
      content = {
        type: 'document',
        mediaUrl: message.document.id,
        filename: message.document.filename || ''
      };
    } else if (message.type === 'audio') {
      content = {
        type: 'audio',
        mediaUrl: message.audio.id
      };
    }

    // Save message to database
    await prisma.message.create({
      data: {
        contactId: contact.id,
        direction: 'incoming',
        status: 'received',
        content: stringifyMessageContent(content),
        whatsappMessageId: message.id,
        organizationId: contact.organizationId,
        stats: JSON.stringify({ totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }),
      }
    });

    // Update contact's last contacted time
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContacted: new Date() }
    });

    console.log('[WhatsApp Webhook] Message processed successfully');
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing message:', error);
  }
}
