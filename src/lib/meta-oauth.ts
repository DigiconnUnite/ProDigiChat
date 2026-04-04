/**
 * Meta OAuth Library
 * 
 * This module provides OAuth functionality for connecting to Meta's Facebook/WhatsApp API.
 * It handles authentication, token exchange, and fetching business account information.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/overview
 * @see https://developers.facebook.com/docs/facebook-login
 */

// =============================================================================
// TypeScript Interfaces
// =============================================================================

/**
 * Response from Meta OAuth token exchange
 */
export interface MetaAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  code?: string;
}

/**
 * Response from debug token endpoint
 */
export interface MetaDebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
}

/**
 * WhatsApp Business Account information
 */
export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
  primary_business_location?: string;
  account_review_status: string;
  business_type?: string;
  // Extended fields for internal use
  business_id?: string;
  business_name?: string;
}

/**
 * Phone number associated with a WABA account
 */
export interface WABAPhoneNumber {
  display_phone_number: string;
  phone_number_id: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
  status?: string;
}

/**
 * WABA Account with additional details
 */
export interface WABAAccount {
  id: string;
  name: string;
  phone_number: string;
  phone_number_id: string;
  business_id: string;
  business_name: string;
  quality_rating: string;
  messaging_limit: string;
  status: string;
  profile_picture_url?: string;
}

/**
 * Meta User information
 */
export interface MetaUser {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

// =============================================================================
// Configuration
// =============================================================================

import { META_API_VERSION, META_API_BASE, META_OAUTH_CONFIG as META_OAUTH, META_WHATSAPP_SCOPES } from './meta-config';

/**
 * Meta OAuth Configuration
 */
export const META_CONFIG = {
  appId: process.env.NEXT_PUBLIC_META_APP_ID || 'YOUR_FACEBOOK_APP_ID',
  appSecret: process.env.META_APP_SECRET || 'YOUR_APP_SECRET',
  redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/meta/callback',
  scopes: META_WHATSAPP_SCOPES,
  apiVersion: META_API_VERSION,
  configurationId: process.env.NEXT_PUBLIC_META_CONFIG_ID || '',
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generates a secure random state parameter for CSRF protection
 * @returns A cryptographically secure random string
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js environments without crypto
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds the Facebook OAuth URL for user authentication
 * @param state - CSRF protection state parameter
 * @returns The complete OAuth URL
 */
export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: META_CONFIG.redirectUri,
    scope: META_CONFIG.scopes.join(','),
    response_type: 'code',
    state: state,
    display: 'page',
    auth_type: 'rerequest',
    extras: JSON.stringify({
      setup: {
        [META_CONFIG.configurationId]: true,
      },
    }),
  });

  return `${META_OAUTH.authUrl}?${params.toString()}`;
}

/**
 * Builds the Embedded Signup URL for business account creation
 * @param state - CSRF protection state parameter
 * @returns The complete embedded signup URL
 */
export function buildEmbeddedSignupUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: META_CONFIG.redirectUri,
    config_id: META_CONFIG.configurationId,
    response_type: 'code',
    state: state,
    scope: META_CONFIG.scopes.join(','),
    extras: JSON.stringify({
      setup: {},
    }),
  });

  return `${META_OAUTH.authUrl}?${params.toString()}`;
}

// =============================================================================
// Token Exchange Functions
// =============================================================================

/**
 * Exchanges an authorization code for an access token
 * @param code - The authorization code from OAuth callback
 * @returns Promise resolving to the authentication response
 */
