import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const userId = token?.sub;
    const orgId = token?.organizationId || token?.orgId;

    if (!userId && !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build user filter for queries
    const userFilter: any = userId ? { userId } : {};

    // Count total unread messages across all contacts
    const unreadCount = await prisma.message.count({
      where: {
        ...userFilter,
        direction: "incoming",
        status: "sent", // Unread messages have status "sent"
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