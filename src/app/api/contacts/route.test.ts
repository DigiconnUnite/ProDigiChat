import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { DELETE, GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { requireRole } from '@/lib/rbac'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

jest.mock('@/lib/rbac', () => ({
  requireRole: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('contacts route', () => {
  const mockedGetToken = getToken as any
  const mockedRequireRole = requireRole as any
  const mockedPrisma = prisma as any

  beforeEach(() => {
    jest.clearAllMocks()
    mockedRequireRole.mockImplementation(async () => null)
  })

  it('returns 401 for POST when token has no organization', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: null }))

    const response = await POST({
      json: async () => ({ firstName: 'John', phoneNumber: '+123' }),
    } as any)

    expect(response.status).toBe(401)
  })

  it('returns role denial for POST when RBAC fails', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedRequireRole.mockImplementation(async () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const response = await POST({
      json: async () => ({ firstName: 'John', phoneNumber: '+123' }),
    } as any)

    expect(response.status).toBe(403)
  })

  it('creates contact with normalized phone and proper tags serialization', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedPrisma.contact.findFirst.mockResolvedValue(null)
    mockedPrisma.contact.create.mockResolvedValue({ id: 'c-1' })

    const response = await POST({
      json: async () => ({
        firstName: '  John  ',
        lastName: ' Doe ',
        phoneNumber: '+1 (234) 567-8900',
        email: ' john@example.com ',
        tags: ['vip', 'lead'],
        attributes: { source: 'api' },
        optInStatus: 'opted_in',
      }),
    } as any)

    expect(response.status).toBe(201)
    expect(mockedPrisma.contact.create).toHaveBeenCalledTimes(1)

    const payload = mockedPrisma.contact.create.mock.calls[0][0].data
    expect(payload.phoneNumber).toBe('+12345678900')
    expect(payload.tags).toBe(JSON.stringify(['vip', 'lead']))
    expect(payload.organizationId).toBe('org-1')
    expect(payload.lifecycleStatus).toBe('lead')
  })

  it('clamps GET limit to max 100 and filters by org + non-deleted', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedPrisma.contact.findMany.mockResolvedValue([])
    mockedPrisma.contact.count.mockResolvedValue(0)

    const response = await GET({
      url: 'http://localhost/api/contacts?page=1&limit=999',
    } as any)

    expect(response.status).toBe(200)
    expect(mockedPrisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          organizationId: 'org-1',
          isDeleted: { not: true },
        }),
      }),
    )
  })

  it('soft deletes contact by default', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedPrisma.contact.findFirst.mockResolvedValue({ id: 'c-1' })
    mockedPrisma.contact.update.mockResolvedValue({ id: 'c-1', isDeleted: true })

    const response = await DELETE({
      url: 'http://localhost/api/contacts?id=c-1',
    } as any)

    expect(response.status).toBe(200)
    expect(mockedPrisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c-1' },
        data: expect.objectContaining({
          isDeleted: true,
          lifecycleStatus: 'suppressed',
        }),
      }),
    )
  })
})
