import axios from "axios";
import { prisma } from "@/lib/prisma";
import { META_API_BASE } from "./meta-config";

// Import auth functions - adjust path based on file location
let getWhatsAppCredentials: any = null;

// Dynamic import to avoid circular dependencies
async function loadAuth() {
  if (!getWhatsAppCredentials) {
    try {
      const auth = await import("../app/api/whatsapp/auth");
      getWhatsAppCredentials = auth.getWhatsAppCredentials;
    } catch (e) {
      console.error("[WhatsApp] Failed to load auth module:", e);
    }
  }
  return getWhatsAppCredentials;
}

// Types for incoming WhatsApp messages
export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    voice: boolean;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename?: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  reaction?: {
    message_id: string;
    emoji: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  system?: {
    body?: string;
    identity?: string;
    new_wa_id?: string;
    wa_id?: string;
    type?: string;
    customer?: string;
  };
  contacts?: any[];
}

export interface ParsedMessageContent {
  type: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
  interactive?: {
    type: string;
    id?: string;
    title?: string;
    description?: string;
    payload?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: any[];
  raw: any;
}

/**
 * Download media from WhatsApp Meta API
 */
export async function downloadMedia(mediaId: string, organizationId?: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const getCreds = await loadAuth();
    if (!getCreds) {
      console.error("[WhatsApp] Failed to load auth module");
      return null;
    }
    
    const orgId = organizationId;
    if (!orgId) throw new Error("No organization Id provided for media download");
    const credentials = await getCreds(orgId);
    
    if (!credentials?.apiKey) {
      console.error("[WhatsApp] No credentials found for media download");
      return null;
    }

    // Step 1: Get the media URL from Meta
    const mediaInfoResponse = await axios.get(
      `${META_API_BASE}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      }
    );

    const mediaUrl = mediaInfoResponse.data.url;
    const mimeType = mediaInfoResponse.data.mime_type || "application/octet-stream";

    if (!mediaUrl) {
      console.error("[WhatsApp] No media URL found in response");
      return null;
    }

    // Step 2: Download the actual media content
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      responseType: "arraybuffer",
    });

    // Step 3: Upload to our storage and return the URL
    // For now, we'll create a data URL (base64) for small files
    // In production, you'd want to upload to S3/cloud storage
    const base64Media = Buffer.from(mediaResponse.data).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Media}`;

    return {
      url: dataUrl,
      mimeType,
    };
  } catch (error: any) {
    console.error("[WhatsApp] Error downloading media:", error.message);
    return null;
  }
}

/**
 * Parse incoming WhatsApp message based on type
 */
export async function parseIncomingMessage(
  message: WhatsAppIncomingMessage,
  organizationId?: string
): Promise<ParsedMessageContent> {
  const baseContent: ParsedMessageContent = {
    type: message.type,
    raw: message,
  };

  switch (message.type) {
    case "text":
      return {
        ...baseContent,
        text: message.text?.body || "",
      };

    case "image":
      if (message.image?.id) {
        const media = await downloadMedia(message.image.id, organizationId);
        return {
          ...baseContent,
          mediaId: message.image.id,
          mediaUrl: media?.url,
          mediaType: message.image.mime_type,
          caption: message.image.caption,
        };
      }
      return {
        ...baseContent,
        caption: message.image?.caption,
      };

    case "audio":
      if (message.audio?.id) {
        const media = await downloadMedia(message.audio.id, organizationId);
        return {
          ...baseContent,
          mediaId: message.audio.id,
          mediaUrl: media?.url,
          mediaType: message.audio.mime_type,
        };
      }
      return baseContent;

    case "video":
      if (message.video?.id) {
        const media = await downloadMedia(message.video.id, organizationId);
        return {
          ...baseContent,
          mediaId: message.video.id,
          mediaUrl: media?.url,
          mediaType: message.video.mime_type,
          caption: message.video.caption,
        };
      }
      return {
        ...baseContent,
        caption: message.video?.caption,
      };

    case "document":
      if (message.document?.id) {
        const media = await downloadMedia(message.document.id, organizationId);
        return {
          ...baseContent,
          mediaId: message.document.id,
          mediaUrl: media?.url,
          mediaType: message.document.mime_type,
          filename: message.document.filename,
        };
      }
      return {
        ...baseContent,
        filename: message.document?.filename,
      };

    case "button":
      return {
        ...baseContent,
        text: message.button?.text,
        interactive: {
          type: "button",
          payload: message.button?.payload || "",
        },
      };

    case "interactive":
      if (message.interactive?.type === "button_reply") {
        return {
          ...baseContent,
          interactive: {
            type: "button_reply",
            id: message.interactive.button_reply?.id,
            title: message.interactive.button_reply?.title,
          },
        };
      } else if (message.interactive?.type === "list_reply") {
        return {
          ...baseContent,
          interactive: {
            type: "list_reply",
            id: message.interactive.list_reply?.id,
            title: message.interactive.list_reply?.title,
            description: message.interactive.list_reply?.description,
          },
        };
      }
      return baseContent;

    case "reaction":
      return {
        ...baseContent,
        text: `${message.reaction?.emoji || ""} reaction`,
      };

    case "location":
      return {
        ...baseContent,
        location: {
          latitude: message.location?.latitude || 0,
          longitude: message.location?.longitude || 0,
          name: message.location?.name,
          address: message.location?.address,
        },
        text: `Location: ${message.location?.latitude}, ${message.location?.longitude}`,
      };

    case "contacts":
      return {
        ...baseContent,
        contacts: message.contacts,
        text: "Contact shared",
      };

    default:
      return {
        ...baseContent,
        text: `Unsupported message type: ${message.type}`,
      };
  }
}

/**
 * Check for duplicate messages (replay protection)
 */
export async function checkDuplicateMessage(
  whatsappMessageId: string
): Promise<{ isDuplicate: boolean; existingMessage?: any }> {
  const existingMessage = await prisma.message.findFirst({
    where: { whatsappMessageId },
  });

  return {
    isDuplicate: !!existingMessage,
    existingMessage,
  };
}

/**
 * Find or create contact from phone number
 */
export async function findOrCreateContact(phoneNumber: string, organizationId?: string): Promise<any> {
  // Normalize phone number (remove any non-digit characters except +)
  const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "");
  const orgFilter = organizationId ? { organizationId } : undefined;
  
