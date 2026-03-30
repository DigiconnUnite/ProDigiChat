import { WhatsAppClient } from "./client";
import { getSettings } from "@/lib/settings-storage";
import { prisma } from "@/lib/prisma";
import { decryptWhatsAppCredential, encryptField } from "@/lib/encryption";
import { META_API_BASE } from "@/lib/meta-config";

// Cache for the WhatsApp client
// BUG FIX: Cache key should include both orgId and accountId to avoid cross-account contamination
let whatsappClientInstance: WhatsAppClient | null = null;
let lastSettingsFetch: number = 0;
let cachedOrgId: string | null = null;
let cachedAccountId: string | null = null; // BUG FIX: Track account ID in cache
const CACHE_TTL = 60000; // 1 minute cache

// Get credentials from Prisma database
async function getWhatsAppCredentials(orgId: string, accountId?: string) {
  
  console.log('[WhatsAppAuth] Getting credentials for orgId:', orgId, 'accountId:', accountId);
  
  // If accountId is provided, get that specific account
  if (accountId) {
    const dbCredential = await prisma.whatsAppCredential.findFirst({
      where: { 
        id: accountId,
        organizationId: orgId,
        isActive: true
      },
      include: {
        phoneNumbers: true
      }
    });
    
    if (dbCredential) {
      console.log('[WhatsAppAuth] Found specific account:', dbCredential.id);
      const decryptedCredential = decryptWhatsAppCredential(dbCredential as any);
      
      return {
        apiKey: decryptedCredential?.accessToken,
        phoneNumberId: dbCredential.phoneNumberId || dbCredential.phoneNumbers?.find(p => p.isDefault)?.metaPhoneNumberId || '',
        businessAccountId: dbCredential.businessAccountId,
        tokenExpiresAt: dbCredential.tokenExpiresAt,
        organizationId: dbCredential.organizationId,
        accountId: dbCredential.id,
        fromDb: true
      };
    }
  }
  
  // First, try to get credentials from Prisma (new way) - prioritize default account
  const dbCredential = await prisma.whatsAppCredential.findFirst({
    where: { 
      organizationId: orgId,
      isActive: true
    },
    orderBy: [
      { isDefault: 'desc' },
      { connectedAt: 'desc' }
    ],
    include: {
      phoneNumbers: true
    }
  });
  
  console.log('[WhatsAppAuth] Found DB credential:', dbCredential ? 'yes' : 'no');
  
  if (dbCredential) {
    console.log('[WhatsAppAuth] DB credential orgId:', dbCredential.organizationId, 'isDefault:', dbCredential.isDefault);
    
    // Decrypt sensitive credential fields before returning
    const decryptedCredential = decryptWhatsAppCredential(dbCredential as any);
    
    // Find the default phone number
    const defaultPhone = dbCredential.phoneNumbers?.find(p => p.isDefault);
    
    return {
      apiKey: decryptedCredential?.accessToken,
      phoneNumberId: dbCredential.phoneNumberId || defaultPhone?.metaPhoneNumberId || '',
      businessAccountId: dbCredential.businessAccountId,
      tokenExpiresAt: dbCredential.tokenExpiresAt,
      organizationId: dbCredential.organizationId,
      accountId: dbCredential.id,
      fromDb: true
    };
  }
  
  // Fall back to legacy settings
  console.log('[WhatsAppAuth] Falling back to legacy settings');
  const settings = await getSettings(orgId);
  const whatsappSettings = settings.whatsapp;
  
  console.log('[WhatsAppAuth] Legacy settings:', {
    hasApiKey: !!whatsappSettings?.apiKey,
    hasPhoneNumberId: !!whatsappSettings?.phoneNumberId,
    hasBusinessAccountId: !!whatsappSettings?.businessAccountId
  });
  
  if (whatsappSettings?.apiKey && whatsappSettings?.phoneNumberId && whatsappSettings?.businessAccountId) {
    return {
      apiKey: whatsappSettings.apiKey,
      phoneNumberId: whatsappSettings.phoneNumberId,
      businessAccountId: whatsappSettings.businessAccountId,
      fromDb: false
    };
  }
  
  console.log('[WhatsAppAuth] No credentials found!');
  return null;
}

// Refresh the access token using Meta OAuth
async function refreshAccessToken(organizationId: string, currentAccessToken: string, businessAccountId: string): Promise<string | null> {
  try {
    console.log('[WhatsAppAuth] Attempting to refresh access token...');

    // Use the correct Meta token refresh endpoint
    const refreshUrl = `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${currentAccessToken}`;

    const response = await fetch(refreshUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[WhatsAppAuth] Token refresh failed:', error);
      return null;
    }

    const data = await response.json();
    console.log('[WhatsAppAuth] Token refresh successful');
    return data.access_token;
  } catch (error) {
    console.error('[WhatsAppAuth] Error refreshing token:', error);
    return null;
  }
}

// Update the stored credentials with new token
async function updateCredentialToken(organizationId: string, newAccessToken: string, accountId?: string): Promise<void> {
  try {
    // Encrypt the new access token before storing
    const encryptedToken = encryptField(newAccessToken);
    
    // If accountId is provided, update that specific account
    if (accountId) {
      await prisma.whatsAppCredential.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedToken || newAccessToken,
          tokenExpiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
          lastVerifiedAt: new Date(),
          lastRefreshedAt: new Date(),
          lastRefreshStatus: 'success'
        }
      });
    } else {
      // Update the default account
      await prisma.whatsAppCredential.updateMany({
        where: { organizationId, isDefault: true },
        data: {
          accessToken: encryptedToken || newAccessToken,
          tokenExpiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
          lastVerifiedAt: new Date(),
          lastRefreshedAt: new Date(),
          lastRefreshStatus: 'success'
        }
      });
    }
    console.log('[WhatsAppAuth] Updated credential token in database');
  } catch (error) {
    console.error('[WhatsAppAuth] Failed to update credential token:', error);
  }
}

