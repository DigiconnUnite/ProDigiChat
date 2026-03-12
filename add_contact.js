const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  // You need to provide a valid userId - get this from your database
  // Replace with actual user ID or pass as command line argument
  const userId = process.argv[2] || 'your-user-id-here';
  
  if (process.argv[2] === undefined) {
    console.log('Usage: node add_contact.js <userId> [phoneNumber]');
    console.log('Example: node add_contact.js 65f2a1b2c3d4e5f6a7b8c9d0 +1234567890');
    console.log('');
    console.log('To find a user ID, check the users collection in MongoDB');
    process.exit(1);
  }

  const phoneNumber = process.argv[3] || '918958394972';
  
  try {
    // Check if contact exists for this specific user
    const contact = await prisma.contact.findFirst({
      where: { 
        phoneNumber: phoneNumber,
        userId: userId
      }
    });
    
    if (contact) {
      console.log('Contact found:', JSON.stringify(contact, null, 2));
    } else {
      console.log('Contact not found. Creating it...');
      console.log('Using userId:', userId);
      
      // Create the contact with userId
      const newContact = await prisma.contact.create({
        data: {
          phoneNumber: phoneNumber,
          firstName: 'Test',
          lastName: 'User',
          optInStatus: 'opted_in',
          tags: '[]',
          attributes: '{}',
          userId: userId,  // Now including userId!
        }
      });
      
      console.log('Contact created:', JSON.stringify(newContact, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'P2002') {
      console.log('A contact with this phone number already exists for this user.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
