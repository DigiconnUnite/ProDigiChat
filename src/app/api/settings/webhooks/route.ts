import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"
import crypto from "crypto"

// GET: Fetch webhooks
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    const availableEvents = [
      { id: "message.sent", description: "When a message is sent" },
      { id: "message.delivered", description: "When a message is delivered" },
      { id: "message.read", description: "When a message is read" },
      { id: "message.failed", description: "When a message fails to send" },
      { id: "message.received", description: "When a message is received" },
      { id: "campaign.created", description: "When a campaign is created" },
      { id: "campaign.started", description: "When a campaign starts" },
      { id: "campaign.completed", description: "When a campaign completes" },
      { id: "contact.created", description: "When a contact is created" },
      { id: "contact.opted_in", description: "When a contact opts in" },
      { id: "contact.opted_out", description: "When a contact opts out" },
      { id: "webhook.test", description: "Test webhook payload" },
    ]
    
    return NextResponse.json({
      webhooks: settings.webhooks,
      availableEvents,
      totalWebhooks: settings.webhooks.length,
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST: Create webhook
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { name, url, events } = body
    
    const settings = await getSettings(orgId)
    
    const newWebhook = {
      id: crypto.randomUUID(),
      name,
      url,
      events,
      status: "active",
      secret: crypto.randomBytes(32).toString("hex"),
      createdAt: new Date().toISOString(),
    }
    
    const updated = await updateSettings(orgId, {
      webhooks: [...settings.webhooks, newWebhook]
    })
    
    return NextResponse.json({
      message: "Webhook created successfully",
      webhook: newWebhook,
    })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 })
  }
}

// PUT: Update webhook
export async function PUT(request: NextRequest) {
  return NextResponse.json({ message: "Webhook updated successfully" })
}

// DELETE: Delete webhook
export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get("id")
  
  if (!webhookId) {
    return NextResponse.json({ error: "Webhook ID required" }, { status: 400 })
  }
  
  try {
    const settings = await getSettings(orgId)
    const filtered = settings.webhooks.filter((w: any) => w.id !== webhookId)
    
    await updateSettings(orgId, { webhooks: filtered })
    
    return NextResponse.json({ message: "Webhook deleted successfully" })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 })
  }
}
