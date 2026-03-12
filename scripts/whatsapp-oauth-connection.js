/**
 * WhatsApp OAuth Connection & Business Management Script
 * 
 * This script provides a complete solution for:
 * - OAuth authentication with Meta (Facebook) for WhatsApp Business API
 * - Connecting WhatsApp business accounts
 * - Fetching all business information (accounts, phone numbers, templates)
 * - Token management and automatic refresh
 * - Sending messages
 * - Webhook configuration
 * - Health monitoring
 * 
 * Required Environment Variables:
 * - META_APP_ID: Facebook App ID
 * - META_APP_SECRET: Facebook App Secret
 * - META_OAUTH_REDIRECT_URI: OAuth callback URL
 * - NEXT_PUBLIC_APP_URL: Your application URL
 * - MONGODB_URI: MongoDB connection string (for storing credentials)
 * 
 * Usage:
 *   node scripts/whatsapp-oauth-connection.js [command] [options]
 * 
 * Commands:
 *   init          Initialize OAuth URL for connecting an account
 *   status        Check connection status
 *   accounts      List all connected business accounts
 *   phones        List all phone numbers
 *   templates     List all message templates
 *   health        Run health check
 *   report        Generate comprehensive business report
 *   send          Send a test message
 *   disconnect    Disconnect a business account
 * 
 * Examples:
 *   node scripts/whatsapp-oauth-connection.js init --orgId=org_123
 *   node scripts/whatsapp-oauth-connection.js status
 *   node scripts/whatsapp-oauth-connection.js send --to=+1234567890 --message="Hello"
 */

import axios from 'axios';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ============================================================
// Configuration
// ============================================================

const META_API_VERSION = 'v18.0';
const META_AUTH_URL = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;
const META_TOKEN_URL = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================
// WhatsApp OAuth Service Class
// ============================================================

