import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// GET: Fetch user profile settings
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const userId = token?.sub as string;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's organization role
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({
      user: {
        ...user,
        organizationRole: orgMember?.role || null,
        organizationName: orgMember?.organization?.name || null,
      }
    })
  } catch (error) {
    console.error("Error fetching profile settings:", error)
    return NextResponse.json({ error: "Failed to fetch profile settings" }, { status: 500 })
  }
}

// PUT: Update user profile
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  const userId = token?.sub as string;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { name, email, phone, role } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone) updateData.phone = phone

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
      }
    })

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updated,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

// POST: Change password
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const userId = token?.sub as string;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
