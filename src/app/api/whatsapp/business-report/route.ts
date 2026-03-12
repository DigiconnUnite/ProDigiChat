/**
 * WhatsApp Business Account Report API
 * 
 * Fetches comprehensive details from Meta's WhatsApp Business Cloud API
 * to create reports for optimization and troubleshooting.
 * 
 * This endpoint provides:
 * - Business account information
 * - Phone numbers with quality scores
 * - Message templates status
 * - API usage and limits
 * - Webhook configuration
 * - Account health metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

const META_API_BASE_URL = 'https://graph.facebook.com/v18.0';

interface BusinessReport {
  businessAccount: {
    id: string;
    name: string;
    messageTemplateNamespace: string;
    createdAt?: string;
  };
  phoneNumbers: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    verificationStatus: string;
    qualityScore: string;
    codeVerificationStatus: string;
  }>;
  messageTemplates: Array<{
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    qualityScore?: string;
    rejectionReason?: string;
  }>;
  webhooks: {
    url: string;
    fields: string[];
  } | null;
  apiUsage: {
    currentTier: string;
    messageLimit: number;
    conversationLimit: number;
  };
  connection: {
    type: string;
    connectedAt: string;
    lastVerifiedAt: string;
    isActive: boolean;
  };
  rawData: Record<string, unknown>;
}

/**
 * Fetch phone numbers from Meta API
 */
async function fetchPhoneNumbersFromMeta(
  accessToken: string,
  businessAccountId: string
): Promise<BusinessReport['phoneNumbers']> {
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}/phone_numbers`,
      {
        params: {
          fields: 'id,verified_name,display_phone_number,certified_wa_phone_number,verification_status,quality_score,code_verification_status'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    return response.data.data.map((phone: any) => ({
      id: phone.id,
      displayName: phone.verified_name || phone.display_phone_number || 'Unknown',
      phoneNumber: phone.certified_wa_phone_number || phone.display_phone_number || '',
      verificationStatus: phone.verification_status || 'UNKNOWN',
      qualityScore: phone.quality_score || 'UNKNOWN',
      codeVerificationStatus: phone.code_verification_status || 'NOT_STARTED'
    }));
  } catch (error: any) {
    console.error('Error fetching phone numbers from Meta:', error.response?.data || error.message);
    throw new Error(`Failed to fetch phone numbers: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Fetch message templates from Meta API
 */
async function fetchMessageTemplates(
  accessToken: string,
  businessAccountId: string
): Promise<BusinessReport['messageTemplates']> {
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}/message_templates`,
      {
        params: {
          fields: 'id,name,status,category,language,components,quality_score,rejection_reason',
          limit: 100
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    return response.data.data.map((template: any) => ({
      id: template.id,
      name: template.name,
      status: template.status,
      category: template.category,
      language: template.language,
      qualityScore: template.quality_score,
      rejectionReason: template.rejection_reason
    }));
  } catch (error: any) {
    console.error('Error fetching message templates from Meta:', error.response?.data || error.message);
    throw new Error(`Failed to fetch templates: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Fetch webhook configuration from Meta API
 */
async function fetchWebhookConfig(
  accessToken: string,
  businessAccountId: string
): Promise<BusinessReport['webhooks']> {
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}/webhooks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    const entry = response.data.entry?.[0];
    if (!entry?.changes) {
      return null;
    }

    return {
      url: entry.changes[0]?.value?.url || '',
      fields: entry.changes[0]?.value?.fields || []
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching webhook config:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch account ownership details
 */
async function fetchAccountOwnership(
  accessToken: string,
  businessAccountId: string
): Promise<{ id: string; name: string; messageTemplateNamespace: string }> {
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}`,
      {
        params: {
          fields: 'id,name,message_template_namespace,creation_time'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 10000
      }
    );

    return {
      id: response.data.id,
      name: response.data.name,
      messageTemplateNamespace: response.data.message_template_namespace || ''
    };
  } catch (error: any) {
    console.error('Error fetching account ownership:', error.response?.data || error.message);
    throw new Error(`Failed to fetch account details: ${error.response?.data?.error?.message || error.message}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get organization ID from session token
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - no organization' },
        { status: 401 }
      );
    }

    // Fetch WhatsApp credentials from database
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId }
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect your WhatsApp account first.' },
        { status: 404 }
      );
    }

    if (!credential.isActive) {
      return NextResponse.json(
        { error: 'WhatsApp connection is inactive. Please reconnect your account.' },
        { status: 400 }
      );
    }

    // Use the access token from the credential
    const accessToken = credential.accessToken;
    const businessAccountId = credential.businessAccountId;

    console.log(`Generating business report for org ${orgId}, business account: ${businessAccountId}`);

    // Fetch all data in parallel for better performance
    const [accountOwnership, phoneNumbers, templates, webhooks] = await Promise.allSettled([
      fetchAccountOwnership(accessToken, businessAccountId),
      fetchPhoneNumbersFromMeta(accessToken, businessAccountId),
      fetchMessageTemplates(accessToken, businessAccountId),
      fetchWebhookConfig(accessToken, businessAccountId)
    ]);

    // Build the report
    const report: BusinessReport = {
      businessAccount: {
        id: accountOwnership.status === 'fulfilled' ? accountOwnership.value.id : businessAccountId,
        name: accountOwnership.status === 'fulfilled' ? accountOwnership.value.name : credential.businessAccountName || 'Unknown',
        messageTemplateNamespace: accountOwnership.status === 'fulfilled' ? accountOwnership.value.messageTemplateNamespace : ''
      },
      phoneNumbers: phoneNumbers.status === 'fulfilled' ? phoneNumbers.value : [],
      messageTemplates: templates.status === 'fulfilled' ? templates.value : [],
      webhooks: webhooks.status === 'fulfilled' ? webhooks.value : null,
      apiUsage: {
        currentTier: 'Standard', // Meta doesn't expose tier via API
        messageLimit: 1000, // Default limit
        conversationLimit: 250
      },
      connection: {
        type: credential.accessToken ? 'OAuth' : 'Manual',
        connectedAt: credential.connectedAt?.toISOString() || new Date().toISOString(),
        lastVerifiedAt: credential.lastVerifiedAt?.toISOString() || new Date().toISOString(),
        isActive: credential.isActive
      },
      rawData: {
        accountResponse: accountOwnership.status === 'fulfilled' ? accountOwnership.value : accountOwnership.reason?.message,
        phoneNumbersCount: phoneNumbers.status === 'fulfilled' ? phoneNumbers.value.length : 0,
        templatesCount: templates.status === 'fulfilled' ? templates.value.length : 0,
        webhooksConfigured: webhooks.status === 'fulfilled' ? !!webhooks.value : false,
        generatedAt: new Date().toISOString()
      }
    };

    // Add any errors to the report
    const errors: string[] = [];
    if (accountOwnership.status === 'rejected') errors.push(`Account: ${accountOwnership.reason}`);
    if (phoneNumbers.status === 'rejected') errors.push(`Phone Numbers: ${phoneNumbers.reason}`);
    if (templates.status === 'rejected') errors.push(`Templates: ${templates.reason}`);
    if (webhooks.status === 'rejected') errors.push(`Webhooks: ${webhooks.reason}`);

    if (errors.length > 0) {
      (report as any).errors = errors;
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating business report:', error);

    if (error.response?.data?.error) {
      return NextResponse.json(
        { error: error.response.data.error.message },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate business report' },
      { status: 500 }
    );
  }
}
