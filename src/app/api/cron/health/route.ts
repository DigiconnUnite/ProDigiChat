/**
 * WhatsApp Health Check Cron Job
 * 
 * Periodically runs health checks for all WhatsApp-connected organizations.
 * This endpoint should be called via cron job (e.g., every 15 minutes).
 * 
 * Cron URL: /api/cron/health?key=YOUR_CRON_KEY
 * 
 * Recommended cron schedule: Every 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

const META_API_BASE_URL = 'https://graph.facebook.com/v18.0';
const CRON_KEY = process.env.CRON_SECRET_KEY || 'development-cron-key';

// Health check interval - minimum time between checks (10 minutes)
const HEALTH_CHECK_MIN_INTERVAL = 10 * 60 * 1000;

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: {
    apiCredentials: { status: 'pass' | 'fail' | 'warning'; message: string };
    webhook: { status: 'pass' | 'fail' | 'warning'; message: string };
    phoneNumbers: { status: 'pass' | 'fail' | 'warning'; message: string };
    token: { status: 'pass' | 'fail' | 'warning'; message: string };
    rateLimits: { status: 'pass' | 'fail' | 'warning'; message: string };
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    check: string;
    message: string;
    actionRequired: boolean;
  }>;
}

/**
 * Validate API credentials against Meta API
 */
