import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
// Import validatePhoneNumber - it's async so we need to handle it differently
import { prisma } from "@/lib/prisma";
import {
  WhatsAppIncomingMessage,
  parseIncomingMessage,
  checkDuplicateMessage,
  findOrCreateContact,
  storeIncomingMessage,
} from "@/lib/whatsapp-incoming-message";


/**
 * Verify Meta webhook HMAC-SHA256 signature
 * Uses timingSafeEqual to prevent timing attacks
 */
function verifyMetaSignature(payload: string, signature: string | null): boolean {
  if (!signature) {
    console.log("[Webhook Security] No signature header provided");
    return false;
  }

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[Webhook Security] META_APP_SECRET environment variable is not set!");
    return false;
  }

  const expected = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  // Both buffers must be the same length for timingSafeEqual to work
  if (signature.length !== expected.length) {
    console.log("[Webhook Security] Signature length mismatch");
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Simple phone validation for legacy support
function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Redact PII from webhook payloads before logging. Returns a shallow
 * copy of the payload with phone numbers, message bodies, and other
 * customer data masked. Used in non-production environments only.
 */
function redactWebhookPayload(payload: unknown): unknown {
  try {
    const cloned = JSON.parse(JSON.stringify(payload));
    const masked = (s: unknown) =>
      typeof s === 'string' && s.length > 4 ? `${s.slice(0, 2)}***${s.slice(-2)}` : '***';

    for (const entry of cloned?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (!value) continue;
        for (const c of value.contacts ?? []) {
          if (c?.wa_id) c.wa_id = masked(c.wa_id);
          if (c?.profile?.name) c.profile.name = '***';
        }
        for (const m of value.messages ?? []) {
          if (m?.from) m.from = masked(m.from);
          if (m?.text?.body) m.text.body = '***';
          if (m?.image) m.image = { ...m.image, caption: '***' };
          if (m?.button?.text) m.button.text = '***';
          if (m?.interactive) m.interactive = '***';
        }
        for (const s of value.statuses ?? []) {
          if (s?.recipient_id) s.recipient_id = masked(s.recipient_id);
        }
      }
    }
    return cloned;
  } catch {
    return { redacted: true };
  }
}

