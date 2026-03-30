import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting final legacy campaign repair script...');

  // Get all organizations with active credentials
  const orgsWithCreds = await prisma.whatsAppCredential.findMany({
    where: { isActive: true },
    select: { organizationId: true }
  });

  if (orgsWithCreds.length === 0) {
    console.log('No organizations with active credentials found. Cannot repair legacy campaigns.');
    return;
  }

  const fallbackOrgId = orgsWithCreds[0].organizationId;
  console.log(`Using fallback organization ID: ${fallbackOrgId}`);

  // Find legacy campaigns without organizationId
  const allCampaigns = await prisma.campaign.findMany();
  const legacyCampaigns = allCampaigns.filter(c => !c.organizationId);

  console.log(`Found ${legacyCampaigns.length} legacy campaigns.`);

  let repairedCount = 0;
  for (const campaign of legacyCampaigns) {
    console.log(`Repairing campaign ${campaign.id} (${campaign.name}) -> ${fallbackOrgId}`);
    
    const defaultCred = await prisma.whatsAppCredential.findFirst({
        where: { organizationId: fallbackOrgId, isDefault: true }
    });

    const updateData = { organizationId: fallbackOrgId };
    if (defaultCred) {
        updateData.whatsappAccountId = defaultCred.id;
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: updateData
    });
    repairedCount++;
  }

  console.log(`Repaired ${repairedCount} campaigns.`);

  // Repair queue items
  const allQueueItems = await prisma.whatsAppMessageQueue.findMany();
  const legacyQueueItems = allQueueItems.filter(item => !item.organizationId);
  console.log(`Found ${legacyQueueItems.length} legacy queue items.`);

  let repairedQueueCount = 0;
  for (const item of legacyQueueItems) {
    let orgId = fallbackOrgId;
    if (item.campaignId) {
        const campaign = await prisma.campaign.findUnique({ where: { id: item.campaignId } });
        if (campaign?.organizationId) orgId = campaign.organizationId;
    }
    
    await prisma.whatsAppMessageQueue.update({
      where: { id: item.id },
      data: { organizationId: orgId }
    });
    repairedQueueCount++;
  }
  console.log(`Repaired ${repairedQueueCount} queue items.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
