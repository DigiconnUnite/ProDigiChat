import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { requireRole } from '@/lib/rbac'
import { clearContactImportJobsForTests } from '@/lib/contact-import-jobs'

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
      createMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/contact-import-jobs', () => {
  const jobs = new Map<string, any>()

  return {
    createContactImportJob: jest.fn(async ({ organizationId, userId }) => {
      const id = `job-${Math.random().toString(36).slice(2)}`
      const now = new Date().toISOString()
      const job = {
        id,
        organizationId,
        userId,
        status: 'queued',
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        createdAt: now,
        updatedAt: now,
      }
      jobs.set(id, job)
      return job
    }),
    getContactImportJob: jest.fn(async (id: string) => jobs.get(id) || null),
    updateContactImportJob: jest.fn(async (id: string, updates: any) => {
      const existing = jobs.get(id)
      if (!existing) return null
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      jobs.set(id, updated)
      return updated
    }),
    completeContactImportJob: jest.fn(async (id: string, updates: any) => {
      const existing = jobs.get(id)
      if (!existing) return null
      const updated = {
        ...existing,
        ...updates,
        status: updates.status || 'completed',
        progress: 100,
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      jobs.set(id, updated)
      return updated
    }),
    failContactImportJob: jest.fn(async (id: string, errorMessage: string) => {
      const existing = jobs.get(id)
      if (!existing) return null
      const updated = {
        ...existing,
        status: 'failed',
        progress: 100,
        errors: [...(existing.errors || []), errorMessage],
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      jobs.set(id, updated)
      return updated
    }),
    clearContactImportJobsForTests: jest.fn(async () => jobs.clear()),
  }
})

describe('contacts import route', () => {
  const mockedGetToken = getToken as any
  const mockedRequireRole = requireRole as any
  const mockedPrisma = prisma as any

  beforeEach(() => {
    jest.clearAllMocks()
    clearContactImportJobsForTests()
    mockedGetToken.mockImplementation(async () => ({ sub: 'user-1', organizationId: 'org-1' }))
    mockedRequireRole.mockImplementation(async () => null)
    mockedPrisma.contact.findMany.mockResolvedValue([])
    mockedPrisma.contact.createMany.mockResolvedValue({ count: 1 })
  })

  it('returns role denial for import POST when RBAC fails', async () => {
    mockedRequireRole.mockImplementation(async () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const response = await POST({
      formData: async () => ({ get: () => null }),
    } as any)

    expect(response.status).toBe(403)
  })

  it('starts async import job and allows polling', async () => {
    const csvContent = 'firstName,phoneNumber\nJohn,+1234567890\n'
    const fakeFile = {
      arrayBuffer: async () => new TextEncoder().encode(csvContent).buffer,
    }

    const formData = {
      get: (key: string) => {
        const map: Record<string, any> = {
          file: fakeFile,
          defaultOptInStatus: 'pending',
          tags: '["vip"]',
          async: 'true',
        }
        return map[key] ?? null
      },
    }

    const postResponse = await POST({
      formData: async () => formData,
      url: 'http://localhost/api/contacts/import',
    } as any)

    expect(postResponse.status).toBe(202)
    const started = await postResponse.json()
    expect(started.success).toBe(true)
    expect(started.jobId).toBeTruthy()

    let jobPayload: any = null
    for (let attempt = 0; attempt < 20; attempt++) {
      const pollResponse = await GET({
        url: `http://localhost/api/contacts/import?jobId=${started.jobId}`,
      } as any)

      jobPayload = await pollResponse.json()
      if (jobPayload?.job?.status === 'completed') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    expect(jobPayload.success).toBe(true)
    expect(['queued', 'processing', 'completed']).toContain(jobPayload.job.status)
  })
})
