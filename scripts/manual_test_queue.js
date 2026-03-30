import { PrismaClient } from '@prisma/client';
import { processQueue } from '../src/lib/queue.js';

const prisma = new PrismaClient();

async function main() {
  const orgId = "69a53a8cdf22e2e7c7cf3f9c";
  console.log(`Manually processing queue for org: ${orgId}`);
  
  try {
    const result = await processQueue(orgId, 5);
    console.log('Processing result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fatal error during queue processing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
