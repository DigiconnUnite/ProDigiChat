import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { requireRole } from '@/lib/rbac'
import {
  completeContactImportJob,
  createContactImportJob,
  failContactImportJob,
  getContactImportJob,
  updateContactImportJob,
} from '@/lib/contact-import-jobs'

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

const ALLOWED_OPT_IN_STATUS = new Set(['opted_in', 'opted_out', 'pending'])
const ASYNC_IMPORT_ROW_THRESHOLD = 1000

type ImportProgressUpdate = {
  totalRows?: number
  processedRows?: number
  imported?: number
  skipped?: number
  progress?: number
  errors?: string[]
  status?: 'queued' | 'processing' | 'completed' | 'failed'
}

type ProcessImportInput = {
  csvText: string
  defaultOptInStatus: string
  defaultTags: string[]
  userId: string
  organizationId: string
  onProgress?: (update: ImportProgressUpdate) => void
}

function buildDisplayName(firstName: string, lastName: string, phoneNumber: string): string {
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || phoneNumber
}

function normalizePhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '')
  return cleaned.replace(/(?!^)\+/g, '')
}

function parseTagsInput(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))]
  }

  if (typeof tags === 'string') {
    const trimmed = tags.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((tag) => String(tag).trim()).filter(Boolean))]
      }
    } catch {
      return [...new Set(trimmed.split(',').map((tag) => tag.trim()).filter(Boolean))]
    }
  }

  return []
}

// Simple CSV line parser (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''))
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''))
  return result
}

async function processImportRows(input: ProcessImportInput): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { csvText, defaultOptInStatus, defaultTags, userId, organizationId, onProgress } = input

  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows')
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())

  const firstNameIdx = headers.findIndex(h => h === 'firstname' || h === 'first-name' || h === 'first_name')
  const lastNameIdx = headers.findIndex(h => h === 'lastname' || h === 'last-name' || h === 'last_name')
  const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phone_number' || h === 'phone-number' || h === 'phonenumber')
  const emailIdx = headers.findIndex(h => h === 'email')
  const tagsIdx = headers.findIndex(h => h === 'tags')

  if (phoneIdx < 0) {
    throw new Error('Missing required phoneNumber column in CSV header')
  }

  const totalDataRows = lines.length - 1
  const errors: string[] = []
  let skipped = 0

  onProgress?.({ totalRows: totalDataRows, status: 'processing', progress: 1 })

  const candidateRows: Array<{
    rowNumber: number
    firstName: string
    lastName: string
    phoneNumber: string
    email: string
    tags: string[]
  }> = []

  const seenPhones = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    const rowNumber = i + 1

    try {
      const firstName = firstNameIdx >= 0 ? (row[firstNameIdx] || '').trim() : ''
      const lastName = lastNameIdx >= 0 ? (row[lastNameIdx] || '').trim() : ''
      const rawPhoneNumber = row[phoneIdx] || ''
      const phoneNumber = normalizePhoneNumber(rawPhoneNumber)
      const email = emailIdx >= 0 ? (row[emailIdx] || '').trim() : ''
      const rowTags = row[tagsIdx] || ''

      if (!phoneNumber) {
        errors.push(`Row ${rowNumber}: Phone number is required`)
        skipped++
      } else if (seenPhones.has(phoneNumber)) {
        errors.push(`Row ${rowNumber}: Duplicate phone number in file (${phoneNumber})`)
        skipped++
      } else {
        seenPhones.add(phoneNumber)
        const tagsArray = rowTags
          ? [...new Set([...defaultTags, ...rowTags.split(',').map((t) => t.trim()).filter(Boolean)])]
          : defaultTags

        candidateRows.push({
          rowNumber,
          firstName,
          lastName,
          phoneNumber,
          email,
          tags: tagsArray,
        })
      }
    } catch (rowError: any) {
      errors.push(`Row ${rowNumber}: ${rowError.message}`)
      skipped++
    }

    if (i % 100 === 0 || i === lines.length - 1) {
      const parseProgress = Math.floor((i / (lines.length - 1)) * 50)
      onProgress?.({ processedRows: i, skipped, errors: errors.slice(0, 50), progress: Math.max(1, parseProgress) })
    }
  }

  const uniquePhones = candidateRows.map((row) => row.phoneNumber)
  const existingContacts = uniquePhones.length > 0
    ? await prisma.contact.findMany({
        where: {
          organizationId,
          phoneNumber: { in: uniquePhones },
        },
        select: { phoneNumber: true },
      })
    : []

  const existingPhoneSet = new Set(existingContacts.map((contact) => contact.phoneNumber))
  const rowsToCreate = candidateRows.filter((row) => {
    if (existingPhoneSet.has(row.phoneNumber)) {
      errors.push(`Row ${row.rowNumber}: Contact already exists (${row.phoneNumber})`)
      skipped++
      return false
    }
    return true
  })

  let imported = 0
  const BATCH_SIZE = 500

  for (let i = 0; i < rowsToCreate.length; i += BATCH_SIZE) {
    const batch = rowsToCreate.slice(i, i + BATCH_SIZE)
    const result = await prisma.contact.createMany({
      data: batch.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: buildDisplayName(row.firstName, row.lastName, row.phoneNumber),
        phoneNumber: row.phoneNumber,
        email: row.email,
        tags: JSON.stringify(row.tags),
        attributes: JSON.stringify({}),
        optInStatus: defaultOptInStatus,
        lifecycleStatus: 'lead',
        userId,
        organizationId,
      })),
    })

    imported += result.count

    const writeProgress = 50 + Math.floor(((i + batch.length) / Math.max(rowsToCreate.length, 1)) * 50)
    onProgress?.({
      processedRows: totalDataRows,
      imported,
      skipped,
      errors: errors.slice(0, 50),
      progress: Math.min(99, writeProgress),
    })
  }

  return {
    imported,
    skipped,
    errors: errors.slice(0, 50),
  }
}

