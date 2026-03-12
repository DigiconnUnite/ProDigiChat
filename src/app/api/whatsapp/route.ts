import { NextResponse } from "next/server";
import { sendTextMessage, sendMediaMessage, sendTemplateMessage } from "./messages";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

async function validateSession(request: Request) {
  const token = await getToken({ req: request as any });
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return null;
}

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request as any, 'messages');
  
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const unauthorizedResponse = await validateSession(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }
  try {
    const { type, to, message, mediaUrl, caption, templateName, components } = await request.json();

    switch (type) {
      case "text":
        const textResponse = await sendTextMessage(to, message);
        return NextResponse.json(textResponse, {
          headers: rateLimitResult.headers,
        });

      case "media":
        const mediaResponse = await sendMediaMessage(to, mediaUrl, caption);
        return NextResponse.json(mediaResponse, {
          headers: rateLimitResult.headers,
        });

      case "template":
        const templateResponse = await sendTemplateMessage(to, templateName, components);
        return NextResponse.json(templateResponse, {
          headers: rateLimitResult.headers,
        });

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
