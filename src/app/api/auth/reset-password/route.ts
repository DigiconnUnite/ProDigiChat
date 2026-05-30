import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { validatePasswordStrength } from "@/lib/password";

// GET /api/auth/reset-password?token=... — validate a token before
// showing the reset form, so the UI can show a clear "expired link"
// state instead of failing on submit.
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const verified = await verifyAuthToken(token);
  if (!verified) {
    return NextResponse.json(
      { valid: false, error: "This link is invalid or has expired." },
      { status: 400 },
    );
  }
  return NextResponse.json({ valid: true, purpose: verified.purpose });
}

// POST /api/auth/reset-password — consume the token and set the new
// password. Used by both the self-service reset and the invite
// set-password flows.
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request
      .json()
      .catch(() => ({ token: "", password: "" }));

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 },
      );
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    // Consume atomically first so a token can never be reused, even if
    // two requests arrive at once.
    const verified = await consumeAuthToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: verified.userId },
      data: { password: hashedPassword, isActive: true },
    });

    // For invite tokens, mark the membership accepted so the user shows
    // as active rather than "invited" in the team UI.
    if (verified.purpose === "invite") {
      await prisma.organizationMember.updateMany({
        where: { userId: verified.userId, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been set. You can now sign in.",
    });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 },
    );
  }
}
