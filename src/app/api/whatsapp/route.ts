import { NextResponse } from "next/server";
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from "./messages";
import { rateLimit } from "@/lib/rate-limit";
import { requireOrg } from "@/lib/api-auth";
import { evaluateOutboundPolicy } from "@/lib/messaging-policy";

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request as any, 'messages');

  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // Authentication / org membership. Direct sends (i.e. an operator
  // manually typing into chat or hitting this API) require member+
  // role. The org id is always taken from the JWT.
  const auth = await requireOrg(request, "member");
  if (!auth.ok) return auth.response;
  const orgId = auth.context.organizationId;

  try {
    const { type, to, message, mediaUrl, caption, templateName, components } = await request.json();

    if (!to) {
      return NextResponse.json({ error: "Recipient phone number is required" }, { status: 400 });
    }

    // Messaging-policy gate: every outbound send must pass opt-in and
    // (for freeform messages) the 24-hour customer-care window.
    const policy = await evaluateOutboundPolicy({
      organizationId: orgId,
      phoneNumber: String(to),
      isTemplate: type === "template",
    });
    if (!policy.ok) {
      return NextResponse.json(
        { error: policy.message, reason: policy.reason },
        { status: 422, headers: rateLimitResult.headers },
      );
    }

    switch (type) {
      case "text": {
        const textResponse = await sendTextMessage(to, message, orgId);
        return NextResponse.json(textResponse, {
          headers: rateLimitResult.headers,
        });
      }

      case "media": {
        const mediaResponse = await sendMediaMessage(to, mediaUrl, caption, orgId);
        return NextResponse.json(mediaResponse, {
          headers: rateLimitResult.headers,
        });
      }

      case "template": {
        const templateResponse = await sendTemplateMessage(to, templateName, components, orgId);
        return NextResponse.json(templateResponse, {
          headers: rateLimitResult.headers,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in WhatsApp API route:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
