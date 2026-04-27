import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: jest.fn(),
    },
  },
}))

describe('contacts export route', () => {
  const mockedGetToken = getToken as any
  const mockedPrisma = prisma as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when missing org in token', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: null }))

    const response = await GET({ url: 'http://localhost/api/contacts/export' } as any)
    expect(response.status).toBe(401)
  })

  it('exports filtered contacts CSV for organization', async () => {
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedPrisma.contact.findMany.mockResolvedValue([
      {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        optInStatus: 'opted_in',
        tags: '["vip"]',
      },
    ])

    const response = await GET({
      url: 'http://localhost/api/contacts/export?status=opted_in&lifecycleStatus=active',
    } as any)

    expect(response.status).toBe(200)
    expect(mockedPrisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          isDeleted: { not: true },
          optInStatus: 'opted_in',
          lifecycleStatus: 'active',
        }),
      }),
    )

    const csv = await response.text()
    expect(csv).toContain('First Name,Last Name,Phone,Email,Status,Tags')
    expect(csv).toContain('"John"')
    expect(csv).toContain('"+1234567890"')
  })
})
