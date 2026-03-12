/**
 * WhatsApp Direct Message Test Script
 * Sends a real WhatsApp message to your phone number
 * 
 * Usage: node tests/whatsapp-send-message.js
 */

require('dotenv').config();

// Check environment variables
const apiKey = process.env.WHATSAPP_API_KEY;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const recipientPhone = process.env.TEST_PHONE_NUMBER || "917302542398";

console.log("\n" + "=".repeat(60));
console.log("📱 WhatsApp Direct Message Test");
console.log("=".repeat(60));

console.log(`\nConfiguration:`);
console.log(`   API Key: ${apiKey ? apiKey.substring(0, 20) + "..." : "❌ NOT SET"}`);
console.log(`   Phone Number ID: ${phoneNumberId || "❌ NOT SET"}`);
console.log(`   Business Account ID: ${businessAccountId || "❌ NOT SET"}`);
console.log(`   Recipient: ${recipientPhone}`);

if (!apiKey || !phoneNumberId || !businessAccountId) {
  console.error(`\n❌ Error: Missing environment variables!`);
  console.log(`Please configure .env file with WhatsApp API credentials.`);
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

async function sendTestMessage() {
  console.log(`\n🚀 Sending test message to ${recipientPhone}...`);

  try {
    // Send template message (hello_world template is pre-built)
    const response = await client.post(
      `/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" }
        }
      }
    );

    console.log(`\n✅ SUCCESS! Message sent!`);
    console.log(`\nResponse:`, JSON.stringify(response.data, null, 2));
    
    console.log(`\n📱 Check your WhatsApp on number ${recipientPhone}!`);
    console.log(`   The message should arrive within a few seconds.`);
    console.log(`   Template: hello_world`);
    
  } catch (error) {
    console.error(`\n❌ FAILED to send message:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error?.message || error.message}`);
    
    if (error.response?.data?.error?.code === 131030) {
      console.error(`\n💡 Tip: The phone number ${recipientPhone} may not be in your WhatsApp recipients list.`);
      console.error(`   Add this number to your test recipients in Meta Developer Dashboard.`);
    }
    
    process.exit(1);
  }
}

sendTestMessage();
