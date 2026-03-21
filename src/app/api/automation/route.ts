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
    const status = searchParams.get('status') || ''

    // Build query conditions - always filter by authenticated user
    const conditions: any = {
      createdBy: userId
    }
    if (status) conditions.status = status

    // Query automation workflows from database
    const workflows = await prisma.automationWorkflow.findMany({
      where: conditions,
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      include: {
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
      data: workflows,
      total: workflows.length
    })
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch workflows'
    }, { status: 500 })
  }
}

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
    const { 
      name, 
      trigger, 
      nodes, 
      status 
    } = body

    // Create new automation workflow with authenticated user as owner
    const workflow = await prisma.automationWorkflow.create({
      data: {
        name,
        trigger: trigger || {},
        nodes: nodes || [],
        createdBy: userId,
        status: status || 'draft'
      }
    })

    return NextResponse.json({
      success: true,
      data: workflow
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating workflow:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create workflow'
    }, { status: 500 })
  }
}
