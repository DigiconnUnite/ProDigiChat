import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getSettings } from "@/lib/settings-storage"

// GET: Check status - requires valid session
export async function GET() {
  const session = await getServerSession()
  
  // Require authentication - no fallback to default org
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const orgId = (session.user as any).organizationId
  
  if (!orgId) {
    return NextResponse.json({ error: "No organization found. Please log in again." }, { status: 401 })
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      exists: true,
      organizationId: orgId,
      organizationName: settings.general.companyName || "My Organization",
    })
  } catch (error) {
    console.error("Error initializing settings:", error)
    return NextResponse.json({ error: "Failed to initialize" }, { status: 500 })
  }
}

// POST: Initialize settings - requires valid session
export async function POST() {
  const session = await getServerSession()
  
  // Require authentication - no fallback to default org
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const orgId = (session.user as any).organizationId
  
  if (!orgId) {
    return NextResponse.json({ error: "No organization found. Please log in again." }, { status: 401 })
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      success: true,
      message: "Organization settings initialized",
      organization: {
        id: orgId,
        name: settings.general.companyName || "My Organization",
      },
    })
  } catch (error) {
    console.error("Error initializing settings:", error)
    return NextResponse.json({ error: "Failed to initialize settings" }, { status: 500 })
  }
}
