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
  sendMessageAck,
} from "@/lib/whatsapp-incoming-message";

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "default_secret";

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

// Meta sends a GET request with a challenge for webhook verification
 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Get verify token from env
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    // Debug: Log what we received
    console.log("[Webhook Verification] Received:", { mode, token, challenge });
    console.log("[Webhook Verification] Checking token...");

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
    
    // SECURITY: Verify the webhook signature before processing any data
    if (!verifyMetaSignature(rawBody, signature)) {
      console.log("[Webhook Security] Invalid signature - rejecting request");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }

    // ✅ CRITICAL: Acknowledge immediately before any processing
    // Meta requires 200 OK within 5 seconds or it will retry the webhook
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
    
    // Log the full payload for debugging
    console.log("[WhatsApp Webhook] Received payload:", JSON.stringify(payload, null, 2));

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
      where: { phoneNumber: recipient }
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
            organizationId: messageOrgId
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
  if (value.metadata?.phone_number_id) {
    // Look up the organization that owns this phone number
    const phoneNumber = await prisma.whatsAppPhoneNumber.findUnique({
      where: { id: value.metadata.phone_number_id },
      include: { credential: true }
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

  // Check for opt-out keywords in text messages
  if (parsedContent.text && parsedContent.text.match(/stop|unsubscribe|opt.?out|quit|cancel/i)) {
    console.log(`[WhatsApp Webhook] Opt-out detected from ${from}: ${parsedContent.text}`);
    await prisma.contact.updateMany({
      where: { phoneNumber: from, organizationId },
      data: { optInStatus: 'opted_out' }
    });
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

  // Store the message in the database
  const storedMessage = await storeIncomingMessage(
    contact.id,
    id,
    parsedContent,
    timestamp
  );

  // Send acknowledgment (read receipt) to Meta
  await sendMessageAck(id, "delivered", organizationId);

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
      data: { stats: JSON.stringify(stats) }
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
