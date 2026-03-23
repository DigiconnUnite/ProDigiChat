import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET: Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Error getting unread count:", error)
    return NextResponse.json({ error: "Failed to get unread count" }, { status: 500 })
  }
}
