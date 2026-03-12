import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings } from "@/lib/settings-storage"

// GET: Fetch billing info
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    const usage = {
      contacts: { current: 0, limit: 1000, percentage: 0 },
      campaigns: { current: 0, limit: 10, percentage: 0 },
      messagesThisMonth: { current: 0, limit: 1000, percentage: 0 },
    }
    
    const plans = [
      { id: "free", name: "Free", price: 0, interval: "month", limits: { contacts: 1000, campaigns: 10, messagesPerMonth: 1000, whatsappNumbers: 1 } },
      { id: "starter", name: "Starter", price: 29, interval: "month", limits: { contacts: 5000, campaigns: 50, messagesPerMonth: 10000, whatsappNumbers: 3 } },
      { id: "professional", name: "Professional", price: 79, interval: "month", limits: { contacts: 25000, campaigns: 200, messagesPerMonth: 50000, whatsappNumbers: 10 } },
      { id: "enterprise", name: "Enterprise", price: 199, interval: "month", limits: { contacts: 100000, campaigns: -1, messagesPerMonth: 200000, whatsappNumbers: -1 } },
    ]
    
    return NextResponse.json({
      billing: settings.billing,
      usage,
      plans,
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching billing info:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT: Update billing
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  return NextResponse.json({ message: "Billing preferences updated successfully" })
}
