/**
 * WhatsApp Health Check API
 * 
 * Provides comprehensive health checks for WhatsApp connections:
 * - API credentials validation
 * - Webhook registration check
 * - Phone number verification status
 * - Token expiration check
 * - API rate limits check
 * 
 * Endpoints:
 * - GET /api/whatsapp/health/check - Get health status for all organizations (admin/cron)
 * - GET /api/whatsapp/health/check?orgId=<id> - Get health status for specific organization
 * - POST /api/whatsapp/health/check - Trigger health check for specific organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import axios from 'axios';

const META_API_BASE_URL = 'https://graph.facebook.com/v18.0';

// Health check interval - minimum time between checks (5 minutes)
const HEALTH_CHECK_MIN_INTERVAL = 5 * 60 * 1000;

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: {
    apiCredentials: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
    };
    webhook: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
    };
    phoneNumbers: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details: Array<{
        id: string;
        displayName: string;
        verificationStatus: string;
        isVerified: boolean;
      }>;
    };
    token: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      daysUntilExpiry?: number;
    };
    rateLimits: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
    };
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    check: string;
    message: string;
    actionRequired: boolean;
  }>;
  lastChecked: string;
  actionRequired: boolean;
}

/**
 * Validate API credentials against Meta API
 */
async function validateApiCredentials(
  apiKey: string,
  phoneNumberId: string,
  businessAccountId: string
): Promise<{ valid: boolean; error?: string; businessAccountName?: string }> {
  try {
    // Test phone number access
    const phoneResponse = await axios.get(
      `${META_API_BASE_URL}/${phoneNumberId}`,
      {
        params: {
          fields: 'id,verified_name,display_phone_number,code_verification_status,quality_rating'
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );

    if (!phoneResponse.data || phoneResponse.data.id !== phoneNumberId) {
      return { valid: false, error: 'Phone Number ID is invalid or does not match the API key' };
    }

    // Test business account access
    const businessResponse = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}`,
      {
        params: {
          fields: 'id,name'
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );

    if (!businessResponse.data || businessResponse.data.id !== businessAccountId) {
      return { valid: false, error: 'Business Account ID is invalid' };
    }

    return {
      valid: true,
      businessAccountName: businessResponse.data.name || 'WhatsApp Business'
    };
  } catch (error: any) {
    console.error('[HealthCheck] Error validating credentials:', error);
    
    if (error.response?.status === 401) {
      return { valid: false, error: 'API credentials are invalid or expired' };
    }
    
    if (error.response?.data?.error) {
      return { valid: false, error: error.response.data.error.message || 'Invalid credentials' };
    }
    
    return { valid: false, error: 'Failed to validate credentials' };
  }
}

/**
 * Check webhook configuration
 */
async function checkWebhook(
  webhookUrl: string | null,
  webhookVerifyToken: string | null
): Promise<{ configured: boolean; message: string }> {
  // Check if webhook URL is configured
  if (!webhookUrl) {
    return {
      configured: false,
      message: 'Webhook URL is not configured. Incoming messages will not be received.'
    };
  }

  // Verify webhook is accessible (basic check)
  try {
    const webhookEndpoint = `${webhookUrl.replace(/\/$/, '')}`;
    const response = await axios.head(webhookEndpoint, { timeout: 5000 }).catch(() => null);
    
    if (response || webhookUrl.includes('localhost')) {
      return {
        configured: true,
        message: 'Webhook is configured and accessible'
      };
    }
  } catch {
    // Webhook might not respond to HEAD requests - this is OK
    return {
      configured: true,
      message: 'Webhook is configured (could not verify accessibility)'
    };
  }

  return {
    configured: true,
    message: 'Webhook is configured'
  };
}

/**
 * Check phone number verification status
 */
async function checkPhoneNumbers(
  apiKey: string,
  businessAccountId: string,
  storedPhoneNumbers: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    verificationStatus: string;
    isDefault: boolean;
  }>
): Promise<{
  allVerified: boolean;
  hasDefault: boolean;
  details: Array<{
    id: string;
    displayName: string;
    verificationStatus: string;
    isVerified: boolean;
  }>;
  message: string;
}> {
  // Fetch current phone numbers from Meta API
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}/phone_numbers`,
      {
        params: {
          fields: 'id,verified_name,display_phone_number,code_verification_status,quality_rating',
          limit: 100
        },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000
      }
    );

    const metaPhoneNumbers = response.data.data || [];
    
    // Map Meta phone numbers to check verification status
    const details = metaPhoneNumbers.map((phone: any) => {
      const isVerified = phone.code_verification_status === 'VERIFIED';
      const storedNumber = storedPhoneNumbers.find(p => p.phoneNumber === phone.id);
      
      return {
        id: phone.id,
        displayName: phone.verified_name || phone.display_phone_number || 'Unknown',
        verificationStatus: phone.code_verification_status || 'UNKNOWN',
        isVerified,
        qualityScore: phone.quality_rating || 'UNKNOWN',
        isDefault: storedNumber?.isDefault || false
      } as {
        id: string;
        displayName: string;
        verificationStatus: string;
        isVerified: boolean;
        qualityScore?: string;
        isDefault: boolean;
      };
    });

    const verifiedCount = details.filter(d => d.isVerified).length;
    const hasDefault = details.some(d => d.isDefault);

    let message: string;
    if (verifiedCount === 0) {
      message = 'No phone numbers are verified. Messages cannot be sent.';
    } else if (verifiedCount < details.length) {
      message = `${verifiedCount} of ${details.length} phone numbers verified`;
    } else {
      message = `All ${details.length} phone numbers verified`;
    }

    return {
      allVerified: verifiedCount === details.length && details.length > 0,
      hasDefault,
      details,
      message
    };
  } catch (error: any) {
    console.error('[HealthCheck] Error fetching phone numbers:', error);
    
    // Return stored phone numbers if API call fails
    const details = storedPhoneNumbers.map(p => ({
      id: p.phoneNumber,
      displayName: p.displayName,
      verificationStatus: p.verificationStatus,
      isVerified: p.verificationStatus === 'VERIFIED'
    }));
    
    return {
      allVerified: false,
      hasDefault: details.some((d: any) => d.isDefault),
      details,
      message: 'Could not verify phone numbers - API call failed'
    };
  }
}

