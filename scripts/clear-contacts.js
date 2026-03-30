import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllContacts() {
  try {
    console.log('Clearing all related data...');

    // Delete in order to avoid foreign key constraints
    console.log('Deleting messages...');
    await prisma.message.deleteMany({});

    console.log('Deleting segment members...');
    await prisma.segmentMember.deleteMany({});

    console.log('Deleting queue messages...');
    await prisma.whatsAppMessageQueue.deleteMany({});

    console.log('Deleting contacts...');
    const contactResult = await prisma.contact.deleteMany({});
    console.log(`Deleted ${contactResult.count} contacts`);

  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllContacts();