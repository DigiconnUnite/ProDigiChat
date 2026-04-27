import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSettings, updateSettings } from "@/lib/settings-storage"
import { prisma } from "@/lib/prisma"

// GET: Fetch billing info with real usage data
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const settings = await getSettings(orgId)
    
    // Fetch actual usage data
    const [totalContacts, totalCampaigns, messagesThisMonth] = await Promise.all([
      prisma.contact.count({ where: { organizationId: orgId, isDeleted: false } }),
      prisma.campaign.count({ where: { organizationId: orgId } }),
      prisma.message.count({
        where: {
          organizationId: orgId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);
    
    // Get current plan limits
    const currentPlanId = settings.billing?.subscriptionTier || 'free';
    const plans = [
      { id: "free", name: "Free", price: 0, interval: "month", limits: { contacts: 1000, campaigns: 10, messagesPerMonth: 1000, whatsappNumbers: 1 } },
      { id: "starter", name: "Starter", price: 29, interval: "month", limits: { contacts: 5000, campaigns: 50, messagesPerMonth: 10000, whatsappNumbers: 3 } },
      { id: "professional", name: "Professional", price: 79, interval: "month", limits: { contacts: 25000, campaigns: 200, messagesPerMonth: 50000, whatsappNumbers: 10 } },
      { id: "enterprise", name: "Enterprise", price: 199, interval: "month", limits: { contacts: 100000, campaigns: -1, messagesPerMonth: 200000, whatsappNumbers: -1 } },
    ];
    
    const currentPlan = plans.find(p => p.id === currentPlanId) || plans[0];
    const limits = currentPlan.limits;
    
    const usage = {
      contacts: { 
        current: totalContacts, 
        limit: limits.contacts, 
        percentage: limits.contacts > 0 ? Math.round((totalContacts / limits.contacts) * 100) : 0 
      },
      campaigns: { 
        current: totalCampaigns, 
        limit: limits.campaigns, 
        percentage: limits.campaigns > 0 ? Math.round((totalCampaigns / limits.campaigns) * 100) : 0 
      },
      messagesThisMonth: { 
        current: messagesThisMonth, 
        limit: limits.messagesPerMonth, 
        percentage: limits.messagesPerMonth > 0 ? Math.round((messagesThisMonth / limits.messagesPerMonth) * 100) : 0 
      },
    };
    
    return NextResponse.json({
      billing: settings.billing,
      usage,
      plans,
      currentPlan,
      organizationId: orgId,
    })
  } catch (error) {
    console.error("Error fetching billing info:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT: Update billing plan
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Update billing settings
    const settings = await getSettings(orgId);
    settings.billing = {
      ...settings.billing,
      subscriptionTier: planId
    };

    await updateSettings(orgId, settings);

    return NextResponse.json({ 
      success: true,
      message: "Billing plan updated successfully",
      billing: settings.billing
    });
  } catch (error) {
    console.error("Error updating billing:", error)
    return NextResponse.json({ error: "Failed to update billing" }, { status: 500 })
  }
}
