const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

async function main() {
  const prisma = new PrismaClient();
  const orgId = "69a53a8cdf22e2e7c7cf3f9c";
  const recipientPhone = "8958394972";

  console.log(`--- WhatsApp Diagnosis for Organization ${orgId} ---`);

  try {
    const cred = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId, isActive: true }
    });

    if (!cred) {
      console.log('❌ FATAL: No active WhatsApp credential found for this organization.');
      return;
    }

    console.log('✅ Credential Record Found');
    console.log('Health Status:', cred.healthCheckStatus);
    console.log('Health Error:', cred.healthCheckError);

    // Check Phone Number ID
    let phoneId = cred.whatsappNumberId;
    if (!phoneId && cred.phoneNumbers && Array.isArray(cred.phoneNumbers) && cred.phoneNumbers.length > 0) {
        phoneId = cred.phoneNumbers[0].id;
    }

    if (!phoneId) {
      console.log('❌ FATAL: No WhatsApp Phone Number ID configured.');
      console.log('   Please go to Settings > WhatsApp and ensure you have select/verified a phone number.');
    } else {
      console.log('✅ Phone Number ID:', phoneId);
    }

    if (!cred.accessToken) {
      console.log('❌ FATAL: No Access Token found.');
    } else {
      console.log('✅ Access Token: present');
    }

    console.log('\nSummary: Your WhatsApp configuration is incomplete or unhealthy.');
    console.log('To fix this, go to Settings > WhatsApp and:');
    console.log('1. Re-authenticate / Reconnect your account.');
    console.log('2. Select and verify your primary phone number.');

  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
