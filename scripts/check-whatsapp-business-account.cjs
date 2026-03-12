/**
 * WhatsApp Business Account Diagnostic Tool
 * 
 * This script checks if your Meta Business Manager account has a 
 * WhatsApp Business Account properly linked and configured.
 * 
 * Usage:
 * 1. Get a temporary access token from Meta Developers console
 * 2. Run: node scripts/check-whatsapp-business-account.js <ACCESS_TOKEN>
 * 
 * Or use as an API endpoint in your Next.js app
 */

const axios = require('axios');

const META_GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' || args[i] === '-t') {
      options.accessToken = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    } else if (!options.accessToken) {
      options.accessToken = args[i];
    }
  }
  
  return options;
}

/**
 * Make API request with error handling
 */
async function makeRequest(endpoint, accessToken, params = {}) {
  try {
    const response = await axios.get(`${META_GRAPH_API_URL}${endpoint}`, {
      params: {
        access_token: accessToken,
        ...params
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorCode = error.response?.data?.error?.code || 'UNKNOWN';
    return { 
      success: false, 
      error: errorMessage, 
      code: errorCode,
      raw: error.response?.data 
    };
  }
}

/**
 * Check Strategy 1: Direct WhatsApp Business Account query
 */
async function checkDirectWhatsAppAccounts(accessToken) {
  console.log('\n📋 Strategy 1: Checking /me?fields=whatsapp_business_accounts');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('/me', accessToken, { 
    fields: 'whatsapp_business_accounts' 
  });
  
  if (result.success) {
    const accounts = result.data.whatsapp_business_accounts?.data || [];
    if (accounts.length > 0) {
      console.log(`✅ Found ${accounts.length} WhatsApp Business Account(s):`);
      accounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ID: ${account.id}`);
        console.log(`      Name: ${account.name || 'N/A'}`);
      });
      return { found: true, accounts };
    } else {
      console.log('❌ No WhatsApp Business Accounts found');
      return { found: false };
    }
  } else {
    console.log(`❌ Failed: ${result.error}`);
    return { found: false, error: result };
  }
}

/**
 * Check Strategy 2: Check /me/accounts for business accounts
 */
async function checkAccountsWithPermissions(accessToken) {
  console.log('\n📋 Strategy 2: Checking /me/accounts for WhatsApp permissions');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('/me/accounts', accessToken, {
    fields: 'id,name,perms'
  });
  
  if (result.success) {
    const accounts = result.data.data || [];
    if (accounts.length === 0) {
      console.log('❌ No accounts found');
      return { found: false };
    }
    
    console.log(`Found ${accounts.length} Facebook/Meta accounts:`);
    
    const whatsappAccounts = [];
    for (const account of accounts) {
      const perms = account.perms || [];
      const hasWhatsAppPerm = perms.includes('WHATSAPP_BUSINESS') || 
                             perms.includes('WHATSAPP_BUSINESS_MANAGEMENT');
      
      console.log(`   • ${account.name} (ID: ${account.id})`);
      console.log(`     Permissions: ${perms.join(', ') || 'None'}`);
      
      if (hasWhatsAppPerm) {
        whatsappAccounts.push(account);
        console.log(`     ✅ Has WhatsApp permissions!`);
      }
    }
    
    if (whatsappAccounts.length > 0) {
      return { found: true, accounts: whatsappAccounts };
    }
    
    return { found: false };
  } else {
    console.log(`❌ Failed: ${result.error}`);
    return { found: false, error: result };
  }
}

/**
 * Check Strategy 3: Check businesses and their WhatsApp accounts
 */
async function checkBusinesses(accessToken) {
  console.log('\n📋 Strategy 3: Checking /me?fields=businesses');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('/me', accessToken, {
    fields: 'businesses'
  });
  
  if (result.success) {
    const businesses = result.data.businesses?.data || [];
    
    if (businesses.length === 0) {
      console.log('❌ No businesses found');
      return { found: false };
    }
    
    console.log(`Found ${businesses.length} business(es):`);
    
    const whatsappBusinesses = [];
    
    for (const business of businesses) {
      console.log(`\n   📍 Business: ${business.name} (ID: ${business.id})`);
      
      // Check for WhatsApp Business accounts
      const waResult = await makeRequest(
        `/${business.id}/whatsapp_business_accounts`,
        accessToken
      );
      
      if (waResult.success) {
        const waAccounts = waResult.data.data || [];
        if (waAccounts.length > 0) {
          console.log(`   ✅ Found ${waAccounts.length} WhatsApp Business Account(s)!`);
          waAccounts.forEach((account, index) => {
            console.log(`      ${index + 1}. ID: ${account.id}`);
          });
          whatsappBusinesses.push({
            business,
            whatsappAccounts: waAccounts
          });
        } else {
          console.log(`   ❌ No WhatsApp Business Accounts linked`);
        }
      } else {
        console.log(`   ⚠️  Could not check WhatsApp accounts: ${waResult.error}`);
      }
    }
    
    if (whatsappBusinesses.length > 0) {
      return { found: true, businesses: whatsappBusinesses };
    }
    
    return { found: false };
  } else {
    console.log(`❌ Failed: ${result.error}`);
    return { found: false, error: result };
  }
}

/**
 * Get detailed info about a WhatsApp Business Account
 */
async function getWhatsAppBusinessAccountDetails(accessToken, accountId) {
  console.log(`\n📋 Getting details for WhatsApp Business Account: ${accountId}`);
  console.log('─'.repeat(50));
  
  const result = await makeRequest(`/${accountId}`, accessToken, {
    fields: 'id,name,message_template_namespace,timezone,created_timestam'
  });
  
  if (result.success) {
    console.log('✅ Account Details:');
    console.log(`   ID: ${result.data.id}`);
    console.log(`   Name: ${result.data.name}`);
    console.log(`   Template Namespace: ${result.data.message_template_namespace || 'N/A'}`);
    console.log(`   Timezone: ${result.data.timezone || 'N/A'}`);
    console.log(`   Created: ${result.data.created_timestamp || 'N/A'}`);
    
    // Get phone numbers
    const phoneResult = await makeRequest(`/${accountId}/phone_numbers`, accessToken, {
      fields: 'id,verified_name,display_phone_number,certification_status,quality_score'
    });
    
    if (phoneResult.success) {
      const phones = phoneResult.data.data || [];
      console.log(`\n   📱 Phone Numbers (${phones.length}):`);
      phones.forEach((phone, index) => {
        console.log(`      ${index + 1}. ${phone.verified_name}`);
        console.log(`         Number: ${phone.display_phone_number}`);
        console.log(`         Status: ${phone.certification_status || phone.quality_score || 'N/A'}`);
      });
    }
    
    return { success: true, details: result.data };
  } else {
    console.log(`❌ Failed to get details: ${result.error}`);
    return { success: false, error: result };
  }
}

/**
 * Run full diagnostic
 */
async function runDiagnostic(accessToken) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 WhatsApp Business Account Diagnostic Tool');
  console.log('═'.repeat(60));
  console.log('\nThis tool will check multiple ways to find your WhatsApp Business Account.');
  console.log('You need to provide a valid Meta access token.\n');
  
  console.log('📝 How to get an access token:');
  console.log('   1. Go to https://developers.facebook.com');
  console.log('   2. Select your app');
  console.log('   3. Go to WhatsApp → API Setup');
  console.log('   4. Copy the "Temporary Access Token"');
  console.log('\n⚠️  Note: Temporary tokens expire in ~24 hours\n');
  
  // Try each strategy
  let finalResult = { found: false };
  
  // Strategy 1
  const result1 = await checkDirectWhatsAppAccounts(accessToken);
  if (result1.found) {
    finalResult = result1;
  }
  
  // Strategy 2
  if (!finalResult.found) {
    const result2 = await checkAccountsWithPermissions(accessToken);
    if (result2.found) {
      finalResult = result2;
    }
  }
  
  // Strategy 3
  if (!finalResult.found) {
    const result3 = await checkBusinesses(accessToken);
    if (result3.found) {
      finalResult = result3;
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  
  if (finalResult.found) {
    console.log('\n✅ SUCCESS: WhatsApp Business Account found!');
    
    // Get details of first account
    const accounts = finalResult.accounts || 
                     finalResult.businesses?.[0]?.whatsappAccounts || [];
    
    if (accounts.length > 0) {
      await getWhatsAppBusinessAccountDetails(accessToken, accounts[0].id);
    }
    
    console.log('\n✅ Next Steps:');
    console.log('   1. Your WhatsApp Business Account is properly configured');
    console.log('   2. Try the OAuth connection in your app again');
    console.log('   3. If still failing, check your Meta App configuration');
    
  } else {
    console.log('\n❌ FAILURE: No WhatsApp Business Account found!');
    console.log('\n🔧 How to create a WhatsApp Business Account:');
    console.log('   1. Go to https://business.facebook.com');
    console.log('   2. Log in with your Business Manager account');
    console.log('   3. Click "WhatsApp Accounts" in the left sidebar');
    console.log('   4. Click "Create WhatsApp Account"');
    console.log('   5. Follow the setup wizard:');
    console.log('      - Select your business or create new');
    console.log('      - Add a phone number');
    console.log('      - Complete business verification');
    console.log('   6. Return here and run this diagnostic again');
    
    console.log('\n⚠️  Common Issues:');
    console.log('   • You have a Meta Business but NOT a WhatsApp Business Account');
    console.log('   • The WhatsApp Business Account is under a different Business Manager');
    console.log('   • Your account does not have permission to access WhatsApp accounts');
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// Export for use as API endpoint
module.exports = {
  runDiagnostic,
  checkDirectWhatsAppAccounts,
  checkAccountsWithPermissions,
  checkBusinesses,
  getWhatsAppBusinessAccountDetails
};

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  
  if (options.help) {
    console.log(`
WhatsApp Business Account Diagnostic Tool

Usage:
  node scripts/check-whatsapp-business-account.js <ACCESS_TOKEN>
  node scripts/check-whatsapp-business-account.js --token <ACCESS_TOKEN>
  node scripts/check-whatsapp-business-account.js -t <ACCESS_TOKEN>

Options:
  -t, --token <TOKEN>   Meta access token
  -h, --help            Show this help message

Example:
  node scripts/check-whatsapp-business-account.js EAAC...
`);
    process.exit(0);
  }
  
  if (!options.accessToken) {
    console.error('❌ Error: Access token is required');
    console.log('Usage: node scripts/check-whatsapp-business-account.js <ACCESS_TOKEN>');
    console.log('Use --help for more information');
    process.exit(1);
  }
  
  runDiagnostic(options.accessToken)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
