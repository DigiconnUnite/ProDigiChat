import crypto from "crypto";

/**
 * Tamper-proof OAuth `state` parameter for the WhatsApp/Meta OAuth flow.
 *
 * Meta echoes the `state` value back to our callback unchanged, but it never
 * authenticates it. To get CSRF protection without server-side session storage
 * we sign the state payload with an HMAC keyed on a server-only secret. The
 * callback recomputes the HMAC and rejects any state whose signature does not
 * match (forged/tampered) or whose timestamp is stale (replayed).
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 */

const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

interface OAuthStatePayload {
  timestamp: number;
  nonce: string;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "OAuth state signing requires NEXTAUTH_SECRET (or ENCRYPTION_KEY) to be set",
    );
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
}

/** Create a signed, freshness-stamped OAuth state value. */
export function createOAuthState(): string {
  const payload: OAuthStatePayload = {
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify a signed OAuth state value. Throws with a user-facing message if the
 * signature is invalid or the state has expired.
 */
export function verifyOAuthState(state: string): void {
  const [payloadB64, providedSig] = state.split(".");
  if (!payloadB64 || !providedSig) {
    throw new Error("Invalid OAuth state. Please try connecting again.");
  }

  const expectedSig = sign(payloadB64);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("OAuth state signature mismatch. Please try connecting again.");
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    throw new Error("Malformed OAuth state. Please try connecting again.");
  }

  if (!payload.timestamp || Date.now() - payload.timestamp > MAX_AGE_MS) {
    throw new Error("OAuth state expired. Please try connecting again within 15 minutes.");
  }
}
