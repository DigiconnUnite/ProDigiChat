import { WhatsAppClient, MetaTemplate, MetaTemplateStatus } from "@/app/api/whatsapp/client";
import { whatsappClient } from "@/app/api/whatsapp/auth";
import { WhatsAppTemplate, TemplateTranslation, TemplateCategory } from "@/types/template";

// Convert internal template format to Meta API format
export function convertToMetaTemplate(
  template: WhatsAppTemplate,
  translation: TemplateTranslation
): MetaTemplate {
  const components: MetaTemplate["components"] = [];

  // Add header component if present
  if (translation.header) {
    const headerComponent: any = {
      type: "HEADER",
    };

    if (translation.header.type === "text" && translation.header.text) {
      headerComponent.format = "TEXT";
      headerComponent.text = translation.header.text;
    } else if (translation.header.type === "image" && translation.header.mediaUrl) {
      headerComponent.format = "IMAGE";
      headerComponent.example = {
        header_handle: [translation.header.mediaUrl],
      };
    } else if (translation.header.type === "video" && translation.header.mediaUrl) {
      headerComponent.format = "VIDEO";
      headerComponent.example = {
        header_handle: [translation.header.mediaUrl],
      };
    } else if (translation.header.type === "document" && translation.header.mediaUrl) {
      headerComponent.format = "DOCUMENT";
      headerComponent.example = {
        header_handle: [translation.header.mediaUrl],
      };
    }

    components.push(headerComponent);
  }

  // Add body component
  if (translation.body) {
    components.push({
      type: "BODY",
      text: translation.body,
    });
  }

  // Add footer component if present
  if (translation.footer) {
    components.push({
      type: "FOOTER",
      text: translation.footer,
    });
  }

  // Add buttons component if present
  if (translation.buttons && translation.buttons.length > 0) {
    const buttons = translation.buttons.map((btn) => {
      if (btn.type === "quick_reply") {
        return {
          type: "QUICK_REPLY" as const,
          text: btn.text,
        };
      } else if (btn.type === "call_to_action") {
        if (btn.actionType === "url") {
          return {
            type: "URL" as const,
            text: btn.text,
            url: btn.actionValue || "",
          };
        } else if (btn.actionType === "phone") {
          return {
            type: "PHONE_NUMBER" as const,
            text: btn.text,
            phone_number: btn.actionValue || "",
          };
        }
      }
      return {
        type: "QUICK_REPLY" as const,
        text: btn.text,
      };
    });

    components.push({
      type: "BUTTONS",
      buttons,
    });
  }

  // Map category to Meta format
  const categoryMap: Record<TemplateCategory, "MARKETING" | "UTILITY" | "AUTHENTICATION"> = {
    marketing: "MARKETING",
    utility: "UTILITY",
    authentication: "AUTHENTICATION",
  };

  return {
    name: template.name,
    category: categoryMap[template.category] || "MARKETING",
    components,
    language: translation.language || "en_US",
    allow_category_selection: true,
  };
}

// Convert Meta template status to internal format
export function convertMetaStatus(
  metaStatus: string
): "draft" | "pending" | "approved" | "rejected" {
  const statusMap: Record<string, "draft" | "pending" | "approved" | "rejected"> = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    PAUSED: "approved", // Paused templates are still approved
    DELETED: "rejected",
  };

  return statusMap[metaStatus] || "pending";
}

// Submit template to Meta and return the response
export async function submitTemplateToMeta(
  template: WhatsAppTemplate,
  orgId?: string,
  accountId?: string
): Promise<{ success: boolean; metaTemplateId?: string; error?: string }> {
  try {
    // Use the first translation for submission
    const translation = template.translations[0];
    if (!translation) {
      throw new Error("Template has no translations");
    }

    const metaTemplate = convertToMetaTemplate(template, translation);
    const response = await whatsappClient.submitTemplate(metaTemplate, orgId, accountId);

    // Meta returns the created template ID in the response
    const metaTemplateId = response.data?.id;
    
    if (metaTemplateId) {
      return {
        success: true,
        metaTemplateId,
      };
    }

    return {
      success: true,
      metaTemplateId: response.data?.id || template.name,
    };
  } catch (error: any) {
    console.error("Error submitting template to Meta:", error);
    
    // If the error indicates the template already exists, we might still be able to use it
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Check template status from Meta
export async function checkTemplateStatusFromMeta(
  metaTemplateId: string,
  orgId?: string,
  accountId?: string
): Promise<{
  status: "pending" | "approved" | "rejected";
  qualityScore?: string;
  rejectionReason?: string;
}> {
  try {
    const response = await whatsappClient.getTemplateStatus(metaTemplateId, orgId, accountId);
    const metaStatus: MetaTemplateStatus = response.data;

    const convertedStatus = convertMetaStatus(metaStatus.status);
    // Filter out 'draft' since it doesn't come from Meta
    const finalStatus: "pending" | "approved" | "rejected" = 
      convertedStatus === "draft" ? "pending" : convertedStatus;

    return {
      status: finalStatus,
      qualityScore: metaStatus.quality_score,
      rejectionReason: metaStatus.rejection_reason,
    };
  } catch (error: any) {
    console.error("Error checking template status from Meta:", error);
    throw error;
  }
}

// Sync all templates with Meta (for initial import or reconciliation)
export async function syncTemplatesWithMeta(
  orgId?: string,
  accountId?: string
): Promise<{
  success: boolean;
  synced: number;
  errors: string[];
}> {
  try {
    const response = await whatsappClient.getAllTemplates(undefined, orgId, accountId);
    const metaTemplates = response.data?.data || [];

    return {
      success: true,
      synced: metaTemplates.length,
      errors: [],
    };
  } catch (error: any) {
    console.error("Error syncing templates with Meta:", error);
    return {
      success: false,
      synced: 0,
      errors: [error.message],
    };
  }
}

// Delete template from Meta
export async function deleteTemplateFromMeta(
  metaTemplateId: string,
  orgId?: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await whatsappClient.deleteTemplate(metaTemplateId, orgId, accountId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting template from Meta:", error);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}
