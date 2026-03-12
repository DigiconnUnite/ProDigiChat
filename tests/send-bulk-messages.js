/**
 * WhatsApp Bulk Message Test Script
 * 
 * Sends WhatsApp template messages to multiple recipients
 * 
 * Usage: node tests/send-bulk-messages.js
 */

import axios from 'axios';

// WhatsApp API Configuration from database
const config = {
  apiKey: 'EAAhQMlZAIIbgBQZCbC5C9PC5ryPg0PQLtESCpzUIoAiiUvWNs3TVDpSUTfOeaI0TQG75ufHdbtZAGtzZAcNkPbxxChVobzOScxUkmNe0jpAKzwGRO9beYXy8VJxYpCnIuuW8ibrJcZBSxQfWOWH8wCLWq1PIJIWO9DGZBU6TQPZCo1K2SztNROdbvCgZBC1ANgZDZD',
  phoneNumberId: '1015531584980370',
  businessAccountId: '798951219915878'
};

// Recipients from user
const recipients = [
  { name: 'Ankit Dixit', phone: '917466008576' },
  { name: 'Rahul Rajput', phone: '919045468543' },
  { name: 'Muskan Chaduhary', phone: '917302542398' },
  { name: 'Shivam Thakurt', phone: '918958394972' }
];

// Template to use (must be approved in Meta)
const templateName = 'hello_world';
const language = 'en_US';

// Create WhatsApp API client
const client = axios.create({
  baseURL: 'https://graph.facebook.com/v18.0',
  headers: {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  },
});

// Format phone number for WhatsApp API
function formatPhoneNumber(phone) {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, keep it but validate format
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

// Send template message to a single recipient
async function sendTemplateMessage(to, templateName, language) {
  const formattedTo = formatPhoneNumber(to);
  
  console.log(`\n📤 Sending to ${formattedTo}...`);
  
  try {
    const response = await client.post(
      `/${config.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language }
        }
      }
    );
    
    console.log(`✅ SUCCESS! Message ID: ${response.data.messages[0]?.id}`);
    return { success: true, messageId: response.data.messages[0]?.id };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.log(`❌ FAILED: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// Main function to send to all recipients
async function main() {
  console.log('='.repeat(60));
  console.log('📱 WhatsApp Bulk Message Test');
  console.log('='.repeat(60));
  
  console.log(`\n📋 Configuration:`);
  console.log(`   Template: ${templateName}`);
  console.log(`   Language: ${language}`);
  console.log(`   Recipients: ${recipients.length}`);
  
  console.log(`\n👥 Recipient List:`);
  recipients.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name} - ${r.phone}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting message dispatch...');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendTemplateMessage(recipient.phone, templateName, language);
    results.push({
      name: recipient.name,
      phone: recipient.phone,
      ...result
    });
    
    // Small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Results Summary');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.name} (${r.phone})`);
    if (r.success) {
      console.log(`   Status: ✅ Sent`);
      console.log(`   Message ID: ${r.messageId}`);
    } else {
      console.log(`   Status: ❌ Failed`);
      console.log(`   Error: ${r.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
