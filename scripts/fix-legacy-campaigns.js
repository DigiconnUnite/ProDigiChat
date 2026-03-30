import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting legacy campaign repair script (in-memory filtering)...');

  // 1. Repair campaigns
  const allCampaigns = await prisma.campaign.findMany({
    include: { creator: true }
  });

  const legacyCampaigns = allCampaigns.filter(c => !c.organizationId);
  console.log(`Found ${legacyCampaigns.length} campaigns with missing organizationId.`);

  let repairedCount = 0;
  for (const campaign of legacyCampaigns) {
    if (!campaign.createdBy) {
      console.log(`Skipping campaign ${campaign.id} - no creator ID.`);
      continue;
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: campaign.createdBy, isActive: true },
      select: { organizationId: true }
    });

    if (membership) {
      console.log(`Repairing campaign ${campaign.id} - setting organizationId to ${membership.organizationId}.`);
      
      const defaultCred = await prisma.whatsAppCredential.findFirst({
        where: { organizationId: membership.organizationId, isDefault: true },
        select: { id: true, phoneNumbers: true }
      });

      const updateData = { organizationId: membership.organizationId };
      
      if (defaultCred && !campaign.whatsappAccountId) {
        updateData.whatsappAccountId = defaultCred.id;
        if (!campaign.whatsappNumberId && defaultCred.phoneNumbers) {
          const defaultPhone = defaultCred.phoneNumbers.find((p) => p.isDefault);
          if (defaultPhone) {
            updateData.whatsappNumberId = defaultPhone.id;
          }
        }
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: updateData
      });
      repairedCount++;
    }
  }

  console.log(`Successfully repaired ${repairedCount} campaigns.`);

  // 2. Repair queue items
  const allQueueItems = await prisma.whatsAppMessageQueue.findMany({
    include: { campaign: true }
  });

  const legacyQueueItems = allQueueItems.filter(item => !item.organizationId);
  console.log(`Found ${legacyQueueItems.length} queue items with missing organizationId.`);
  
  let repairedQueueCount = 0;
  for (const item of legacyQueueItems) {
    if (item.campaign?.organizationId) {
      await prisma.whatsAppMessageQueue.update({
        where: { id: item.id },
        data: { organizationId: item.campaign.organizationId }
      });
      repairedQueueCount++;
    }
  }
  
  console.log(`Successfully repaired ${repairedQueueCount} queue items.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
