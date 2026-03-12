import { whatsappClient } from "./auth";

const RATE_LIMIT_DELAY = 1000;
const MAX_RETRIES = 3;

export async function sendMessageWithRetry(to: string, message: string, retries = 0): Promise<any> {
  try {
    const response = await whatsappClient.sendMessage({
      to,
      type: "text",
      text: { body: message },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries < MAX_RETRIES) {
      console.log(`Rate limited. Retrying in ${RATE_LIMIT_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return sendMessageWithRetry(to, message, retries + 1);
    }
    console.error("Failed to send message after retries:", error);
    throw error;
  }
}

export async function validateMessageContent(message: string): Promise<boolean> {
  const forbiddenPatterns = [/spam/, /promotion/, /discount/];
  const isValid = !forbiddenPatterns.some(pattern => pattern.test(message.toLowerCase()));
  
  if (!isValid) {
    console.warn("Message content violates WhatsApp policies");
  }
  
  return isValid;
}

export async function validatePhoneNumber(phoneNumber: string): Promise<boolean> {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  const isValid = phoneRegex.test(phoneNumber);
  
  if (!isValid) {
    console.warn("Invalid phone number format");
  }
  
  return isValid;
}

export async function validateMediaFile(mediaUrl: string): Promise<boolean> {
  const allowedTypes = ["image/jpeg", "image/png", "video/mp4"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  try {
    const response = await fetch(mediaUrl, { method: "HEAD" });
    const contentType = response.headers.get("Content-Type") || "";
    const contentLength = parseInt(response.headers.get("Content-Length") || "0");
    
    const isValidType = allowedTypes.includes(contentType);
    const isValidSize = contentLength <= maxSize;
    
    if (!isValidType) {
      console.warn("Invalid media type");
    }
    
    if (!isValidSize) {
      console.warn("Media file too large");
    }
    
    return isValidType && isValidSize;
  } catch (error) {
    console.error("Failed to validate media file:", error);
    return false;
  }
}