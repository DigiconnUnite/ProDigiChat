import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/app/api/whatsapp/messages";
import { parseMessageContent, stringifyMessageContent, parseTags } from "@/types/common";
import { broadcastToInbox } from "@/lib/websocket";

// GET /api/inbox - Get all conversations
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build organization filter for queries
    const orgFilter: any = { organizationId: orgId };

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    // If contactId is provided, get messages for that conversation
    if (contactId) {
      // First verify the contact belongs to the organization
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          ...orgFilter
        }
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      const messages = await prisma.message.findMany({
        where: {
          contactId,
          ...orgFilter
        },
        orderBy: { createdAt: "asc" },
        include: {
          contact: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
              tags: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({ messages });
    }

    // Otherwise, get all conversations (grouped by contact)
    // Get unique contacts with their latest message
    const contacts = await prisma.contact.findMany({
      where: orgFilter as any,
      orderBy: { lastContacted: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                direction: "incoming",
                status: "sent", // Consider unread as 'sent' status
              },
            },
          },
        },
      },
    });

    // Transform to conversation format
    const conversations = (contacts as any[])
      .filter((contact: any) => contact.messages && contact.messages.length > 0)
      .map((contact: any) => {
        const lastMessage = contact.messages[0];
        const content = parseMessageContent(lastMessage.content);
        
        return {
          id: contact.id,
          name: contact.firstName 
            ? `${contact.firstName} ${contact.lastName || ""}`.trim()
            : contact.phoneNumber,
          phone: contact.phoneNumber,
          avatar: contact.firstName 
            ? `${contact.firstName[0]}${contact.lastName?.[0] || ""}`.toUpperCase()
            : contact.phoneNumber?.slice(-2).toUpperCase() || "??",
          status: "active",
          unread: contact._count?.messages || 0,
          lastMessage: content.text || content.caption || "Media message",
          lastMessageTime: formatRelativeTime(lastMessage.createdAt),
          lastMessageDate: lastMessage.createdAt,
          tags: parseTags(contact.tags),
        };
      })
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox" },
      { status: 500 }
    );
  }
}

// POST /api/inbox - Send a message
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, content, type = "text" } = body;

    if (!contactId || !content) {
      return NextResponse.json(
        { error: "Contact ID and content are required" },
        { status: 400 }
      );
    }

    // Get contact - only if it belongs to organization
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId }
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Create message in database
    // Use contact's organizationId or fall back to token's orgId
    const messageOrgId: string = (contact.organizationId ?? orgId ?? "") as string;
    if (!messageOrgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }
    
    const message = await prisma.message.create({
      data: {
        contactId,
        direction: "outgoing",
        status: "sent",
        content: stringifyMessageContent({ text: content, type }),
        sentBy: userId || undefined,
        organizationId: messageOrgId,
        stats: JSON.stringify({ totalSent: 1, delivered: 0, read: 0, failed: 0, clicked: 0 }),
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
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update contact's last contacted time
    await prisma.contact.update({
      where: { id: contactId },
      data: { lastContacted: new Date() },
    });

    // Send message via WhatsApp API
    let whatsappMessageId: string | null = null;
    let deliveryStatus: string = "sent";
    
    try {
      const whatsappResponse = await sendTextMessage(
        contact.phoneNumber,
        content,
        messageOrgId
      );
      
      // Update message with WhatsApp message ID and status
      if (whatsappResponse?.id) {
        whatsappMessageId = whatsappResponse.id;
        deliveryStatus = "sent";
        
        await prisma.message.update({
          where: { id: message.id },
          data: {
            whatsappMessageId,
            status: deliveryStatus
          }
        });
      }
    } catch (whatsappError) {
      console.error("[Inbox] Failed to send via WhatsApp API:", whatsappError);
      // Update message status to failed
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" }
      });
      deliveryStatus = "failed";
    }
    
    // Broadcast new message to connected clients
    broadcastToInbox(messageOrgId, 'new-message', {
      messageId: message.id,
      contactId,
      content: { text: content, type },
      status: deliveryStatus,
      whatsappMessageId,
      sender: {
        id: userId,
        name: (await prisma.user.findUnique({ where: { id: userId } }))?.name || 'You'
      },
      createdAt: message.createdAt
    });
    
    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        type: "sent",
        text: content,
        time: formatTime(message.createdAt),
        status: deliveryStatus,
        whatsappMessageId
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// PATCH /api/inbox - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // First verify the contact belongs to the organization
    const orgFilter: any = { organizationId: orgId };
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ...orgFilter
      } as any
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Mark all incoming messages from this contact as read
    await prisma.message.updateMany({
      where: {
        contactId,
        organizationId: orgId,
        direction: "incoming",
        status: "sent",
      },
      data: {
        status: "read",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}

// Helper functions
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return new Date(date).toLocaleDateString();
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
