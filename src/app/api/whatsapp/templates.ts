import { whatsappClient } from "./auth";

export async function submitTemplate(template: any, orgId: string, accountId?: string) {
  try {
    const response = await whatsappClient.submitTemplate(template, orgId, accountId);
    return response.data;
  } catch (error) {
    console.error("Failed to submit template:", error);
    throw error;
  }
}

export async function checkTemplateStatus(templateId: string, orgId: string, accountId?: string) {
  try {
    const response = await whatsappClient.getTemplateStatus(templateId, orgId, accountId);
    return response.data;
  } catch (error) {
    console.error("Failed to check template status:", error);
    throw error;
  }
}