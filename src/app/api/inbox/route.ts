import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/inbox - Get all conversations
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId && !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build user filter for queries - support both userId and orgId
    // Note: Contact model has userId field, not organizationId
    // When orgId is provided without userId, we get all contacts (could be improved with org-level filtering)
    const userFilter: any = userId ? { userId } : {};

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    // If contactId is provided, get messages for that conversation
    if (contactId) {
      // First verify the contact belongs to the user
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          ...userFilter
        }
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      const messages = await prisma.message.findMany({
        where: { 
          contactId,
          ...userFilter
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
      where: userFilter as any,
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
        let content = { text: "", caption: "", mediaUrl: "" };
        try {
          content = JSON.parse(lastMessage.content);
        } catch (e) {
          // If not valid JSON, treat as plain text
          content = { text: lastMessage.content, caption: "", mediaUrl: "" };
        }
        
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
          tags: (() => {
            try {
              return JSON.parse(contact.tags || "[]");
            } catch (e) {
              return [];
            }
          })(),
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

    if (!userId && !orgId) {
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

    // Get contact - only if it belongs to user
    const userFilter: any = userId ? { userId } : {};
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ...userFilter
      } as any
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Create message in database
    const message = await prisma.message.create({
      data: {
        contactId,
        direction: "outgoing",
        status: "sent",
        content: JSON.stringify({ text: content, type }),
        sentBy: userId || undefined,
        organizationId: contact.organizationId,
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

    // TODO: Actually send the message via WhatsApp API
    // This would require integrating with the WhatsApp API
    
    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        type: "sent",
        text: content,
        time: formatTime(message.createdAt),
        status: message.status,
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

    if (!userId && !orgId) {
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

    // First verify the contact belongs to the user
    const userFilter: any = userId ? { userId } : {};
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        ...userFilter
      } as any
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Mark all incoming messages from this contact as read
    await prisma.message.updateMany({
      where: {
        contactId,
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
