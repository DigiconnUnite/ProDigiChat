import { prisma } from '@/lib/prisma'

type ImportJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface ContactImportJob {
  id: string
  organizationId: string
  userId: string
  status: ImportJobStatus
  progress: number
  totalRows: number
  processedRows: number
  imported: number
  skipped: number
  errors: string[]
  createdAt: string
  updatedAt: string
  finishedAt?: string
}

function parseErrors(errors: string): string[] {
  try {
    const parsed = JSON.parse(errors)
    return Array.isArray(parsed) ? parsed.map((e) => String(e)) : []
  } catch {
    return []
  }
}

function getContactImportJobModel(): any {
  const model = (prisma as any).contactImportJob
  if (!model) {
    throw new Error('Prisma ContactImportJob model is not available. Run prisma generate after schema update.')
  }
  return model
}

function toDto(job: {
  id: string
  organizationId: string
  userId: string
  status: string
  progress: number
  totalRows: number
  processedRows: number
  imported: number
  skipped: number
  errors: string
  createdAt: Date
  updatedAt: Date
  finishedAt: Date | null
}): ContactImportJob {
  return {
    id: job.id,
    organizationId: job.organizationId,
    userId: job.userId,
    status: job.status as ImportJobStatus,
    progress: job.progress,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    imported: job.imported,
    skipped: job.skipped,
    errors: parseErrors(job.errors),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : undefined,
  }
}

export async function createContactImportJob(input: { organizationId: string; userId: string }): Promise<ContactImportJob> {
  const model = getContactImportJobModel()
  const job = await model.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      status: 'queued',
      progress: 0,
      totalRows: 0,
      processedRows: 0,
      imported: 0,
      skipped: 0,
      errors: '[]',
    },
  })

  return toDto(job)
}

export async function getContactImportJob(id: string): Promise<ContactImportJob | null> {
  const model = getContactImportJobModel()
  const job = await model.findUnique({ where: { id } })
  return job ? toDto(job) : null
}

export async function updateContactImportJob(id: string, updates: Partial<ContactImportJob>): Promise<ContactImportJob | null> {
  const model = getContactImportJobModel()
  const existing = await model.findUnique({ where: { id } })
  if (!existing) {
    return null
  }

  const job = await model.update({
    where: { id },
    data: {
      status: updates.status,
      progress: updates.progress,
      totalRows: updates.totalRows,
      processedRows: updates.processedRows,
      imported: updates.imported,
      skipped: updates.skipped,
      errors: updates.errors ? JSON.stringify(updates.errors) : undefined,
      finishedAt: updates.finishedAt ? new Date(updates.finishedAt) : undefined,
    },
  })

  return toDto(job)
}

export async function completeContactImportJob(id: string, updates: Partial<ContactImportJob>): Promise<ContactImportJob | null> {
  return updateContactImportJob(id, {
    ...updates,
    status: updates.status || 'completed',
    progress: 100,
    finishedAt: new Date().toISOString(),
  })
}

export async function failContactImportJob(id: string, errorMessage: string): Promise<ContactImportJob | null> {
  const job = await getContactImportJob(id)
  const errors = [...(job?.errors || []), errorMessage]
  return completeContactImportJob(id, {
    status: 'failed',
    errors,
  })
}

export async function clearContactImportJobsForTests(): Promise<void> {
  const model = getContactImportJobModel()
  await model.deleteMany({})
}
