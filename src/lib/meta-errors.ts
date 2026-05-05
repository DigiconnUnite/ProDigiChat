/**
 * Meta WhatsApp Cloud API error classification.
 *
 * The Meta API returns a wide variety of error codes with very
 * different semantics: some indicate a transient problem we should
 * retry (network blip, generic 500), some indicate a permanent
 * problem the recipient or template payload caused (invalid phone
 * number, template not approved), and some require operator action
 * before any further sends can succeed (rate-limit cooldown, expired
 * access token).
 *
 * We collapse them into four categories so the queue worker can make
 * one decision per error:
 *
 *   - retry          : retry with backoff
 *   - no_retry       : permanent — mark FAILED and move on
 *   - rate_limited   : pause this account's queue for the cooldown
 *   - reconnect_auth : credentials are bad; pause sends and surface
 *                      a "reconnect WhatsApp" UI signal
 *
 * Codes are documented at:
 *   https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */

export type MetaErrorCategory =
  | "retry"
  | "no_retry"
  | "rate_limited"
  | "reconnect_auth";

export interface MetaErrorClassification {
  category: MetaErrorCategory;
  /** Suggested cooldown in ms (rate_limited only). */
  cooldownMs?: number;
  /** Human-readable summary for logs and queue rows. */
  reason: string;
}

/** Codes that should be retried with normal backoff. */
const RETRY_CODES = new Set<number>([
  -1,      // generic / unknown — be optimistic
  1,       // API_UNKNOWN
  2,       // API_SERVICE
  4,       // API_TOO_MANY_CALLS (treat as retryable, not a hard rate limit)
  17,      // API_USER_TOO_MANY_CALLS
  131000,  // generic Meta error
  131005,  // permission denied (transient — sometimes resolves)
  131016,  // service unavailable
  131048,  // spam rate limit (treat as retryable with backoff)
  131056,  // pair rate limit
]);

/** Codes that mean: do not retry, mark failed, move on. */
const NO_RETRY_CODES = new Set<number>([
  131008,  // required parameter missing
  131009,  // parameter value invalid
  131021,  // recipient cannot be sender
  131026,  // message undeliverable (recipient unreachable)
  131031,  // account locked
  131047,  // re-engagement message (outside 24h, no template)
  131051,  // unsupported message type
  132000,  // template parameter count mismatch
  132001,  // template doesn't exist in given language
  132005,  // translated text too long
  132007,  // template format character policy violation
  132012,  // template parameter format mismatch
  132015,  // template paused
  132016,  // template disabled (rejected on Meta)
  132068,  // flow blocked
  132069,  // flow throttled
]);

/** Codes that mean: pause this account, retry later. */
const RATE_LIMITED_CODES = new Map<number, number>([
  [130429, 60 * 60 * 1000], // 1 hour cooldown - business throughput limit
  [130472, 60 * 60 * 1000], // user marketing message limit reached
  [80007, 60 * 60 * 1000], // application request limit reached
]);

/** Codes that mean: token is dead, the account needs to reconnect. */
const RECONNECT_AUTH_CODES = new Set<number>([
  0,       // generic auth error in some Meta docs
  3,       // capability error
  10,      // permission denied
  190,     // OAuth token invalid
  102,     // session has expired
  104,     // password changed (reconnect)
  200,     // permissions error
]);

/**
 * Classify a Meta error from an axios-shaped error response.
 * Accepts:
 *   - `{response: {status, data: {error: {code, message}}}}` (axios)
 *   - `{code, message}` (already-extracted Meta error)
 *   - any other shape (returns `retry` as a conservative default)
 */
export function classifyMetaError(error: unknown): MetaErrorClassification {
  const code = extractMetaCode(error);
  const message = extractMetaMessage(error);

  if (code != null) {
    if (RECONNECT_AUTH_CODES.has(code)) {
      return {
        category: "reconnect_auth",
        reason: `auth(${code}): ${message ?? "Meta access token invalid or expired"}`,
      };
    }
    const cooldown = RATE_LIMITED_CODES.get(code);
    if (cooldown != null) {
      return {
        category: "rate_limited",
        cooldownMs: cooldown,
        reason: `rate_limited(${code}): ${message ?? "Meta rate limit"}`,
      };
    }
    if (NO_RETRY_CODES.has(code)) {
      return {
        category: "no_retry",
        reason: `permanent(${code}): ${message ?? "Meta returned a permanent error"}`,
      };
    }
    if (RETRY_CODES.has(code)) {
      return {
        category: "retry",
        reason: `retry(${code}): ${message ?? "Meta transient error"}`,
      };
    }
  }

  // HTTP status fallback — treat 5xx as retry, 4xx (except 401/403)
  // as no_retry. 401/403 -> auth.
  const httpStatus = extractHttpStatus(error);
  if (httpStatus != null) {
    if (httpStatus === 401 || httpStatus === 403) {
      return {
        category: "reconnect_auth",
        reason: `http_${httpStatus}: ${message ?? "Meta auth failure"}`,
      };
    }
    if (httpStatus === 429) {
      return {
        category: "rate_limited",
        cooldownMs: 60 * 1000,
        reason: `http_429: ${message ?? "Rate limited"}`,
      };
    }
    if (httpStatus >= 500) {
      return {
        category: "retry",
        reason: `http_${httpStatus}: ${message ?? "Meta server error"}`,
      };
    }
    if (httpStatus >= 400) {
      return {
        category: "no_retry",
        reason: `http_${httpStatus}: ${message ?? "Meta client error"}`,
      };
    }
  }

  // Truly unknown — be optimistic and retry once. The attempts cap
  // means we still won't loop forever.
  return {
    category: "retry",
    reason: `unknown: ${message ?? "Unclassified Meta error"}`,
  };
}

function extractMetaCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const e = error as any;
  const candidates = [
    e?.response?.data?.error?.code,
    e?.error?.code,
    e?.code,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const n = typeof candidate === "string" ? Number(candidate) : candidate;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}

function extractMetaMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as any;
  return (
    e?.response?.data?.error?.message ??
    e?.error?.message ??
    e?.message ??
    null
  );
}

function extractHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const e = error as any;
  const status = e?.response?.status ?? e?.status;
  if (typeof status === "number" && Number.isFinite(status)) return status;
  return null;
}
