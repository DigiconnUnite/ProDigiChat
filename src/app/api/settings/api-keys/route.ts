import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"
import crypto from "crypto"

// GET: Fetch API keys
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    return NextResponse.json({
      apiKeys: settings.apiKeys,
      totalKeys: settings.apiKeys.length,
      maxKeys: 5,
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST: Create API key
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { name, scopes } = body
    
    const settings = await getSettings(orgId)
    
    if (settings.apiKeys.length >= 5) {
      return NextResponse.json({ error: "Maximum API key limit reached (5)" }, { status: 403 })
    }
    
    const fullKey = `wa_${crypto.randomBytes(32).toString("hex")}`
    const prefix = fullKey.substring(0, 12)
    
    const newKey = {
      id: crypto.randomUUID(),
      name,
      prefix,
      scopes: scopes || ["campaigns:read", "campaigns:write", "contacts:read", "messages:write"],
      rateLimit: 1000,
      maxRequests: null,
      requestCount: 0,
      expiresAt: null,
      lastUsedAt: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      fullKey,
    }
    
    const updated = await updateSettings(orgId, {
      apiKeys: [...settings.apiKeys, newKey]
    })
    
    return NextResponse.json({
      message: "API key created successfully",
      apiKey: newKey,
    })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}

// DELETE: Revoke API key
export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")
  
  if (!keyId) {
    return NextResponse.json({ error: "API key ID required" }, { status: 400 })
  }
  
  try {
    const settings = await getSettings(orgId)
    const filtered = settings.apiKeys.filter((k: any) => k.id !== keyId)
    
    await updateSettings(orgId, { apiKeys: filtered })
    
    return NextResponse.json({ message: "API key revoked successfully" })
  } catch (error) {
    console.error("Error revoking API key:", error)
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 })
  }
}

// POST: Regenerate API key
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")
  
  if (!keyId) {
    return NextResponse.json({ error: "API key ID required" }, { status: 400 })
  }
  
  try {
    const settings = await getSettings(orgId)
    const keyIndex = settings.apiKeys.findIndex((k: any) => k.id === keyId)
    
    if (keyIndex === -1) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }
    
    // Generate new key
    const fullKey = `wa_${crypto.randomBytes(32).toString("hex")}`
    const prefix = fullKey.substring(0, 12)
    
    // Update the key
    const updatedKeys = [...settings.apiKeys]
    updatedKeys[keyIndex] = {
      ...updatedKeys[keyIndex],
      prefix,
      fullKey,
      lastUsedAt: null,
      requestCount: 0,
      updatedAt: new Date().toISOString(),
    }
    
    await updateSettings(orgId, { apiKeys: updatedKeys })
    
    return NextResponse.json({
      message: "API key regenerated successfully",
      apiKey: updatedKeys[keyIndex],
    })
  } catch (error) {
    console.error("Error regenerating API key:", error)
    return NextResponse.json({ error: "Failed to regenerate key" }, { status: 500 })
  }
}
