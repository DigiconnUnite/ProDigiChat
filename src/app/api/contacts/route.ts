import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"
import { hasRole, getUserOrganizationRole, requireRole } from "@/lib/rbac"
import { parseTags, stringifyTags, parseAttributes, stringifyAttributes } from "@/types/common"

const MAX_LIMIT = 100
const ALLOWED_LIFECYCLE_STATUS = new Set(['lead', 'active', 'suppressed', 'blocked', 'bounced'])

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

function normalizePhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '')
  return cleaned.replace(/(?!^)\+/g, '')
}

// Use standardized parsing functions from common types
function parseTagsInput(tags: unknown): string[] {
  return parseTags(tags as string | string[] | null);
}

function parseAttributesInput(attributes: unknown): Record<string, unknown> {
  return parseAttributes(attributes as string | Record<string, unknown> | null);
}

function normalizeLifecycleStatus(status: unknown): string {
  const normalized = String(status || 'lead').trim().toLowerCase()
  return ALLOWED_LIFECYCLE_STATUS.has(normalized) ? normalized : 'lead'
}

function buildDisplayName(firstName: string, lastName: string, phoneNumber: string): string {
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || phoneNumber
}

export async function GET(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const tags = searchParams.get('tags') || ''
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : 10
    const skip = (page - 1) * limit

    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrderParam = searchParams.get('sortOrder') || 'desc'
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc'

    // Build query conditions - filter by organization
    const conditions: any = {
      organizationId: organizationId
    }

    if (!includeDeleted) {
      conditions.isDeleted = { not: true }
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

    // Query contacts from database with sorting - filter by organizationId
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

  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const body = await request.json()
    const { firstName, lastName, phoneNumber, email, tags, attributes, optInStatus } = body

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber || '')
    if (!normalizedPhoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    // Check if contact already exists for this organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        phoneNumber: normalizedPhoneNumber,
        organizationId: organizationId
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
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        phoneNumber: normalizedPhoneNumber,
        email: email?.trim() || '',
        tags: JSON.stringify(parseTagsInput(tags)),
        attributes: JSON.stringify(parseAttributesInput(attributes)),
        optInStatus: optInStatus || 'pending',
        displayName: buildDisplayName(firstName?.trim() || '', lastName?.trim() || '', normalizedPhoneNumber),
        optInAt: optInStatus === 'opted_in' ? new Date() : null,
        optOutAt: optInStatus === 'opted_out' ? new Date() : null,
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
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // RBAC: Require manager role or higher to edit contacts
  const roleCheck = await requireRole(request, 'manager')
  if (roleCheck) {
    return roleCheck
  }

  try {
    const body = await request.json()
    const { id, firstName, lastName, phoneNumber, email, tags, attributes, optInStatus } = body

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber || '')
    if (!normalizedPhoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Contact ID is required'
      }, { status: 400 })
    }

    // Verify contact belongs to the organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId: organizationId
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found or access denied'
      }, { status: 404 })
    }

    // Update contact
    const nextOptInStatus = optInStatus || existingContact.optInStatus
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        displayName: buildDisplayName(firstName?.trim() || '', lastName?.trim() || '', normalizedPhoneNumber),
        phoneNumber: normalizedPhoneNumber,
        email: email?.trim() || '',
        tags: JSON.stringify(parseTagsInput(tags)),
        attributes: JSON.stringify(parseAttributesInput(attributes)),
        optInStatus: nextOptInStatus,
        optInAt: nextOptInStatus === 'opted_in' ? new Date() : null,
        optOutAt: nextOptInStatus === 'opted_out' ? new Date() : null,
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
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const hardDelete = searchParams.get('hard') === 'true'

    // RBAC: member for soft delete, admin for hard delete
    const roleCheck = await requireRole(request, hardDelete ? 'admin' : 'member')
    if (roleCheck) {
      return roleCheck
    }

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Contact ID is required'
      }, { status: 400 })
    }

    // Verify contact belongs to the organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId: organizationId,
        ...(hardDelete ? {} : { isDeleted: { not: true } }),
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found or access denied'
      }, { status: 404 })
    }

    if (hardDelete) {
      await prisma.contact.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Contact permanently deleted'
      })
    }

    await prisma.contact.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Contact archived successfully'
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