class WhatsAppOAuthService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state, forceReauth = false) {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code',
    });

    if (forceReauth) {
      params.append('auth_type', 'reauthenticate');
    }

    return `${META_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code) {
    try {
      const tokenResponse = await axios.get(META_TOKEN_URL, {
        params: {
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          redirect_uri: this.config.redirectUri,
          code
        }
      });

      const { access_token, expires_in } = tokenResponse.data;
      const businessAccountId = await this.findWhatsAppBusinessAccount(access_token);

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        businessAccountId
      };
    } catch (error) {
      throw new Error(`OAuth Error: ${this.parseGraphApiError(error)}`);
    }
  }

  /**
   * Convert short-lived token to long-lived token (~60 days)
   */
  async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(META_TOKEN_URL, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          fb_exchange_token: shortLivedToken
        }
      });
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Token Exchange Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Find WhatsApp Business Account using multiple strategies
   */
  async findWhatsAppBusinessAccount(accessToken) {
    // Strategy 1: Direct field access
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/me?fields=whatsapp_business_accounts`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const accounts = response.data.whatsapp_business_accounts?.data;
      if (accounts && accounts.length > 0) {
        return accounts[0].id;
      }
    } catch (error) {
      console.log('Strategy 1 failed, trying Strategy 2...');
    }

    // Strategy 2: Query /me/accounts
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/me/accounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,name,perms' }
        }
      );
      const accounts = response.data.data;
      if (accounts && accounts.length > 0) {
        for (const account of accounts) {
          const perms = account.perms || [];
          if (perms.includes('WHATSAPP_BUSINESS') || perms.includes('WHATSAPP_BUSINESS_MANAGEMENT')) {
            return account.id;
          }
        }
      }
    } catch (error) {
      console.log('Strategy 2 failed, trying Strategy 3...');
    }

    // Strategy 3: Query businesses
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/me?fields=businesses`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const businesses = response.data.businesses?.data;
      if (businesses && businesses.length > 0) {
        for (const business of businesses) {
          try {
            const waResponse = await axios.get(
              `${META_API_BASE_URL}/${business.id}/whatsapp_business_accounts`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const waAccounts = waResponse.data.data;
            if (waAccounts && waAccounts.length > 0) {
              return waAccounts[0].id;
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (error) {
      console.log('Strategy 3 failed');
    }

    throw new Error(
      'No WhatsApp Business Account found. Please ensure you have a WhatsApp Business Account linked to your Meta Business Account.'
    );
  }

  /**
   * Get business account information
   */
  async getBusinessAccountInfo(accessToken, businessAccountId) {
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/${businessAccountId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,name,message_template_namespace' }
        }
      );
      return {
        id: response.data.id,
        name: response.data.name,
        messageTemplateNamespace: response.data.message_template_namespace || ''
      };
    } catch (error) {
      throw new Error(`Business Account Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get all phone numbers for a business account
   */
  async getPhoneNumbers(accessToken, businessAccountId) {
    try {
      const allPhoneNumbers = [];
      let nextCursor = null;

      do {
        const response = await axios.get(
          `${META_API_BASE_URL}/${businessAccountId}/phone_numbers`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              fields: 'id,verified_name,display_phone_number,certified_wa_phone_number,verification_status,quality_score,code_verification_status',
              limit: 100,
              ...(nextCursor && { after: nextCursor })
            }
          }
        );

        allPhoneNumbers.push(...response.data.data);
        nextCursor = response.data.paging?.cursors?.after || null;
      } while (nextCursor);

      return allPhoneNumbers.map((phone) => ({
        id: phone.id,
        displayName: phone.verified_name || phone.display_phone_number || 'Unknown',
        phoneNumber: phone.certified_wa_phone_number || phone.display_phone_number || '',
        verificationStatus: phone.verification_status || 'PENDING',
        qualityScore: phone.quality_score,
        codeVerificationStatus: phone.code_verification_status
      }));
    } catch (error) {
      throw new Error(`Phone Numbers Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get all message templates
   */
  async getMessageTemplates(accessToken, businessAccountId) {
    try {
      const allTemplates = [];
      let nextCursor = null;

      do {
        const response = await axios.get(
          `${META_API_BASE_URL}/${businessAccountId}/message_templates`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              fields: 'id,name,status,category,language,components,quality_score,rejection_reason',
              limit: 100,
              ...(nextCursor && { after: nextCursor })
            }
          }
        );

        allTemplates.push(...response.data.data);
        nextCursor = response.data.paging?.cursors?.after || null;
      } while (nextCursor);

      return allTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category,
        language: template.language,
        qualityScore: template.quality_score,
        rejectionReason: template.rejection_reason
      }));
    } catch (error) {
      throw new Error(`Templates Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get webhook configuration
   */
  async getWebhookConfig(accessToken, businessAccountId) {
    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/${businessAccountId}/webhooks`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const entry = response.data.entry?.[0];
      if (!entry?.changes) {
        return null;
      }

      return {
        url: entry.changes[0]?.value?.url || '',
        fields: entry.changes[0]?.value?.fields || []
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(accessToken, phoneNumberId, to, message) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to,
        [message.type]: message.content
      };

      const response = await axios.post(
        `${META_API_BASE_URL}/${phoneNumberId}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      return { messageId: response.data.messages[0].id };
    } catch (error) {
      throw new Error(`Send Message Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(accessToken, businessAccountId) {
    try {
      const response = await axios.post(
        `${META_API_BASE_URL}/${businessAccountId}/refresh_token`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Token Refresh Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Parse Graph API errors
   */
  parseGraphApiError(error) {
    if (!error) return 'Unknown error';
    const response = error.response;
    if (!response?.data?.error) {
      return error.message || 'Network error';
    }
    const graphError = response.data.error;
    return `(${graphError.type || graphError.code}) ${graphError.message || 'Unknown error'}`;
  }
}

// ============================================================
// Database Functions
// ============================================================

let prisma = null;

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

async function getCredentials(orgId) {
  try {
    const db = await getPrisma();
    const where = orgId ? { organizationId: orgId, isActive: true } : { isActive: true };
    return await db.whatsAppCredential.findMany({
      where,
      include: { phoneNumbers: true }
    });
  } catch (error) {
    console.log('Database not available or no credentials found');
    return [];
  }
}

async function deleteCredential(credentialId) {
  try {
    const db = await getPrisma();
    await db.whatsAppCredential.delete({ where: { id: credentialId } });
    console.log('✓ Credential deleted from database');
  } catch (error) {
    console.log('Failed to delete credential from database');
  }
}

// ============================================================
// Main CLI Functions
// ============================================================

function validateConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  META_APP_ID\n' +
      '  META_APP_SECRET\n' +
      '  META_OAUTH_REDIRECT_URI\n' +
      '\nPlease add these to your .env file.'
    );
  }

  return { appId, appSecret, redirectUri };
}

async function commandInit(orgId) {
  console.log('\n=== WhatsApp OAuth Initialization ===\n');
  
  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  const state = Buffer.from(JSON.stringify({ 
    orgId, 
    timestamp: Date.now() 
  })).toString('base64');
  
  const authUrl = oauthService.getAuthorizationUrl(state, false);
  
  console.log('OAuth Authorization URL:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Instructions:');
  console.log('1. Open the URL above in a browser');
  console.log('2. Complete the OAuth flow');
  console.log('3. You will be redirected to:', config.redirectUri);
  console.log('4. The callback will store credentials automatically\n');
}

async function commandStatus(orgId) {
  console.log('\n=== WhatsApp Connection Status ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No WhatsApp accounts connected.');
    console.log('Run "npm run whatsapp init" to connect an account.\n');
    return;
  }

  console.log(`Connected Accounts: ${credentials.length}\n`);
  
  for (const cred of credentials) {
    console.log(`Account: ${cred.accountName || 'Unnamed'}`);
    console.log(`  ID: ${cred.id}`);
    console.log(`  Business Account ID: ${cred.businessAccountId}`);
    console.log(`  Business Account Name: ${cred.businessAccountName || 'N/A'}`);
    console.log(`  Default: ${cred.isDefault ? 'Yes' : 'No'}`);
    console.log(`  Active: ${cred.isActive ? 'Yes' : 'No'}`);
    console.log(`  Connected: ${cred.connectedAt ? new Date(cred.connectedAt).toISOString() : 'N/A'}`);
    console.log('');
  }
}

async function commandAccounts(orgId) {
  console.log('\n=== WhatsApp Business Accounts ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts connected. Run "npm run whatsapp init" first.\n');
    return;
  }

  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  for (const cred of credentials) {
    console.log(`\nAccount: ${cred.businessAccountName || 'Unnamed'}`);
    console.log(`  ID: ${cred.id}`);
    console.log(`  Business Account ID: ${cred.businessAccountId}`);
    console.log(`  Namespace: ${cred.messageTemplateNamespace || 'N/A'}`);
    
    try {
      const info = await oauthService.getBusinessAccountInfo(
        cred.accessToken,
        cred.businessAccountId
      );
      console.log(`  Verified Name: ${info.name}`);
      console.log(`  Status: ✓ Connected`);
    } catch (error) {
      console.log(`  Status: ✗ Error - ${error.message}`);
    }
  }
  console.log('');
}

async function commandPhones(orgId) {
  console.log('\n=== WhatsApp Phone Numbers ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts connected. Run "npm run whatsapp init" first.\n');
    return;
  }

  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  for (const cred of credentials) {
    console.log(`\nAccount: ${cred.businessAccountName || 'Unnamed'}`);
    
    try {
      const phones = await oauthService.getPhoneNumbers(
        cred.accessToken,
        cred.businessAccountId
      );
      
      if (phones.length === 0) {
        console.log('  No phone numbers found.');
      } else {
        for (const phone of phones) {
          console.log(`\n  Phone: ${phone.phoneNumber}`);
          console.log(`    Display Name: ${phone.displayName}`);
          console.log(`    Verification: ${phone.verificationStatus}`);
          console.log(`    Quality Score: ${phone.qualityScore || 'N/A'}`);
        }
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }
  console.log('');
}

async function commandTemplates(orgId) {
  console.log('\n=== WhatsApp Message Templates ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts connected. Run "npm run whatsapp init" first.\n');
    return;
  }

  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  for (const cred of credentials) {
    console.log(`\nAccount: ${cred.businessAccountName || 'Unnamed'}`);
    
    try {
      const templates = await oauthService.getMessageTemplates(
        cred.accessToken,
        cred.businessAccountId
      );
      
      console.log(`\n  Total Templates: ${templates.length}\n`);
      
      const byStatus = {};
      for (const t of templates) {
        if (!byStatus[t.status]) byStatus[t.status] = [];
        byStatus[t.status].push(t);
      }
      
      for (const [status, tmpls] of Object.entries(byStatus)) {
        console.log(`  ${status}: ${tmpls.length}`);
        for (const t of tmpls.slice(0, 5)) {
          console.log(`    - ${t.name} (${t.language})`);
        }
        if (tmpls.length > 5) {
          console.log(`    ... and ${tmpls.length - 5} more`);
        }
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }
  console.log('');
}

async function commandHealth(orgId) {
  console.log('\n=== WhatsApp Health Check ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts to check. Run "npm run whatsapp init" first.\n');
    return;
  }

  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  for (const cred of credentials) {
    console.log(`\nAccount: ${cred.businessAccountName || 'Unnamed'}`);
    console.log(`  Business Account ID: ${cred.businessAccountId}`);
    
    // Test 1: Business Account API
    try {
      await oauthService.getBusinessAccountInfo(cred.accessToken, cred.businessAccountId);
      console.log('  ✓ Business Account API: OK');
    } catch (error) {
      console.log(`  ✗ Business Account API: ${error.message}`);
    }
    
    // Test 2: Phone Numbers API
    try {
      await oauthService.getPhoneNumbers(cred.accessToken, cred.businessAccountId);
      console.log('  ✓ Phone Numbers API: OK');
    } catch (error) {
      console.log(`  ✗ Phone Numbers API: ${error.message}`);
    }
    
    // Test 3: Templates API
    try {
      await oauthService.getMessageTemplates(cred.accessToken, cred.businessAccountId);
      console.log('  ✓ Templates API: OK');
    } catch (error) {
      console.log(`  ✗ Templates API: ${error.message}`);
    }
    
    // Test 4: Token validity
    try {
      await oauthService.getBusinessAccountInfo(cred.accessToken, cred.businessAccountId);
      console.log('  ✓ Access Token: Valid');
    } catch (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        console.log('  ⚠ Access Token: Expired - Run refresh command');
      } else {
        console.log(`  ✗ Access Token: ${error.message}`);
      }
    }
  }
  console.log('');
}

async function commandSend(to, messageText, orgId) {
  console.log('\n=== Send Test Message ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts connected. Run "npm run whatsapp init" first.\n');
    return;
  }

  const cred = credentials.find(c => c.isDefault) || credentials[0];
  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  console.log(`Sending to: ${to}`);
  console.log(`Message: ${messageText}\n`);
  
  try {
    const phones = await oauthService.getPhoneNumbers(cred.accessToken, cred.businessAccountId);
    
    if (phones.length === 0) {
      console.log('No phone numbers available.\n');
      return;
    }
    
    const phoneNumberId = phones[0].id;
    console.log(`From: ${phones[0].phoneNumber}`);
    
    const result = await oauthService.sendMessage(
      cred.accessToken,
      phoneNumberId,
      to,
      { type: 'text', content: { body: messageText } }
    );
    console.log(`\n✓ Message sent successfully!`);
    console.log(`  Message ID: ${result.messageId}\n`);
  } catch (error) {
    console.log(`✗ Failed to send message: ${error.message}\n`);
  }
}

async function commandDisconnect(credentialId) {
  console.log('\n=== Disconnect Account ===\n');
  
  const credentials = await getCredentials();
  const cred = credentials.find(c => c.id === credentialId);
  
  if (!cred) {
    console.log('Account not found. Run "npm run whatsapp status" to see available accounts.\n');
    return;
  }
  
  console.log(`Disconnecting: ${cred.businessAccountName}`);
  console.log(`Business Account ID: ${cred.businessAccountId}\n`);
  
  await deleteCredential(credentialId);
  console.log('✓ Account disconnected successfully.\n');
}

async function commandReport(orgId) {
  console.log('\n=== WhatsApp Business Report ===\n');
  
  const credentials = await getCredentials(orgId);
  
  if (credentials.length === 0) {
    console.log('No accounts connected. Run "npm run whatsapp init" first.\n');
    return;
  }

  const config = validateConfig();
  const oauthService = new WhatsAppOAuthService(config);
  
  for (const cred of credentials) {
    console.log(`\nGenerating report for: ${cred.businessAccountName}`);
    console.log('...\n');
    
    try {
      const [accountInfo, phoneNumbers, templates, webhooks] = await Promise.allSettled([
        oauthService.getBusinessAccountInfo(cred.accessToken, cred.businessAccountId),
        oauthService.getPhoneNumbers(cred.accessToken, cred.businessAccountId),
        oauthService.getMessageTemplates(cred.accessToken, cred.businessAccountId),
        oauthService.getWebhookConfig(cred.accessToken, cred.businessAccountId)
      ]);
      
      console.log('=== Business Account ===');
      console.log(`  Name: ${accountInfo.value?.name || 'N/A'}`);
      console.log(`  ID: ${cred.businessAccountId}`);
      console.log(`  Namespace: ${accountInfo.value?.messageTemplateNamespace || 'N/A'}`);
      
      console.log('\n=== Phone Numbers ===');
      console.log(`  Total: ${phoneNumbers.value?.length || 0}`);
      if (phoneNumbers.value) {
        for (const phone of phoneNumbers.value) {
          console.log(`  - ${phone.phoneNumber} (${phone.verificationStatus}) [${phone.qualityScore || 'N/A'}]`);
        }
      }
      
      console.log('\n=== Message Templates ===');
      console.log(`  Total: ${templates.value?.length || 0}`);
      if (templates.value) {
        const approved = templates.value.filter(t => t.status === 'APPROVED').length;
        const pending = templates.value.filter(t => t.status === 'PENDING').length;
        const rejected = templates.value.filter(t => t.status === 'REJECTED').length;
        console.log(`  Approved: ${approved}`);
        console.log(`  Pending: ${pending}`);
        console.log(`  Rejected: ${rejected}`);
      }
      
      console.log('\n=== Webhooks ===');
      if (webhooks.value) {
        console.log(`  URL: ${webhooks.value.url}`);
        console.log(`  Fields: ${webhooks.value.fields.join(', ')}`);
      } else {
        console.log('  Not configured');
      }
      
      console.log('');
    } catch (error) {
      console.log(`✗ Error generating report: ${error.message}\n`);
    }
  }
}

// ============================================================
// CLI Entry Point
// ============================================================

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
WhatsApp OAuth Connection Script
===================================

Usage: node scripts/whatsapp-oauth-connection.js <command> [options]

Commands:
  init [options]       Initialize OAuth URL for connecting an account
  status              Check connection status
  accounts            List connected business accounts
  phones              List all phone numbers
  templates           List all message templates
  health              Run health check
  report              Generate comprehensive business report
  send <to> <msg>     Send a test message
  disconnect <id>     Disconnect a business account

Options:
  --orgId=<id>        Organization ID
  --to=<phone>        Recipient phone number (for send command)
  --message=<text>    Message text (for send command)

Examples:
  node scripts/whatsapp-oauth-connection.js init --orgId=org_123
  node scripts/whatsapp-oauth-connection.js status
  node scripts/whatsapp-oauth-connection.js phones --orgId=org_123
  node scripts/whatsapp-oauth-connection.js send --to=+1234567890 --message="Hello"
  `);
  process.exit(1);
}

// Parse options
const options = {};
for (const arg of args.slice(1)) {
  const [key, value] = arg.replace('--', '').split('=');
  options[key] = value;
}

const orgId = options.orgId;

async function main() {
  try {
    switch (command) {
      case 'init':
        await commandInit(orgId || 'default');
        break;
        
      case 'status':
        await commandStatus(orgId);
        break;
        
      case 'accounts':
        await commandAccounts(orgId);
        break;
        
      case 'phones':
        await commandPhones(orgId);
        break;
        
      case 'templates':
        await commandTemplates(orgId);
        break;
        
      case 'health':
        await commandHealth(orgId);
        break;
        
      case 'report':
        await commandReport(orgId);
        break;
        
      case 'send':
        const to = options.to || args[1];
        const message = options.message || args[2];
        if (!to || !message) {
          console.log('Error: --to and --message are required');
          console.log('Usage: node scripts/whatsapp-oauth-connection.js send --to=+1234567890 --message="Hello"');
          process.exit(1);
        }
        await commandSend(to, message, orgId);
        break;
        
      case 'disconnect':
        const credentialId = args[1] || options.id;
        if (!credentialId) {
          console.log('Error: Credential ID is required');
          console.log('Usage: node scripts/whatsapp-oauth-connection.js disconnect <credential-id>');
          console.log('Run "npm run whatsapp status" to see connected accounts');
          process.exit(1);
        }
        await commandDisconnect(credentialId);
        break;
        
      default:
        console.log(`Unknown command: ${command}`);
        console.log('Run without arguments to see available commands');
        process.exit(1);
    }
    
    // Close Prisma connection
    if (prisma) {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();