export async function exchangeCodeForToken(code: string): Promise<MetaAuthResponse> {
  try {
    const params = new URLSearchParams({
      client_id: META_CONFIG.appId,
      client_secret: META_CONFIG.appSecret,
      redirect_uri: META_CONFIG.redirectUri,
      code: code,
    });

    const response = await fetch(
      `${META_API_BASE}/oauth/access_token?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange code for token: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      expires_in: data.expires_in || 0,
      code: code,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
    throw new Error('Token exchange failed: Unknown error occurred');
  }
}

/**
 * Exchanges a short-lived access token for a long-lived token
 * @param shortLivedToken - The short-lived access token
 * @returns Promise resolving to the authentication response with long-lived token
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<MetaAuthResponse> {
  try {
    const params = new URLSearchParams({
      client_secret: META_CONFIG.appSecret,
      fb_exchange_token: shortLivedToken,
      access_token: shortLivedToken,
    });

    const response = await fetch(
      `${META_API_BASE}/oauth/access_token?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get long-lived token: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      expires_in: data.expires_in || 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Long-lived token exchange failed: ${error.message}`);
    }
    throw new Error('Long-lived token exchange failed: Unknown error occurred');
  }
}

/**
 * Validates an access token by calling the debug token endpoint
 * @param accessToken - The access token to validate
 * @returns Promise resolving to the debug token response
 */
export async function debugAccessToken(accessToken: string): Promise<MetaDebugTokenResponse> {
  try {
    const params = new URLSearchParams({
      input_token: accessToken,
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_API_BASE}/debug_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to debug access token: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.data?.is_valid) {
      throw new Error('Access token is invalid or has expired');
    }

    return data as MetaDebugTokenResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
    throw new Error('Token validation failed: Unknown error occurred');
  }
}

// =============================================================================
// Business Account Functions
// =============================================================================

/**
 * Fetches WhatsApp Business Accounts associated with the access token
 * @param accessToken - The long-lived access token
 * @returns Promise resolving to an array of WhatsApp Business Accounts
 */
export async function getWABAAccounts(accessToken: string): Promise<WhatsAppBusinessAccount[]> {
  try {
    // First, get all WhatsApp Business Accounts directly
    // This endpoint returns WABA accounts associated with the user's WhatsApp business management access
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,currency,timezone_id,message_template_namespace,primary_business_location,account_review_status,business_type',
    });

    // Try to fetch WABA directly - this is the correct endpoint for WhatsApp Business Accounts
    const response = await fetch(
      `${META_API_BASE}/me/wa_businesses?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      // If direct WABA endpoint fails, try businesses endpoint as fallback
      console.log('Direct WABA endpoint failed, trying businesses fallback:', error.error?.message);
      
      const businessParams = new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,whatsapp_business_accounts{id,name,currency,timezone_id,message_template_namespace,primary_business_location,account_review_status,business_type}',
      });

      const businessResponse = await fetch(
        `${META_API_BASE}/me/businesses?${businessParams.toString()}`
      );

      if (!businessResponse.ok) {
        const bizError = await businessResponse.json();
        throw new Error(`Failed to fetch business accounts: ${bizError.error?.message || 'Unknown error'}`);
      }

      const bizData = await businessResponse.json();
      
      if (!bizData.data || !Array.isArray(bizData.data)) {
        return [];
      }

      // Extract WABA from nested business accounts
      const wabaAccounts: WhatsAppBusinessAccount[] = [];
      for (const business of bizData.data) {
        if (business.whatsapp_business_accounts?.data) {
          for (const waba of business.whatsapp_business_accounts.data) {
            wabaAccounts.push({
              id: waba.id,
              name: waba.name,
              currency: waba.currency,
              timezone_id: waba.timezone_id,
              message_template_namespace: waba.message_template_namespace,
              primary_business_location: waba.primary_business_location,
              account_review_status: waba.account_review_status,
              business_type: waba.business_type,
              business_id: business.id, // Store the business ID for phone number fetching
              business_name: business.name,
            });
          }
        }
      }
      
      console.log('Fetched WABA accounts from businesses fallback:', wabaAccounts.length);
      return wabaAccounts;
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    console.log('Fetched WABA accounts directly:', data.data.length);
    return data.data as WhatsAppBusinessAccount[];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fetching WABA accounts failed: ${error.message}`);
    }
    throw new Error('Fetching WABA accounts failed: Unknown error occurred');
  }
}

/**
 * Fetches phone numbers for a specific WABA account
 * @param wabaId - The WhatsApp Business Account ID
 * @param accessToken - The access token
 * @returns Promise resolving to phone numbers data
 */
export async function getPhoneNumbers(wabaId: string, accessToken: string): Promise<any> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'id,display_phone_number,phone_number_id,verified_name,code_verification_status,quality_rating,status,name_status,certificate,last_onboarded_time,messaging_limit_tier',
    });

    console.log(`Fetching phone numbers for WABA ID: ${wabaId}`);
    
    const response = await fetch(
      `${META_API_BASE}/${wabaId}/phone_numbers?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Phone numbers fetch error:', error);
      throw new Error(`Failed to fetch phone numbers: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`Found ${data.data?.length || 0} phone numbers for WABA ${wabaId}`);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fetching phone numbers failed: ${error.message}`);
    }
    throw new Error('Fetching phone numbers failed: Unknown error occurred');
  }
}

/**
 * Fetches the authenticated user's Meta information
 * @param accessToken - The access token
 * @returns Promise resolving to the user information
 */
export async function getMetaUserInfo(accessToken: string): Promise<MetaUser> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'id,name,email,picture',
    });

    const response = await fetch(
      `${META_API_BASE}/me?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch user info: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      picture: data.picture,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fetching user info failed: ${error.message}`);
    }
    throw new Error('Fetching user info failed: Unknown error occurred');
  }
}

// =============================================================================
// Additional Helper Functions
// =============================================================================

/**
 * Gets the full URL for the Meta Graph API
 * @param endpoint - The API endpoint
 * @returns The complete URL
 */
export function getGraphApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${META_API_BASE}/${cleanEndpoint}`;
}

/**
 * Makes an authenticated request to the Meta Graph API
 * @param endpoint - The API endpoint
 * @param accessToken - The access token
 * @param method - HTTP method (default: GET)
 * @param body - Optional request body
 * @returns Promise resolving to the response data
 */
export async function makeGraphApiRequest(
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    const url = `${getGraphApiUrl(endpoint)}?${params.toString()}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API request failed: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Graph API request failed: ${error.message}`);
    }
    throw new Error('Graph API request failed: Unknown error occurred');
  }
}

/**
 * Gets the business account linked to a WhatsApp Business Account
 * @param wabaId - The WhatsApp Business Account ID
 * @param accessToken - The access token
 * @returns Promise resolving to business account data
 */
export async function getLinkedBusinessAccount(wabaId: string, accessToken: string): Promise<any> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'linked商业账户',
    });

    const response = await fetch(
      `${META_API_BASE}/${wabaId}?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch linked business: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fetching linked business failed: ${error.message}`);
    }
    throw new Error('Fetching linked business failed: Unknown error occurred');
  }
}
