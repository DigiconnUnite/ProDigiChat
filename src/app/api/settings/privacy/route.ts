import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"

// GET: Fetch privacy settings
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      settings: settings.privacy,
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching privacy settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT: Update privacy settings
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { settings } = body
    
    const updated = await updateSettings(orgId, {
      privacy: settings
    })
    
    return NextResponse.json({
      message: "Privacy settings updated successfully",
      settings: updated.privacy,
    })
  } catch (error) {
    console.error("Error saving privacy settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
