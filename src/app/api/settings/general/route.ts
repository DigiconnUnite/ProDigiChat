import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"

// GET: Fetch general settings
export async function GET(request: NextRequest) {
  // Get orgId from session token instead of query params
  const token = await getToken({ req: request })
  const orgId = (token?.organizationId || token?.orgId) as string

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 })
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      general: settings.general,
      organization: { id: orgId, name: settings.general.companyName || "Demo Organization" },
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching general settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT: Update general settings
export async function PUT(request: NextRequest) {
  try {
    // Get orgId from session token instead of body
    const token = await getToken({ req: request })
    const orgId = (token?.organizationId || token?.orgId) as string

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, email, timezone, language, dateFormat, currency } = body
    
    const settings = await getSettings(orgId)
    
    const updated = await updateSettings(orgId, {
      general: {
        ...settings.general,
        companyName: name ?? settings.general.companyName,
        companyEmail: email ?? settings.general.companyEmail,
        timezone: timezone ?? settings.general.timezone,
        language: language ?? settings.general.language,
        dateFormat: dateFormat ?? settings.general.dateFormat,
        currency: currency ?? settings.general.currency,
      }
    })
    
    return NextResponse.json({
      message: "Settings saved successfully",
      general: updated.general,
      organization: { id: orgId, name: updated.general.companyName || "Demo Organization" },
    })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
