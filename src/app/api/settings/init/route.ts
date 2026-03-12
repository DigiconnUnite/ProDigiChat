import { NextResponse } from "next/server"
import { getSettings, getDefaultOrgId } from "@/lib/settings-storage"

// GET: Check status
export async function GET() {
  const orgId = getDefaultOrgId()
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      exists: true,
      organizationId: orgId,
      organizationName: settings.general.companyName || "Demo Organization",
    })
  } catch (error) {
    console.error("Error initializing settings:", error)
    return NextResponse.json({ error: "Failed to initialize" }, { status: 500 })
  }
}

// POST: Initialize demo
export async function POST() {
  const orgId = getDefaultOrgId()
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      success: true,
      message: "Demo organization initialized",
      organization: {
        id: orgId,
        name: settings.general.companyName || "Demo Organization",
      },
    })
  } catch (error) {
    console.error("Error initializing demo:", error)
    return NextResponse.json({ error: "Failed to initialize demo" }, { status: 500 })
  }
}
