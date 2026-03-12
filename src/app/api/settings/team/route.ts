import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"

// GET: Fetch team members
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      members: settings.team,
      organization: { id: orgId, name: "Demo Organization" },
      totalCount: settings.team.length,
    })
  } catch (error) {
    console.error("Error fetching team settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST: Invite team member (mock)
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  const body = await request.json()
  const { email, role } = body
  
  return NextResponse.json({
    message: "Invitation sent successfully",
    invitation: { email, role, status: "pending" },
  })
}

// PUT: Update member role
export async function PUT(request: NextRequest) {
  const body = await request.json()
  
  return NextResponse.json({
    message: "Member role updated successfully",
  })
}

// DELETE: Remove member
export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    message: "Team member removed successfully",
  })
}
