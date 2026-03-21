import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request })
  return token?.sub || null
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

export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const defaultOptInStatus = formData.get('defaultOptInStatus') as string || 'pending'
    const tagsParam = formData.get('tags') as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 })
    }

    // Parse tags from comma-separated string
    const defaultTags = tagsParam ? JSON.parse(tagsParam) : []

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(arrayBuffer)
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'CSV file is empty or has no data rows'
      }, { status: 400 })
    }

    // Parse header
    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
    
    // Find column indices
    const firstNameIdx = headers.findIndex(h => h === 'firstname' || h === 'first-name' || h === 'first_name')
    const lastNameIdx = headers.findIndex(h => h === 'lastname' || h === 'last-name' || h === 'last_name')
    const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phone_number' || h === 'phone-number' || h === 'phonenumber')
    const emailIdx = headers.findIndex(h => h === 'email')
    const tagsIdx = headers.findIndex(h => h === 'tags')

    const errors: string[] = []
    let imported = 0
    let skipped = 0

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])
      const rowNumber = i + 1

      try {
        const firstName = row[firstNameIdx] || ''
        const lastName = row[lastNameIdx] || ''
        const phoneNumber = row[phoneIdx] || ''
        const email = row[emailIdx] || ''
        const rowTags = row[tagsIdx] || ''

        // Validate required fields
        if (!phoneNumber) {
          errors.push(`Row ${rowNumber}: Phone number is required`)
          skipped++
          continue
        }

        // Parse tags (from CSV or default)
        const tagsArray = rowTags 
          ? [...new Set([...defaultTags, ...rowTags.split(',').map((t) => t.trim())])]
          : defaultTags

        // Check if contact already exists for this user
        const existingContact = await prisma.contact.findFirst({
          where: { 
            phoneNumber,
            userId: userId as string
          } as any
        })

        if (existingContact) {
          skipped++
          continue
        }

        // Create contact - associate with authenticated user
        await prisma.contact.create({
          data: {
            firstName,
            lastName,
            phoneNumber,
            email,
            tags: JSON.stringify(tagsArray),
            attributes: JSON.stringify({}),
            optInStatus: defaultOptInStatus,
            userId: userId as string,
          } as any
        })

        imported++
      } catch (rowError: any) {
        errors.push(`Row ${rowNumber}: ${rowError.message}`)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 50) // Limit errors to 50
    })
  } catch (error: any) {
    console.error('Error importing contacts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import contacts'
    }, { status: 500 })
  }
}
