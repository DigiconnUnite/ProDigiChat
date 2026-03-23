import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request })
  return token?.sub || null
}

async function getUserAndOrgId(request: NextRequest): Promise<{ userId: string | null; organizationId: string | null }> {
  const token = await getToken({ req: request })
  return {
    userId: token?.sub || null,
    organizationId: token?.organizationId as string | null
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const tags = searchParams.get('tags') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query conditions - ALWAYS filter by authenticated user
    const conditions: any = {
      userId: userId,
      organizationId: { not: null }
    }
    
    if (status && status !== 'all') {
      conditions.optInStatus = status
    }
    
    if (tags) {
      conditions.tags = { contains: tags }
    }

    if (search) {
      conditions.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build orderBy object based on sortBy parameter
    const orderBy: any = {}
    switch (sortBy) {
      case 'firstName':
        orderBy.firstName = sortOrder
        break
      case 'phoneNumber':
        orderBy.phoneNumber = sortOrder
        break
      case 'optInStatus':
        orderBy.optInStatus = sortOrder
        break
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder
        break
    }

    // Query contacts from database with sorting - filter by userId
    const [contacts, total, optedInCount, optedOutCount, pendingCount] = await Promise.all([
      prisma.contact.findMany({
        where: conditions,
        orderBy,
        skip,
        take: limit
      }),
      prisma.contact.count({ where: conditions }),
      prisma.contact.count({ where: { ...conditions, optInStatus: 'opted_in' } }),
      prisma.contact.count({ where: { ...conditions, optInStatus: 'opted_out' } }),
      prisma.contact.count({ where: { ...conditions, optInStatus: 'pending' } }),
    ])

    return NextResponse.json({
      success: true,
      data: contacts,
      total,
      page,
      limit,
      optedIn: optedInCount,
      optedOut: optedOutCount,
      pending: pendingCount
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contacts'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized - organization not found' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { firstName, lastName, phoneNumber, email, tags, attributes, optInStatus } = body

    // Check if contact already exists for this user
    const existingContact = await prisma.contact.findFirst({
      where: {
        phoneNumber: phoneNumber,
        userId: userId
      }
    })

    if (existingContact) {
      return NextResponse.json({
        success: false,
        error: 'A contact with this phone number already exists'
      }, { status: 409 })
    }

    // Create new contact - associate with authenticated user
    const contact = await prisma.contact.create({
      data: {
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber,
        email: email || '',
        tags: JSON.stringify(tags || []),
        attributes: JSON.stringify(attributes || {}),
        optInStatus: optInStatus || 'pending',
        userId: userId,
        organizationId: organizationId,
      }
    })

    return NextResponse.json({
      success: true,
      data: contact
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'A contact with this phone number already exists'
      }, { status: 409 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create contact'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { id, firstName, lastName, phoneNumber, email, tags, attributes, optInStatus } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Contact ID is required'
      }, { status: 400 })
    }

    // Verify contact belongs to the authenticated user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: userId
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found or access denied'
      }, { status: 404 })
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phoneNumber,
        email,
        tags: JSON.stringify(tags || []),
        attributes: JSON.stringify(attributes || {}),
        optInStatus,
      }
    })

    return NextResponse.json({
      success: true,
      data: contact
    })
  } catch (error: any) {
    console.error('Error updating contact:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update contact'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Contact ID is required'
      }, { status: 400 })
    }

    // Verify contact belongs to the authenticated user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: userId
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found or access denied'
      }, { status: 404 })
    }

    // Delete contact
    await prisma.contact.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting contact:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete contact'
    }, { status: 500 })
  }
}
