/**
 * Centralized Meta API configuration
 * 
 * Meta deprecated v17.0, v18.0 in early 2025.
 * Current supported versions: v21.0, v22.0, v23.0
 *
 * Use META_API_VERSION environment variable to override,
 * defaults to v22.0 (latest stable as of early 2026)
 */

export const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';
export const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Meta OAuth endpoints
 */
export const META_OAUTH_CONFIG = {
  authUrl: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`,
  tokenUrl: `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`,
  graphApiBase: META_API_BASE,
};

/**
 * Meta API scopes required for WhatsApp business management
 */
export const META_WHATSAPP_SCOPES = [
  'whatsapp_business_management',
  'whatsapp_business_messaging',
  'business_management',
];
