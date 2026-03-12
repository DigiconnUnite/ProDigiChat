/**
 * WhatsApp Token Status API
 * 
 * Provides endpoint to check token status for monitoring and debugging.
 * Returns token expiration information and refresh status for all organizations.
 * 
 * Endpoints:
 * - GET /api/whatsapp/token/status - Get status for all organizations
 * - GET /api/whatsapp/token/status?orgId=<id> - Get status for specific organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET handler for token status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (orgId) {
      // Get status for specific organization
      const credential = await prisma.whatsAppCredential.findFirst({
        where: { organizationId: orgId }
      });
      
      if (!credential) {
        return NextResponse.json({
          success: false,
          message: 'No WhatsApp credential found for this organization'
        }, { status: 404 });
      }
      
      // Calculate days until expiration
      const tokenExpiresAt = credential.tokenExpiresAt 
        ? new Date(credential.tokenExpiresAt) 
        : null;
      
      const daysUntilExpiration = tokenExpiresAt 
        ? Math.ceil((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      
      const needsRefresh = daysUntilExpiration !== null && daysUntilExpiration <= 7;
      
      return NextResponse.json({
        success: true,
        organizationId: orgId,
        isActive: credential.isActive,
        connectedAt: credential.connectedAt,
        tokenExpiresAt: credential.tokenExpiresAt,
        daysUntilExpiration,
        needsRefresh,
        lastRefreshedAt: credential.lastRefreshedAt,
        lastRefreshStatus: credential.lastRefreshStatus,
        lastRefreshError: credential.lastRefreshError,
        lastVerifiedAt: credential.lastVerifiedAt
      });
    }
    
    // Get status for all organizations
    const credentials = await prisma.whatsAppCredential.findMany({
      where: { isActive: true },
      select: {
        organizationId: true,
        businessAccountName: true,
        isActive: true,
        connectedAt: true,
        tokenExpiresAt: true,
        lastRefreshedAt: true,
        lastRefreshStatus: true,
        lastVerifiedAt: true
      },
      orderBy: { connectedAt: 'desc' }
    });
    
    // Calculate status for each organization
    const statusList = credentials.map(cred => {
      const tokenExpiresAt = cred.tokenExpiresAt 
        ? new Date(cred.tokenExpiresAt) 
        : null;
      
      const daysUntilExpiration = tokenExpiresAt 
        ? Math.ceil((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        organizationId: cred.organizationId,
        businessAccountName: cred.businessAccountName,
        isActive: cred.isActive,
        connectedAt: cred.connectedAt,
        tokenExpiresAt: cred.tokenExpiresAt,
        daysUntilExpiration,
        needsRefresh: daysUntilExpiration !== null && daysUntilExpiration <= 7,
        lastRefreshedAt: cred.lastRefreshedAt,
        lastRefreshStatus: cred.lastRefreshStatus,
        lastVerifiedAt: cred.lastVerifiedAt
      };
    });
    
    // Summary statistics
    const total = statusList.length;
    const needsRefresh = statusList.filter(s => s.needsRefresh).length;
    const healthy = statusList.filter(s => !s.needsRefresh && s.lastRefreshStatus === 'success').length;
    const expired = statusList.filter(s => s.daysUntilExpiration !== null && s.daysUntilExpiration <= 0).length;
    const unknown = statusList.filter(s => s.daysUntilExpiration === null).length;
    
    return NextResponse.json({
      success: true,
      summary: {
        total,
        healthy,
        needsRefresh,
        expired,
        unknown
      },
      organizations: statusList
    });
    
  } catch (error: any) {
    console.error(`[TokenStatus] Error:`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get token status',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
