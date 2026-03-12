import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkTemplateStatusFromMeta } from "@/lib/whatsapp-template-service";
import { getToken } from "next-auth/jwt";

/**
 * API route to sync template statuses with Meta
 * 
 * This endpoint can be called periodically (e.g., via cron job) to check
 * the status of pending templates with Meta's API.
 * 
 * GET /api/templates/sync?status=pending - Sync only pending templates
 * GET /api/templates/sync - Sync all templates with Meta IDs
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization from session
    const token = await getToken({ req: request });
    const orgId = (token?.organizationId || token?.orgId) as string | undefined;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - no organization found' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    // Build where clause to get templates that have been submitted to Meta
    // Only get templates for this organization
    const where: any = {
      whatsappTemplateId: { not: null },
      organizationId: orgId,
    };

    if (status && status !== "all") {
      where.status = status;
    } else {
      // Default: only sync pending templates
      where.status = "pending";
    }

    // Get templates that have been submitted to Meta
    const templatesToSync = await prisma.messageTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        whatsappTemplateId: true,
        status: true,
      },
    });

    if (templatesToSync.length === 0) {
      return NextResponse.json({
        message: "No templates to sync",
        synced: 0,
        results: [],
      });
    }

    // Sync each template's status with Meta
    const results = await Promise.allSettled(
      templatesToSync.map(async (template) => {
        try {
          const metaStatus = await checkTemplateStatusFromMeta(
            template.whatsappTemplateId!,
            orgId
          );

          // Update local database with latest status
          await prisma.messageTemplate.update({
            where: { id: template.id },
            data: {
              status: metaStatus.status,
            },
          });

          return {
            id: template.id,
            name: template.name,
            previousStatus: template.status,
            newStatus: metaStatus.status,
            success: true,
            qualityScore: metaStatus.qualityScore,
            rejectionReason: metaStatus.rejectionReason,
          };
        } catch (error: any) {
          console.error(`Failed to sync template ${template.name}:`, error);
          return {
            id: template.id,
            name: template.name,
            previousStatus: template.status,
            success: false,
            error: error.message,
          };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - successful;

    return NextResponse.json({
      message: `Sync completed: ${successful} successful, ${failed} failed`,
      total: results.length,
      successful,
      failed,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: r.reason }
      ),
    });
  } catch (error) {
    console.error("Error syncing templates:", error);
    return NextResponse.json(
      { error: "Failed to sync templates" },
      { status: 500 }
    );
  }
}
