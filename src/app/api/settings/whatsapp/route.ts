import { NextRequest, NextResponse } from "next/server";
import { getSettings, getDefaultOrgId } from "@/lib/settings-storage";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import axios from "axios";
import { encryptWhatsAppCredential } from "@/lib/encryption";
import { META_API_BASE } from "@/lib/meta-config";

// Meta API base URL
const META_API_BASE_URL = META_API_BASE;

// Validate credentials against Meta API
async function validateCredentials(
  apiKey: string,
  phoneNumberId: string,
  businessAccountId: string
): Promise<{ valid: boolean; error?: string; businessAccountName?: string }> {
  try {
    // Test 1: Try to access the phone number to verify API key and phoneNumberId
    const phoneResponse = await axios.get(
      `${META_API_BASE_URL}/${phoneNumberId}`,
      {
        params: {
          fields: "id,verified_name,display_phone_number,code_verification_status,quality_rating"
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );

    if (!phoneResponse.data || phoneResponse.data.id !== phoneNumberId) {
      return { valid: false, error: "Phone Number ID is invalid or doesn't match the API key" };
    }

    // Test 2: Try to access the business account to verify businessAccountId
    const businessResponse = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}`,
      {
        params: {
          fields: "id,name"
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );

    if (!businessResponse.data || businessResponse.data.id !== businessAccountId) {
      return { valid: false, error: "Business Account ID is invalid" };
    }

    return {
      valid: true,
      businessAccountName: businessResponse.data.name || 'WhatsApp Business'
    };
  } catch (error: any) {
    console.error('Error validating credentials:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return { valid: false, error: "Unable to connect to Meta API. Please check your network connection." };
    }
    
    if (error.response?.data?.error) {
      const metaError = error.response.data.error;
      return { valid: false, error: metaError.message || "Invalid credentials" };
    }
    
    if (error.message) {
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
    
    return { valid: false, error: "Failed to validate credentials. Please check your API key and IDs." };
  }
}

// Fetch phone numbers from Meta API with pagination support
async function fetchPhoneNumbers(
  apiKey: string,
  businessAccountId: string
): Promise<Array<{
  displayName: string;
  phoneNumber: string;
  verificationStatus: string;
  qualityScore: string;
}>> {
  try {
    const allPhoneNumbers: any[] = [];
    let nextCursor: string | null = null;
    const limit = 100; // Request maximum allowed per page

    do {
      const response = await axios.get(
        `${META_API_BASE_URL}/${businessAccountId}/phone_numbers`,
        {
          params: {
            fields: "id,verified_name,display_phone_number,code_verification_status,quality_rating",
            limit: limit,
            ...(nextCursor && { after: nextCursor })
          },
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000
        }
      );

      allPhoneNumbers.push(...response.data.data);
      
      // Get next page cursor
      nextCursor = response.data.paging?.cursors?.after || null;
      
    } while (nextCursor); // Continue until no more pages

    return allPhoneNumbers.map((phone: any) => ({
      displayName: phone.verified_name || phone.display_phone_number || 'Unknown',
      phoneNumber: phone.id,
      verificationStatus: phone.code_verification_status || 'UNKNOWN',
      qualityScore: phone.quality_rating || 'UNKNOWN'
    }));
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return [];
  }
}

// Get WhatsApp credentials from environment variables
function getEnvWhatsAppCredentials() {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  if (apiKey && phoneNumberId && businessAccountId) {
    return {
      apiKey,
      phoneNumberId,
      businessAccountId,
      isActive: true,
      connectedAt: new Date().toISOString(),
      connectedDevice: 'Environment Configuration',
      businessAccountName: 'WhatsApp Business'
    };
  }
  return null;
}

/**
 * GET: Fetch WhatsApp settings and connection status
 * Returns all connected WhatsApp accounts for the organization
 */
export async function GET(request: NextRequest) {
  // Get orgId from session token instead of query params
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string | undefined;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    // Get all WhatsApp credentials for this organization
    const dbCredentials = await prisma.whatsAppCredential.findMany({
      where: { organizationId: orgId },
      include: {
        phoneNumbers: true
      },
      orderBy: [
        { isDefault: 'desc' },  // Default account first
        { connectedAt: 'desc' } // Then by connection date
      ]
    });

    // If there are connected accounts
    if (dbCredentials && dbCredentials.length > 0) {
      const accounts = dbCredentials.map(cred => {
        const c = cred as any;
        return {
          id: cred.id,
          accountName: cred.accountName || cred.businessAccountName || 'WhatsApp Account',
          businessAccountId: cred.businessAccountId,
          businessAccountName: cred.businessAccountName,
          // Include additional WABA account details
          currency: c.currency,
          timezoneId: c.timezoneId,
          accountReviewStatus: c.accountReviewStatus,
          businessType: c.businessType,
          businessLocation: c.businessLocation,
          // Include owner business info
          ownerBusinessId: c.ownerBusinessId,
          ownerBusinessName: c.ownerBusinessName,
          ownerBusinessPhone: c.ownerBusinessPhone,
          ownerBusinessEmail: c.ownerBusinessEmail,
          ownerBusinessAddress: c.ownerBusinessAddress,
          phoneNumberId: cred.phoneNumberId,
          isActive: cred.isActive,
          isDefault: cred.isDefault,
          connectedAt: c.connectedAt,
          connectedDevice: c.connectedDevice,
          lastVerifiedAt: c.lastVerifiedAt,
          phoneNumbers: c.phoneNumbers || []
        };
      });

      // Get the default account for primary display
      const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];

      return NextResponse.json({
        isConnected: accounts.some(a => a.isActive),
        connectionType: 'database',
        accounts: accounts,
        defaultAccountId: defaultAccount?.id,
        selectedAccountId: request.nextUrl.searchParams.get('accountId') || defaultAccount?.id,
        settings: {
          webhookUrl: defaultAccount?.phoneNumbers?.find(p => p.isDefault)?.phoneNumber || defaultAccount?.phoneNumberId,
          hasWebhook: !!defaultAccount?.phoneNumbers?.length
        },
        organizationId: orgId,
      });
    }

    // Otherwise, check for legacy settings (API key based)
    const settings = await getSettings(orgId);
    
    // Check if legacy config exists and has required fields
    const hasLegacyConfig = !!(settings.whatsapp?.apiKey && settings.whatsapp?.phoneNumberId);
    const isConnected = hasLegacyConfig;
    
    // Build credential object
    let legacyCred: any = null;
    if (hasLegacyConfig) {
      legacyCred = {
        id: 'legacy',
        accountName: 'Legacy Account',
        businessAccountId: settings.whatsapp?.businessAccountId || '',
        phoneNumberId: settings.whatsapp?.phoneNumberId,
        isActive: true,
        connectedAt: settings.whatsapp?.connectedAt || new Date().toISOString(),
        connectedDevice: 'Manual Configuration (Legacy)',
      };
    }
    
    return NextResponse.json({
      isConnected,
      connectionType: hasLegacyConfig ? 'legacy' : 'none',
      accounts: legacyCred ? [legacyCred] : [],
      defaultAccountId: legacyCred?.id,
      settings: settings.whatsapp,
      config: settings.whatsapp,
      organizationId: orgId,
    });
  } catch (error) {
    console.error("Error fetching WhatsApp settings:", error);
    
    // Fallback to legacy settings or env credentials on error
    try {
      const settings = await getSettings(orgId);
      const envCreds = getEnvWhatsAppCredentials();
      const hasLegacyConfig = !!(settings.whatsapp?.apiKey && settings.whatsapp?.phoneNumberId);
      const hasEnvConfig = !!envCreds;
      const isConnected = hasLegacyConfig || hasEnvConfig;
      
      let legacyCred: any = null;
      if (hasLegacyConfig) {
        legacyCred = {
          id: 'legacy',
          accountName: 'Legacy Account',
          businessAccountId: settings.whatsapp?.businessAccountId || '',
          phoneNumberId: settings.whatsapp?.phoneNumberId,
          isActive: true,
          connectedAt: settings.whatsapp?.connectedAt || new Date().toISOString(),
          connectedDevice: 'Manual Configuration (Legacy)',
        };
      } else if (hasEnvConfig) {
        legacyCred = {
          id: 'env',
          accountName: 'Environment Account',
          businessAccountId: envCreds!.businessAccountId,
          businessAccountName: envCreds!.businessAccountName,
          phoneNumberId: envCreds!.phoneNumberId,
          isActive: true,
          connectedAt: envCreds!.connectedAt,
          connectedDevice: envCreds!.connectedDevice,
        };
      }
      
      return NextResponse.json({
        isConnected,
        connectionType: hasLegacyConfig ? 'legacy' : hasEnvConfig ? 'env' : 'none',
        accounts: legacyCred ? [legacyCred] : [],
        settings: settings.whatsapp,
        config: settings.whatsapp,
        organizationId: orgId,
      });
    } catch (fallbackError) {
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
  }
}

/**
 * POST: Add WhatsApp number (legacy), set default account, or manage accounts
 */
export async function POST(request: NextRequest) {
  // Get orgId from session token
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string | undefined;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phoneNumber, apiCredentials, action, accountId, accountName } = body;

    // Handle set default account
    if (action === 'setDefaultAccount') {
      if (!accountId) {
        return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
      }
      
      // First, unset all defaults for this organization
      await prisma.whatsAppCredential.updateMany({
        where: { organizationId: orgId },
        data: { isDefault: false }
      });

      // Set new default
      await prisma.whatsAppCredential.update({
        where: { id: accountId },
        data: { isDefault: true }
      });

      return NextResponse.json({
        success: true,
        message: "Default account updated"
      });
    }

    // Handle rename account
    if (action === 'renameAccount') {
      if (!accountId || !accountName) {
        return NextResponse.json({ error: 'Account ID and name are required' }, { status: 400 });
      }
      
      await prisma.whatsAppCredential.update({
        where: { id: accountId },
        data: { accountName: accountName.trim() }
      });

      return NextResponse.json({
        success: true,
        message: "Account renamed successfully"
      });
    }

    // Handle set default phone number for an account
    if (action === 'setDefault') {
      const { phoneNumberId } = body;
      
      if (!accountId || !phoneNumberId) {
        return NextResponse.json({ error: 'Account ID and phone number ID are required' }, { status: 400 });
      }
      
      // First, unset all defaults for this credential
      await prisma.whatsAppPhoneNumber.updateMany({
        where: { credentialId: accountId },
        data: { isDefault: false }
      });

      // Set new default
      await prisma.whatsAppPhoneNumber.update({
        where: { id: phoneNumberId },
        data: { isDefault: true }
      });

      // Update credential with default phone number ID
      await prisma.whatsAppCredential.update({
        where: { id: accountId },
        data: { phoneNumberId }
      });

      return NextResponse.json({
        success: true,
        message: "Default phone number updated"
      });
    }

    // Legacy: Add WhatsApp number with API credentials
    return NextResponse.json({
      message: "WhatsApp number added successfully",
      number: {
        id: crypto.randomUUID(),
        phoneNumber,
        status: "pending_verification",
        messageLimit: { current: 0, max: 1000 },
      },
    });
  } catch (error) {
    console.error("Error in WhatsApp POST:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

/**
 * PUT: Add a new WhatsApp account or update settings
 * Creates a new account instead of replacing existing one
 */
export async function PUT(request: NextRequest) {
  // Get orgId from session token
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string | undefined;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { config, accountName } = body;
    
    console.log('PUT /api/settings/whatsapp - Received:', { accountName });
    
    console.log('Using orgId:', orgId);
    
    if (!config) {
      return NextResponse.json({ error: "No config provided" }, { status: 400 });
    }
    
    const { apiKey, phoneNumberId, businessAccountId, webhookSecret } = config;
    
    // Validate required fields
    if (!apiKey?.trim()) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 });
    }
    if (!phoneNumberId?.trim()) {
      return NextResponse.json({ error: "Phone Number ID is required" }, { status: 400 });
    }
    if (!businessAccountId?.trim()) {
      return NextResponse.json({ error: "Business Account ID is required" }, { status: 400 });
    }
    
    // Note: Facebook App ID and App Secret are NOT required for manual configuration
    // They are only used for OAuth flow which uses META_APP_ID and META_APP_SECRET from .env
    
    // Step 1: Validate credentials against Meta API
    console.log('Validating credentials against Meta API...');
    const validation = await validateCredentials(apiKey, phoneNumberId, businessAccountId);
    
    if (!validation.valid) {
      console.log('Validation failed:', validation.error);
      return NextResponse.json({ 
        error: validation.error || "Invalid credentials",
        validationError: true
      }, { status: 400 });
    }
    
    console.log('Credentials validated successfully. Business account:', validation.businessAccountName);
    
    // Step 2: Fetch phone numbers from Meta API
    console.log('Fetching phone numbers from Meta API...');
    const phoneNumbers = await fetchPhoneNumbers(apiKey, businessAccountId);
    console.log('Fetched phone numbers:', phoneNumbers.length);
    
    // Step 3: Save to Prisma database as a NEW account
    console.log('Creating new WhatsApp account in Prisma...');
    const userAgent = 'Manual Configuration';
    
    // Generate webhook verification token
    const webhookVerifyToken = webhookSecret || crypto.randomBytes(32).toString('hex');
    const now = new Date();
    
    // Check if this is the first account (make it default)
    const existingAccounts = await prisma.whatsAppCredential.count({
      where: { organizationId: orgId }
    });
    const isFirstAccount = existingAccounts === 0;
    
    // Use type assertion for fields that may not be in cached types
    const credentialData = {
      organizationId: orgId,
      accountName: accountName?.trim() || validation.businessAccountName || 'WhatsApp Account',
      accessToken: apiKey,
      businessAccountId: businessAccountId,
      businessAccountName: validation.businessAccountName || 'WhatsApp Business',
      phoneNumberId: phoneNumberId,
      tokenExpiresAt: new Date(Date.now() + (59 * 24 * 60 * 60 * 1000)),
      webhookVerifyToken,
      isActive: true,
      isDefault: isFirstAccount, // First account becomes default
      connectedAt: now,
      connectedDevice: userAgent,
      lastVerifiedAt: now,
      updatedAt: now,
      // Facebook App credentials - not needed for manual config (OAuth uses env vars)
      // Removed: facebookAppId: facebookAppId?.trim() || null,
      // Removed: facebookAppSecret: facebookAppSecret?.trim() || null,
    } as any;
    
    // Encrypt sensitive credential fields before storage
    const encryptedCredentialData = encryptWhatsAppCredential(credentialData);
    
    // Create new credential in Prisma (not upsert - allows multiple accounts)
    const newCredential = await prisma.whatsAppCredential.create({
      data: encryptedCredentialData
    });
    
    // Step 4: Save phone numbers to Prisma
    if (phoneNumbers.length > 0) {
      // Create phone number records linked to the new credential
      await prisma.whatsAppPhoneNumber.createMany({
        data: phoneNumbers.map((phone, index) => ({
          credentialId: newCredential.id,
          displayName: phone.displayName,
          phoneNumber: phone.phoneNumber,
          verificationStatus: phone.verificationStatus,
          qualityScore: phone.qualityScore || '',
          isDefault: phone.phoneNumber === phoneNumberId || index === 0 // The configured number or first one is default
        }))
      });
    }
    
    console.log('WhatsApp account created successfully');
    
    return NextResponse.json({
      isConnected: true,
      message: "WhatsApp account added successfully",
      accountId: newCredential.id,
      connectionType: 'manual',
      credential: {
        id: newCredential.id,
        accountName: credentialData.accountName,
        businessAccountId: businessAccountId,
        businessAccountName: validation.businessAccountName || 'WhatsApp Business',
        phoneNumberId: phoneNumberId,
        isActive: true,
        isDefault: isFirstAccount,
        connectedAt: now.toISOString(),
        connectedDevice: userAgent
      },
      phoneNumbers: phoneNumbers.map((phone, index) => ({
        id: `temp-${index}`,
        ...phone,
        isDefault: phone.phoneNumber === phoneNumberId || index === 0
      })),
      organizationId: orgId,
    });
    
  } catch (error: any) {
    console.error("Error updating WhatsApp settings:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update settings" 
    }, { status: 500 });
  }
}

/**
 * DELETE: Delete WhatsApp account, phone number, or disconnect
 */
export async function DELETE(request: NextRequest) {
  // Get orgId from session token
  const token = await getToken({ req: request });
  const orgId = (token?.organizationId || token?.orgId) as string | undefined;

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { accountId, phoneNumberId } = body;

    // If deleting a specific phone number
    if (phoneNumberId) {
      await prisma.whatsAppPhoneNumber.delete({
        where: { id: phoneNumberId }
      });
      return NextResponse.json({
        message: "Phone number removed successfully",
      });
    }

    // If deleting an entire account
    if (accountId) {
      // Check if this was the default account
      const accountToDelete = await prisma.whatsAppCredential.findUnique({
        where: { id: accountId }
      });
      
      if (!accountToDelete) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      
      const wasDefault = accountToDelete.isDefault;
      
      // Delete the credential (phone numbers will be cascade deleted)
      await prisma.whatsAppCredential.delete({
        where: { id: accountId }
      });
      
      // If we deleted the default account, make another account the default
      if (wasDefault) {
        const remainingAccounts = await prisma.whatsAppCredential.findFirst({
          where: { organizationId: orgId },
          orderBy: { connectedAt: 'desc' }
        });
        
        if (remainingAccounts) {
          await prisma.whatsAppCredential.update({
            where: { id: remainingAccounts.id },
            data: { isDefault: true }
          });
        }
      }
      
      return NextResponse.json({
        message: "WhatsApp account deleted successfully",
      });
    }

    // Legacy: Delete WhatsApp number
    return NextResponse.json({
      message: "Phone number removed successfully",
    });
  } catch (error) {
    console.error("Error deleting WhatsApp account:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
