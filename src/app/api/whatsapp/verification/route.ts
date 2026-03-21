/**
 * WhatsApp Business Verification Status API
 * 
 * Checks and guides users through Meta Business verification
 * to enable sending messages to unverified phone numbers.
 * 
 * GET /api/whatsapp/verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { META_API_BASE } from '@/lib/meta-config';

const META_GRAPH_API_BASE = META_API_BASE;

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request });
  // Try both possible token shapes
  return (token?.organizationId || token?.orgId || token?.sub) as string | null;
}

/**
 * Get WhatsApp Business Account verification status
 */
async function getWABAVerificationStatus(accessToken: string, businessAccountId: string) {
  try {
    // Get business account details
    const businessResponse = await fetch(
      `${META_GRAPH_API_BASE}/${businessAccountId}?fields=id,name,verification_status,primary_email,primary_phone`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const businessData = await businessResponse.json();
    
    // Get owner business info
    const ownerResponse = await fetch(
      `${META_GRAPH_API_BASE}/${businessAccountId}/owner_business`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const ownerData = await ownerResponse.json();
    
    return {
      businessId: businessData.id,
      businessName: businessData.name,
      verificationStatus: businessData.verification_status,
      isVerified: businessData.verification_status === 'verified',
      ownerBusiness: ownerData,
    };
  } catch (error) {
    console.error('Error fetching WABA verification status:', error);
    return null;
  }
}

/**
 * Get phone number verification status
 */
async function getPhoneNumberStatus(accessToken: string, phoneNumberId: string) {
  try {
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${phoneNumberId}?fields=id,display_phone_number,code_verification_status,quality_rating,status`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const data = await response.json();
    
    return {
      phoneNumberId: data.id,
      displayNumber: data.display_phone_number,
      codeVerificationStatus: data.code_verification_status,
      qualityRating: data.quality_rating,
      status: data.status,
      isVerified: data.code_verification_status === 'VERIFIED',
    };
  } catch (error) {
    console.error('Error fetching phone number status:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's WhatsApp credentials
    const credentials = await prisma.whatsAppCredential.findFirst({
      where: { 
        organizationId: userId
      },
      include: { 
        phoneNumbers: true 
      } as any,
    });

    if (!credentials) {
      return NextResponse.json({
        connected: false,
        message: 'WhatsApp is not connected',
        verificationSteps: getVerificationSteps('not_connected'),
      });
    }

    // Get access token and business account info
    const accessToken = (credentials as any).accessToken;
    const businessAccountId = (credentials as any).businessAccountId;
    const phoneNumbers = (credentials as any).phoneNumbers || [];
    const phoneNumberId = (credentials as any).phoneNumberId || (phoneNumbers.length > 0 ? phoneNumbers[0].phoneNumber : null);

    // Get verification statuses
    const [wabaStatus, phoneStatus] = await Promise.all([
      getWABAVerificationStatus(accessToken, businessAccountId),
      phoneNumberId ? getPhoneNumberStatus(accessToken, phoneNumberId) : Promise.resolve(null),
    ]);

    // Determine overall verification level
    const verificationLevel = determineVerificationLevel(wabaStatus, phoneStatus);

    return NextResponse.json({
      connected: true,
      verification: {
        level: verificationLevel,
        business: wabaStatus,
        phoneNumber: phoneStatus,
      },
      canSendToUnverified: verificationLevel === 'full',
      message: getVerificationMessage(verificationLevel),
      verificationSteps: getVerificationSteps(verificationLevel),
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}

function determineVerificationLevel(
  wabaStatus: any,
  phoneStatus: any
): 'none' | 'phone_verified' | 'business_pending' | 'full' {
  if (!wabaStatus) return 'none';
  if (!phoneStatus) return 'none';
  
  if (phoneStatus.isVerified && wabaStatus.isVerified) {
    return 'full';
  }
  
  if (phoneStatus.isVerified && !wabaStatus.isVerified) {
    return 'business_pending';
  }
  
  if (!phoneStatus.isVerified && wabaStatus.isVerified) {
    return 'phone_verified';
  }
  
  return 'none';
}

function getVerificationMessage(level: string): string {
  switch (level) {
    case 'full':
      return '✅ Your WhatsApp Business is fully verified! You can send messages to any phone number.';
    case 'business_pending':
      return '⚠️ Phone number verified, but Business Account verification is pending. Some restrictions may apply.';
    case 'phone_verified':
      return '⚠️ Business verified, but phone number verification is pending. Complete phone verification to remove restrictions.';
    default:
      return '❌ Verification required. Complete the steps below to send messages to your contacts.';
  }
}

function getVerificationSteps(level: string): Array<{
  title: string;
  description: string;
  link?: string;
  status: 'completed' | 'pending' | 'required';
}> {
  const steps = [
    {
      title: 'Step 1: Connect WhatsApp Account',
      description: 'Connect your WhatsApp Business account via OAuth or manual setup',
      status: 'required' as const,
    },
    {
      title: 'Step 2: Verify Phone Number',
      description: 'Verify your business phone number through the Meta Developer Console',
      link: 'https://developers.facebook.com/apps/',
      status: 'required' as const,
    },
    {
      title: 'Step 3: Complete Business Verification',
      description: 'Submit your business documents for Meta verification',
      link: 'https://www.facebook.com/business/help/205851029421035',
      status: 'required' as const,
    },
  ];

  switch (level) {
    case 'full':
      return steps.map(s => ({ ...s, status: 'completed' as const }));
    case 'business_pending':
      return [
        { ...steps[0], status: 'completed' },
        { ...steps[1], status: 'completed' },
        { ...steps[2], status: 'pending' },
      ];
    case 'phone_verified':
      return [
        { ...steps[0], status: 'completed' },
        { ...steps[1], status: 'completed' },
        { ...steps[2], status: 'pending' },
      ];
    default:
      return steps;
  }
}
