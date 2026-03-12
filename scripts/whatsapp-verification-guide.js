/**
 * WhatsApp Business Verification Guide
 * 
 * This script helps users understand and complete the Meta Business verification
 * process to send messages to unverified phone numbers.
 * 
 * Run: node scripts/whatsapp-verification-guide.js
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const META_GRAPH_API = 'https://graph.facebook.com/v18.0';

async function getCredentials() {
  const creds = await prisma.whatsAppCredential.findFirst({
    include: { phoneNumbers: true }
  });
  return creds;
}

async function checkBusinessVerification(accessToken, businessAccountId) {
  try {
    // Get Business Account info
    const response = await axios.get(
      `${META_GRAPH_API}/${businessAccountId}`,
      {
        params: {
          fields: 'id,name,verification_status,primary_email,primary_phone'
        },
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error checking business verification:', error.response?.data || error.message);
    return null;
  }
}

async function checkPhoneNumberVerification(accessToken, phoneNumberId) {
  try {
    const response = await axios.get(
      `${META_GRAPH_API}/${phoneNumberId}`,
      {
        params: {
          fields: 'id,display_phone_number,code_verification_status,quality_rating,status,name_status'
        },
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error checking phone verification:', error.response?.data || error.message);
    return null;
  }
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function printSection(title) {
  console.log('\n' + '-'.repeat(40));
  console.log(title);
  console.log('-'.repeat(40));
}

async function main() {
  printHeader('🔍 WhatsApp Business Verification Status Check');

  // Get credentials from database
  const creds = await getCredentials();
  
  if (!creds) {
    console.log('\n❌ No WhatsApp credentials found!');
    console.log('   Please connect your WhatsApp account first.');
    console.log('   Go to: Dashboard → Settings → WhatsApp');
    process.exit(1);
  }

  const accessToken = creds.accessToken;
  const businessAccountId = creds.businessAccountId;
  const phoneNumberId = creds.phoneNumberId || creds.phoneNumbers[0]?.phoneNumber;

  console.log(`\n📱 Account: ${creds.accountName}`);
  console.log(`   Business ID: ${businessAccountId}`);
  console.log(`   Phone Number ID: ${phoneNumberId}`);

  // Check verification status
  printSection('1️⃣ Business Account Verification Status');
  const businessInfo = await checkBusinessVerification(accessToken, businessAccountId);
  
  if (businessInfo) {
    console.log(`   Business Name: ${businessInfo.name}`);
    console.log(`   Verification Status: ${businessInfo.verification_status}`);
    
    if (businessInfo.verification_status === 'verified') {
      console.log('   ✅ Business is VERIFIED');
    } else if (businessInfo.verification_status === 'pending') {
      console.log('   ⏳ Business verification is PENDING');
    } else {
      console.log('   ❌ Business is NOT verified');
    }
  }

  printSection('2️⃣ Phone Number Verification Status');
  const phoneInfo = await checkPhoneNumberVerification(accessToken, phoneNumberId);
  
  if (phoneInfo) {
    console.log(`   Display Number: ${phoneInfo.display_phone_number}`);
    console.log(`   Code Verification: ${phoneInfo.code_verification_status}`);
    console.log(`   Quality Rating: ${phoneInfo.quality_rating}`);
    console.log(`   Status: ${phoneInfo.status}`);
    
    if (phoneInfo.code_verification_status === 'VERIFIED') {
      console.log('   ✅ Phone number is VERIFIED');
    } else {
      console.log('   ❌ Phone number is NOT verified');
    }
  }

  // Determine overall status
  printSection('3️⃣ Overall Status & Next Steps');
  
  const isBusinessVerified = businessInfo?.verification_status === 'verified';
  const isPhoneVerified = phoneInfo?.code_verification_status === 'VERIFIED';
  
  if (isBusinessVerified && isPhoneVerified) {
    console.log('\n🎉 CONGRATULATIONS! Your WhatsApp Business is fully verified!');
    console.log('   You can now send messages to any phone number.');
    console.log('\n   To test, run: node tests/send-bulk-messages.js');
  } else {
    console.log('\n⚠️  Your WhatsApp Business needs verification.');
    console.log('\n📋 REQUIRED STEPS TO VERIFY:');
    
    if (!isPhoneVerified) {
      console.log('\n   STEP 1: Verify Phone Number');
      console.log('   ────────────────────────────');
      console.log('   1. Go to: https://developers.facebook.com/apps/');
      console.log('   2. Select your WhatsApp app');
      console.log('   3. Go to WhatsApp → API Setup');
      console.log('   4. Find your phone number');
      console.log('   5. Click "Verify" or "Verify Code"');
      console.log('   6. Enter the verification code sent to your phone');
      console.log('   7. Wait for Meta to verify (usually instant)');
    }
    
    if (!isBusinessVerified) {
      console.log('\n   STEP 2: Complete Business Verification');
      console.log('   ─────────────────────────────────────');
      console.log('   1. Go to: https://www.facebook.com/business/help/205851029421035');
      console.log('   2. Click "Start Verification"');
      console.log('   3. Provide business documents:');
      console.log('      - Business license / Registration');
      console.log('      - Proof of business address');
      console.log('      - Government ID of owner');
      console.log('   4. Wait for Meta review (1-7 days)');
      console.log('   5. Once verified, you can send to any number');
    }
    
    console.log('\n   📞 ALTERNATIVE: Use Official WhatsApp Business API');
    console.log('   ─────────────────────────────────────────────────');
    console.log('   If you need faster verification, consider:');
    console.log('   1. Using an official WhatsApp Business Partner');
    console.log('   2. Applying for direct WhatsApp Business API access');
    console.log('   3. Using AISENSY/Watt platform (they handle verification)');
  }

  printSection('4️⃣ Quick Test');
  console.log('\n   After verification, test with:');
  console.log('   node tests/send-bulk-messages.js');
  
  console.log('\n' + '='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
