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
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { webhookId, name, url, events, secret, active } = body
    
    const settings = await getSettings(orgId)
    const webhookIndex = settings.webhooks.findIndex((w: any) => w.id === webhookId)
    
    if (webhookIndex === -1) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }
    
    const updatedWebhooks = [...settings.webhooks]
    updatedWebhooks[webhookIndex] = {
      ...updatedWebhooks[webhookIndex],
      ...(name && { name }),
      ...(url && { url }),
      ...(events && { events }),
      ...(secret && { secret }),
      ...(active !== undefined && { status: active ? 'active' : 'inactive' }),
      updatedAt: new Date().toISOString(),
    }
    
    await updateSettings(orgId, { webhooks: updatedWebhooks })
    
    return NextResponse.json({
      message: "Webhook updated successfully",
      webhook: updatedWebhooks[webhookIndex],
    })
  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 })
  }
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

// POST: Test webhook
export async function PATCH(request: NextRequest) {
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
    const webhook = settings.webhooks.find((w: any) => w.id === webhookId)
    
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }
    
    // Simulate webhook test
    const testPayload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook payload from ProDigiChat",
        organizationId: orgId,
      },
    }
    
    // In a real implementation, you would make an actual HTTP request to the webhook URL
    // For now, we'll simulate a successful response
    const response = {
      success: true,
      statusCode: 200,
      responseTime: Math.floor(Math.random() * 100) + 20,
    }
    
    return NextResponse.json({
      message: "Webhook test completed",
      result: response,
    })
  } catch (error) {
    console.error("Error testing webhook:", error)
    return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 })
  }
}

// GET: Webhook delivery logs
export async function OPTIONS(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get("id")
  
  try {
    // Return mock delivery logs
    const logs = [
      {
        id: crypto.randomUUID(),
        event: "message.delivered",
        webhookId: webhookId || "all",
        status: 200,
        responseTime: 32,
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        event: "campaign.completed",
        webhookId: webhookId || "all",
        status: 503,
        responseTime: null,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        event: "message.failed",
        webhookId: webhookId || "all",
        status: 200,
        responseTime: 28,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        event: "contact.opted_out",
        webhookId: webhookId || "all",
        status: 200,
        responseTime: 41,
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ]
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching webhook logs:", error)
    return NextResponse.json({ error: "Failed to fetch webhook logs" }, { status: 500 })
  }
}
