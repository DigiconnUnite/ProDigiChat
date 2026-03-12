/**
 * WhatsApp Custom Template Message Test
 * 
 * IMPORTANT: Custom templates must be created and approved in Meta Dashboard first!
 * 
 * Usage: 
 * 1. Create template in Meta Dashboard: https://developers.facebook.com/apps/
 * 2. Name it: "marketing_test"
 * 3. Get it approved by Meta
 * 4. Run: node tests/whatsapp-template-message.js
 */

require('dotenv').config();

const apiKey = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const recipientPhone = process.env.TEST_PHONE_NUMBER || "918958394972";

console.log("\n" + "=".repeat(60));
console.log("📱 WhatsApp Custom Template Message");
console.log("=".repeat(60));

if (!apiKey || !phoneNumberId) {
  console.error(`\n❌ Error: Missing credentials!`);
  process.exit(1);
}

const axios = require('axios');
const client = axios.create({
  baseURL: "https://graph.facebook.com/v18.0",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
});

async function sendTemplateMessage() {
  const templateName = process.argv[2] || "hello_world"; // Default to hello_world

  console.log(`\n🚀 Sending template "${templateName}" to ${recipientPhone}...`);

  try {
    // Check which template exists
    const response = await client.post(
      `/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" }
        }
      }
    );

    console.log(`\n✅ SUCCESS!`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`\n❌ FAILED: ${errorMsg}`);
    
    if (errorMsg.includes("not found") || errorMsg.includes("not approved")) {
      console.log(`\n💡 To use custom templates:`);
      console.log(`1. Go to: https://developers.facebook.com/apps/`);
      console.log(`2. Select your WhatsApp app`);
      console.log(`3. Click "Message Templates" > "Create"`);
      console.log(`4. Create template with your custom message`);
      console.log(`5. Submit for Meta approval`);
      console.log(`6. Run: node tests/whatsapp-template-message.js <template_name>`);
    }
  }
}

sendTemplateMessage();