export async function GET(request: NextRequest) {
  const { userId, organizationId } = await getUserAndOrgId(request)
  if (!userId || !organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleCheck = await requireRole(request, 'member')
  if (roleCheck) {
    return roleCheck
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 })
  }

  const job = await getContactImportJob(jobId)
  if (!job || job.organizationId !== organizationId) {
    return NextResponse.json({ success: false, error: 'Import job not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    job,
  })
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
    const formData = await request.formData()
    const file = formData.get('file') as File
    const requestedStatus = (formData.get('defaultOptInStatus') as string) || 'pending'
    const defaultOptInStatus = ALLOWED_OPT_IN_STATUS.has(requestedStatus) ? requestedStatus : 'pending'
    const tagsParam = formData.get('tags') as string
    const asyncParam = String(formData.get('async') || '') === 'true'

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 })
    }

    // Parse tags from comma-separated string
    const defaultTags = parseTagsInput(tagsParam)

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(arrayBuffer)
    const totalRows = text.split('\n').filter((line) => line.trim()).length - 1
    const shouldRunAsync = asyncParam || totalRows > ASYNC_IMPORT_ROW_THRESHOLD

    if (shouldRunAsync) {
      const job = await createContactImportJob({ organizationId, userId })

      void (async () => {
        try {
          await updateContactImportJob(job.id, { status: 'processing', progress: 1, totalRows: Math.max(totalRows, 0) })
          const result = await processImportRows({
            csvText: text,
            defaultOptInStatus,
            defaultTags,
            userId,
            organizationId,
            onProgress: (progressUpdate) => {
              void updateContactImportJob(job.id, progressUpdate)
            },
          })

          await completeContactImportJob(job.id, {
            status: 'completed',
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors,
            processedRows: Math.max(totalRows, 0),
            totalRows: Math.max(totalRows, 0),
          })
        } catch (jobError: any) {
          await failContactImportJob(job.id, jobError?.message || 'Import failed')
        }
      })()

      return NextResponse.json({
        success: true,
        async: true,
        jobId: job.id,
        job,
      }, { status: 202 })
    }

    const result = await processImportRows({
      csvText: text,
      defaultOptInStatus,
      defaultTags,
      userId,
      organizationId,
    })

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error: any) {
    console.error('Error importing contacts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import contacts'
    }, { status: 500 })
  }
}
