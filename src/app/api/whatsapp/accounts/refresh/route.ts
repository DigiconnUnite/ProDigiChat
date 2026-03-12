/**
 * WhatsApp Account Refresh API
 * 
 * Refreshes WhatsApp Business Account details from Meta API.
 * This allows updating account information without reconnecting.
 * 
 * API: POST /api/whatsapp/accounts/refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import axios from 'axios';

const META_API_VERSION = 'v18.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(request: NextRequest) {
  try {
    // Get organization ID from session
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get the credential from database
    const credential = await prisma.whatsAppCredential.findUnique({
      where: { id: accountId, organizationId: orgId },
      include: { phoneNumbers: true }
    });

    if (!credential) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get the access token (handle encryption)
    const accessToken = (credential as any).accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token not found. Please reconnect your account.' }, { status: 400 });
    }

    const wabaId = credential.businessAccountId;

    // Fetch fresh WABA account details from Meta API
    let wabaDetails: any = null;
    try {
      const wabaResponse = await axios.get(
        `${GRAPH_BASE_URL}/${wabaId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            fields: 'id,name,message_template_namespace,currency,timezone_id,account_review_status,business_type,primary_business_location,owner_business_info'
          }
        }
      );
      wabaDetails = wabaResponse.data;
    } catch (error: any) {
      console.error('Error fetching WABA details:', error.response?.data || error.message);
      return NextResponse.json({ 
        error: 'Failed to fetch account details from Meta. Your token may have expired.',
        code: 'TOKEN_EXPIRED'
      }, { status: 400 });
    }

    // Fetch fresh phone numbers from Meta API
    let phoneNumbers: any[] = [];
    try {
      const phonesResponse = await axios.get(
        `${GRAPH_BASE_URL}/${wabaId}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            fields: 'id,verified_name,display_phone_number,certified_wa_phone_number,verification_status,quality_score,code_verification_status,messaging_limit_tier,status,name_status',
            limit: 100
          }
        }
      );
      phoneNumbers = phonesResponse.data.data || [];
    } catch (error: any) {
      console.error('Error fetching phone numbers:', error.response?.data || error.message);
      // Continue with existing phone numbers if this fails
    }

    // Update credential with fresh WABA details
    await prisma.whatsAppCredential.update({
      where: { id: accountId },
      data: {
        businessAccountName: wabaDetails.name,
        messageTemplateNamespace: wabaDetails.message_template_namespace,
        currency: wabaDetails.currency,
        timezoneId: wabaDetails.timezone_id,
        accountReviewStatus: wabaDetails.account_review_status,
        businessType: wabaDetails.business_type,
        businessLocation: wabaDetails.primary_business_location,
        // Update owner business info
        ownerBusinessId: wabaDetails.owner_business_info?.id,
        ownerBusinessName: wabaDetails.owner_business_info?.name,
        ownerBusinessPhone: wabaDetails.owner_business_info?.primary_phone,
        ownerBusinessEmail: wabaDetails.owner_business_info?.primary_email,
        ownerBusinessAddress: wabaDetails.owner_business_info?.address,
        lastVerifiedAt: new Date(),
        updatedAt: new Date()
      } as any
    });

    // Update phone numbers
    if (phoneNumbers.length > 0) {
      // Delete existing phone numbers
      await prisma.whatsAppPhoneNumber.deleteMany({
        where: { credentialId: accountId }
      });

      // Create new phone numbers
      const defaultPhoneNumberId = credential.phoneNumberId;
      await prisma.whatsAppPhoneNumber.createMany({
        data: phoneNumbers.map((phone: any, index: number) => ({
          credentialId: accountId,
          displayName: phone.verified_name || phone.display_phone_number || phone.certified_wa_phone_number || 'Unknown',
          phoneNumber: phone.certified_wa_phone_number || phone.id,
          verifiedWaPhoneNumber: phone.certified_wa_phone_number,
          verificationStatus: phone.verification_status || 'PENDING',
          codeVerificationStatus: phone.code_verification_status || 'PENDING',
          qualityScore: phone.quality_score || '',
          qualityRating: phone.quality_score || '',
          // Additional fields
          messagingLimitTier: phone.messaging_limit_tier,
          phoneNumberStatus: phone.status,
          nameStatus: phone.name_status,
          isDefault: phone.id === defaultPhoneNumberId || index === 0,
          isVerified: phone.verification_status === 'VERIFIED'
        }))
      });
    }

    // Fetch updated credential
    const updatedCredential = await prisma.whatsAppCredential.findUnique({
      where: { id: accountId },
      include: { phoneNumbers: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Account details refreshed successfully',
      account: {
        id: updatedCredential?.id,
        accountName: updatedCredential?.accountName,
        businessAccountId: updatedCredential?.businessAccountId,
        businessAccountName: updatedCredential?.businessAccountName,
        currency: (updatedCredential as any)?.currency,
        timezoneId: (updatedCredential as any)?.timezoneId,
        accountReviewStatus: (updatedCredential as any)?.accountReviewStatus,
        businessType: (updatedCredential as any)?.businessType,
        businessLocation: (updatedCredential as any)?.businessLocation,
        // Owner business info
        ownerBusinessId: (updatedCredential as any)?.ownerBusinessId,
        ownerBusinessName: (updatedCredential as any)?.ownerBusinessName,
        ownerBusinessPhone: (updatedCredential as any)?.ownerBusinessPhone,
        ownerBusinessEmail: (updatedCredential as any)?.ownerBusinessEmail,
        ownerBusinessAddress: (updatedCredential as any)?.ownerBusinessAddress,
        phoneNumbers: updatedCredential?.phoneNumbers
      }
    });

  } catch (error: any) {
    console.error('Error refreshing WhatsApp account:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to refresh account details' 
    }, { status: 500 });
  }
}
