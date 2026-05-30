/**
 * WhatsApp Disconnect API
 *
 * Disconnects WhatsApp Business Account credentials from the caller's
 * organization. Removes phone numbers and credentials.
 *
 * Authorization:
 *  - Caller must be authenticated.
 *  - Caller's session must have an active membership in the org with
 *    role >= manager (managers, admins, owners can disconnect).
 *  - The organizationId is always taken from the verified JWT — the
 *    request body is no longer trusted to specify which org to disconnect.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireOrg(request, "manager");
  if (!auth.ok) return auth.response;
  const { organizationId } = auth.context;

  try {
    const body = await request.json().catch(() => ({}));
    const { accountId } = body as { accountId?: string };

    if (accountId) {
      const owned = await prisma.whatsAppCredential.findFirst({
        where: { id: accountId, organizationId },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Credential not found in this organization" },
          { status: 404 },
        );
      }

      await prisma.whatsAppPhoneNumber.deleteMany({
        where: { credentialId: accountId },
      });

      await prisma.whatsAppCredential.deleteMany({
        where: { id: accountId, organizationId },
      });
    } else {
      const credentials = await prisma.whatsAppCredential.findMany({
        where: { organizationId },
        select: { id: true },
      });

      for (const cred of credentials) {
        await prisma.whatsAppPhoneNumber.deleteMany({
          where: { credentialId: cred.id },
        });
      }

      await prisma.whatsAppCredential.deleteMany({
        where: { organizationId },
      });
    }

    try {
      const { NotificationHelpers } = await import("@/lib/notifications");
      await NotificationHelpers.whatsappDisconnected(organizationId);
    } catch (e) {
      console.error("[Disconnect] whatsappDisconnected notification error:", e);
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp account disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting WhatsApp account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect WhatsApp account" },
      { status: 500 },
    );
  }
}
