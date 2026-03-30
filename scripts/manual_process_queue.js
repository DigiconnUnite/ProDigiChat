import { processQueue } from './src/lib/queue.js'; // Use .js extension for ESM if needed, or adjust path
import { prisma } from './src/lib/prisma.js';

async function main() {
  const orgId = "69a53a8cdf22e2e7c7cf3f9c";
  console.log(`Manual queue processing for org: ${orgId}`);
  
  try {
    const result = await processQueue(orgId, 10);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error during manual processQueue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