/**
 * Check token expiration
 */
function checkTokenExpiration(tokenExpiresAt: Date | null): {
  isValid: boolean;
  daysUntilExpiry: number | null;
  message: string;
  status: 'pass' | 'warning' | 'fail';
} {
  if (!tokenExpiresAt) {
    return {
      isValid: false,
      daysUntilExpiry: null,
      message: 'Token expiration date is not set',
      status: 'warning'
    };
  }

  const now = new Date();
  const expiryDate = new Date(tokenExpiresAt);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return {
      isValid: false,
      daysUntilExpiry,
      message: 'Token has expired. Reconnect to refresh the token.',
      status: 'fail'
    };
  }

  if (daysUntilExpiry <= 7) {
    return {
      isValid: true,
      daysUntilExpiry,
      message: `Token expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Consider refreshing soon.`,
      status: 'warning'
    };
  }

  return {
    isValid: true,
    daysUntilExpiry,
    message: `Token is valid for ${daysUntilExpiry} days`,
    status: 'pass'
  };
}

/**
 * Check API rate limits (simulated - Meta doesn't provide direct rate limit status)
 */
async function checkRateLimits(
  apiKey: string,
  phoneNumberId: string
): Promise<{ status: 'pass' | 'warning' | 'fail'; message: string }> {
  try {
    // Try a simple API call to check if we're rate limited
    const response = await axios.get(
      `${META_API_BASE_URL}/${phoneNumberId}`,
      {
        params: { fields: 'id' },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      return {
        status: 'pass',
        message: 'API calls are working. Rate limits appear normal.'
      };
    }

    return {
      status: 'warning',
      message: 'Could not verify rate limit status'
    };
  } catch (error: any) {
    if (error.response?.status === 429) {
      return {
        status: 'fail',
        message: 'Rate limit exceeded. Wait before making more requests.'
      };
    }

    return {
      status: 'warning',
      message: 'Could not verify rate limit status'
    };
  }
}

/**
 * Perform comprehensive health check for an organization
 */
async function performHealthCheck(
  organizationId: string,
  apiKey: string,
  businessAccountId: string,
  phoneNumberId: string | null,
  webhookUrl: string | null,
  webhookVerifyToken: string | null,
  tokenExpiresAt: Date | null,
  storedPhoneNumbers: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    verificationStatus: string;
    isDefault: boolean;
  }>
): Promise<HealthCheckResult> {
  const issues: HealthCheckResult['issues'] = [];
  let overallStatus: HealthCheckResult['status'] = 'healthy';

  // 1. Check API credentials
  const credentialsCheck = await validateApiCredentials(apiKey, phoneNumberId || '', businessAccountId);
  const apiCredentialsStatus: HealthCheckResult['checks']['apiCredentials'] = {
    status: credentialsCheck.valid ? 'pass' : 'fail',
    message: credentialsCheck.valid ? 'API credentials are valid' : credentialsCheck.error || 'Invalid credentials'
  };

  if (!credentialsCheck.valid) {
    issues.push({
      severity: 'critical',
      check: 'apiCredentials',
      message: credentialsCheck.error || 'API credentials are invalid',
      actionRequired: true
    });
    overallStatus = 'unhealthy';
  }

  // 2. Check webhook
  const webhookCheck = await checkWebhook(webhookUrl, webhookVerifyToken);
  const webhookStatus: HealthCheckResult['checks']['webhook'] = {
    status: webhookCheck.configured ? 'pass' : 'warning',
    message: webhookCheck.message
  };

  if (!webhookCheck.configured) {
    issues.push({
      severity: 'warning',
      check: 'webhook',
      message: webhookCheck.message,
      actionRequired: true
    });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  // 3. Check phone numbers
  const phoneNumbersCheck = await checkPhoneNumbers(apiKey, businessAccountId, storedPhoneNumbers);
  const phoneNumbersStatus: HealthCheckResult['checks']['phoneNumbers'] = {
    status: phoneNumbersCheck.allVerified ? 'pass' : phoneNumbersCheck.hasDefault ? 'warning' : 'fail',
    message: phoneNumbersCheck.message,
    details: phoneNumbersCheck.details
  };

  if (!phoneNumbersCheck.allVerified) {
    const unverifiedCount = phoneNumbersCheck.details.filter(d => !d.isVerified).length;
    issues.push({
      severity: unverifiedCount > 0 ? 'critical' : 'warning',
      check: 'phoneNumbers',
      message: `${unverifiedCount} phone number(s) not verified`,
      actionRequired: true
    });
    if (!phoneNumbersCheck.hasDefault) {
      overallStatus = 'unhealthy';
    } else if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  // 4. Check token expiration
  const tokenCheck = checkTokenExpiration(tokenExpiresAt);
  const tokenStatus: HealthCheckResult['checks']['token'] = {
    status: tokenCheck.status,
    message: tokenCheck.message,
    daysUntilExpiry: tokenCheck.daysUntilExpiry ?? undefined
  };

  if (tokenCheck.status === 'fail') {
    issues.push({
      severity: 'critical',
      check: 'token',
      message: tokenCheck.message,
      actionRequired: true
    });
    overallStatus = 'unhealthy';
  } else if (tokenCheck.status === 'warning') {
    issues.push({
      severity: 'warning',
      check: 'token',
      message: tokenCheck.message,
      actionRequired: true
    });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  // 5. Check rate limits
  const rateLimitCheck = await checkRateLimits(apiKey, phoneNumberId || '');
  const rateLimitsStatus: HealthCheckResult['checks']['rateLimits'] = {
    status: rateLimitCheck.status,
    message: rateLimitCheck.message
  };

  if (rateLimitCheck.status === 'fail') {
    issues.push({
      severity: 'critical',
      check: 'rateLimits',
      message: rateLimitCheck.message,
      actionRequired: true
    });
    overallStatus = 'unhealthy';
  }

  const actionRequired = issues.some(i => i.actionRequired);

  return {
    status: overallStatus,
    checks: {
      apiCredentials: apiCredentialsStatus,
      webhook: webhookStatus,
      phoneNumbers: phoneNumbersStatus,
      token: tokenStatus,
      rateLimits: rateLimitsStatus
    },
    issues,
    lastChecked: new Date().toISOString(),
    actionRequired
  };
}

/**
 * Update health check status in database
 */
async function updateHealthCheckStatus(
  organizationId: string,
  result: HealthCheckResult
): Promise<void> {
  try {
    // First, find the credential by organizationId
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { organizationId }
    });

    if (!credential) {
      console.error('[HealthCheck] No credential found for organization:', organizationId);
      return;
    }

    // Update using the credential's id
    await prisma.whatsAppCredential.update({
      where: { id: credential.id },
      data: {
        healthCheckStatus: result.status,
        healthCheckLastRun: new Date(),
        healthCheckError: result.issues.length > 0 
          ? result.issues.map(i => i.message).join('; ')
          : null,
        healthCheckDetails: JSON.stringify({
          checks: result.checks,
          issues: result.issues,
          lastChecked: result.lastChecked
        })
      }
    });
  } catch (error) {
    console.error('[HealthCheck] Error updating health check status:', error);
  }
}

/**
 * GET handler - Retrieve health status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const forceRefresh = searchParams.get('force') === 'true';

    // If orgId is provided, get health status for that organization
    if (orgId) {
      // Get credentials from database - use findFirst since organizationId is not unique
      const credential = await prisma.whatsAppCredential.findFirst({
        where: { organizationId: orgId },
        include: {
          phoneNumbers: true
        }
      });

      if (!credential) {
        return NextResponse.json({
          success: false,
          error: 'No WhatsApp credential found for this organization'
        }, { status: 404 });
      }

      // Check if we can use cached results
      const lastCheck = credential.healthCheckLastRun;
      const timeSinceLastCheck = lastCheck ? Date.now() - new Date(lastCheck).getTime() : Infinity;

      if (!forceRefresh && timeSinceLastCheck < HEALTH_CHECK_MIN_INTERVAL && credential.healthCheckStatus !== 'unknown') {
        // Return cached result
        const cachedDetails = credential.healthCheckDetails ? JSON.parse(credential.healthCheckDetails) : null;
        
        return NextResponse.json({
          success: true,
          organizationId: orgId,
          status: credential.healthCheckStatus,
          lastChecked: credential.healthCheckLastRun,
          issues: cachedDetails?.issues || [],
          cached: true
        });
      }

      // Perform fresh health check
      // Note: We need to decrypt the access token for API calls
      // For now, we'll use a simplified approach - return the stored status if available
      const healthCheckResult = await performHealthCheck(
        orgId,
        credential.accessToken, // This should be decrypted in production
        credential.businessAccountId,
        credential.phoneNumberId,
        credential.webhookUrl,
        credential.webhookVerifyToken,
        credential.tokenExpiresAt,
        credential.phoneNumbers.map(p => ({
          id: p.id,
          displayName: p.displayName,
          phoneNumber: p.phoneNumber,
          verificationStatus: p.verificationStatus,
          isDefault: p.isDefault
        }))
      );

      // Update database with new status
      await updateHealthCheckStatus(orgId, healthCheckResult);

      return NextResponse.json({
        success: true,
        organizationId: orgId,
        ...healthCheckResult
      });
    }

    // No orgId - get status for all organizations (admin view)
    const credentials = await prisma.whatsAppCredential.findMany({
      where: { isActive: true },
      select: {
        organizationId: true,
        businessAccountName: true,
        healthCheckStatus: true,
        healthCheckLastRun: true,
        healthCheckError: true,
        lastVerifiedAt: true,
        tokenExpiresAt: true
      },
      orderBy: { healthCheckLastRun: 'desc' }
    });

    // Calculate summary
    const summary = {
      total: credentials.length,
      healthy: credentials.filter(c => c.healthCheckStatus === 'healthy').length,
      degraded: credentials.filter(c => c.healthCheckStatus === 'degraded').length,
      unhealthy: credentials.filter(c => c.healthCheckStatus === 'unhealthy').length,
      unknown: credentials.filter(c => c.healthCheckStatus === 'unknown').length
    };

    return NextResponse.json({
      success: true,
      summary,
      organizations: credentials
    });

  } catch (error: any) {
    console.error('[HealthCheck] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Health check failed'
    }, { status: 500 });
  }
}

/**
 * POST handler - Trigger health check for specific organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID is required'
      }, { status: 400 });
    }

    // Get credentials from database - use findFirst since organizationId is not unique
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { organizationId },
      include: {
        phoneNumbers: true
      }
    });

    if (!credential) {
      return NextResponse.json({
        success: false,
        error: 'No WhatsApp credential found for this organization'
      }, { status: 404 });
    }

    // Perform health check
    // Note: In production, you'd need to decrypt the access token
    const healthCheckResult = await performHealthCheck(
      organizationId,
      credential.accessToken,
      credential.businessAccountId,
      credential.phoneNumberId,
      credential.webhookUrl,
      credential.webhookVerifyToken,
      credential.tokenExpiresAt,
      credential.phoneNumbers.map(p => ({
        id: p.id,
        displayName: p.displayName,
        phoneNumber: p.phoneNumber,
        verificationStatus: p.verificationStatus,
        isDefault: p.isDefault
      }))
    );

    // Update database with new status
    await updateHealthCheckStatus(organizationId, healthCheckResult);

    return NextResponse.json({
      success: true,
      organizationId,
      ...healthCheckResult
    });

  } catch (error: any) {
    console.error('[HealthCheck] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Health check failed'
    }, { status: 500 });
  }
}
