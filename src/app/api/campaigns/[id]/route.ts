import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getToken } from 'next-auth/jwt'
import { JWT } from 'next-auth/jwt'

async function validateSession(request: NextRequest): Promise<JWT | null> {
  const token = await getToken({ req: request })
  if (!token) {
    return null
  }
  return token
}

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await validateSession(request)
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const userId = token.sub as string
    const { id } = await params
    
    // Get campaign only if it belongs to the authenticated user
    const campaign = await db.campaign.findFirst({
      where: { 
        id,
        createdBy: userId
      },
      include: {
        audience: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            }
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await validateSession(request)
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const userId = token.sub as string
    const { id } = await params
    const body = await request.json()
    
    const {
      name,
      type,
      status,
      messageContent,
      schedule,
      audienceSegmentId
    } = body

    // Check if campaign exists AND belongs to the authenticated user
    const existingCampaign = await db.campaign.findFirst({
      where: { 
        id,
        createdBy: userId
      }
    })

    if (!existingCampaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (messageContent !== undefined) updateData.messageContent = messageContent
    if (schedule !== undefined) updateData.schedule = schedule
    if (audienceSegmentId !== undefined) {
      updateData.audienceSegmentId = audienceSegmentId || null
    }

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await validateSession(request)
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const userId = token.sub as string
    const { id } = await params

    // Check if campaign exists AND belongs to the authenticated user
    const existingCampaign = await db.campaign.findFirst({
      where: { 
        id,
        createdBy: userId
      }
    })

    if (!existingCampaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft, completed, failed, or paused campaigns
    if (!['draft', 'completed', 'failed', 'paused'].includes(existingCampaign.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a running campaign. Please pause it first.' },
        { status: 400 }
      )
    }

    await db.campaign.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