// Meta sends a GET request with a challenge for webhook verification
 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Get verify token from env
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    // Avoid logging the verify token or challenge payload in production logs.
    console.log("[Webhook Verification] Received verification request", { mode });

    // Security fix: Only allow exact token match - no development bypass
    const tokenMatches = token === verifyToken;

    if (mode === "subscribe" && tokenMatches) {
      console.log("Webhook verified successfully");
      // Return challenge as plain text with correct content-type
      return new Response(challenge, { 
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        }
      });
    }

    console.log("[Webhook Verification] Failed - token mismatch");
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  } catch (error) {
    console.error("Error in webhook verification:", error);
    return NextResponse.json({ error: "Verification error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // SECURITY: Read raw body as text BEFORE parsing JSON for signature verification
    const rawBody = await request.text();
    
    // SECURITY: Get Meta's HMAC-SHA256 signature header
    const signature = request.headers.get("x-hub-signature-256");
    
    // SECURITY: Verify the webhook signature before processing any data.
    //
    // We respond 200 even on bad signatures so Meta does not retry the
    // payload (Meta retries on non-2xx and will eventually disable the
    // webhook). The request is silently dropped without further work.
    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn("[Webhook Security] Invalid signature - dropping payload silently");
      return NextResponse.json({ success: true });
    }

    // ✅ CRITICAL: Acknowledge immediately before any processing
    // Meta requires 200 OK within 5 seconds or it will retry
    // webhook. The request is silently dropped without further work.
    const ackResponse = NextResponse.json({ success: true });
    
    // Process webhook asynchronously - don't await to avoid blocking response
    processWebhookAsync(rawBody).catch(err => {
      console.error('[Webhook Processing] Background task failed:', err);
    });
    
    return ackResponse;
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * Process webhook payload asynchronously after acknowledgment
 * This runs in the background and doesn't block the 200 response
 */
async function processWebhookAsync(rawBody: string): Promise<void> {
  try {
    // Now parse the JSON after signature verification
    const payload = JSON.parse(rawBody);
    
    // Avoid logging the raw webhook payload — it may contain customer
    // phone numbers, message content, and other PII. Log a redacted
    // shape instead.
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[WhatsApp Webhook] Received payload (redacted):',
        JSON.stringify(redactWebhookPayload(payload), null, 2),
      );
    } else {
      console.log('[WhatsApp Webhook] Received payload',
        { object: payload?.object, entries: payload?.entry?.length ?? 0 });
    }

    // Handle Meta WhatsApp Cloud API webhook format
    if (payload.object === "whatsapp_business_account") {
      await handleMetaWebhook(payload);
      return;
    }

    // Handle custom payload format (legacy support)
    const { status, messageId, timestamp, recipient, campaignId } = payload;

    if (!status || !messageId || !timestamp || !recipient) {
      console.log("[WhatsApp Webhook] Missing required fields in legacy payload");
      return;
    }

    const allowedStatuses = ["sent", "delivered", "read", "failed"];
    if (!allowedStatuses.includes(status)) {
      console.log("[WhatsApp Webhook] Invalid status value");
      return;
    }

    if (!isValidPhoneNumber(recipient)) {
      console.log("[WhatsApp Webhook] Invalid recipient phone number");
      return;
    }

    const isoTimestamp = new Date(timestamp).toISOString();
    if (isoTimestamp === "Invalid Date") {
      console.log("[WhatsApp Webhook] Invalid timestamp format");
      return;
    }

    console.log(`Message status updated: ${messageId} - ${status}`);

    // Handle inbound message (legacy format)
    if (payload.type === "inbound") {
      const { from, messageId, timestamp, type, content } = payload;
      if (!from || !messageId || !timestamp || !type || !content) {
        console.log("[WhatsApp Webhook] Missing required fields for inbound message");
        return;
      }

      if (!isValidPhoneNumber(from)) {
        console.log("[WhatsApp Webhook] Invalid sender phone number");
        return;
      }

      console.log(`Inbound message received from ${from}: ${content}`);
    }

    // Find existing message by whatsappMessageId using findFirst
    const existingMessage = await prisma.message.findFirst({
      where: { whatsappMessageId: messageId }
    });

    // Resolve organization context so status updates never cross tenant boundaries.
    let organizationIdForLookup: string | null = existingMessage?.organizationId || null;
    if (!organizationIdForLookup && campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { organizationId: true },
      });
      organizationIdForLookup = campaign?.organizationId || null;
    }
    if (!organizationIdForLookup) {
      const queueItem = await prisma.whatsAppMessageQueue.findFirst({
        where: { whatsappMessageId: messageId },
        select: { organizationId: true },
      });
      organizationIdForLookup = queueItem?.organizationId || null;
    }

    if (existingMessage && existingMessage.status === status) {
      console.log(`Duplicate event detected for message ${messageId}`);
      return;
    }

    if (existingMessage && new Date(existingMessage.updatedAt) > new Date(timestamp)) {
      console.log(`Out-of-order update detected for message ${messageId}`);
      return;
    }

    const timestampDate = new Date(timestamp);
    if (isNaN(timestampDate.getTime())) {
      console.log("[WhatsApp Webhook] Invalid timestamp format");
      return;
    }

    const currentTime = new Date();
    const timeDifference = Math.abs(currentTime.getTime() - timestampDate.getTime());
    const MAX_TIME_DIFFERENCE = 5 * 60 * 1000;

    if (timeDifference > MAX_TIME_DIFFERENCE) {
      console.warn(`Potential replay attack detected for message ${messageId}`);
      return;
    }

    // Find contact - don't create if not exists
    const contact = await prisma.contact.findFirst({
      where: organizationIdForLookup
        ? { phoneNumber: recipient, organizationId: organizationIdForLookup }
        : { phoneNumber: recipient }
    });

    if (!contact) {
      console.log(`Contact not found for status update: ${recipient}`);
      return;
    }

    // Update or create message
    if (existingMessage) {
      await prisma.message.update({
        where: { id: existingMessage.id },
        data: {
          status: status,
          updatedAt: new Date(timestamp)
        }
      });
    } else {
      // Get organizationId from campaign if available, otherwise use contact's organizationId
      let messageOrgId: string | undefined = contact.organizationId ?? undefined;
      if (!messageOrgId && campaignId) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { organizationId: true }
        });
        messageOrgId = campaign?.organizationId ?? undefined;
      }
      
      // Only create message if we have an organizationId
      if (messageOrgId) {
        await prisma.message.create({
          data: {
            whatsappMessageId: messageId,
            status: status,
            content: JSON.stringify({ text: "Status update" }),
            direction: "outgoing",
            contactId: contact.id,
            campaignId: campaignId || undefined,
            organizationId: messageOrgId,
            stats: JSON.stringify({ totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }),
          }
        });
      }
    }

    if (campaignId) {
      const campaignMessages = await prisma.message.findMany({
        where: { campaignId: campaignId }
      });

      const allDelivered = campaignMessages.every(msg => msg.status === "delivered");
      const anyFailed = campaignMessages.some(msg => msg.status === "failed");

      let campaignStatus = "running";
      if (allDelivered) {
        campaignStatus = "completed";
      } else if (anyFailed) {
        campaignStatus = "failed";
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: campaignStatus }
      });

      // Update campaign stats JSON
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { stats: true }
        });

        if (campaign) {
          let stats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 };
          try {
            stats = JSON.parse(campaign.stats || '{}');
          } catch (e) {}

          if (status === "delivered") stats.delivered = (stats.delivered || 0) + 1;
          if (status === "read") {
            stats.read = (stats.read || 0) + 1;
            // If it's read, it must have been delivered too, but usually Meta sends both events.
            // We only increment read here.
          }
          if (status === "failed") stats.failed = (stats.failed || 0) + 1;

          await prisma.campaign.update({
            where: { id: campaignId },
            data: { stats: JSON.stringify(stats) }
          });
        }
      } catch (statsError) {
        console.error("[WhatsApp Webhook] Error updating campaign stats (legacy):", statsError);
      }
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook async:", error);
    throw error; // Re-throw to ensure error is caught by caller
  }
}

