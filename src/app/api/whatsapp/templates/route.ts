import { NextRequest, NextResponse } from "next/server";
import { submitTemplate, checkTemplateStatus } from "../templates";
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
  const rateLimitResult = await rateLimit(request as any, 'templates');
  
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const unauthorizedResponse = await validateSession(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }
  try {
    const { action, template, templateId } = await request.json();

    switch (action) {
      case "submit":
        const submitResponse = await submitTemplate(template);
        return NextResponse.json(submitResponse, {
          headers: rateLimitResult.headers,
        });

      case "checkStatus":
        const statusResponse = await checkTemplateStatus(templateId);
        return NextResponse.json(statusResponse, {
          headers: rateLimitResult.headers,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in WhatsApp templates route:", error);
    return NextResponse.json(
      { error: "Failed to process template request" },
      { status: 500 }
    );
  }
}
