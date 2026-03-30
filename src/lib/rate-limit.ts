import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getToken } from 'next-auth/jwt';

// Store for rate limit tracking
const rateLimitStore = new Map<string, Map<RateLimitEndpoint, number[]>>();

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

// Check if Redis is configured
const isRedisConfigured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis
const redis = isRedisConfigured ? Redis.fromEnv() : null;

// Create rate limiters for each endpoint
const rateLimiters = redis ? {
  messages: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.messages.limit, `${RATE_LIMITS.messages.windowSec} s`),
  }),
  'phone-numbers': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS['phone-numbers'].limit, `${RATE_LIMITS['phone-numbers'].windowSec} s`),
  }),
  templates: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.templates.limit, `${RATE_LIMITS.templates.windowSec} s`),
  }),
  webhooks: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.webhooks.limit, `${RATE_LIMITS.webhooks.windowSec} s`),
  }),
} : null;

/**
 * Get organization ID from request
 * Extracts from verified JWT token
 */
async function getOrganizationId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request });
  return token?.organizationId as string || null;
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
 * Check if request is rate limited using Redis
 */
export async function checkRateLimit(
  orgId: string | null,
  endpoint: RateLimitEndpoint
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  // Use 'default-org' if no orgId (unauthenticated requests)
  const key = orgId || 'default-org';
  const config = RATE_LIMITS[endpoint];

  if (rateLimiters) {
    const limiter = rateLimiters[endpoint];

    const result = await limiter.limit(`${key}:${endpoint}`);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
      limit: config.limit,
    };
  }

  // Fallback to in-memory store
  const now = Date.now();
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, new Map());
  }
  
  const orgStore = rateLimitStore.get(key)!;
  if (!orgStore.has(endpoint)) {
    orgStore.set(endpoint, []);
  }
  
  let timestamps = orgStore.get(endpoint)!;
  timestamps = cleanOldTimestamps(timestamps, config.windowMs);
  
  const allowed = timestamps.length < config.limit;
  
  if (allowed) {
    timestamps.push(now);
  }
  
  orgStore.set(endpoint, timestamps);
  
  return {
    allowed,
    remaining: Math.max(0, config.limit - timestamps.length),
    resetTime: timestamps.length > 0 ? timestamps[0] + config.windowMs : now + config.windowMs,
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
  const orgId = await getOrganizationId(request);
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const result = await checkRateLimit(orgId, endpoint);

  const headers = createRateLimitHeaders(
    result.limit,
    result.remaining,
    result.resetTime
  );

  if (!result.allowed) {
    logRateLimitViolation(orgId || 'unknown', endpoint, clientIP);
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
