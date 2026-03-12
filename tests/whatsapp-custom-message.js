/**
 * WhatsApp Custom Message Test Script
 * Sends a custom text message to your phone number
 * 
 * Usage: node tests/whatsapp-custom-message.js
 */

require('dotenv').config();

// Check environment variables
const apiKey = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const recipientPhone = process.env.TEST_PHONE_NUMBER || "918958394972";

console.log("\n" + "=".repeat(60));
console.log("📱 WhatsApp Custom Message Test");
console.log("=".repeat(60));

if (!apiKey || !phoneNumberId) {
  console.error(`\n❌ Error: Missing environment variables!`);
  process.exit(1);
}

// Create WhatsApp API client
const axios = require('axios');
const client = axios.create({
  baseURL: "https://graph.facebook.com/v18.0",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
});

async function sendCustomMessage() {
  // Custom message as requested
  const customMessage = "Hello digiconnuteam this is the testing script by whatsapp marketing tool";

  console.log(`\n🚀 Sending custom message to ${recipientPhone}...`);
  console.log(`📝 Message: "${customMessage}"`);

  try {
    // Send text message (no template approval needed for text)
    const response = await client.post(
      `/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body: customMessage }
      }
    );

    console.log(`\n✅ SUCCESS! Message sent!`);
    console.log(`\nResponse:`, JSON.stringify(response.data, null, 2));
    console.log(`\n📱 Check your WhatsApp on ${recipientPhone}!`);

  } catch (error) {
    console.error(`\n❌ FAILED:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error?.message || error.message}`);
    process.exit(1);
  }
}

sendCustomMessage();
