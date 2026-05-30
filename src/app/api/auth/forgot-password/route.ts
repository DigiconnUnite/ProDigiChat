import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendEmail, renderEmailLayout } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Lightweight in-memory IP throttle: 5 requests / 15 min per IP. This is
// best-effort (per-instance) and complements the always-200 response and
// single-live-token design that prevent enumeration and abuse.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const ipHits = new Map<string, number[]>();

function isThrottled(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isThrottled(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { email } = await request.json().catch(() => ({ email: "" }));

    // Always respond 200 with the same message so we never reveal
    // whether an account exists for the given email.
    const genericResponse = NextResponse.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });

    if (!email || typeof email !== "string") {
      return genericResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const rawToken = await createAuthToken(user.id, "reset");
    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your ProDigiChat password",
      html: renderEmailLayout({
        heading: "Reset your password",
        bodyHtml: `<p>Hi ${user.name || "there"},</p>
          <p>We received a request to reset your ProDigiChat password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
        ctaLabel: "Reset password",
        ctaUrl: resetUrl,
        footnote: `If the button doesn't work, paste this link into your browser:<br>${resetUrl}`,
      }),
    });

    return genericResponse;
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    // Still return a generic success to avoid leaking internal state.
    return NextResponse.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  }
}
