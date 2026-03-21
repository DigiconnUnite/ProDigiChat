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

// GET /api/segments - Get all segments for the authenticated user
export async function GET(request: NextRequest) {
  const unauthorizedResponse = await validateSession(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeCount = searchParams.get('includeCount') === 'true'

    // Always filter by authenticated user
    const segments = await prisma.segment.findMany({
      where: {
        createdBy: userId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: includeCount }
        },
        creator: {
          select: { name: true }
        }
      }
    })

    // Transform to add member count
    const transformedSegments = segments.map(segment => ({
      id: segment.id,
      name: segment.name,
      rules: segment.rules,
      memberCount: segment._count?.members || 0,
      createdBy: segment.creator?.name,
      createdAt: segment.createdAt
    }))

    return NextResponse.json({
      success: true,
      data: transformedSegments
    })
  } catch (error) {
    console.error('Error fetching segments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch segments' },
      { status: 500 }
    )
  }
}

// POST /api/segments - Create a new segment
export async function POST(request: NextRequest) {
  const unauthorizedResponse = await validateSession(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    const { name, rules } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Segment name is required' },
        { status: 400 }
      )
    }

    // Create segment with authenticated user as owner
    const segment = await prisma.segment.create({
      data: {
        name,
        rules: JSON.stringify(rules || []),
        createdBy: userId
      }
    })

    return NextResponse.json({
      success: true,
      data: segment
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating segment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create segment' },
      { status: 500 }
    )
  }
}
