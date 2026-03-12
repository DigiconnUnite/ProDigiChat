import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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

// POST /api/campaigns/[id]/resume - Resume a paused campaign
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

    // Get the campaign
    const campaign = await db.campaign.findUnique({
      where: { id }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign can be resumed
    if (campaign.status !== 'paused') {
      return NextResponse.json(
        { success: false, error: `Cannot resume campaign with status: ${campaign.status}. Only paused campaigns can be resumed.` },
        { status: 400 }
      )
    }

    // Resume the campaign
    const updatedCampaign = await db.campaign.update({
      where: { id },
      data: { status: 'running' }
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign resumed successfully',
      data: {
        campaignId: id,
        status: 'running'
      }
    })
  } catch (error) {
    console.error('Error resuming campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resume campaign' },
      { status: 500 }
    )
  }
}
