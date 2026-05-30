/**
 * Single-use auth tokens for password reset and team-invite
 * set-password flows.
 *
 * Security model:
 *  - The raw token is a 32-byte random value, returned to the caller
 *    once so it can be emailed. Only its SHA-256 hash is persisted.
 *  - Tokens are single-use (stamped `usedAt`) and expire.
 *  - Verifying a token never reveals whether a user exists.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type TokenPurpose = "reset" | "invite";

/** Reset links live for 1 hour; invite links for 7 days. */
const TTL_MS: Record<TokenPurpose, number> = {
  reset: 60 * 60 * 1000,
  invite: 7 * 24 * 60 * 60 * 1000,
};

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a token for a user. Invalidates any prior unused tokens of the
 * same purpose so a user only ever has one live link. Returns the raw
 * token (to embed in the emailed URL).
 */
export async function createAuthToken(
  userId: string,
  purpose: TokenPurpose = "reset",
): Promise<string> {
  // Burn previous unused tokens of this purpose for the user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      purpose,
      expiresAt: new Date(Date.now() + TTL_MS[purpose]),
    },
  });
  return raw;
}

export interface VerifiedToken {
  id: string;
  userId: string;
  purpose: TokenPurpose;
}

/**
 * Verify a raw token without consuming it. Returns null if it does not
 * exist, is already used, or has expired.
 */
export async function verifyAuthToken(
  raw: string,
): Promise<VerifiedToken | null> {
  if (!raw) return null;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return {
    id: record.id,
    userId: record.userId,
    purpose: record.purpose as TokenPurpose,
  };
}

/**
 * Verify and consume a token atomically. The conditional updateMany
 * ensures a token can only be consumed once even under concurrent
 * requests (a second caller updates zero rows and gets null back).
 */
export async function consumeAuthToken(
  raw: string,
): Promise<VerifiedToken | null> {
  const verified = await verifyAuthToken(raw);
  if (!verified) return null;

  const result = await prisma.passwordResetToken.updateMany({
    where: { id: verified.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) return null; // lost the race
  return verified;
}
