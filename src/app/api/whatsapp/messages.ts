import { whatsappClient } from "./auth";

// Format phone number for WhatsApp API (remove + and ensure proper format)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, keep it but validate format
  if (cleaned.startsWith('+')) {
    // WhatsApp API expects: {country_code}{number} (e.g., 919123456789)
    // Remove + and use just digits
    cleaned = cleaned.substring(1);
  }
  
  // Validate it's a reasonable length
  if (cleaned.length < 10 || cleaned.length > 15) {
    console.warn('[WhatsAppMessages] Phone number length seems invalid:', cleaned.length);
  }
  
  console.log('[WhatsAppMessages] Formatted phone number:', cleaned);
  return cleaned;
}

export async function sendTextMessage(to: string, message: string, orgId?: string, accountId?: string) {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendTextMessage called:', { to: formattedTo, messageLength: message.length, orgId, accountId });
  try {
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: "text",
      text: { body: message },
    }, orgId, accountId);
    console.log('[WhatsAppMessages] Text message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error("[WhatsAppMessages] Failed to send text message:", error);
    throw error;
  }
}

export async function sendMediaMessage(to: string, mediaUrl: string, caption: string, orgId?: string, accountId?: string) {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendMediaMessage called:', { to: formattedTo, mediaUrl, caption, orgId, accountId });
  try {
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: "image",
      image: { link: mediaUrl, caption },
    }, orgId, accountId);
    console.log('[WhatsAppMessages] Media message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error("[WhatsAppMessages] Failed to send media message:", error);
    throw error;
  }
}

export async function sendTemplateMessage(to: string, templateName: string, components: any[], orgId?: string, language: string = 'en_US', accountId?: string) {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendTemplateMessage called:', { to: formattedTo, templateName, components, orgId, language, accountId });
  try {
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: "template",
      template: { name: templateName, language: { code: language }, components },
    }, orgId, accountId);
    console.log('[WhatsAppMessages] Template message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error("[WhatsAppMessages] Failed to send template message:", error);
    throw error;
  }
}