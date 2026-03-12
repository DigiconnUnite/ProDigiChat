import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getToken } from 'next-auth/jwt'

export async function GET(request: NextRequest) {
  // Get session for authentication using getToken
  const token = await getToken({ req: request })
  
  // DEBUG: Log authentication attempt first
  console.log('[DEBUG] GET /api/campaigns - Token:', { hasToken: !!token, userId: token?.sub })
  
  // Validate session
  const userId = token?.sub as string | undefined
  if (!userId) {
    console.log('[DEBUG] GET /api/campaigns - No userId found, returning 401')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // DEBUG: Log user info for diagnosis
    console.log('[DEBUG] GET /api/campaigns - User authenticated:', userId)

    // DEBUG: Check total campaigns in database (without filter)
    const totalCampaignsInDb = await db.campaign.count()
    console.log('[DEBUG] GET /api/campaigns - Total campaigns in DB:', totalCampaignsInDb)

    // DEBUG: Check campaigns without createdBy
    const campaignsWithoutCreator = await db.campaign.count({
      where: { createdBy: null }
    })
    console.log('[DEBUG] GET /api/campaigns - Campaigns without createdBy:', campaignsWithoutCreator)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build query conditions - ALWAYS filter by authenticated user
    const conditions: any = {
      createdBy: userId
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
      console.log('[DEBUG] GET /api/campaigns - Searching with createdBy filter:', userId)
    } else {
      console.log('[DEBUG] GET /api/campaigns - Filtering by userId:', userId)
    }
    
    console.log('[DEBUG] GET /api/campaigns - Final query conditions:', JSON.stringify(conditions))

    // Get total count
    const total = await db.campaign.count({ where: conditions })

    // Query campaigns from database
    const campaigns = await db.campaign.findMany({
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
  // Get session for authentication using getToken
  const token = await getToken({ req: request })
  
  // DEBUG: Log authentication attempt first
  console.log('[DEBUG] POST /api/campaigns - Token:', { hasToken: !!token, userId: token?.sub })
  
  // Validate session
  const userId = token?.sub as string | undefined
  if (!userId) {
    console.log('[DEBUG] POST /api/campaigns - No userId found, returning 401')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    
    // DEBUG: Log user info for diagnosis
    console.log('[DEBUG] POST /api/campaigns - User authenticated:', userId)
    
    const {
      name,
      type,
      description,
      audienceSegmentId,
      messageContent,
      schedule,
      fromNumber,
    } = body

    // Build data object conditionally
    const campaignData: any = {
      name,
      type: type || 'broadcast',
      status: 'draft',
      messageContent,
      whatsappNumberId: fromNumber || null, // Issue 3 fix - store fromNumber
      stats: JSON.stringify({
        totalSent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        clicked: 0
      })
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

    // Add createdBy from token
    if (userId) {
      campaignData.createdBy = userId
      console.log('[DEBUG] POST /api/campaigns - Setting createdBy:', userId)
    } else {
      console.log('[DEBUG] POST /api/campaigns - WARNING: userId is missing!')
    }

    // Create new campaign
    const campaign = await db.campaign.create({
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
