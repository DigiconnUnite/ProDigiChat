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

// POST: Request data export
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;
  const userId = token?.sub as string;

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { format, includeMedia } = body

    // In a real implementation, this would:
    // 1. Gather all user data (contacts, messages, campaigns, etc.)
    // 2. Format it according to the requested format (JSON, CSV)
    // 3. Generate a download link
    // 4. Send an email with the download link

    // For now, we'll simulate the request
    return NextResponse.json({
      message: "Data export request submitted",
      exportId: `export_${Date.now()}`,
      format: format || 'json',
      includeMedia: includeMedia || false,
      estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    })
  } catch (error) {
    console.error("Error requesting data export:", error)
    return NextResponse.json({ error: "Failed to request data export" }, { status: 500 })
  }
}

// DELETE: Request data deletion
export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;
  const userId = token?.sub as string;

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { confirmation, entityType } = body

    if (confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    }

    // In a real implementation, this would:
    // 1. Verify the user has permission to delete
    // 2. Schedule the deletion job
    // 3. Send confirmation email
    // 4. Execute deletion after grace period

    return NextResponse.json({
      message: "Data deletion request submitted",
      deletionId: `deletion_${Date.now()}`,
      entityType: entityType || 'all',
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
  } catch (error) {
    console.error("Error requesting data deletion:", error)
    return NextResponse.json({ error: "Failed to request data deletion" }, { status: 500 })
  }
}
