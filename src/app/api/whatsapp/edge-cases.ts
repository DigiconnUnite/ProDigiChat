/**
 * WhatsApp API Edge Cases and Utilities
 * 
 * This file contains utility functions for handling edge cases in the WhatsApp API.
 * Use these helper functions carefully - some may have side effects like rate limiting
 * or external API calls. Always ensure proper error handling when using these utilities.
 */

import { whatsappClient } from "./auth";

const RATE_LIMIT_DELAY = 1000;
const MAX_RETRIES = 3;

export async function sendMessageWithRetry(to: string, message: string, orgId: string, accountId?: string, retries = 0): Promise<any> {
  try {
    const response = await whatsappClient.sendMessage({
      to,
      type: "text",
      text: { body: message },
    }, orgId, accountId);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries < MAX_RETRIES) {
      console.log(`Rate limited. Retrying in ${RATE_LIMIT_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return sendMessageWithRetry(to, message, orgId, accountId, retries + 1);
    }
    console.error("Failed to send message after retries:", error);
    throw error;
  }
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
