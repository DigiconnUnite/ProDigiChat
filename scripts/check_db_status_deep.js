import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Campaigns with Null Org ID ---');
  const nullOrgCampaigns = await prisma.campaign.findMany({
    where: { organizationId: null },
    select: { id: true, name: true, status: true, organizationId: true }
  });
  console.log(JSON.stringify(nullOrgCampaigns, null, 2));

  console.log('\n--- All Organizations in DB ---');
  const orgs = await prisma.team.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(orgs, null, 2));

  console.log('\n--- Queue Items (detailed) ---');
  const queueItems = await prisma.whatsAppMessageQueue.findMany({
    take: 10,
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
  console.log(JSON.stringify(queueItems, null, 2));

  console.log('\n--- WhatsApp Credentials (detailed) ---');
  const creds = await prisma.whatsAppCredential.findMany({
    select: {
      id: true,
      organizationId: true,
      accountName: true,
      isActive: true,
      healthCheckStatus: true,
      healthCheckError: true,
      accessToken: true // Just to see if it exists
    }
  });
  // Hide access token for security in output, just show length or "exists"
  const safeCreds = creds.map(c => ({
    ...c,
    accessToken: c.accessToken ? `exists (length: ${c.accessToken.length})` : 'missing'
  }));
  console.log(JSON.stringify(safeCreds, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