/**
 * Handle Meta WhatsApp Cloud API webhook format
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
async function handleMetaWebhook(payload: any): Promise<NextResponse> {
  try {
    const { entry } = payload;

    if (!entry || !Array.isArray(entry) || entry.length === 0) {
      return NextResponse.json({ success: true, message: "No entries in payload" });
    }

    const results: { success: boolean; messageId?: string; type?: string; status?: string; error?: string }[] = [];

    for (const entryItem of entry) {
      if (!entryItem.changes || !Array.isArray(entryItem.changes)) {
        continue;
      }

      for (const change of entryItem.changes) {
        const { value } = change;

        if (!value) continue;

        // Handle messages (incoming messages from users)
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            try {
              const result = await processIncomingMessage(value, message);
              results.push(result);
            } catch (error: any) {
              console.error("[WhatsApp Webhook] Error processing message:", error.message);
              results.push({ success: false, error: error.message });
            }
          }
        }

        // Handle status updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            try {
              const result = await processStatusUpdate(value, status);
              results.push(result);
            } catch (error: any) {
              console.error("[WhatsApp Webhook] Error processing status:", error.message);
              results.push({ success: false, error: error.message });
            }
          }
        }
      }
    }

    const hasErrors = results.some((r: any) => !r.success);
    if (hasErrors) {
      console.log("[WhatsApp Webhook] Some messages had errors:", results);
    }

    return NextResponse.json({ success: true, processed: results.length });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error handling Meta webhook:", error);
    return NextResponse.json(
      { error: "Failed to process Meta webhook", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Process an incoming message from a WhatsApp user
 */
