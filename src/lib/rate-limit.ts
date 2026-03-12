import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limit configurations per endpoint type
export const RATE_LIMITS = {
  messages: {
    limit: 100, // requests per window
    windowMs: 60 * 1000, // 1 minute in milliseconds
    windowSec: 60, // 1 minute in seconds
  },
  'phone-numbers': {
    limit: 30,
    windowMs: 60 * 1000,
    windowSec: 60,
  },
  templates: {
    limit: 60,
    windowMs: 60 * 1000,
    windowSec: 60,
  },
  webhooks: {
    limit: 200,
    windowMs: 60 * 1000,
    windowSec: 60,
  },
} as const;

export type RateLimitEndpoint = keyof typeof RATE_LIMITS;

// In-memory store for rate limiting using sliding window algorithm
// Map<orgId, Map<endpoint, RequestTimestamp[]>>
const rateLimitStore = new Map<string, Map<RateLimitEndpoint, number[]>>();

/**
 * Get organization ID from request
 * Uses header x-org-id or falls back to auth organization
 */
function getOrganizationId(request: NextRequest): string {
  // First check for org-id header (set by auth middleware)
  const orgId = request.headers.get('x-org-id');
  if (orgId) {
    return orgId;
  }
  
  // Fallback: check for organization in query params or body
  const url = new URL(request.url);
  const orgParam = url.searchParams.get('organizationId');
  if (orgParam) {
    return orgParam;
  }
  
  // Default to 'default-org' for unauthenticated requests
  return 'default-org';
}

/**
 * Clean up old timestamps outside the current window
 */
function cleanOldTimestamps(
  timestamps: number[],
  windowMs: number
): number[] {
  const now = Date.now();
  const cutoff = now - windowMs;
  return timestamps.filter(ts => ts > cutoff);
}

/**
 * Check if request is rate limited using sliding window algorithm
 */
export function checkRateLimit(
  orgId: string,
  endpoint: RateLimitEndpoint
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const config = RATE_LIMITS[endpoint];
  const now = Date.now();
  
  // Initialize org entry if not exists
  if (!rateLimitStore.has(orgId)) {
    rateLimitStore.set(orgId, new Map());
  }
  
  const orgStore = rateLimitStore.get(orgId)!;
  
  // Initialize endpoint entry if not exists
  if (!orgStore.has(endpoint)) {
    orgStore.set(endpoint, []);
  }
  
  const timestamps = orgStore.get(endpoint)!;
  
  // Clean old timestamps outside the window
  const cleanTimestamps = cleanOldTimestamps(timestamps, config.windowMs);
  orgStore.set(endpoint, cleanTimestamps);
  
  const currentCount = cleanTimestamps.length;
  const remaining = Math.max(0, config.limit - currentCount);
  
  // Calculate reset time (end of current window)
  const resetTime = now + config.windowMs;
  
  // Check if limit exceeded
  if (currentCount >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      limit: config.limit,
    };
  }
  
  // Add current request timestamp
  cleanTimestamps.push(now);
  orgStore.set(endpoint, cleanTimestamps);
  
  return {
    allowed: true,
    remaining: remaining - 1, // Account for current request
    resetTime,
    limit: config.limit,
  };
}

/**
 * Log rate limit violation for monitoring
 */
function logRateLimitViolation(
  orgId: string,
  endpoint: RateLimitEndpoint,
  ip: string
): void {
  const timestamp = new Date().toISOString();
  console.warn(
    `[RATE LIMIT] Violation detected | Org: ${orgId} | Endpoint: ${endpoint} | IP: ${ip} | Time: ${timestamp}`
  );
}

/**
 * Create rate limit headers for response
 */
function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  return headers;
}

/**
 * Create rate limit error response
 */
function createRateLimitResponse(
  endpoint: RateLimitEndpoint,
  resetTime: number
): NextResponse {
  const config = RATE_LIMITS[endpoint];
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  const headers = createRateLimitHeaders(config.limit, 0, resetTime);
  headers.set('Retry-After', Math.max(1, retryAfter).toString());
  
  return NextResponse.json(
    {
      error: 'Rate Limit Exceeded',
      message: `Too many requests to ${endpoint} endpoint. Please wait before retrying.`,
      retryAfter: Math.max(1, retryAfter),
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Rate limiting middleware for Next.js API routes
 * Call this at the beginning of your API route handler
 * 
 * @param request - NextRequest object
 * @param endpoint - The endpoint type for rate limiting
 * @returns NextResponse if rate limited, null if allowed
 */
export async function rateLimit(
  request: NextRequest,
  endpoint: RateLimitEndpoint
): Promise<{ allowed: boolean; response?: NextResponse; headers: Headers }> {
  const orgId = getOrganizationId(request);
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  
  const result = checkRateLimit(orgId, endpoint);
  
  const headers = createRateLimitHeaders(
    result.limit,
    result.remaining,
    result.resetTime
  );
  
  if (!result.allowed) {
    logRateLimitViolation(orgId, endpoint, clientIP);
    const response = createRateLimitResponse(endpoint, result.resetTime);
    return { allowed: false, response, headers };
  }
  
  return { allowed: true, headers };
}

/**
 * Get current rate limit status without incrementing
 * Useful for checking status without making a request
 */
export function getRateLimitStatus(
  orgId: string,
  endpoint: RateLimitEndpoint
): {
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const config = RATE_LIMITS[endpoint];
  const now = Date.now();
  
  let current = 0;
  let resetTime = now + config.windowMs;
  
  const orgStore = rateLimitStore.get(orgId);
  if (orgStore) {
    const timestamps = orgStore.get(endpoint);
    if (timestamps) {
      const cleanTimestamps = cleanOldTimestamps(timestamps, config.windowMs);
      current = cleanTimestamps.length;
      // Calculate when the oldest request will expire
      if (cleanTimestamps.length > 0) {
        resetTime = cleanTimestamps[0] + config.windowMs;
      }
    }
  }
  
  return {
    current,
    limit: config.limit,
    remaining: Math.max(0, config.limit - current),
    resetTime,
  };
}

/**
 * Clear rate limit data for an organization
 * Useful for testing or when organization is deleted
 */
export function clearRateLimit(orgId: string): void {
  rateLimitStore.delete(orgId);
}

/**
 * Get all rate limit data (for debugging/monitoring)
 */
export function getRateLimitStats(): {
  organizations: number;
  endpoints: Map<string, number>;
} {
  let totalEndpoints = 0;
  const endpointCounts = new Map<string, number>();
  
  rateLimitStore.forEach((orgStore) => {
    orgStore.forEach((timestamps, endpoint) => {
      const count = timestamps.length;
      totalEndpoints += count;
      endpointCounts.set(
        endpoint,
        (endpointCounts.get(endpoint) || 0) + count
      );
    });
  });
  
  return {
    organizations: rateLimitStore.size,
    endpoints: endpointCounts,
  };
}
