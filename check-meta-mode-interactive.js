/**
 * Interactive script to check Meta app mode (Live/Development)
 * 
 * Usage: node check-meta-mode-interactive.js
 */

import https from 'https';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function checkMetaAppMode(appId, appSecret) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Checking Meta App ${appId} status...`);

    // First, get basic app info
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v22.0/${appId}?fields=name&access_token=${appId}|${appSecret}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.error) {
            reject(new Error(`Meta API Error: ${result.error.message} (Code: ${result.error.code})`));
            return;
          }

          // Now check if we can access WhatsApp Business API endpoints
          // This will help determine if the app is in live mode
          const whatsappOptions = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v22.0/me?fields=id,name&access_token=${appId}|${appSecret}`,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          };

          const whatsappReq = https.request(whatsappOptions, (whatsappRes) => {
            let whatsappData = '';

            whatsappRes.on('data', (chunk) => {
              whatsappData += chunk;
            });

            whatsappRes.on('end', () => {
              try {
                const whatsappResult = JSON.parse(whatsappData);
                
                // If we can access the user info, the app is likely in live mode
                // or at least has proper permissions
                resolve({
                  ...result,
                  canAccessGraphAPI: !whatsappResult.error,
                  userInfo: whatsappResult.error ? null : whatsappResult
                });
              } catch (parseError) {
                resolve({
                  ...result,
                  canAccessGraphAPI: false,
                  userInfo: null
                });
              }
            });
          });

          whatsappReq.on('error', () => {
            resolve({
              ...result,
              canAccessGraphAPI: false,
              userInfo: null
            });
          });

          whatsappReq.end();

        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.end();
  });
}

async function main() {
  console.log('🚀 Meta App Mode Checker');
  console.log('========================\n');

  try {
    const appId = await askQuestion('📱 Enter your Meta App ID: ');
    const appSecret = await askQuestion('🔑 Enter your Meta App Secret: ');

    if (!appId || !appSecret) {
      console.error('❌ Both App ID and App Secret are required.');
      rl.close();
      return;
    }

    const result = await checkMetaAppMode(appId, appSecret);

    console.log('\n📊 Meta App Status:');
    console.log('==================');
    console.log(`📱 App Name: ${result.name || 'N/A'}`);
    console.log(`🆔 App ID: ${appId}`);
    
    // Check if app is in live mode based on API access
    const canAccessGraphAPI = result.canAccessGraphAPI === true;
    
    if (canAccessGraphAPI) {
      console.log('✅ App Mode: LIVE MODE');
      console.log('🎉 Your app appears to be in live mode and can access Meta Graph API!');
      if (result.userInfo) {
        console.log(`👤 Connected User: ${result.userInfo.name || 'N/A'}`);
      }
    } else {
      console.log('⚠️  App Mode: DEVELOPMENT MODE');
      console.log('🔧 Your app appears to be in development mode or has limited permissions.');
      console.log('\n💡 To switch to Live Mode:');
      console.log('   1. Go to https://developers.facebook.com/apps');
      console.log('   2. Select your app');
      console.log('   3. Click "App Review" in the left menu');
      console.log('   4. Complete the app review process');
      console.log('   5. Once approved, switch to Live mode');
    }
    
    console.log('\n📋 Additional Info:');
    console.log(`   Can Access Graph API: ${canAccessGraphAPI}`);
    console.log(`   Has User Info: ${!!result.userInfo}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Verify your App ID and App Secret are correct');
    console.log('   - Check if your app has the WhatsApp product enabled');
    console.log('   - Ensure you have proper permissions for the app');
  } finally {
    rl.close();
  }
}

main();
