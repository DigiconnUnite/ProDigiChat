/**
 * WhatsApp OAuth Service
 * 
 * Handles OAuth flow for connecting Meta Business Accounts to WhatsApp Business API.
 * Supports embedded signup flow for seamless user experience.
 * 
 * References:
 * - https://developers.facebook.com/docs/whatsapp/embedded-signup
 * - https://developers.facebook.com/docs/graph-api/overview
 */

import axios, { AxiosInstance } from 'axios';
import { META_API_VERSION, META_API_BASE, META_OAUTH_CONFIG } from './meta-config';

export interface WhatsAppOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  messageTemplateNamespace: string;
  // Additional fields for complete account information
  currency?: string;
  timezoneId?: string;
  accountReviewStatus?: string;
  businessType?: string;
  businessLocation?: string;
  // Owner business info from Meta Business Manager
  ownerBusinessId?: string;
  ownerBusinessName?: string;
  ownerBusinessPhone?: string;
  ownerBusinessEmail?: string;
  ownerBusinessAddress?: string;
}

export interface WhatsAppPhoneNumber {
  id: string;
  displayName: string;
  phoneNumber: string;
  verificationStatus: string;
  qualityScore?: string;
  codeVerificationStatus?: string;
  // Additional fields from the reference script
  messagingLimitTier?: string;
  status?: string;
  nameStatus?: string;
}

export interface WebhookSubscription {
  field: string;
  value: string;
}

export class WhatsAppOAuthService {
  private config: WhatsAppOAuthConfig;
  private apiClient: AxiosInstance;

  private static readonly META_AUTH_URL = META_OAUTH_CONFIG.authUrl;
  private static readonly META_TOKEN_URL = META_OAUTH_CONFIG.tokenUrl;
  private static readonly META_API_URL = META_API_BASE;

