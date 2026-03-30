import { prisma } from '../src/lib/prisma';
import { processQueueItem } from '../src/lib/queue';

async function main() {
  const queueItems = await prisma.whatsAppMessageQueue.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log('Recent Queue Items (Count: ' + queueItems.length + '):');
  for (const q of queueItems) {
    console.log(`- ID: ${q.id} | Status: ${q.status} | Phone: ${q.recipientPhone} | Attempts: ${q.attempts} | Error: ${q.errorMessage}`);
  }
  
  // Try processing one if it's queued
  const ready = queueItems.find(q => q.status === 'queued' || q.status === 'pending');
  if (ready) {
    console.log('\n--- Attempting to process item:', ready.id, '---');
    const result = await processQueueItem(ready);
    console.log('Result:', result);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
