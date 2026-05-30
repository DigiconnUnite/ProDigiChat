import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Meta Data Deletion Request Callback
 *
 * Meta calls this endpoint when a user requests deletion of their data
 * (e.g. via "Remove app" in their Facebook settings, or a data deletion
 * request). Meta sends a POST with a `signed_request` body parameter,
 * signed with the app secret. We must:
 *   1. Verify the signature with META_APP_SECRET.
 *   2. Extract the Meta user_id.
 *   3. Delete (or schedule deletion of) the data we hold for that user.
 *   4. Respond with JSON: { url, confirmation_code }.
 *
 * `url` is a page where the user can check deletion status; `confirmation_code`
 * is an identifier the user can quote when checking that status.
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

interface SignedRequest {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

/**
 * Base64URL-decode a string into a Buffer.
 */
function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/**
 * Parse and verify a Meta `signed_request`. Returns the decoded payload,
 * or null if the signature is invalid or the request is malformed.
 */
function parseSignedRequest(signedRequest: string): SignedRequest | null {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[Data Deletion] META_APP_SECRET is not set");
    return null;
  }

  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) {
    console.warn("[Data Deletion] Malformed signed_request");
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest();
  const providedSig = base64UrlDecode(encodedSig);

  if (
    expectedSig.length !== providedSig.length ||
    !crypto.timingSafeEqual(expectedSig, providedSig)
  ) {
    console.warn("[Data Deletion] Invalid signed_request signature");
    return null;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload).toString("utf-8"));
    if (data.algorithm && String(data.algorithm).toUpperCase() !== "HMAC-SHA256") {
      console.warn("[Data Deletion] Unexpected algorithm:", data.algorithm);
      return null;
    }
    return data as SignedRequest;
  } catch {
    console.warn("[Data Deletion] Could not parse signed_request payload");
    return null;
  }
}

/**
 * Delete the data we hold that is linked to a given Meta user id.
 *
 * Our linkage to a Meta user is the `systemUserId` stored on a connected
 * WhatsApp credential. We remove the credential and its phone numbers so we
 * no longer hold any access tokens or Meta-derived data for that user.
 */
async function deleteDataForMetaUser(userId: string): Promise<void> {
  const credentials = await prisma.whatsAppCredential.findMany({
    where: { systemUserId: userId },
    select: { id: true },
  });

  if (credentials.length === 0) {
    console.log(`[Data Deletion] No credentials found for Meta user ${userId}`);
    return;
  }

  const credentialIds = credentials.map((c) => c.id);

  await prisma.whatsAppPhoneNumber.deleteMany({
    where: { credentialId: { in: credentialIds } },
  });
  await prisma.whatsAppCredential.deleteMany({
    where: { id: { in: credentialIds } },
  });

  console.log(
    `[Data Deletion] Removed ${credentialIds.length} credential(s) for Meta user ${userId}`,
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let signedRequest: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      signedRequest = form.get("signed_request") as string | null;
    } else {
      // Some Meta calls send JSON
      const body = await request.json().catch(() => null);
      signedRequest = body?.signed_request ?? null;
    }

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const data = parseSignedRequest(signedRequest);
    if (!data || !data.user_id) {
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
    }

    // Deterministic confirmation code so the same request maps to the same
    // code (and we avoid persisting a tracking row).
    const confirmationCode = crypto
      .createHash("sha256")
      .update(`${data.user_id}:${data.issued_at ?? ""}`)
      .digest("hex")
      .slice(0, 16);

    // Perform deletion. We do this synchronously but defensively — any
    // failure is logged and does not change the response shape Meta expects.
    try {
      await deleteDataForMetaUser(data.user_id);
    } catch (err) {
      console.error("[Data Deletion] Deletion failed:", err);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prodigichat.com";

    return NextResponse.json({
      url: `${appUrl}/data-deletion?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[Data Deletion] Error handling callback:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
