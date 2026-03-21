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

// POST /api/campaigns/[id]/duplicate - Duplicate a campaign
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

    // Get the campaign to duplicate
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Create a duplicate campaign
    const duplicateCampaign = await prisma.campaign.create({
      data: {
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        status: 'draft', // Always start as draft
        messageContent: campaign.messageContent,
        schedule: null, // Clear schedule for duplicate
        stats: JSON.stringify({
          totalSent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          clicked: 0
        }),
        audienceSegmentId: campaign.audienceSegmentId,
        createdBy: campaign.createdBy
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign duplicated successfully',
      data: {
        originalCampaignId: id,
        newCampaignId: duplicateCampaign.id,
        name: duplicateCampaign.name
      }
    })
  } catch (error) {
    console.error('Error duplicating campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate campaign' },
      { status: 500 }
    )
  }
}