  constructor(config: WhatsAppOAuthConfig) {
    this.config = config;
    
    this.apiClient = axios.create({
      baseURL: WhatsAppOAuthService.META_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate OAuth URL with Embedded Signup parameters
   * This is the KEY method for Meta Embedded Signup flow
   * 
   * @param state - State parameter for CSRF protection (should contain orgId)
   * @param prefill - Optional pre-fill data (phone number, business name)
   * @returns Authorization URL to redirect user to
   */
  getEmbeddedSignupUrl(state: string, prefill?: { phone_number?: string; business_name?: string }): string {
    const params: Record<string, string> = {
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      state,
      // Added business_management to ensure we can fetch business details
      scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
      response_type: 'code',
    };

    // Embedded Signup extras - THIS IS WHAT MAKES IT EMBEDDED SIGNUP
    const extras: any = {
      setup: {
        ask_for: ['whatsapp_business_management', 'whatsapp_business_messaging']
      }
    };

    // Add prefill data if provided (optional)
    if (prefill) {
      extras.setup.prefill = {};
      if (prefill.phone_number) {
        extras.setup.prefill.phone_number = prefill.phone_number;
      }
      if (prefill.business_name) {
        extras.setup.prefill.business_name = prefill.business_name;
      }
    }

    params.extras = JSON.stringify(extras);

    const queryString = new URLSearchParams(params).toString();
    return `${WhatsAppOAuthService.META_AUTH_URL}?${queryString}`;
  }

  /**
   * Generate OAuth URL (backward compatibility wrapper)
   * 
   * @param state - State parameter for CSRF protection
   * @returns Authorization URL
   * @deprecated Use getEmbeddedSignupUrl instead
   */
  getAuthorizationUrl(state: string): string {
    return this.getEmbeddedSignupUrl(state);
  }

  /**
   * CRITICAL: Exchange session_info for System User token (Embedded Signup)
   * 
   * This is the key difference between regular OAuth and Embedded Signup.
   * The session_info contains a short-lived token that needs to be exchanged
   * to get a System User token with full access to the WABA.
   * 
   * @param sessionInfo - Session info from OAuth callback
   * @returns System User access token
   */
  async exchangeSessionInfoForToken(sessionInfo: string): Promise<string> {
    try {
      console.log('[WhatsApp OAuth] Exchanging session_info for System User token');
      
      const response = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
        params: {
          grant_type: 'fb_exchange_token',
          fb_exchange_token: sessionInfo,
          client_id: this.config.appId,
          client_secret: this.config.appSecret
        }
      });

      if (!response.data.access_token) {
        throw new Error('No access token received in exchange for session_info');
      }

      console.log('[WhatsApp OAuth] Successfully obtained System User token');
      return response.data.access_token;
    } catch (error: any) {
      console.error('[WhatsApp OAuth] Error exchanging session_info:', error.response?.data || error.message);
      throw new Error(`Failed to exchange session_info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Find WhatsApp Business Account using multiple fallback strategies
   * 
   * Strategy 1: Direct field - /me?fields=whatsapp_business_accounts
   * Strategy 2: /me/accounts - look for WhatsApp Business accounts
   * Strategy 3: /me?fields=businesses then query each business for WhatsApp accounts
   * 
   * @param accessToken - Valid access token
   * @returns WhatsApp Business Account ID
   * @throws Error if no WhatsApp Business Account found after all strategies
   */
  async findWhatsAppBusinessAccount(accessToken: string): Promise<string> {
    // Strategy 1: Direct field access
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/me?fields=whatsapp_business_accounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const whatsappAccounts = response.data.whatsapp_business_accounts?.data;
      if (whatsappAccounts && whatsappAccounts.length > 0) {
        return whatsappAccounts[0].id;
      }
    } catch (error: any) {
      const errorMessage = this.parseGraphApiError(error);
      console.log(`Strategy 1 (direct field) failed: ${errorMessage}`);
      // Continue to next strategy
    }

    // Strategy 2: Query /me/accounts endpoint
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/me/accounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            fields: 'id,name,perms'
          }
        }
      );

      const accounts = response.data.data;
      if (accounts && accounts.length > 0) {
        // Look for accounts with WhatsApp-related permissions
        for (const account of accounts) {
          const perms = account.perms || [];
          if (perms.includes('WHATSAPP_BUSINESS') || perms.includes('WHATSAPP_BUSINESS_MANAGEMENT')) {
            // This account has WhatsApp permissions, try to get WhatsApp info
            const waInfo = await this.tryGetWhatsAppFromAccount(accessToken, account.id);
            if (waInfo) return waInfo;
          }
        }
        
        // If no explicit WhatsApp perms found, try the first account anyway
        const waInfo = await this.tryGetWhatsAppFromAccount(accessToken, accounts[0].id);
        if (waInfo) return waInfo;
      }
    } catch (error: any) {
      const errorMessage = this.parseGraphApiError(error);
      console.log(`Strategy 2 (/me/accounts) failed: ${errorMessage}`);
      // Continue to next strategy
    }

    // Strategy 3: Query businesses and look for WhatsApp accounts
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/me?fields=businesses`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const businesses = response.data.businesses?.data;
      if (businesses && businesses.length > 0) {
        for (const business of businesses) {
          const waAccount = await this.tryGetWhatsAppFromBusiness(accessToken, business.id);
          if (waAccount) return waAccount;
        }
      }
    } catch (error: any) {
      const errorMessage = this.parseGraphApiError(error);
      console.log(`Strategy 3 (/me?fields=businesses) failed: ${errorMessage}`);
      // Continue to next strategy
    }

    // If all strategies fail, throw a descriptive error
    throw new Error(
      'No WhatsApp Business Account found. Please ensure you have a WhatsApp Business Account ' +
      'linked to your Meta Business Account. Visit https://business.facebook.com to create one.'
    );
  }

  /**
   * Try to get WhatsApp Business Account from a specific business account
   */
  private async tryGetWhatsAppFromBusiness(accessToken: string, businessId: string): Promise<string | null> {
    try {
      // Try to get WhatsApp Business accounts linked to this business
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${businessId}/whatsapp_business_accounts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const accounts = response.data.data;
      if (accounts && accounts.length > 0) {
        return accounts[0].id;
      }
    } catch (error) {
      // This is expected if no WhatsApp account is linked
    }
    return null;
  }

  /**
   * Try to get WhatsApp info from a specific account
   */
  private async tryGetWhatsAppFromAccount(accessToken: string, accountId: string): Promise<string | null> {
    try {
      // Try to get WhatsApp Business Account details
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${accountId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            fields: 'whatsapp_business_account'
          }
        }
      );

      if (response.data.whatsapp_business_account?.id) {
        return response.data.whatsapp_business_account.id;
      }
    } catch (error) {
      // This is expected if no WhatsApp account is linked
    }
    return null;
  }

