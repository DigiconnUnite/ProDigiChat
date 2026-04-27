import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"
import { requireRole } from '@/lib/rbac'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// GET: Fetch team members
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    // Fetch organization members from database
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Transform to match expected format
    const transformedMembers = members.map(member => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name || 'Unknown',
      email: member.user.email,
      avatar: member.user.avatarUrl,
      role: member.role,
      status: member.acceptedAt ? 'active' : 'invited',
      invitedAt: member.invitedAt,
      acceptedAt: member.acceptedAt,
      lastActive: member.updatedAt,
    }))

    // Get organization info
    const organization = await prisma.team.findUnique({
      where: { id: orgId },
      select: { id: true, name: true }
    })

    return NextResponse.json({
      members: transformedMembers,
      organization: organization || { id: orgId, name: "Demo Organization" },
      totalCount: transformedMembers.length,
    })
  } catch (error) {
    console.error("Error fetching team settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST: Invite team member
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;
  const userId = token?.sub as string;

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC: Require owner/admin role to manage team
  const roleCheck = await requireRole(request, 'admin')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      // Create a placeholder user for invitation
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: crypto.randomBytes(32).toString('hex'), // Temporary password
          role: 'user',
        }
      })
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
    }

    // Create organization member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role,
        invitedBy: userId,
        invitedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        }
      }
    })

    return NextResponse.json({
      message: "Invitation sent successfully",
      member: {
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatarUrl,
        role: member.role,
        status: 'invited',
        invitedAt: member.invitedAt,
      },
    })
  } catch (error) {
    console.error("Error inviting team member:", error)
    return NextResponse.json({ error: "Failed to invite team member" }, { status: 500 })
  }
}

// PUT: Update member role
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC: Require owner/admin role to manage team
  const roleCheck = await requireRole(request, 'admin')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const body = await request.json()
    const { memberId, role } = body

    if (!memberId || !role) {
      return NextResponse.json({ error: 'Member ID and role are required' }, { status: 400 })
    }

    // Verify member belongs to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update member role
    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role }
    })

    return NextResponse.json({
      message: "Member role updated successfully",
      member: {
        id: updated.id,
        role: updated.role,
      },
    })
  } catch (error) {
    console.error("Error updating member role:", error)
    return NextResponse.json({ error: "Failed to update member role" }, { status: 500 })
  }
}

// DELETE: Remove member
export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;
  const userId = token?.sub as string;

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC: Require owner/admin role to manage team
  const roleCheck = await requireRole(request, 'admin')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Verify member belongs to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: 'owner'
        }
      })
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
      }
    }

    // Delete member
    await prisma.organizationMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({
      message: "Team member removed successfully",
    })
  } catch (error) {
    console.error("Error removing team member:", error)
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 })
  }
}

// POST: Resend invitation
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC: Require owner/admin role to manage team
  const roleCheck = await requireRole(request, 'admin')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Verify member belongs to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (member.acceptedAt) {
      return NextResponse.json({ error: 'Member has already accepted the invitation' }, { status: 400 })
    }

    // Update invitedAt to resend invitation
    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { invitedAt: new Date() }
    })

    return NextResponse.json({
      message: "Invitation resent successfully",
      member: {
        id: updated.id,
        invitedAt: updated.invitedAt,
      },
    })
  } catch (error) {
    console.error("Error resending invitation:", error)
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 })
  }
}

// GET: Role permissions matrix
export async function OPTIONS(request: NextRequest) {
  const permissions = {
    owner: {
      manageBilling: true,
      manageTeam: true,
      createCampaigns: true,
      launchCampaigns: true,
      manageContacts: true,
      viewAnalytics: true,
      manageSettings: true,
    },
    admin: {
      manageBilling: false,
      manageTeam: true,
      createCampaigns: true,
      launchCampaigns: true,
      manageContacts: true,
      viewAnalytics: true,
      manageSettings: true,
    },
    manager: {
      manageBilling: false,
      manageTeam: false,
      createCampaigns: true,
      launchCampaigns: true,
      manageContacts: true,
      viewAnalytics: true,
      manageSettings: false,
    },
    member: {
      manageBilling: false,
      manageTeam: false,
      createCampaigns: true,
      launchCampaigns: false,
      manageContacts: true,
      viewAnalytics: true,
      manageSettings: false,
    },
    viewer: {
      manageBilling: false,
      manageTeam: false,
      createCampaigns: false,
      launchCampaigns: false,
      manageContacts: false,
      viewAnalytics: true,
      manageSettings: false,
    },
  }

  return NextResponse.json({ permissions })
}
