require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Test with user that has 5 contacts
    const userId = '69a2891f02bc877a809efba8';
    
    const contacts = await prisma.contact.findMany({
      where: { userId: userId }
    });
    
    console.log('=== Contacts for user', userId, '===');
    console.log('Count:', contacts.length);
    console.log('Phone numbers:', contacts.map(c => c.phoneNumber));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
