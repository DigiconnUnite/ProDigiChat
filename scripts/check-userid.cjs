require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get a contact to see the userId format
    const contact = await db.collection('contacts').findOne({});
    console.log('Sample contact:');
    console.log(JSON.stringify(contact, null, 2));
    
    // Get users to see the _id format  
    const user = await db.collection('users').findOne({});
    console.log('\nSample user:');
    console.log(JSON.stringify(user, null, 2));
    
  } finally {
    await client.close();
  }
}

main();