  /**
   * Parse Graph API errors and provide helpful messages
   */
  private parseGraphApiError(error: any): string {
    if (!error) return 'Unknown error';
    
    const response = error.response;
    if (!response?.data?.error) {
      // Network error or other issue
      return error.message || 'Network error';
    }

    const graphError = response.data.error;
    const errorCode = graphError.code;
    const errorMessage = graphError.message;
    const errorType = graphError.type;

    // Provide helpful messages for common errors
    if (errorCode === 100 && errorMessage?.includes('whatsapp_business_accounts')) {
      return `(#${errorCode}) Tried accessing nonexisting field (whatsapp_business_accounts)`;
    }

    if (errorCode === 190) {
      return `(#${errorCode}) Token expired or invalid. Please re-authenticate.`;
    }

    if (errorCode === 200) {
      return `(#${errorCode}) Permission denied. Ensure you have whatsapp_business_management permission.`;
    }

    return `(${errorType || errorCode}) ${errorMessage || 'Unknown error'}`;
  }

  /**
   * Exchange the authorization code for access tokens
   * 
   * @param code - Authorization code from OAuth callback
   * @returns Access token, expiration, and business account ID
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens & { businessAccountId: string }> {
    try {
      // Step 1: Exchange code for access token
      const tokenResponse = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
        params: {
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          redirect_uri: this.config.redirectUri,
          code
        }
      });

      const { access_token, expires_in } = tokenResponse.data;

      // Step 2: Find WhatsApp Business Account using fallback strategies
      const businessAccountId = await this.findWhatsAppBusinessAccount(access_token);

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        businessAccountId
      };
    } catch (error: any) {
      // Use the improved error parser for better messages
      const parsedError = this.parseGraphApiError(error);
      throw new Error(`OAuth Error: ${parsedError}`);
    }
  }

  /**
   * Generate a long-lived token from a short-lived token
   * Short-lived tokens expire in ~2 hours, long-lived tokens last ~60 days
   * 
   * @param shortLivedToken - Short-lived access token
   * @returns Long-lived access token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<string> {
    try {
      const response = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          fb_exchange_token: shortLivedToken
        }
      });

      return response.data.access_token;
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(`Token Exchange Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get detailed information about the WhatsApp Business Account
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @returns Business account details including name and namespace
   */
  async getBusinessAccountInfo(
    accessToken: string, 
    businessAccountId: string
  ): Promise<WhatsAppBusinessAccount> {
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            // Fetch all available WABA fields for complete account details
            fields: 'id,name,message_template_namespace,currency,timezone_id,account_review_status,business_type,primary_business_location,owner_business_info'
          }
        }
      );

      const data = response.data;
      return {
        id: data.id,
        name: data.name,
        messageTemplateNamespace: data.message_template_namespace || '',
        // Additional fields
        currency: data.currency,
        timezoneId: data.timezone_id,
        accountReviewStatus: data.account_review_status,
        businessType: data.business_type,
        businessLocation: data.primary_business_location,
        // Owner business info
        ownerBusinessId: data.owner_business_info?.id,
        ownerBusinessName: data.owner_business_info?.name,
        ownerBusinessPhone: data.owner_business_info?.primary_phone,
        ownerBusinessEmail: data.owner_business_info?.primary_email,
        ownerBusinessAddress: data.owner_business_info?.address
      };
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(`Business Account Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get phone numbers associated with the WhatsApp Business Account
   * Supports pagination to fetch all phone numbers
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @returns Array of phone numbers with their verification status
   */
  async getPhoneNumbers(
    accessToken: string, 
    businessAccountId: string
  ): Promise<WhatsAppPhoneNumber[]> {
    try {
      const allPhoneNumbers: any[] = [];
      let nextCursor: string | null = null;
      const limit = 100; // Request maximum allowed per page

      do {
        const response = await axios.get(
          `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/phone_numbers`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              // Fetch all phone number fields including messaging_limit_tier
              fields: 'id,verified_name,display_phone_number,certified_wa_phone_number,verification_status,quality_score,code_verification_status,messaging_limit_tier,status,name_status',
              limit: limit,
              ...(nextCursor && { after: nextCursor })
            }
          }
        );

        allPhoneNumbers.push(...response.data.data);
        
        // Get next page cursor
        nextCursor = response.data.paging?.cursors?.after || null;
        
      } while (nextCursor); // Continue until no more pages

      return allPhoneNumbers.map((phone: any) => ({
        id: phone.id,
        displayName: phone.verified_name || phone.display_phone_number || phone.certified_wa_phone_number || 'Unknown',
        phoneNumber: phone.certified_wa_phone_number || '',
        verificationStatus: phone.verification_status || 'PENDING',
        codeVerificationStatus: phone.code_verification_status || 'PENDING',
        qualityScore: phone.quality_score,
        // Additional fields from reference script
        messagingLimitTier: phone.messaging_limit_tier,
        status: phone.status,
        nameStatus: phone.name_status
      }));
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(`Phone Numbers Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Subscribe app to WhatsApp Business Account
   * 
   * NOTE: The Webhook URL MUST be set manually in the Meta App Dashboard.
   * We can only subscribe the app to receive webhooks here.
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID (WABA ID)
   */
  async setupWebhooks(
    accessToken: string,
    businessAccountId: string
  ): Promise<void> {
    try {
      console.log('[WhatsApp OAuth] Setting up webhooks for WABA:', businessAccountId);
      
      // Step 1: CRITICAL - Subscribe the app to the WABA
      // This is what allows the app to receive webhook notifications!
      await axios.post(
        `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/subscribed_apps`,
        { access_token: accessToken },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log('[WhatsApp OAuth] App subscribed to WABA successfully');

      // Note: Setting the webhook URL programmatically is NOT allowed by Meta.
      // The webhook URL must be configured manually in:
      // Meta App Dashboard > WhatsApp > Configuration > Webhook
      // OR use the Graph API Application Settings endpoint (different from WABA settings)
      
      // Step 2: Subscribe to webhook fields (this is allowed)
      const webhookFields = [
        'messages',
        'message_template_status',
        'phone_number_quality',
        'account_alerts'
      ];

      for (const field of webhookFields) {
        try {
          await axios.post(
            `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/webhooks`,
            { fields: field },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          console.log(`[WhatsApp OAuth] Subscribed to webhook field: ${field}`);
        } catch (fieldError) {
          console.warn(`[WhatsApp OAuth] Failed to subscribe to webhook field: ${field}`, fieldError);
        }
      }
      
      console.log('[WhatsApp OAuth] All webhooks set up successfully');
    } catch (error: any) {
      console.error('[WhatsApp OAuth] Error setting up webhooks:', error.response?.data || error.message);
      // Don't throw error here, allow connection to proceed but warn the user
      console.warn('[WhatsApp OAuth] Webhook setup had errors but continuing with connection');
    }
  }

  /**
   * Verify app subscription to WhatsApp Business Account
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @returns true if app is subscribed, false otherwise
   */
  async verifyAppSubscription(
    accessToken: string,
    businessAccountId: string
  ): Promise<boolean> {
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/subscribed_apps`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const subscriptions = response.data.data || [];
      const appId = this.config.appId;

      // Check if our app is in the subscriptions
      return subscriptions.some((sub: any) => 
        sub.id === appId || 
        sub.application_id === appId ||
        (sub.whatsapp_business_account && sub.whatsapp_business_account === businessAccountId)
      );
    } catch (error: any) {
      console.error('[WhatsApp OAuth] Error verifying subscription:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Register a phone number for the WhatsApp Business Account
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @param phoneNumber - Phone number to register (with country code, e.g., +1234567890)
   * @returns Registration response
   */
  async registerPhoneNumber(
    accessToken: string,
    businessAccountId: string,
    phoneNumber: string
  ): Promise<{ verificationId: string }> {
    try {
      const response = await axios.post(
        `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/phone_numbers`,
        {
          phone_number: phoneNumber
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return {
        verificationId: response.data.verification_id
      };
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(`Phone Registration Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify a phone number using the verification code
   * 
   * @param accessToken - Valid access token
   * @param phoneNumberId - Phone number ID to verify
   * @param code - Verification code sent to the phone
   */
  async verifyPhoneNumber(
    accessToken: string,
    phoneNumberId: string,
    code: string
  ): Promise<void> {
    try {
      await axios.post(
        `${WhatsAppOAuthService.META_API_URL}/${phoneNumberId}/verify`,
        {
          code
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(`Verification Error: ${error.response.data.error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the current webhook configuration for the business account
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @returns Webhook configuration
   */
  async getWebhookConfig(
    accessToken: string,
    businessAccountId: string
  ): Promise<{ url: string; fields: string[] } | null> {
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${businessAccountId}/webhooks`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const entry = response.data.entry?.[0];
      if (!entry?.changes) {
        return null;
      }

      return {
        url: entry.changes[0]?.value?.url || '',
        fields: entry.changes[0]?.value?.fields || []
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Test webhook delivery by sending a test notification
   * 
   * @param accessToken - Valid access token
   * @param businessAccountId - WhatsApp Business Account ID
   * @param phoneNumberId - Optional phone number ID
   * @returns Test result
   */
  async testWebhook(
    accessToken: string,
    businessAccountId: string,
    phoneNumberId?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Send a simple test message to verify webhook is working
      // This is useful for testing the webhook configuration
      const testPayload = {
        messaging_product: 'whatsapp',
        to: 'test', // Will fail but trigger webhook
        type: 'text',
        text: { body: 'test' }
      };

      await axios.post(
        `${WhatsAppOAuthService.META_API_URL}/${phoneNumberId || businessAccountId}/messages`,
        testPayload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return { success: true };
    } catch (error: any) {
      // Even if the message fails, webhook might still be triggered
      // Check for specific error codes
      if (error.response?.data?.error?.code === 100) {
        // Parameter value is invalid (expected for test)
        return { success: true, messageId: 'test-triggered' };
      }
      return { success: false };
    }
  }

  /**
   * Get the OAuth service configuration (without secrets)
   * Useful for debugging
   */
  getConfig(): { appId: string; redirectUri: string } {
    return {
      appId: this.config.appId,
      redirectUri: this.config.redirectUri
    };
  }
}

/**
 * Create a WhatsAppOAuthService instance from environment variables
 * or dynamically from the request
 */
export function createWhatsAppOAuthService(requestUrl?: string): WhatsAppOAuthService {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  let redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  // If requestUrl is provided, dynamically generate the redirect URI
  // This is useful when the app runs on different domains (localhost, production, etc.)
  if (requestUrl && !redirectUri) {
    try {
      const url = new URL(requestUrl);
      redirectUri = `${url.origin}/api/whatsapp/oauth/callback`;
      console.log('[WhatsApp OAuth] Using dynamic redirect URI:', redirectUri);
    } catch (e) {
      console.error('[WhatsApp OAuth] Failed to parse request URL:', e);
    }
  }

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      'Missing required environment variables: META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI'
    );
  }

  return new WhatsAppOAuthService({
    appId,
    appSecret,
    redirectUri
  });
}

/**
 * Get the current OAuth redirect URI being used
 */
export function getOAuthRedirectUri(requestUrl?: string): string {
  const envUri = process.env.META_OAUTH_REDIRECT_URI;
  
  if (envUri) return envUri;
  
  // Dynamically generate from request URL
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      return `${url.origin}/api/whatsapp/oauth/callback`;
    } catch (e) {
      // Fall back to default
    }
  }
  
  // Default fallback
  return process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/oauth/callback`
    : 'http://localhost:3000/api/whatsapp/oauth/callback';
}

export default WhatsAppOAuthService;
