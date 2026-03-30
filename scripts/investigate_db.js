import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const result = {};

  result.campaigns = await prisma.campaign.findMany({
    where: { status: { in: ['running', 'scheduled', 'failed'] } },
    select: { id: true, name: true, status: true, organizationId: true, stats: true }
  });

  result.orgs = await prisma.team.findMany({
    select: { id: true, name: true }
  });

  result.queueItems = await prisma.whatsAppMessageQueue.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      organizationId: true,
      campaignId: true,
      status: true,
      attempts: true,
      errorMessage: true,
      errorCode: true,
      createdAt: true,
      updatedAt: true,
      recipientPhone: true
    }
  });

  result.creds = await prisma.whatsAppCredential.findMany({
    select: {
      id: true,
      organizationId: true,
      accountName: true,
      isActive: true,
      healthCheckStatus: true,
      healthCheckError: true,
      accessToken: true
    }
  });

  // Mask access tokens
  result.creds = result.creds.map(c => ({
    ...c,
    accessToken: c.accessToken ? `exists (length: ${c.accessToken.length})` : 'missing'
  }));

  fs.writeFileSync('scripts/db_investigation_result.json', JSON.stringify(result, null, 2));
  console.log('Results written to scripts/db_investigation_result.json');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
