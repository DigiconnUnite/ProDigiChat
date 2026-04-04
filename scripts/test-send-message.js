import { PrismaClient } from '@prisma/client';
import { addToQueue, processQueueItem } from '../src/lib/queue.js';
const prisma = new PrismaClient();

async function main() {
  const recipientPhone = "8958394972";
  const orgId = "69a53a8cdf22e2e7c7cf3f9c"; // Deshveer Chaudhary's Organization
  const messageContent = "Hello! This is a test message from your WhatsApp Marketing Tool.";

  console.log(`--- Test Message Script ---`);
  console.log(`Target Number: ${recipientPhone}`);
  console.log(`Organization ID: ${orgId}`);

  try {
    // 1. Add to queue
    console.log('Adding message to queue...');
    const queueItem = await addToQueue(orgId, recipientPhone, messageContent, {
      messageType: 'text'
    });
    console.log(`Message added to queue with ID: ${queueItem.id}`);

    // 2. Process the item immediately
    console.log('Attempting to send message now...');
    const result = await processQueueItem(queueItem);

    if (result.success) {
      console.log('SUCCESS: Message sent successfully!');
      console.log('WhatsApp Message ID:', result.whatsappMessageId);
    } else {
      console.log('FAILED: Message could not be sent.');
      console.log('Error:', result.error);
      console.log('\n--- DIAGNOSIS ---');
      if (result.error?.includes('access token') || result.error?.includes('401')) {
        console.log('This confirms your WhatsApp access token is expired or invalid.');
        console.log('Please reconnect your account in Settings > WhatsApp.');
      } else {
        console.log('Please check the error message above for details.');
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
