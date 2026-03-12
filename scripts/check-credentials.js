import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== WhatsApp Credentials ===');
  const creds = await prisma.whatsAppCredential.findMany({
    include: { phoneNumbers: true }
  });
  console.log(JSON.stringify(creds, null, 2));

  console.log('\n=== Message Templates (Approved) ===');
  const templates = await prisma.messageTemplate.findMany({
    where: { status: 'approved' },
    select: { id: true, name: true, language: true, status: true }
  });
  console.log(JSON.stringify(templates, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