async function validateApiCredentials(
  apiKey: string,
  phoneNumberId: string,
  businessAccountId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    await axios.get(
      `${META_API_BASE_URL}/${phoneNumberId}`,
      {
        params: { fields: 'id' },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );

    await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}`,
      {
        params: { fields: 'id' },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );

    return { valid: true };
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { valid: false, error: 'API credentials are invalid or expired' };
    }
    return { valid: false, error: error.response?.data?.error?.message || 'Failed to validate credentials' };
  }
}

/**
 * Check phone number verification status
 */
async function checkPhoneNumbers(
  apiKey: string,
  businessAccountId: string
): Promise<{ allVerified: boolean; message: string }> {
  try {
    const response = await axios.get(
      `${META_API_BASE_URL}/${businessAccountId}/phone_numbers`,
      {
        params: {
          fields: 'id,code_verification_status',
          limit: 100
        },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );

    const phoneNumbers = response.data.data || [];
    const verifiedCount = phoneNumbers.filter(
      (phone: any) => phone.code_verification_status === 'VERIFIED'
    ).length;

    if (verifiedCount === 0) {
      return { allVerified: false, message: 'No phone numbers verified' };
    }

    return {
      allVerified: verifiedCount === phoneNumbers.length,
      message: `${verifiedCount} of ${phoneNumbers.length} verified`
    };
  } catch {
    return { allVerified: false, message: 'Could not verify phone numbers' };
  }
}

/**
 * Check token expiration
 */
function checkTokenExpiration(tokenExpiresAt: Date | null): {
  status: 'pass' | 'warning' | 'fail';
  message: string;
} {
  if (!tokenExpiresAt) {
    return { status: 'warning', message: 'Token expiration not set' };
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 0) {
    return { status: 'fail', message: 'Token expired' };
  }

  if (daysUntilExpiry <= 7) {
    return { status: 'warning', message: `Token expires in ${daysUntilExpiry} days` };
  }

  return { status: 'pass', message: 'Token valid' };
}

/**
 * Check API rate limits
 */
async function checkRateLimits(
  apiKey: string,
  phoneNumberId: string
): Promise<{ status: 'pass' | 'warning' | 'fail'; message: string }> {
  try {
    await axios.get(
      `${META_API_BASE_URL}/${phoneNumberId}`,
      {
        params: { fields: 'id' },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );
    return { status: 'pass', message: 'API responding' };
  } catch (error: any) {
    if (error.response?.status === 429) {
      return { status: 'fail', message: 'Rate limited' };
    }
    return { status: 'warning', message: 'Could not verify' };
  }
}

/**
 * Perform health check for a single organization
 */
async function performHealthCheck(
  organizationId: string,
  apiKey: string,
  businessAccountId: string,
  phoneNumberId: string | null,
  tokenExpiresAt: Date | null
): Promise<HealthCheckResult> {
  const issues: HealthCheckResult['issues'] = [];
  let overallStatus: HealthCheckResult['status'] = 'healthy';

  // 1. Check API credentials
  const credentialsCheck = await validateApiCredentials(apiKey, phoneNumberId || '', businessAccountId);
  if (!credentialsCheck.valid) {
    issues.push({
      severity: 'critical',
      check: 'apiCredentials',
      message: credentialsCheck.error || 'Invalid credentials',
      actionRequired: true
    });
    overallStatus = 'unhealthy';
  }

  // 2. Check phone numbers
  const phoneCheck = await checkPhoneNumbers(apiKey, businessAccountId);
  if (!phoneCheck.allVerified) {
    issues.push({
      severity: 'warning',
      check: 'phoneNumbers',
      message: phoneCheck.message,
      actionRequired: true
    });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  // 3. Check token
  const tokenCheck = checkTokenExpiration(tokenExpiresAt);
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

  // 4. Check rate limits
  const rateLimitCheck = await checkRateLimits(apiKey, phoneNumberId || '');
  if (rateLimitCheck.status === 'fail') {
    issues.push({
      severity: 'critical',
      check: 'rateLimits',
      message: rateLimitCheck.message,
      actionRequired: true
    });
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    checks: {
      apiCredentials: {
        status: credentialsCheck.valid ? 'pass' : 'fail',
        message: credentialsCheck.valid ? 'Valid' : credentialsCheck.error || 'Invalid'
      },
      webhook: { status: 'pass', message: 'Not checked in cron' },
      phoneNumbers: {
        status: phoneCheck.allVerified ? 'pass' : 'warning',
        message: phoneCheck.message
      },
      token: { status: tokenCheck.status, message: tokenCheck.message },
      rateLimits: { status: rateLimitCheck.status, message: rateLimitCheck.message }
    },
    issues
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
    await (prisma as any).whatsAppCredential.update({
      where: { organizationId },
      data: {
        healthCheckStatus: result.status,
        healthCheckLastRun: new Date(),
        healthCheckError: result.issues.length > 0
          ? result.issues.map(i => i.message).join('; ')
          : null,
        healthCheckDetails: JSON.stringify({
          checks: result.checks,
          issues: result.issues,
          lastChecked: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    console.error(`[HealthCron] Error updating status for ${organizationId}:`, error);
  }
}

/**
 * GET handler - Run health checks for all organizations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron key
    const cronKey = request.nextUrl.searchParams.get('key');
    if (cronKey !== CRON_KEY) {
      console.warn('[HealthCron] Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[HealthCron] Starting health check for all organizations...');

    // Get all active WhatsApp credentials
    const credentials = await prisma.whatsAppCredential.findMany({
      where: { isActive: true },
      select: {
        organizationId: true,
        accessToken: true,
        businessAccountId: true,
        phoneNumberId: true,
        tokenExpiresAt: true,
        healthCheckLastRun: true,
        healthCheckStatus: true
      }
    });

    console.log(`[HealthCron] Found ${credentials.length} organizations to check`);

    const results = {
      total: credentials.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
      errors: [] as string[]
    };

    // Check each organization
    for (const cred of credentials) {
      try {
        // Skip if checked recently
        if (cred.healthCheckLastRun) {
          const timeSinceLastCheck = Date.now() - new Date(cred.healthCheckLastRun).getTime();
          if (timeSinceLastCheck < HEALTH_CHECK_MIN_INTERVAL) {
            console.log(`[HealthCron] Skipping ${cred.organizationId} - checked recently`);
            // Update counts based on existing status
            if (cred.healthCheckStatus === 'healthy') results.healthy++;
            else if (cred.healthCheckStatus === 'degraded') results.degraded++;
            else if (cred.healthCheckStatus === 'unhealthy') results.unhealthy++;
            else results.unknown++;
            continue;
          }
        }

        // Perform health check
        const healthResult = await performHealthCheck(
          cred.organizationId,
          cred.accessToken,
          cred.businessAccountId,
          cred.phoneNumberId,
          cred.tokenExpiresAt
        );

        // Update status in database
        await updateHealthCheckStatus(cred.organizationId, healthResult);

        // Update counts
        if (healthResult.status === 'healthy') results.healthy++;
        else if (healthResult.status === 'degraded') results.degraded++;
        else if (healthResult.status === 'unhealthy') results.unhealthy++;
        else results.unknown++;

        // Log issues for critical problems
        const criticalIssues = healthResult.issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          console.log(`[HealthCron] Organization ${cred.organizationId} has ${criticalIssues.length} critical issue(s):`,
            criticalIssues.map(i => i.message).join(', ')
          );
        }

      } catch (error: any) {
        console.error(`[HealthCron] Error checking org ${cred.organizationId}:`, error);
        results.errors.push(`Org ${cred.organizationId}: ${error.message}`);
        results.unknown++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[HealthCron] Completed in ${duration}ms. Results:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results
    });

  } catch (error: any) {
    console.error('[HealthCron] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Health check failed' },
      { status: 500 }
    );
  }
}

// Support POST as well
export async function POST(request: NextRequest) {
  return GET(request);
}
