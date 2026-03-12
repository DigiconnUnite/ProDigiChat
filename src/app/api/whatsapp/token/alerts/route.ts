/**
 * WhatsApp Token Expiration Alerts API
 * 
 * Provides endpoint to check token expiration status and generate appropriate alerts.
 * Implements alert levels based on days until expiration:
 * - Warning (14+ days): Green indicator
 * - Caution (7-14 days): Yellow indicator  
 * - Critical (1-7 days): Red indicator with prominent warning
 * - Expired: Immediate action required
 * 
 * Endpoints:
 * - GET /api/whatsapp/token/alerts - Get alerts for authenticated user's org
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Alert level types
 */
export type AlertLevel = 'warning' | 'caution' | 'critical' | 'expired' | 'healthy';

/**
 * Token alert response interface
 */
export interface TokenAlert {
  alertLevel: AlertLevel;
  daysUntilExpiry: number | null;
  expirationDate: string | null;
  message: string;
  actionRequired: boolean;
  refreshTokenUrl: string;
}

/**
 * Determine alert level based on days until expiration
 */
function getAlertLevel(daysUntilExpiry: number | null): AlertLevel {
  if (daysUntilExpiry === null) {
    return 'healthy';
  }
  
  if (daysUntilExpiry <= 0) {
    return 'expired';
  }
  
  if (daysUntilExpiry <= 7) {
    return 'critical';
  }
  
  if (daysUntilExpiry <= 14) {
    return 'caution';
  }
  
  return 'warning';
}

/**
 * Get alert message based on level and days
 */
function getAlertMessage(alertLevel: AlertLevel, daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) {
    return 'Token expiration date unknown. Please refresh your token.';
  }
  
  switch (alertLevel) {
    case 'expired':
      return `Token has expired! Immediate action required to restore WhatsApp connectivity.`;
    case 'critical':
      return `Token expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Refresh immediately to avoid service interruption.`;
    case 'caution':
      return `Token expires in ${daysUntilExpiry} days. Consider refreshing soon.`;
    case 'warning':
      return `Token expires in ${daysUntilExpiry} days. Everything looks good for now.`;
    default:
      return 'Token is healthy.';
  }
}

/**
 * Format expiration date for display
 */
function formatExpirationDate(tokenExpiresAt: Date | null): string | null {
  if (!tokenExpiresAt) {
    return null;
  }
  return tokenExpiresAt.toISOString();
}

/**
 * GET handler for token alerts
 * Returns expiration status and alert level for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No organization found'
      }, { status: 401 });
    }
    
    const orgId = session.user.organizationId;
    
    // Get WhatsApp credential for this organization
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId }
    });
    
    // If no credential exists, return healthy status
    if (!credential) {
      return NextResponse.json({
        success: true,
        hasCredential: false,
        alert: null
      });
    }
    
    // Calculate days until expiration
    const tokenExpiresAt = credential.tokenExpiresAt 
      ? new Date(credential.tokenExpiresAt) 
      : null;
    
    const daysUntilExpiry = tokenExpiresAt !== null
      ? Math.ceil((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    
    // Determine alert level
    const alertLevel = getAlertLevel(daysUntilExpiry);
    
    // Determine if action is required
    const actionRequired = alertLevel === 'critical' || alertLevel === 'expired';
    
    // Build the alert object
    const alert: TokenAlert = {
      alertLevel,
      daysUntilExpiry,
      expirationDate: formatExpirationDate(tokenExpiresAt),
      message: getAlertMessage(alertLevel, daysUntilExpiry),
      actionRequired,
      refreshTokenUrl: '/api/whatsapp/token/refresh'
    };
    
    // Check if credential is active
    const hasCredential = true;
    const isActive = credential.isActive;
    
    return NextResponse.json({
      success: true,
      hasCredential,
      isActive,
      alert,
      // Include additional info for debugging/monitoring
      debug: {
        connectedAt: credential.connectedAt,
        lastRefreshedAt: credential.lastRefreshedAt,
        lastRefreshStatus: credential.lastRefreshStatus,
        lastVerifiedAt: credential.lastVerifiedAt
      }
    });
    
  } catch (error: any) {
    console.error(`[TokenAlerts] Error:`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get token alerts',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
