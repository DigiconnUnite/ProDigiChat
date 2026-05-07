import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { requireRole } from '@/lib/rbac'

// GET /api/segments - Get all segments for the authenticated user
export async function GET(request: NextRequest) {
  // RBAC: Require member role or higher to view segments
  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const token = await getToken({ req: request })
    const organizationId = token?.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeCount = searchParams.get('includeCount') === 'true'

    // Always filter by organization
    const segments = await prisma.segment.findMany({
      where: {
        organizationId
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
  // RBAC: Require member role or higher to create segments
  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string
    const organizationId = (token?.organizationId || token?.orgId) as string

    if (!userId || !organizationId) {
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

    // Create segment with organization
    const segment = await prisma.segment.create({
      data: {
        name,
        rules: JSON.stringify(rules || []),
        organizationId,
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
