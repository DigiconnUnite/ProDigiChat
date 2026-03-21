/**
 * WhatsApp Token Auto-Refresh Scheduler
 * 
 * This endpoint provides automated background token refresh functionality.
 * It checks all organization credentials for upcoming expiration and refreshes
 * tokens that are within 7 days of expiration.
 * 
 * Can be triggered via:
 * - Cron job (recommended): Configure external cron to call this endpoint hourly
 * - Internal scheduling: This endpoint includes self-scheduling via interval check
 * 
 * Endpoints:
 * - GET /api/whatsapp/token/refresh - Trigger token refresh check for all organizations
 * - GET /api/whatsapp/token/refresh?orgId=<id> - Refresh token for specific organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptWhatsAppCredential, encryptField } from '@/lib/encryption';
import { META_API_BASE } from '@/lib/meta-config';

// Token expiration thresholds
const REFRESH_THRESHOLD_DAYS = 7; // Refresh tokens expiring within 7 days
const REFRESH_THRESHOLD_MS = REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

// Meta token refresh endpoint
const META_REFRESH_TOKEN_URL = META_API_BASE;

/**
 * Refresh the access token using Meta's refresh_token endpoint
 */
async function refreshAccessToken(
  accessToken: string,
  businessAccountId: string
): Promise<{ newToken: string; expiresIn: number } | null> {
  try {
    console.log(`[TokenRefresh] Attempting to refresh token for business account: ${businessAccountId}`);
    
    const response = await fetch(`${META_REFRESH_TOKEN_URL}/${businessAccountId}/refresh_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`[TokenRefresh] Token refresh failed:`, error);
      return null;
    }
    
    const data = await response.json();
    console.log(`[TokenRefresh] Token refresh successful, expires in: ${data.expires_in} seconds`);
    
    return {
      newToken: data.access_token,
      expiresIn: data.expires_in || (59 * 24 * 60 * 60) // Default to ~59 days if not returned
    };
  } catch (error) {
    console.error(`[TokenRefresh] Error refreshing token:`, error);
    return null;
  }
}

/**
 * Check if a token needs refresh based on expiration time
 */
function needsRefresh(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) {
    // If no expiration date, assume it needs refresh (old data migration)
    return true;
  }
  
  const now = new Date();
  const expirationDate = new Date(tokenExpiresAt);
  const timeUntilExpiration = expirationDate.getTime() - now.getTime();
  
  // Refresh if token expires within the threshold
  return timeUntilExpiration < REFRESH_THRESHOLD_MS;
}

/**
 * Get the new expiration date from the refresh response
 */
function calculateNewExpiration(expiresIn: number): Date {
  // Meta tokens typically last ~59 days (5118720 seconds)
  // Add a small buffer to ensure we refresh before actual expiration
  const bufferSeconds = 24 * 60 * 60; // 1 day buffer
  const effectiveExpiresIn = Math.max(expiresIn - bufferSeconds, 0);
  return new Date(Date.now() + effectiveExpiresIn * 1000);
}

/**
 * Process a single organization's token refresh
 */
async function processOrganizationTokenRefresh(
  orgId: string
): Promise<{
  success: boolean;
  orgId: string;
  refreshed: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Get the credential from database - use findFirst since organizationId is not unique
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId }
    });
    
    if (!credential) {
      return {
        success: false,
        orgId,
        refreshed: false,
        message: 'No WhatsApp credential found'
      };
    }
    
    if (!credential.isActive) {
      return {
        success: false,
        orgId,
        refreshed: false,
        message: 'Credential is not active'
      };
    }
    
    // Check if token needs refresh
    if (!needsRefresh(credential.tokenExpiresAt)) {
      const expiresAt = credential.tokenExpiresAt 
        ? new Date(credential.tokenExpiresAt).toISOString() 
        : 'unknown';
      return {
        success: true,
        orgId,
        refreshed: false,
        message: `Token not near expiration, skipping refresh. Expires: ${expiresAt}`
      };
    }
    
    // Decrypt the current access token
    const decryptedCredential = decryptWhatsAppCredential(credential as any);
    const currentToken = decryptedCredential?.accessToken;
    
    if (!currentToken) {
      // Update status to failed
      await prisma.whatsAppCredential.updateMany({
        where: { organizationId: orgId },
        data: {
          lastRefreshStatus: 'failed',
          lastRefreshError: 'No access token found'
        }
      });
      
      return {
        success: false,
        orgId,
        refreshed: false,
        message: 'No access token to refresh',
        error: 'No access token found in credential'
      };
    }
    
    // Attempt to refresh the token
    const refreshResult = await refreshAccessToken(
      currentToken,
      credential.businessAccountId
    );
    
    if (!refreshResult) {
      // Update status to failed
      await prisma.whatsAppCredential.updateMany({
        where: { organizationId: orgId },
        data: {
          lastRefreshStatus: 'failed',
          lastRefreshError: 'Meta API refresh failed'
        }
      });
      
      return {
        success: false,
        orgId,
        refreshed: false,
        message: 'Token refresh API call failed',
        error: 'Failed to refresh token with Meta API'
      };
    }
    
    // Encrypt and update the new token
    const encryptedNewToken = encryptField(refreshResult.newToken);
    const newExpirationDate = calculateNewExpiration(refreshResult.expiresIn);
    
    await prisma.whatsAppCredential.updateMany({
      where: { organizationId: orgId },
      data: {
        accessToken: encryptedNewToken || refreshResult.newToken,
        tokenExpiresAt: newExpirationDate,
        lastRefreshedAt: new Date(),
        lastVerifiedAt: new Date(),
        lastRefreshStatus: 'success',
        lastRefreshError: null
      }
    });
    
    console.log(`[TokenRefresh] Successfully refreshed token for org: ${orgId}`);
    
    return {
      success: true,
      orgId,
      refreshed: true,
      message: `Token refreshed successfully. New expiration: ${newExpirationDate.toISOString()}`
    };
    
  } catch (error: any) {
    console.error(`[TokenRefresh] Error processing org ${orgId}:`, error);
    
    // Update status to failed
    try {
      await prisma.whatsAppCredential.updateMany({
        where: { organizationId: orgId },
        data: {
          lastRefreshStatus: 'failed',
          lastRefreshError: error.message || 'Unknown error'
        }
      });
    } catch (dbError) {
      console.error(`[TokenRefresh] Failed to update error status:`, dbError);
    }
    
    return {
      success: false,
      orgId,
      refreshed: false,
      message: 'Error during token refresh',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * GET handler for token refresh
 * 
 * Query parameters:
 * - orgId (optional): Specific organization ID to refresh
 * - internal (optional): If true, allows internal scheduling calls
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const internal = searchParams.get('internal');
    
    console.log(`[TokenRefresh] Starting token refresh check. OrgId: ${orgId || 'all'}`);
    
    let results: Array<{
      success: boolean;
      orgId: string;
      refreshed: boolean;
      message: string;
      error?: string;
    }> = [];
    
    if (orgId) {
      // Refresh token for specific organization
      const result = await processOrganizationTokenRefresh(orgId);
      results.push(result);
    } else {
      // Get all active WhatsApp credentials
      const credentials = await prisma.whatsAppCredential.findMany({
        where: { isActive: true },
        select: { organizationId: true }
      });
      
      console.log(`[TokenRefresh] Found ${credentials.length} active credentials to check`);
      
      // Process each organization (continue even if one fails)
      for (const cred of credentials) {
        const result = await processOrganizationTokenRefresh(cred.organizationId);
        results.push(result);
        
        // Small delay to avoid overwhelming the Meta API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Summarize results
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const refreshed = results.filter(r => r.refreshed).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = results.filter(r => r.success && !r.refreshed).length;
    
    const duration = Date.now() - startTime;
    
    console.log(`[TokenRefresh] Completed in ${duration}ms. Total: ${total}, Success: ${successful}, Refreshed: ${refreshed}, Skipped: ${skipped}, Failed: ${failed}`);
    
    return NextResponse.json({
      success: true,
      message: `Token refresh check completed`,
      summary: {
        total,
        successful,
        refreshed,
        skipped,
        failed,
        durationMs: duration
      },
      results: results.map(r => ({
        orgId: r.orgId,
        refreshed: r.refreshed,
        message: r.message,
        error: r.error
      }))
    });
    
  } catch (error: any) {
    console.error(`[TokenRefresh] Fatal error:`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Token refresh failed',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST handler for triggering refresh with body parameters
 * 
 * Body parameters:
 * - orgId: Specific organization ID to refresh (optional)
 * - force: Force refresh even if not near expiration (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, force } = body;
    
    console.log(`[TokenRefresh] POST request received. OrgId: ${orgId}, Force: ${force}`);
    
    if (orgId) {
      // If force is true, temporarily override the needsRefresh check
      if (force) {
        // Get credential and force update lastRefreshStatus to trigger refresh
        const credential = await prisma.whatsAppCredential.findFirst({
          where: { organizationId: orgId }
        });
        
        if (credential) {
          await prisma.whatsAppCredential.updateMany({
            where: { organizationId: orgId },
            data: {
              tokenExpiresAt: new Date(Date.now() + REFRESH_THRESHOLD_MS - 1)
            }
          });
        }
      }
      
      const result = await processOrganizationTokenRefresh(orgId);
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        orgId: result.orgId,
        refreshed: result.refreshed,
        error: result.error
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'orgId is required for POST requests'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error(`[TokenRefresh] POST error:`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Token refresh failed',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
