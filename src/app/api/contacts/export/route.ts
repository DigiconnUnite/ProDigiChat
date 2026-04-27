import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

const MAX_EXPORT_ROWS = 50000
const ALLOWED_LIFECYCLE_STATUS = new Set(['lead', 'active', 'suppressed', 'blocked', 'bounced'])

async function getUserAndOrgId(request: NextRequest): Promise<{ userId: string | null; organizationId: string | null }> {
  const token = await getToken({ req: request })
  return {
    userId: token?.sub || null,
    organizationId: token?.organizationId as string | null,
  }
}

function escapeCsvField(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags || typeof tags !== 'string') {
    return []
  }

  let parsed: unknown = tags
  for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      break
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((tag) => String(tag).trim()).filter(Boolean)
  }

  try {
    const single = JSON.parse(tags)
    if (Array.isArray(single)) {
      return single.map((tag) => String(tag).trim()).filter(Boolean)
    }
  } catch {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  }

  return []
}

export async function GET(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const lifecycleStatus = searchParams.get('lifecycleStatus') || ''
    const tags = searchParams.get('tags') || ''

    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const where: any = { organizationId, isDeleted: { not: true } }

    if (status && status !== 'all') {
      where.optInStatus = status
    }

    if (lifecycleStatus && lifecycleStatus !== 'all') {
      const normalizedLifecycle = lifecycleStatus.toLowerCase()
      if (ALLOWED_LIFECYCLE_STATUS.has(normalizedLifecycle)) {
        where.lifecycleStatus = normalizedLifecycle
      }
    }

    if (tags) {
      where.tags = { contains: tags }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

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

    const contacts = await prisma.contact.findMany({
      where,
      orderBy,
      take: MAX_EXPORT_ROWS,
    })

    const header = ['First Name', 'Last Name', 'Phone', 'Email', 'Status', 'Tags']
    const rows = contacts.map((contact) => [
      escapeCsvField(contact.firstName || ''),
      escapeCsvField(contact.lastName || ''),
      escapeCsvField(contact.phoneNumber || ''),
      escapeCsvField(contact.email || ''),
      escapeCsvField(contact.optInStatus || ''),
      escapeCsvField(parseTags(contact.tags).join(', ')),
    ])

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const filename = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting contacts:', error)
    return NextResponse.json({ error: 'Failed to export contacts' }, { status: 500 })
  }
}
