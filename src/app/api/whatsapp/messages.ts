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

  return cleaned;
}

/** Mask a phone number for logging — keeps only the last 4 digits. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `****${digits.slice(-4)}`;
}

export async function sendTextMessage(to: string, message: string, orgId: string, accountId?: string) {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendTextMessage', { to: maskPhone(formattedTo), messageLength: message.length, accountId });
  try {
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: "text",
      text: { body: message },
    }, orgId, accountId);
    return response.data;
  } catch (error) {
    console.error('[WhatsAppMessages] Failed to send text message');
    throw error;
  }
}

export async function sendMediaMessage(to: string, mediaUrl: string, caption: string, orgId: string, accountId?: string, mediaType: string = 'image') {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendMediaMessage', { to: maskPhone(formattedTo), hasCaption: !!caption, mediaType, accountId });
  try {
    const mediaPayload: any = { link: mediaUrl };
    if (caption) {
      mediaPayload.caption = caption;
    }
    
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: mediaType,
      [mediaType]: mediaPayload,
    }, orgId, accountId);
    return response.data;
  } catch (error) {
    console.error('[WhatsAppMessages] Failed to send media message');
    throw error;
  }
}

export async function sendTemplateMessage(to: string, templateName: string, components: any[], orgId: string, language: string = 'en_US', accountId?: string) {
  const formattedTo = formatPhoneNumber(to);
  console.log('[WhatsAppMessages] sendTemplateMessage', { to: maskPhone(formattedTo), templateName, language, components: components?.length ?? 0, accountId });
  try {
    const response = await whatsappClient.sendMessage({
      to: formattedTo,
      type: "template",
      template: { name: templateName, language: { code: language }, components },
    }, orgId, accountId);
    return response.data;
  } catch (error) {
    console.error('[WhatsAppMessages] Failed to send template message');
    throw error;
  }
}