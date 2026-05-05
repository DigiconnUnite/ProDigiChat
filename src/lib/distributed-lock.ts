/**
 * Distributed lock backed by Upstash Redis.
 *
 * Used to prevent concurrent execution of work that must not overlap
 * across instances — primarily the cron queue tick. Without this,
 * two cron invocations (or a cron + a manual trigger) could fan out
 * the same set of queue rows and produce duplicate Meta API sends.
 *
 * The lock is implemented as `SET key value NX PX ttl` (Redis NX: set
 * only if absent). The owner identifier is randomly generated; release
 * uses a CHECK-AND-DELETE Lua script so a stale lock that has already
 * expired and been re-acquired by someone else is never deleted by the
 * original holder.
 *
 * If Upstash credentials are not configured, the lock helper logs a
 * warning and treats every acquire as successful — this is a
 * deliberate fail-open in development. In production, set
 * `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
 */
import { Redis } from "@upstash/redis";
import crypto from "crypto";

let _client: Redis | null = null;
let _checkedEnv = false;

function getClient(): Redis | null {
  if (_client) return _client;
  if (_checkedEnv) return null;
  _checkedEnv = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[DistributedLock] Upstash Redis credentials not configured — locks are NOT enforced. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production.",
    );
    return null;
  }

  _client = new Redis({ url, token });
  return _client;
}

export interface AcquiredLock {
  /** The lock key, with the configured prefix applied. */
  key: string;
  /** Randomly-generated owner token; used for safe release. */
  owner: string;
  /** When the lock was acquired (ms epoch). */
  acquiredAt: number;
  /** TTL in milliseconds. */
  ttlMs: number;
}

const LOCK_KEY_PREFIX = "lock:";

/**
 * Try to acquire `key` with the given TTL. Returns the lock handle on
 * success, or `null` if another holder already has it. When Upstash is
 * not configured the call always returns a synthetic handle so callers
 * can run their work in development.
 */
export async function tryAcquireLock(
  key: string,
  ttlMs: number,
): Promise<AcquiredLock | null> {
  const fullKey = LOCK_KEY_PREFIX + key;
  const owner = crypto.randomBytes(16).toString("hex");
  const client = getClient();

  if (!client) {
    return { key: fullKey, owner, acquiredAt: Date.now(), ttlMs };
  }

  // SET key value NX PX ttl — atomic acquire.
  const result = await client.set(fullKey, owner, { nx: true, px: ttlMs });
  if (result !== "OK") {
    return null;
  }
  return { key: fullKey, owner, acquiredAt: Date.now(), ttlMs };
}

/**
 * Release a previously-acquired lock. Safe to call even after expiry —
 * we only delete the key if it still belongs to us, so we won't ever
 * release a lock that another holder has since acquired.
 */
export async function releaseLock(lock: AcquiredLock): Promise<void> {
  const client = getClient();
  if (!client) return;

  // CHECK-AND-DELETE via eval: only delete if value matches our owner.
  const script = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `;
  try {
    await client.eval(script, [lock.key], [lock.owner]);
  } catch (err) {
    console.error("[DistributedLock] Failed to release lock:", err);
  }
}

/**
 * Convenience wrapper: acquire `key`, run `fn`, then release. Returns
 * `{ ran: false }` if the lock could not be acquired (caller should
 * usually treat this as a no-op skip).
 */
export async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<{ ran: true; value: T } | { ran: false; reason: "locked" }> {
  const lock = await tryAcquireLock(key, ttlMs);
  if (!lock) return { ran: false, reason: "locked" };
  try {
    const value = await fn();
    return { ran: true, value };
  } finally {
    await releaseLock(lock);
  }
}
