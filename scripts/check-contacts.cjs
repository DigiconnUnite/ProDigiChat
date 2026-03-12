require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get contacts grouped by userId
    const contactsByUser = await db.collection('contacts').aggregate([
      { $group: { 
        _id: '$userId', 
        count: { $sum: 1 },
        phones: { $push: '$phoneNumber' }
      }}
    ]).toArray();
    
    console.log('=== Contacts by User ===');
    console.log(JSON.stringify(contactsByUser, null, 2));
    
    // Get all users
    const users = await db.collection('users').find({}).project({ email: 1, name: 1 }).toArray();
    
    console.log('\n=== All Users ===');
    console.log(JSON.stringify(users, null, 2));
    
  } finally {
    await client.close();
  }
}

main();
