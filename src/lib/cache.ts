import { Redis } from '@upstash/redis'

// Initialize Redis client
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[Cache] Redis credentials not configured. Caching disabled.');
      return null as any;
    }

    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

export async function get<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const data = await client.get(key) as string | null;
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    console.error('[Cache] Error getting data:', error);
    return null;
  }
}

export async function set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;

    await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    console.error('[Cache] Error setting data:', error);
  }
}

export async function del(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;

    await client.del(key);
  } catch (error) {
    console.error('[Cache] Error deleting data:', error);
  }
}

export async function delPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys && keys.length > 0) {
      for (const key of keys) {
        await client.del(key);
      }
    }
  } catch (error) {
    console.error('[Cache] Error deleting pattern:', error);
  }
}

export function generateCacheKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

export function generateOrganizationCacheKey(prefix: string, orgId: string, suffix: string = ''): string {
  return `${prefix}:org:${orgId}${suffix ? `:${suffix}` : ''}`;
}
