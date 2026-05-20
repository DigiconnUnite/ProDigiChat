import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { JWT } from 'next-auth/jwt'
import { Prisma } from '@prisma/client'

async function validateSession(request: NextRequest): Promise<JWT | null> {
  const token = await getToken({ req: request })
  if (!token) {
    return null
  }
  return token
}

// GET /api/campaigns/[id] - Get single campaign with REAL computed stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await validateSession(request)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = token.sub as string
    const organizationId = token.organizationId as string | undefined
    const { id } = await params
    
    // Parse query params for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const statusFilter = searchParams.get('status') || null // filter by message status
    const skip = (page - 1) * pageSize

    const campaignWhere: { id: string; createdBy?: string; organizationId?: string } = { id }
    if (organizationId) {
      campaignWhere.organizationId = organizationId
    } else {
      campaignWhere.createdBy = userId
    }

    // ─── Fetch campaign with messages ───
    const campaign = await prisma.campaign.findFirst({
      where: campaignWhere,
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
          // ✅ FIX: Apply status filter if provided
          where: statusFilter ? { status: statusFilter } : undefined,
          take: pageSize,
          skip,
          orderBy: [
            // Show failed messages first, then by recency
            { status: 'desc' },
            { createdAt: 'desc' }
          ],
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

    // ─── COMPUTE REAL STATS FROM ACTUAL MESSAGES ───
    // This is the KEY fix — don't trust the stored JSON stats field
    const [
      totalMessages,
      pendingCount,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
    ] = await Promise.all([
      prisma.message.count({ where: { campaignId: id } }),
      prisma.message.count({ where: { campaignId: id, status: 'pending' } }),
      prisma.message.count({ where: { campaignId: id, status: 'sent' } }),
      prisma.message.count({ where: { campaignId: id, status: 'delivered' } }),
      prisma.message.count({ where: { campaignId: id, status: 'read' } }),
      prisma.message.count({ where: { campaignId: id, status: 'failed' } }),
    ])

    const realStats = {
      totalMessages,
      totalSent: sentCount + deliveredCount + readCount, // messages that left our system
      delivered: deliveredCount + readCount,              // confirmed delivery
      read: readCount,                                    // confirmed read
      failed: failedCount,                                // confirmed failure
      pending: pendingCount,                              // still waiting
    }

    // ─── GET FAILURE REASONS SUMMARY ───
    const failureReasons = await prisma.message.groupBy({
      by: ['failureReason'],
      where: {
        campaignId: id,
        status: 'failed',
      },
      _count: { failureReason: true }
    })

    // ─── GET TOTAL MESSAGE COUNT FOR PAGINATION ───
    const totalFilteredMessages = statusFilter
      ? await prisma.message.count({
          where: { campaignId: id, status: statusFilter }
        })
      : totalMessages

    // ─── Update the stored stats JSON so it stays in sync ───
    // (Do this in background, don't block the response)
    prisma.campaign.update({
      where: { id },
      data: {
        stats: JSON.stringify(realStats),
      }
    }).catch(err => console.error('Failed to sync campaign stats:', err))

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        // ✅ OVERRIDE the stored stats with real computed stats
        stats: JSON.stringify(realStats),
        // ✅ ADD computed stats as a separate field for clarity
        computedStats: realStats,
        // ✅ ADD failure analysis
        failureAnalysis: {
          reasons: failureReasons.map(r => ({
            reason: r.failureReason || 'Unknown',
            count: r._count.failureReason
          })),
          totalFailed: failedCount,
          failureRate: totalMessages > 0
            ? ((failedCount / totalMessages) * 100).toFixed(1)
            : '0.0',
        },
        // ✅ ADD pagination info
        messagesPagination: {
          page,
          pageSize,
          totalMessages: totalFilteredMessages,
          totalPages: Math.ceil(totalFilteredMessages / pageSize),
          hasNextPage: page * pageSize < totalFilteredMessages,
          hasPrevPage: page > 1,
        }
      }
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
    const organizationId = token.organizationId as string | undefined
    const { id } = await params
    const body = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      type,
      status,
      messageContent,
      schedule,
      audienceSegmentId
    } = body

    // Check campaign belongs to the authenticated user's organization
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId,
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

    const campaign = await prisma.campaign.update({
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
    const organizationId = token.organizationId as string | undefined
    const { id } = await params

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign belongs to the authenticated user's organization
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId,
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

    await prisma.campaign.delete({
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
