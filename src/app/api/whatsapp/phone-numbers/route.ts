import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getToken } from 'next-auth/jwt'
import { getDefaultOrgId } from '@/lib/settings-storage'
import { rateLimit } from '@/lib/rate-limit'

async function getOrganizationId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request })
  if (!token) {
    return null
  }
  
  // Try to get orgId from query params first
  const { searchParams } = new URL(request.url)
  const orgIdParam = searchParams.get('orgId')
  
  if (orgIdParam) {
    return orgIdParam
  }
  
  // Try to get from token
  if (token.orgId) {
    return token.orgId as string
  }
  
  // Fallback to default org
  return getDefaultOrgId()
}

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

// GET /api/whatsapp/phone-numbers - Get all WhatsApp phone numbers
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, 'phone-numbers');
  
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const unauthorizedResponse = await validateSession(request)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const orgId = await getOrganizationId(request)
    console.log('Fetching phone numbers for orgId:', orgId)
    
    const allNumbers: any[] = []

    // 1. Get WhatsApp credentials to find related phone numbers
    // Use findMany since organizationId is not unique
    const creds = await db.whatsAppCredential.findMany({
      where: orgId ? { organizationId: orgId, isActive: true } : { isActive: true },
      include: {
        phoneNumbers: true
      }
    })
    
    const credIds = creds.map(c => c.id)
    
    // Get all phone numbers from WhatsAppPhoneNumber model
    const phoneNumbers = await db.whatsAppPhoneNumber.findMany({
      where: credIds.length > 0 ? { credentialId: { in: credIds } } : undefined,
      orderBy: {
        createdAt: 'desc'
      }
    })

    allNumbers.push(...phoneNumbers.map(p => ({
      id: p.id,
      phoneNumber: p.phoneNumber,
      displayName: p.displayName || p.phoneNumber,
      qualityScore: p.qualityScore,
      isDefault: p.isDefault,
      source: 'oauth'
    })))

    // 2. Get from legacy WhatsAppNumber model
    const legacyNumbers = await db.whatsappNumber.findMany({})
    
    allNumbers.push(...legacyNumbers.map(n => ({
      id: n.id,
      phoneNumber: n.phoneNumber,
      displayName: n.phoneNumber,
      qualityScore: n.qualityRating,
      isDefault: false,
      source: 'legacy'
    })))

    // 3. Add phone numbers from credentials (including phoneNumberId field)
    for (const cred of creds) {
      // Add phone number from credential if exists
      if (cred.phoneNumberId) {
        const exists = allNumbers.find(n => n.phoneNumber === cred.phoneNumberId)
        if (!exists) {
          allNumbers.push({
            id: cred.phoneNumberId,
            phoneNumber: cred.phoneNumberId,
            displayName: cred.phoneNumberId,
            qualityScore: null,
            isDefault: true,
            source: 'credential'
          })
        }
      }
      
      // Add any phone numbers from the relation
      for (const pn of cred.phoneNumbers || []) {
        const exists = allNumbers.find(n => n.id === pn.id)
        if (!exists) {
          allNumbers.push({
            id: pn.id,
            phoneNumber: pn.phoneNumber,
            displayName: pn.displayName || pn.phoneNumber,
            qualityScore: pn.qualityScore,
            isDefault: pn.isDefault,
            source: 'credential'
          })
        }
      }
    }

    // Remove duplicates by phone number
    const uniqueNumbers = allNumbers.filter((item, index, self) => 
      index === self.findIndex((t) => t.phoneNumber === item.phoneNumber)
    )

    console.log('Found phone numbers:', uniqueNumbers.length)

    return NextResponse.json({
      success: true,
      data: uniqueNumbers
    }, {
      headers: rateLimitResult.headers,
    })
  } catch (error) {
    console.error('Error fetching WhatsApp phone numbers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch phone numbers' },
      { status: 500 }
    )
  }
}
