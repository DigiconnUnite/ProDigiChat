import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

async function validateSession(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

// POST /api/campaigns/[id]/pause - Pause a running campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorizedResponse = await validateSession(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const { id } = await params
    const token = await getToken({ req: request })
    const orgId = token?.organizationId

    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    })

    if (!campaign || campaign.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign can be paused
    if (campaign.status !== 'running') {
      return NextResponse.json(
        { success: false, error: `Cannot pause campaign with status: ${campaign.status}. Only running campaigns can be paused.` },
        { status: 400 }
      )
    }

    // Pause the campaign and queue items
    const [updatedCampaign] = await Promise.all([
      prisma.campaign.update({
        where: { id },
        data: { status: 'paused' }
      }),
      prisma.whatsAppMessageQueue.updateMany({
        where: { 
          campaignId: id, 
          status: { in: ['queued', 'pending'] } 
        },
        data: { status: 'paused' }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Campaign paused successfully',
      data: {
        campaignId: id,
        status: 'paused'
      }
    })
  } catch (error) {
    console.error('Error pausing campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to pause campaign' },
      { status: 500 }
    )
  }
}