async function processIncomingMessage(
  value: any,
  message: WhatsAppIncomingMessage
): Promise<{ success: boolean; messageId?: string; type?: string; error?: string }> {
  const { from, id, timestamp } = message;

  console.log(`[WhatsApp Webhook] Processing incoming message: ${id} from ${from}`);

  // Validate required fields
  if (!from || !id || !timestamp) {
    throw new Error("Missing required message fields: from, id, or timestamp");
  }

  // Extract organization ID from webhook metadata
  let organizationId: string | null = null;
  const metaPhoneNumberId = value.metadata?.phone_number_id;
  if (metaPhoneNumberId) {
    // Look up the organization that owns this Meta phone number id.
    const phoneNumber = await prisma.whatsAppPhoneNumber.findFirst({
      where: {
        OR: [
          { metaPhoneNumberId },
          { id: metaPhoneNumberId },
        ],
      },
      include: { credential: true },
    });
    organizationId = phoneNumber?.credential?.organizationId || null;
  }

  if (!organizationId) {
    console.error(`[WhatsApp Webhook] Could not determine organization for phone number ${value.metadata?.phone_number_id}`);
    return { success: false, error: "Could not determine organization" };
  }

  console.log(`[WhatsApp Webhook] Message belongs to organization: ${organizationId}`);

  // Check for duplicate messages (replay protection)
  const { isDuplicate, existingMessage } = await checkDuplicateMessage(id);
  if (isDuplicate) {
    console.log(`[WhatsApp Webhook] Duplicate message detected: ${id}`);
    return { success: true, messageId: id, type: message.type };
  }

  // Parse the message content based on type
  const parsedContent = await parseIncomingMessage(message, organizationId);

  // Check for opt-out keywords in text messages.
  //
  // We use a strict, anchored match to avoid false positives. Words
  // like "cancel" or "quit" are common in unrelated business messages
  // (e.g. "I want to cancel my appointment") and should not be treated
  // as opt-outs. WhatsApp / Meta documentation specifies STOP /
  // UNSUBSCRIBE / OPT-OUT as the canonical keywords.
  const trimmedText = parsedContent.text?.trim() ?? '';
  let optOutDetected = false;
  if (trimmedText && /^(stop|unsubscribe|opt[\s-]?out)$/i.test(trimmedText)) {
    console.log(`[WhatsApp Webhook] Opt-out detected from ${from}`);
    await prisma.contact.updateMany({
      where: { phoneNumber: from, organizationId },
      data: {
        optInStatus: 'opted_out',
        optOutAt: new Date(),
        optInSource: 'whatsapp_stop_reply',
      }
    });
    optOutDetected = true;
  }

  // Check for system messages indicating opt-out
  if (message.type === 'system' && message.system?.type === 'user_changed_number') {
    console.log(`[WhatsApp Webhook] System opt-out detected from ${from}`);
    await prisma.contact.updateMany({
      where: { phoneNumber: from, organizationId },
      data: { optInStatus: 'opted_out' }
    });
  }

  // Find or create the contact with organization context
  const contact = await findOrCreateContact(from, organizationId);

  // Stamp lastInboundAt so the messaging policy gate can apply the
  // Meta 24-hour customer-care window correctly to subsequent freeform
  // sends. We use the message timestamp (Meta returns Unix seconds)
  // rather than `Date.now()` so out-of-order webhooks don't move the
  // window backwards spuriously.
  const inboundAt = new Date(Number(timestamp) * 1000);
  if (!Number.isNaN(inboundAt.getTime())) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        lastInboundAt: inboundAt,
        lastContacted: inboundAt,
      },
    }).catch((err) => {
      console.error('[WhatsApp Webhook] Failed to stamp lastInboundAt:', err);
    });
  }

  // Store the message in the database
  const storedMessage = await storeIncomingMessage(
    contact.id,
    id,
    parsedContent,
    timestamp
  );

  // Broadcast new incoming message to WebSocket clients
  try {
    const { broadcastToInbox } = await import("@/lib/websocket");
    broadcastToInbox(organizationId, 'new-message', {
      messageId: storedMessage.id,
      contactId: contact.id,
      content: {
        text: parsedContent.text || parsedContent.caption || "",
        type: parsedContent.type,
        mediaUrl: parsedContent.mediaUrl,
        mediaType: parsedContent.mediaType,
        caption: parsedContent.caption,
        filename: parsedContent.filename,
        interactive: parsedContent.interactive,
        location: parsedContent.location
      },
      status: "delivered",
      direction: "incoming",
      sender: {
        id: null,
        name: contact.firstName ? `${contact.firstName} ${contact.lastName || ""}`.trim() : from
      },
      createdAt: storedMessage.createdAt
    });
  } catch (broadcastError) {
    console.error('[WhatsApp Webhook] Failed to broadcast incoming message:', broadcastError);
  }

  // Note: we deliberately do NOT send a read receipt to Meta here. Meta
  // only supports marking a message as "read" (which shows blue ticks to
  // the customer), and an inbound message has not actually been read until
  // an operator opens the conversation. The read receipt is sent from the
  // inbox PATCH (mark-as-read) handler instead.

  // If the customer just opted out, send them a one-shot confirmation
  // reply ("You have been unsubscribed..."). This is permitted under
  // Meta's policy as a transactional response and is best-practice for
  // suppression lists. We send it within the 24-hour window because
  // they just messaged us, so a freeform reply is allowed.
  if (optOutDetected) {
    try {
      const { sendTextMessage } = await import("@/app/api/whatsapp/messages");
      await sendTextMessage(
        from,
        "You have been unsubscribed from this WhatsApp business account. " +
          "You will no longer receive messages from us. " +
          "Reply START at any time to opt back in.",
        organizationId,
      );
    } catch (err) {
      console.error('[WhatsApp Webhook] Failed to send opt-out confirmation:', err);
    }
  }

  // If the customer sent START / UNSTOP / RESUBSCRIBE, treat as
  // re-opt-in.
  if (trimmedText && /^(start|unstop|resubscribe|opt[\s-]?in)$/i.test(trimmedText)) {
    console.log(`[WhatsApp Webhook] Opt-in detected from ${from}`);
    await prisma.contact.updateMany({
      where: { phoneNumber: from, organizationId },
      data: {
        optInStatus: 'opted_in',
        optInAt: new Date(),
        optInSource: 'whatsapp_start_reply',
      }
    });
  }

  console.log(`[WhatsApp Webhook] Successfully stored incoming message: ${id}`);

  return {
    success: true,
    messageId: id,
    type: message.type,
  };
}

