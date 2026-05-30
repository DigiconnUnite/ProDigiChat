import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build organization filter for queries
    const orgFilter: any = orgId ? { organizationId: orgId } : {};

    // Count total unread messages across all contacts
    const unreadCount = await prisma.message.count({
      where: {
        ...orgFilter,
        direction: "incoming",
        // Incoming messages are stored with status "delivered" and only
        // flipped to "read" once an operator opens the conversation. This
        // must stay in sync with storeIncomingMessage() and the inbox
        // PATCH (mark-as-read) handler.
        status: "delivered",
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching inbox unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}