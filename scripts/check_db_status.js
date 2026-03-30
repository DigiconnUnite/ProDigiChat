import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Campaign Status ---');
  const campaigns = await prisma.campaign.findMany({
    where: { status: { in: ['running', 'scheduled', 'failed'] } },
    select: { id: true, name: true, status: true, organizationId: true, stats: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));

  console.log('\n--- Queue Status Summary ---');
  const queueStats = await prisma.whatsAppMessageQueue.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log(JSON.stringify(queueStats, null, 2));

  console.log('\n--- Recent Failed/Queued Messages (up to 5) ---');
  const recentMessages = await prisma.whatsAppMessageQueue.findMany({
    where: { status: { in: ['failed', 'queued', 'pending', 'sending'] } },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(recentMessages, null, 2));

  console.log('\n--- WhatsApp Credentials Status ---');
  const creds = await prisma.whatsAppCredential.findMany({
    select: { id: true, organizationId: true, accountName: true, isActive: true, healthCheckStatus: true, healthCheckError: true }
  });
  console.log(JSON.stringify(creds, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