/**
 * Process a status update (sent, delivered, read, failed)
 */
async function processStatusUpdate(
  value: any,
  status: any
): Promise<{ success: boolean; messageId?: string; status?: string }> {
  const { id, status: messageStatus, timestamp } = status;

  if (!id || !messageStatus) {
    throw new Error("Missing required status fields: id or status");
  }

  console.log(`[WhatsApp Webhook] Processing status update: ${id} - ${messageStatus}`);

  // Find existing message
  const existingMessage = await prisma.message.findFirst({
    where: { whatsappMessageId: id },
  });

  if (!existingMessage) {
    console.log(`[WhatsApp Webhook] Message not found for status update: ${id}`);
    return { success: true, messageId: id, status: messageStatus };
  }

  // Check if status is already updated (ignore duplicates)
  if (existingMessage.status === messageStatus) {
    console.log(`[WhatsApp Webhook] Duplicate status update: ${id} - ${messageStatus}`);
    return { success: true, messageId: id, status: messageStatus };
  }

  // Update the message status
  await prisma.message.update({
    where: { id: existingMessage.id },
    data: {
      status: messageStatus,
      updatedAt: new Date(timestamp * 1000),
    },
  });

  const queueStatus =
    messageStatus === "failed"
      ? "failed"
      : messageStatus === "sent"
        ? "sent"
        : messageStatus === "delivered" || messageStatus === "read"
          ? "delivered"
          : null;

  if (queueStatus) {
    await prisma.whatsAppMessageQueue.updateMany({
      where: { whatsappMessageId: id },
      data: {
        status: queueStatus,
        ...(queueStatus === "delivered"
          ? { deliveredAt: new Date(timestamp * 1000) }
          : {}),
      },
    });
  }

  // If it's a campaign message, update campaign stats
  if (existingMessage.campaignId) {
    await updateCampaignStats(existingMessage.campaignId, messageStatus);
    await updateCampaignStatus(existingMessage.campaignId);
  }

  console.log(`[WhatsApp Webhook] Status updated: ${id} - ${messageStatus}`);

  return {
    success: true,
    messageId: id,
    status: messageStatus,
  };
}

/**
 * Update campaign stats (delivered, read, failed)
 */
async function updateCampaignStats(campaignId: string, status: string): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { stats: true }
    });

    if (!campaign) return;

    let stats = { totalSent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 };
    try {
      stats = JSON.parse(campaign.stats || '{}');
    } catch (e) {
      // Use defaults
    }

    if (status === "delivered") stats.delivered = (stats.delivered || 0) + 1;
    else if (status === "read") stats.read = (stats.read || 0) + 1;
    else if (status === "failed") stats.failed = (stats.failed || 0) + 1;
    else return; // Other statuses don't affect these counters

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        stats: JSON.stringify(stats)
      }
    });

    console.log(`[WhatsApp Webhook] Campaign ${campaignId} stats updated for status: ${status}`);
  } catch (error) {
    console.error(`[WhatsApp Webhook] Error updating campaign stats:`, error);
  }
}

/**
 * Update campaign status based on message statuses
 */
async function updateCampaignStatus(campaignId: string): Promise<void> {
  try {
    const campaignMessages = await prisma.message.findMany({
      where: { campaignId },
    });

    if (campaignMessages.length === 0) return;

    const allDelivered = campaignMessages.every((msg) => msg.status === "delivered");
    const allRead = campaignMessages.every((msg) => msg.status === "read");
    const anyFailed = campaignMessages.some((msg) => msg.status === "failed");

    let campaignStatus = "running";
    if (allRead) {
      campaignStatus = "completed";
    } else if (allDelivered) {
      campaignStatus = "completed";
    } else if (anyFailed) {
      campaignStatus = "failed";
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: campaignStatus },
    });

    console.log(`[WhatsApp Webhook] Campaign ${campaignId} status updated to: ${campaignStatus}`);
  } catch (error: any) {
    console.error(`[WhatsApp Webhook] Error updating campaign status:`, error);
  }
}
