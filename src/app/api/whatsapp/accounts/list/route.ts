/**
 * WhatsApp Accounts List API
 * 
 * Returns all accessible WhatsApp Business Accounts for the Business Account.
 * This includes both owned accounts and client-shared accounts.
 * 
 * API: GET /api/whatsapp/accounts/list?orgId=<organizationId>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppOAuthService } from '@/lib/whatsapp-oauth';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    // Get orgId from session if not provided
    const token = await getToken({ req: request });
    const organizationId = orgId || (token?.organizationId as string) || (token?.orgId as string);

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get credentials for this organization
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { 
        organizationId: organizationId,
        isActive: true
      },
      include: {
        phoneNumbers: true
      }
    });

    if (!credential) {
      return NextResponse.json({
        success: false,
        error: 'No WhatsApp account connected',
        accounts: []
      });
    }

    const oauthService = createWhatsAppOAuthService();
    const accounts: any[] = [];

    try {
      // Fetch owned WhatsApp Business Accounts
      // Using the business account ID to query
      const ownedResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=whatsapp_business_accounts{id,name,message_template_namespace}`,
        {
          headers: { 
            Authorization: `Bearer ${credential.accessToken}` 
          }
        }
      );

      const ownedData = await ownedResponse.json();
      
      if (ownedData.whatsapp_business_accounts?.data) {
        for (const waba of ownedData.whatsapp_business_accounts.data) {
          // Get phone numbers for each WABA
          let phoneNumbers: any[] = [];
          try {
            const phonesResponse = await fetch(
              `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?fields=id,verified_name,display_phone_number,code_verification_status,quality_rating`,
              {
                headers: { 
                  Authorization: `Bearer ${credential.accessToken}` 
                }
              }
            );
            const phonesData = await phonesResponse.json();
            phoneNumbers = phonesData.data || [];
          } catch (e) {
            console.log('Could not fetch phone numbers for WABA:', waba.id);
          }

          accounts.push({
            id: waba.id,
            name: waba.name,
            messageTemplateNamespace: waba.message_template_namespace,
            type: 'owned',
            phoneNumbers: phoneNumbers.map((p: any) => ({
              id: p.id,
              displayName: p.verified_name,
              phoneNumber: p.display_phone_number,
              verificationStatus: p.code_verification_status,
              qualityScore: p.quality_rating
            }))
          });
        }
      }
    } catch (error) {
      console.error('Error fetching owned accounts:', error);
    }

    try {
      // Fetch client-shared accounts
      const clientResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?fields=whatsapp_business_accounts{id,name,message_template_namespace}`,
        {
          headers: { 
            Authorization: `Bearer ${credential.accessToken}` 
          }
        }
      );

      const clientData = await clientResponse.json();

      if (clientData.data) {
        for (const business of clientData.data) {
          if (business.whatsapp_business_accounts?.data) {
            for (const waba of business.whatsapp_business_accounts.data) {
              // Skip if already added (from owned accounts)
              if (!accounts.find(a => a.id === waba.id)) {
                accounts.push({
                  id: waba.id,
                  name: waba.name,
                  messageTemplateNamespace: waba.message_template_namespace,
                  type: 'client_shared',
                  businessId: business.id,
                  phoneNumbers: []
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching client accounts:', error);
    }

    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
      organizationId
    });

  } catch (error: any) {
    console.error('Error fetching WhatsApp accounts:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch WhatsApp accounts' 
      },
      { status: 500 }
    );
  }
}
