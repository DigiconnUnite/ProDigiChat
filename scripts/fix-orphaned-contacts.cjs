/**
 * Script to fix orphaned contacts (contacts without userId)
 * Uses MongoDB native driver
 * 
 * Usage:
 *   node scripts/fix-orphaned-contacts.cjs list      - List all orphaned contacts
 *   node scripts/fix-orphaned-contacts.cjs delete   - Delete all orphaned contacts  
 *   node scripts/fix-orphaned-contacts.cjs assign <userId> - Assign orphaned contacts to a user
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function main() {
  const action = process.argv[2];
  const userId = process.argv[3];
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wpblaster';

  console.log('=== Fix Orphaned Contacts Script ===\n');

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();
    const contacts = db.collection('contacts');

    // Find contacts without userId (null or undefined)
    const orphanedContacts = await contacts.find({ 
      userId: { $exists: false }
    }).toArray();
    
    console.log(`Found ${orphanedContacts.length} orphaned contacts (without userId)\n`);

    if (orphanedContacts.length === 0) {
      console.log('No orphaned contacts found. All contacts have userId assigned.');
      return;
    }

    switch (action) {
      case 'list':
        console.log('Orphaned contacts:');
        orphanedContacts.forEach((contact, index) => {
          console.log(`\n${index + 1}. ID: ${contact._id}`);
          console.log(`   Phone: ${contact.phoneNumber}`);
          console.log(`   Name: ${contact.firstName} ${contact.lastName || ''}`);
          console.log(`   Email: ${contact.email || 'N/A'}`);
          console.log(`   Status: ${contact.optInStatus}`);
        });
        break;

      case 'delete':
        console.log('Deleting orphaned contacts...');
        for (const contact of orphanedContacts) {
          await contacts.deleteOne({ _id: contact._id });
          console.log(`Deleted: ${contact.phoneNumber}`);
        }
        console.log(`\nSuccessfully deleted ${orphanedContacts.length} orphaned contacts.`);
        break;

      case 'assign':
        if (!userId) {
          console.log('Error: Please provide a userId to assign contacts to.');
          console.log('Usage: node scripts/fix-orphaned-contacts.cjs assign <userId>');
          console.log('\nExample: node scripts/fix-orphaned-contacts.cjs assign 65f2a1b2c3d4e5f6a7b8c9d0');
          process.exit(1);
        }

        // Validate userId format
        if (!ObjectId.isValid(userId)) {
          console.log(`Error: Invalid userId format: ${userId}`);
          process.exit(1);
        }

        // Check if user exists
        const users = db.collection('users');
        const user = await users.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          console.log(`Error: User with ID ${userId} not found.`);
          process.exit(1);
        }

        console.log(`Assigning ${orphanedContacts.length} contacts to user: ${user.email}\n`);

        // Check for duplicates and assign
        for (const contact of orphanedContacts) {
          // Check if contact with same phoneNumber exists for this user
          const existingContact = await contacts.findOne({ 
            phoneNumber: contact.phoneNumber, 
            userId: userId 
          });

          if (existingContact) {
            console.log(`Skipping ${contact.phoneNumber} - already exists for this user`);
            // Delete the orphaned contact since it would be a duplicate
            await contacts.deleteOne({ _id: contact._id });
            console.log(`  -> Deleted duplicate orphaned contact`);
          } else {
            // Assign to user
            await contacts.updateOne(
              { _id: contact._id },
              { $set: { userId: userId } }
            );
            console.log(`Assigned: ${contact.phoneNumber}`);
          }
        }
        console.log(`\nSuccessfully processed contacts for user: ${user.email}`);
        break;

      default:
        console.log('Usage:');
        console.log('  node scripts/fix-orphaned-contacts.cjs list              - List all orphaned contacts');
        console.log('  node scripts/fix-orphaned-contacts.cjs delete           - Delete all orphaned contacts');
        console.log('  node scripts/fix-orphaned-contacts.cjs assign <userId>  - Assign orphaned contacts to a user');
        console.log('\nExample:');
        console.log('  node scripts/fix-orphaned-contacts.cjs assign 65f2a1b2c3d4e5f6a7b8c9d0');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

main();