// Clear the cached client to force a refresh
function clearClientCache(): void {
  whatsappClientInstance = null;
  lastSettingsFetch = 0;
  cachedOrgId = null;
  cachedAccountId = null; // BUG FIX: Clear account ID cache too
  console.log('[WhatsAppAuth] Cleared client cache');
}

export async function getWhatsAppClient(orgId: string, accountId?: string): Promise<WhatsAppClient> {
  const targetAccountId = accountId || null;
  
  // BUG FIX: Return cached instance only if both orgId AND accountId match
  // This prevents cross-account contamination in multi-account scenarios
  if (whatsappClientInstance && (Date.now() - lastSettingsFetch) < CACHE_TTL && cachedOrgId === orgId && cachedAccountId === targetAccountId) {
    console.log('[WhatsAppAuth] Returning cached client for org:', orgId, 'account:', targetAccountId);
    return whatsappClientInstance;
  }

  try {
    const credentials = await getWhatsAppCredentials(orgId, accountId);
    
    console.log('[WhatsAppAuth] Credentials result:', credentials ? 'found' : 'not found');
    
    if (!credentials) {
      console.error('[WhatsAppAuth] No credentials found!');
      throw new Error("WhatsApp credentials not configured. Please configure in Settings.");
    }

    // Create new client with credentials
    const client = new WhatsAppClient({
      apiKey: credentials.apiKey,
      phoneNumberId: credentials.phoneNumberId,
      businessAccountId: credentials.businessAccountId,
      organizationId: credentials.organizationId || orgId,
      onTokenRefresh: async (newToken: string) => {
        console.log('[WhatsAppAuth] Token refresh callback triggered');
        const orgIdForUpdate = credentials.organizationId || orgId;
        const accountIdForUpdate = (credentials as any).accountId;
        await updateCredentialToken(orgIdForUpdate, newToken, accountIdForUpdate);
        clearClientCache();
      }
    });

    whatsappClientInstance = client;
    lastSettingsFetch = Date.now();
    cachedOrgId = orgId;
    cachedAccountId = targetAccountId; // BUG FIX: Store account ID in cache
    console.log('[WhatsAppAuth] Created new WhatsApp client for org:', orgId, 'account:', targetAccountId);
    return client;
  } catch (error) {
    console.error("[WhatsAppAuth] Error fetching WhatsApp settings:", error);
    throw error;
  }
}

// Force refresh the token (can be called manually)
export async function forceRefreshToken(orgId: string, accountId?: string): Promise<boolean> {
  try {
    const targetOrgId = orgId;
    const credentials = await getWhatsAppCredentials(orgId, accountId);
    
    if (!credentials || !credentials.fromDb) {
      console.log('[WhatsAppAuth] Cannot force refresh - no stored credentials');
      return false;
    }
    
    const newToken = await refreshAccessToken(
      targetOrgId, 
      credentials.apiKey, 
      credentials.businessAccountId
    );
    
    if (newToken) {
      await updateCredentialToken(targetOrgId, newToken, (credentials as any).accountId);
      clearClientCache();
      console.log('[WhatsAppAuth] Token force refresh successful');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[WhatsAppAuth] Force token refresh failed:', error);
    return false;
  }
}

// Export the client getter (for backward compatibility)
export const whatsappClient = {
  async submitTemplate(template: any, orgId: string, accountId?: string) {
    const client = await getWhatsAppClient(orgId, accountId);
    return client.submitTemplate(template);
  },
  
  async getTemplateStatus(templateId: string, orgId: string, accountId?: string) {
    const client = await getWhatsAppClient(orgId, accountId);
    return client.getTemplateStatus(templateId);
  },
  
  async getAllTemplates(status?: string, orgId?: string, accountId?: string) {
    if (!orgId) throw new Error("Organization ID is required");
    const client = await getWhatsAppClient(orgId, accountId);
    return client.getAllTemplates(status);
  },
  
  async deleteTemplate(templateId: string, orgId: string, accountId?: string) {
    const client = await getWhatsAppClient(orgId, accountId);
    return client.deleteTemplate(templateId);
  },
  
  async sendMessage(payload: any, orgId: string, accountId?: string) {
    const client = await getWhatsAppClient(orgId, accountId);
    return client.sendMessage(payload);
  },
  
  async refreshToken(orgId: string, accountId?: string) {
    return await forceRefreshToken(orgId, accountId);
  },
};

export async function refreshToken(orgId: string, accountId?: string): Promise<string> {
  try {
    const success = await forceRefreshToken(orgId, accountId);
    if (!success) {
      throw new Error('Failed to refresh token');
    }
    const credentials = await getWhatsAppCredentials(orgId, accountId);
    return credentials?.apiKey || '';
  } catch (error) {
    console.error("Failed to refresh WhatsApp token:", error);
    throw error;
  }
}

// Export clear cache function
export { clearClientCache };

// Export for external use
export { getWhatsAppCredentials };
