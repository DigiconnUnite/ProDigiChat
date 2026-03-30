import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { requireRole } from '@/lib/rbac'

async function getUserAndOrgId(request: NextRequest): Promise<{ userId: string | null; organizationId: string | null }> {
  const token = await getToken({ req: request })
  return {
    userId: token?.sub || null,
    organizationId: token?.organizationId as string | null
  }
}

export async function GET(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build conditions - support both legacy (createdBy) and new (organizationId) campaigns
    const conditions: any = {
      OR: [
        { createdBy: userId },
        { organizationId: organizationId }
      ]
    }
    
    // Apply status filter if provided and not 'all'
    if (status && status !== 'all') {
      conditions.status = status
    }
    
    // Apply type filter if provided and not 'all'
    if (type && type !== 'all') {
      conditions.type = type
    }
    
    // Apply search filter if provided (AND with existing conditions)
    if (search) {
      conditions.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }
    
    // Get total count
    const total = await prisma.campaign.count({ where: conditions })

    // Query campaigns from database
    const campaigns = await prisma.campaign.findMany({
      where: conditions,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
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
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch campaigns'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  
  if (!userId || !organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // RBAC: Require member role or higher to create campaigns
  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const body = await request.json()
    
    const {
      name,
      type,
      description,
      audienceSegmentId,
      messageContent,
      schedule,
      fromNumber,
    } = body

    // Build data object with required fields
    const campaignData: any = {
      name,
      type: type || 'broadcast',
      status: 'draft',
      messageContent,
      whatsappNumberId: fromNumber || null,
      whatsappAccountId: fromNumber || null,  // Store the account ID for multi-account support
      stats: JSON.stringify({
        totalSent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        clicked: 0
      }),
      createdBy: userId,
      organizationId: organizationId
    }

    // Add description if provided
    if (description) {
      campaignData.description = description
    }

    // Only add audienceSegmentId if provided
    if (audienceSegmentId) {
      campaignData.audienceSegmentId = audienceSegmentId
    }

    // Only add schedule if provided
    if (schedule) {
      campaignData.schedule = schedule
    }

    // Create new campaign
    const campaign = await prisma.campaign.create({
      data: campaignData
    })

    return NextResponse.json({
      success: true,
      data: campaign
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create campaign'
    }, { status: 500 })
  }
}