  // Try to find by phoneNumber within the current organization first.
  let contact = await prisma.contact.findFirst({
    where: {
      phoneNumber: normalizedPhone,
      ...(orgFilter || {}),
    },
  });

  if (!contact) {
    // Try without + prefix
    const phoneWithoutPlus = normalizedPhone.replace(/^\+/, "");
    contact = await prisma.contact.findFirst({
      where: {
        ...(orgFilter || {}),
        OR: [
          { phoneNumber: phoneWithoutPlus },
          { phoneNumber: { endsWith: phoneWithoutPlus } },
        ],
      },
    });
  }

  if (!contact) {
    // Get the organization ID
    const orgId = organizationId;
    if (!orgId) throw new Error("No organization Id provided for contact creation");
    
    // Get a user ID for this org
    const user = await prisma.user.findFirst({
      where: {
        organizationMemberships: {
          some: { organizationId: orgId }
        }
      },
      select: { id: true }
    });
    
    const userId = user?.id || 'default-user';
    
    contact = await prisma.contact.create({
      data: {
        phoneNumber: normalizedPhone,
        userId: userId,
        organizationId: orgId,
        tags: "[]",
        attributes: "{}",
      },
    });
  }

  return contact;
}

/**
 * Store incoming message in database
 */
export async function storeIncomingMessage(
  contactId: string,
  whatsappMessageId: string,
  content: ParsedMessageContent,
  timestamp: string
): Promise<any> {
  // Get contact to get organizationId
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { organizationId: true }
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Create content object with all relevant fields
  const contentObj: any = {
    type: content.type,
    raw: content.raw,
  };

  if (content.text) contentObj.text = content.text;
  if (content.mediaUrl) contentObj.mediaUrl = content.mediaUrl;
  if (content.mediaType) contentObj.mediaType = content.mediaType;
  if (content.mediaId) contentObj.mediaId = content.mediaId;
  if (content.caption) contentObj.caption = content.caption;
  if (content.filename) contentObj.filename = content.filename;
  if (content.interactive) contentObj.interactive = content.interactive;
  if (content.location) contentObj.location = content.location;
  if (content.contacts) contentObj.contacts = content.contacts;

  const message = await prisma.message.create({
    data: {
      contactId,
      whatsappMessageId,
      direction: "incoming",
      status: "delivered", // Incoming messages are considered delivered
      content: JSON.stringify(contentObj),
      organizationId: contact.organizationId || "",
    },
    include: {
      contact: {
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Update contact's last contacted time
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastContacted: new Date(timestamp) },
  });

  return message;
}

/**
 * Send acknowledgment receipt (read receipt) back to Meta
 */
export async function sendMessageAck(
  messageId: string,
  status: "read" | "delivered",
  organizationId?: string
): Promise<boolean> {
  try {
    const getCreds = await loadAuth();
    if (!getCreds) {
      console.error("[WhatsApp] Failed to load auth module for ack");
      return false;
    }
    
    const orgId = organizationId;
    if (!orgId) {
      console.error("[WhatsApp] No organization Id provided for ack");
      return false;
    }
    const credentials = await getCreds(orgId);

    if (!credentials?.apiKey || !credentials?.phoneNumberId) {
      console.error("[WhatsApp] No credentials for sending ack");
      return false;
    }

    await axios.post(
      `${META_API_BASE}/${credentials.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        status: status,
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return true;
  } catch (error: any) {
    console.error("[WhatsApp] Error sending ack:", error.message);
    return false;
  }
}
