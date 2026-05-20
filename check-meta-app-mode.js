/**
 * Script to check if Meta app is in Live or Development mode
 * 
 * Usage: node check-meta-app-mode.js
 */

import https from 'https';
const { META_APP_ID, META_APP_SECRET } = process.env;

if (!META_APP_ID || !META_APP_SECRET) {
  console.error('❌ Missing environment variables:');
  console.error('   - META_APP_ID');
  console.error('   - META_APP_SECRET');
  console.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

console.log(`🔍 Checking Meta App ${META_APP_ID} status...`);

// Meta API debug token endpoint to check app info
const options = {
  hostname: 'graph.facebook.com',
  port: 443,
  path: `/v22.0/${META_APP_ID}?fields=name,status,is_live_mode&access_token=${META_APP_ID}|${META_APP_SECRET}`,
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
        console.error('❌ Error from Meta API:', result.error.message);
        console.error('   Error code:', result.error.code);
        console.error('   Error type:', result.error.error_user_title);
        process.exit(1);
      }

      console.log('\n📊 Meta App Status:');
      console.log('==================');
      console.log(`📱 App Name: ${result.name || 'N/A'}`);
      console.log(`🆔 App ID: ${META_APP_ID}`);
      
      // Check if app is in live mode
      const isLiveMode = result.is_live_mode === true;
      
      if (isLiveMode) {
        console.log('✅ App Mode: LIVE MODE');
        console.log('🎉 Your app is approved and ready for production use!');
      } else {
        console.log('⚠️  App Mode: DEVELOPMENT MODE');
        console.log('🔧 Your app is in development mode.');
        console.log('\n💡 To switch to Live Mode:');
        console.log('   1. Go to https://developers.facebook.com/apps');
        console.log('   2. Select your app');
        console.log('   3. Click "App Review" in the left menu');
        console.log('   4. Complete the app review process');
        console.log('   5. Once approved, switch to Live mode');
      }
      
      console.log('\n📋 Additional Info:');
      console.log(`   Status: ${result.status || 'N/A'}`);
      console.log(`   Live Mode: ${result.is_live_mode || false}`);
      
    } catch (parseError) {
      console.error('❌ Failed to parse Meta API response:', parseError.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Network error:', error.message);
  process.exit(1);
});

req.end();
