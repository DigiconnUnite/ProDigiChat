import { whatsappClient } from "./auth";

export async function submitTemplate(template: any) {
  try {
    const response = await whatsappClient.submitTemplate(template);
    return response.data;
  } catch (error) {
    console.error("Failed to submit template:", error);
    throw error;
  }
}

export async function checkTemplateStatus(templateId: string) {
  try {
    const response = await whatsappClient.getTemplateStatus(templateId);
    return response.data;
  } catch (error) {
    console.error("Failed to check template status:", error);
    throw error;
  }
}