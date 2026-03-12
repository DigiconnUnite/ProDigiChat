# Meta Embedded Signup Implementation Guide

## WhatsApp Marketing Tool - Technical Implementation

**Document Version:** 2.0  
**Date:** March 6, 2026  
**Status:** Implementation Required

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Meta Embedded Signup Flow](#meta-embedded-signup-flow)
4. [Required API Endpoints](#required-api-endpoints)
5. [Database Schema Changes](#database-schema-changes)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Integration](#frontend-integration)
8. [Error Handling & Retry Mechanisms](#error-handling--retry-mechanisms)
9. [Security Best Practices](#security-best-practices)
10. [Testing Procedures](#testing-procedures)
11. [Common Pitfalls & Troubleshooting](#common-pitfalls--troubleshooting)
12. [File-by-File Implementation Checklist](#file-by-file-implementation-checklist)

---

## 1. Executive Summary

This document provides a comprehensive technical guide to implementing Meta Embedded Signup for the WhatsApp Marketing Tool. Embedded Signup is the industry-standard approach used by successful SaaS platforms like AiSensy, WATI, and Meessage to automate the WhatsApp Business Account (WABA) creation process.

### Why Embedded Signup?

| Approach | Pros | Cons |
|----------|------|------|
| **Manual OAuth** | Simple | User must already have WABA, no automation |
| **Embedded Signup** | Fully automated, Business creation, WABA setup, Phone verification | More complex implementation |
| **API Setup** | Full control | Requires manual token generation, complex |

Embedded Signup handles everything automatically:
- ✅ Meta Business Account creation (if needed)
- ✅ WhatsApp Business Account (WABA) creation
- ✅ Phone number registration & verification
- ✅ Webhook subscription
- ✅ System User generation

---

## 2. Current System Analysis

### Issues Identified

| # | Issue | Severity | Current Location |
|---|-------|----------|------------------|
| 1 | Missing session_info handling | CRITICAL | `src/app/api/whatsapp/oauth/callback/route.ts` |
| 2 | Wrong webhook subscription endpoint | CRITICAL | `src/lib/whatsapp-oauth.ts` |
| 3 | No API to fetch all WhatsApp accounts | HIGH | Missing endpoint |
| 4 | No API for account details selection | HIGH | Missing endpoint |
| 5 | No pre-fill data support | MEDIUM | `src/lib/whatsapp-oauth.ts` |
| 6 | No subscription verification in health check | MEDIUM | `src/app/api/whatsapp/health/check/route.ts` |

### Current OAuth Flow (Broken)

```
User clicks "Connect WhatsApp"
        |
        v
Redirect to Meta OAuth (code-based)
        |
        v
User approves permissions
        |
        v
Meta redirects with CODE only
        |
        v
Backend exchanges code → token
        |
        v
ERROR: Missing session_info for embedded signup!
        |
        v
Business/WABA not created automatically
```

### Required Embedded Signup Flow

```
User clicks "Connect WhatsApp"
        |
        v
Redirect to Meta OAuth with setup params
        |
        v
User logs into Facebook / completes verification
        |
        v
Meta redirects with CODE + SESSION_INFO
        |
        v
Backend exchanges session_info → System User token
        |
        v
Fetch/Create Business Account
        |
        v
Fetch/Create WABA
        |
        v
Register & Verify Phone Number
        |
        v
Subscribe to Webhooks
        |
        v
Save credentials in DB
        |
        v
WhatsApp connected successfully
```

---

## 3. Meta Embedded Signup Flow

### 3.1 OAuth Authorization URL

Meta Embedded Signup requires special parameters in the OAuth URL:

```typescript
// Required parameters for Embedded Signup
const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');

authUrl.searchParams.set('client_id', META_APP_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging');

// CRITICAL: Embedded Signup extra parameters
authUrl.searchParams.set('extras', JSON.stringify({
  setup: {
    ask_for: [
      'whatsapp_business_management',
      'whatsapp_business_messaging'
    ],
    // Optional: Pre-fill data
    prefill: {
      phone_number: '+1234567890',  // Format: +[country_code][number]
      business_name: 'My Business'
    }
  }
}));

return authUrl.toString();
```

### 3.2 OAuth Callback Handling

The callback URL contains TWO critical parameters:

```typescript
// Callback URL format:
// https://your-app.com/api/whatsapp/oauth/callback?code=XXX&session_info=YYY&state=ZZZ

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // 1. Authorization code (for user permissions)
  const code = searchParams.get('code');
  
  // 2. CRITICAL: Session info (for embedded signup - System User token)
  const sessionInfo = searchParams.get('session_info');
  
  // 3. State for CSRF protection
  const state = searchParams.get('state');
  
  // For embedded signup, we need session_info
  if (sessionInfo) {
    // Exchange session_info for System User access token
    const systemUserToken = await exchangeSessionInfoForToken(sessionInfo);
  }
}
```

### 3.3 Exchanging Session Info for Token

```typescript
async function exchangeSessionInfoForToken(sessionInfo: string): Promise<string> {
  // This is the CRITICAL step that creates the System User
  const response = await axios.post(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    null,
    {
      params: {
        grant_type: 'fb_exchange_token',
        fb_exchange_token: sessionInfo,  // session_info from callback
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET
      }
    }
  );
  
  // This token is a SYSTEM USER token with full WABA access
  return response.data.access_token;
}
```

### 3.4 Complete Embedded Signup Flow

```typescript
async function completeEmbeddedSignup(code: string, sessionInfo: string, orgId: string) {
  // Step 1: Get user access token (short-lived)
  const userTokenResponse = await axios.get(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code
      }
    }
  );
  const userAccessToken = userTokenResponse.data.access_token;

  // Step 2: Exchange for System User token (using session_info)
  // This is what makes it "Embedded Signup" vs regular OAuth
  const systemUserResponse = await axios.get(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    {
      params: {
        grant_type: 'fb_exchange_token',
        fb_exchange_token: sessionInfo,  // KEY DIFFERENCE!
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET
      }
    }
  );
  const systemUserToken = systemUserResponse.data.access_token;

  // Step 3: Get long-lived token (59 days)
  const longLivedToken = await getLongLivedToken(systemUserToken);

  // Step 4: Find or create Business Account
  const businessAccount = await findOrCreateBusinessAccount(longLivedToken);

  // Step 5: Find or create WABA
  const waba = await findOrCreateWABA(longLivedToken, businessAccount.id);

  // Step 6: Get phone numbers
  const phoneNumbers = await getPhoneNumbers(longLivedToken, waba.id);

  // Step 7: Subscribe to webhooks
  await subscribeToWebhooks(longLivedToken, waba.id);

  // Step 8: Save to database
  await saveCredentials(orgId, {
    accessToken: longLivedToken,
    businessAccountId: businessAccount.id,
    wabaId: waba.id,
    phoneNumbers: phoneNumbers
  });

  return { success: true };
}
```

---

## 4. Required API Endpoints

### 4.1 New Endpoint Structure

```
/api/whatsapp/
├── /embedded/
│   ├── /init          POST   - Initialize embedded signup URL
│   ├── /callback      GET    - Handle OAuth callback with session_info
│   └── /status        GET    - Check signup status
├── /accounts/
│   ├── /list          GET    - List all accessible WhatsApp accounts
│   └── /[id]/details  GET    - Get account details
├── /phone-numbers/
│   ├── /register      POST   - Register new phone number
│   ├── /verify        POST   - Verify phone with code
│   └── /list          GET    - List phone numbers
├── /webhooks/
│   ├── /subscribe     POST   - Subscribe to WABA
│   └── /verify        GET    - Verify subscription
```

### 4.2 Endpoint: Initialize Embedded Signup

```typescript
// POST /api/whatsapp/embedded/init
// Creates OAuth URL with embedded signup parameters

export async function POST(request: NextRequest) {
  const { orgId, prefill } = await request.json();
  
  // Generate state with orgId and timestamp
  const state = Buffer.from(JSON.stringify({
    orgId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString('hex')
  })).toString('base64');

  // Build OAuth URL with Embedded Signup parameters
  const params = {
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_OAUTH_REDIRECT_URI,
    state,
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
    response_type: 'code',
    extras: JSON.stringify({
      setup: {
        ask_for: [
          'whatsapp_business_management',
          'whatsapp_business_messaging'
        ],
        // Pre-fill optional data
        ...(prefill && { prefill: prefill })
      }
    })
  };

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${new URLSearchParams(params)}`;

  return NextResponse.json({ 
    url: authUrl,
    state,
    expiresIn: 600 // 10 minutes
  });
}
```

### 4.3 Endpoint: Handle Embedded Signup Callback

```typescript
// GET /api/whatsapp/embedded/callback
// Handles OAuth callback with session_info for embedded signup

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const code = searchParams.get('code');
  const sessionInfo = searchParams.get('session_info');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Validate state
  const stateData = decodeState(state);
  
  // Handle OAuth errors
  if (error) {
    return handleOAuthError(error, errorDescription, stateData.orgId);
  }

  try {
    // CRITICAL: Exchange session_info for System User token
    let accessToken;
    
    if (sessionInfo) {
      // Embedded Signup flow - use session_info
      accessToken = await exchangeSessionInfoForToken(sessionInfo);
    } else {
      // Fallback: Regular OAuth (user already has WABA)
      accessToken = await exchangeCodeForToken(code);
    }

    // Get long-lived token
    const longLivedToken = await getLongLivedToken(accessToken);

    // Fetch Business Account
    const businessAccount = await getOrCreateBusinessAccount(longLivedToken);

    // Fetch WABA
    const waba = await getOrCreateWABA(longLivedToken, businessAccount.id);

    // Get Phone Numbers
    const phoneNumbers = await getPhoneNumbers(longLivedToken, waba.id);

    // Subscribe to Webhooks (CRITICAL FIX!)
    await subscribeToWABA(longLivedToken, waba.id);

    // Save credentials
    await saveWhatsAppCredentials(stateData.orgId, {
      accessToken: longLivedToken,
      businessAccountId: businessAccount.id,
      businessAccountName: businessAccount.name,
      wabaId: waba.id,
      phoneNumbers,
      connectionType: 'embedded_signup'
    });

    return NextResponse.redirect(`${BASE_URL}/dashboard/settings?whatsapp=connected`);
    
  } catch (error) {
    console.error('Embedded signup error:', error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/settings?whatsapp=error&message=${encodeURIComponent(error.message)}`
    );
  }
}
```

### 4.4 Endpoint: List WhatsApp Accounts

```typescript
// GET /api/whatsapp/accounts/list
// Returns all accessible WhatsApp accounts (owned + client-shared)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  
  const credential = await getWhatsAppCredential(orgId);
  const accessToken = credential.accessToken;

  // Fetch owned WhatsApp Business Accounts
  const ownedResponse = await axios.get(
    'https://graph.facebook.com/v18.0/me',
    {
      params: {
        fields: 'whatsapp_business_accounts{id,name,message_template_namespace,phone_numbers}'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  // Fetch client-shared accounts
  const clientResponse = await axios.get(
    'https://graph.facebook.com/v18.0/me/businesses',
    {
      params: {
        fields: 'whatsapp_business_accounts{id,name,message_template_namespace}'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  return NextResponse.json({
    owned: ownedResponse.data.whatsapp_business_accounts?.data || [],
    clientShared: clientResponse.data.data || [],
    total: (ownedResponse.data.whatsapp_business_accounts?.data?.length || 0) + 
           (clientResponse.data.data?.length || 0)
  });
}
```

### 4.5 Endpoint: Subscribe to Webhooks (FIXED)

```typescript
// The CORRECT way to subscribe to WhatsApp Business Account
// File: src/lib/whatsapp-oauth.ts

async function subscribeToWABA(accessToken: string, wabaId: string): Promise<void> {
  // Subscribe the app to the WABA (NOT /webhooks endpoint!)
  await axios.post(
    `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
    {
      access_token: accessToken
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  // Then set up the webhook URL
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/whatsapp/webhooks';
  const verifyToken = randomBytes(32).toString('hex');

  await axios.post(
    `https://graph.facebook.com/v18.0/${wabaId}/webhooks`,
    {
      url: webhookUrl,
      verify_token: verifyToken
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  // Subscribe to specific fields
  const fields = ['messages', 'message_template_status', 'phone_number_quality', 'account_alerts'];
  
  for (const field of fields) {
    await axios.post(
      `https://graph.facebook.com/v18.0/${wabaId}/webhooks`,
      { fields: field },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }
}
```

---

## 5. Database Schema Changes

### 5.1 Updated Prisma Schema

```prisma
// File: prisma/schema.prisma

model WhatsAppCredential {
  id                        String   @id @default(cuid())
  organizationId            String
  
  // Connection metadata
  connectionType            String   @default("oauth") // "oauth" | "embedded_signup" | "manual"
  
  // Business Account
  businessAccountId         String
  businessAccountName      String?
  businessId              String?  // Meta Business Account ID
  
  // WhatsApp Business Account (WABA)
  whatsappBusinessAccountId String?  // WABA ID (sometimes different from businessAccountId)
  messageTemplateNamespace  String?
  
  // Credentials (encrypted)
  accessToken              String
  systemUserId            String?  // System User ID (for embedded signup)
  systemUserToken         String?  // System User access token
  
  // Phone numbers
  phoneNumberId           String?
  phoneNumbers            WhatsAppPhoneNumber[]
  
  // Token management
  tokenExpiresAt          DateTime?
  tokenLastRefreshedAt    DateTime?
  
  // Webhook configuration
  webhookUrl              String?
  webhookVerifyToken      String?
  webhookSecret          String?
  isWebhookSubscribed    Boolean  @default(false) // Track subscription status
  
  // Status
  isActive               Boolean  @default(true)
  isDefault              Boolean  @default(false)
  
  // Metadata
  connectedAt            DateTime  @default(now())
  connectedDevice       String?
  lastVerifiedAt        DateTime?
  lastHealthCheckAt    DateTime?
  healthCheckStatus    String?  // "healthy" | "degraded" | "unhealthy"
  
  // Embedded signup specific
  signupSessionId        String?  // For tracking signup progress
  signupStep            String?   // "init" | "phone_verification" | "complete"
  signupError           String?
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([organizationId])
  @@index([businessAccountId])
  @@index([whatsappBusinessAccountId])
  @@unique([organizationId, businessAccountId])
}

// Phone number with verification status
model WhatsAppPhoneNumber {
  id                  String   @id @default(cuid())
  credentialId        String
  credential          WhatsAppCredential @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  
  displayName         String
  phoneNumberId       String   // Meta Phone Number ID
  certifiedWaPhoneNumber String? // The verified phone number
  
  // Verification
  verificationStatus  String   @default("PENDING") // "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FLAGGED"
  codeVerificationStatus String?
  
  // Quality
  qualityScore       String?
  qualityRating      String?
  
  // Status
  isDefault          Boolean  @default(false)
  isVerified        Boolean  @default(false)
  
  // Verification details
  verificationId    String?  // From registration API
  verificationCode  String?  // Code sent for verification
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([credentialId])
  @@index([phoneNumberId])
}

// Track signup sessions for debugging
model WhatsAppSignupSession {
  id              String   @id @default(cuid())
  organizationId  String
  
  sessionId       String   @unique  // From Meta
  state          String   // CSRF state
  
  // Progress tracking
  currentStep    String   @default("init") // "init" | "business" | "waba" | "phone" | "webhook" | "complete"
  stepsCompleted  String[] @default([])
  
  // Error tracking
  lastError      String?
  errorDetails   Json?
  
  // Metadata
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  expiresAt      DateTime
  
  @@index([organizationId])
  @@index([sessionId])
}
```

---

## 6. Backend Implementation

### 6.1 Updated WhatsApp OAuth Service

```typescript
// File: src/lib/whatsapp-oauth.ts

import axios from 'axios';

export class WhatsAppOAuthService {
  private static readonly META_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
  private static readonly META_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private static readonly META_API_URL = 'https://graph.facebook.com/v18.0';

  /**
   * Generate OAuth URL with Embedded Signup parameters
   */
  getEmbeddedSignupUrl(state: string, prefill?: { phone_number?: string; business_name?: string }): string {
    const params: Record<string, string> = {
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code',
    };

    // Embedded Signup extras
    const extras: any = {
      setup: {
        ask_for: ['whatsapp_business_management', 'whatsapp_business_messaging']
      }
    };

    // Add prefill data if provided
    if (prefill) {
      extras.setup.prefill = prefill;
    }

    params.extras = JSON.stringify(extras);

    const queryString = new URLSearchParams(params).toString();
    return `${WhatsAppOAuthService.META_AUTH_URL}?${queryString}`;
  }

  /**
   * Exchange authorization code for access token (regular OAuth)
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
      params: {
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        redirect_uri: this.config.redirectUri,
        code
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  /**
   * CRITICAL: Exchange session_info for System User token (Embedded Signup)
   */
  async exchangeSessionInfoForToken(sessionInfo: string): Promise<string> {
    // Session info is actually a short-lived token that needs to be exchanged
    const response = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
      params: {
        grant_type: 'fb_exchange_token',
        fb_exchange_token: sessionInfo,
        client_id: this.config.appId,
        client_secret: this.config.appSecret
      }
    });

    return response.data.access_token;
  }

  /**
   * Get long-lived token (59 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<string> {
    const response = await axios.get(WhatsAppOAuthService.META_TOKEN_URL, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    return response.data.access_token;
  }

  /**
   * Get or create Business Account
   */
  async getOrCreateBusinessAccount(accessToken: string): Promise<BusinessAccount> {
    // Try to get existing business account
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/me?fields=businesses`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const businesses = response.data.businesses?.data;
      if (businesses && businesses.length > 0) {
        return {
          id: businesses[0].id,
          name: businesses[0].name
        };
      }
    } catch (error) {
      console.log('No existing business, will create');
    }

    throw new Error('Business Account not found. Please create one in Meta Business Manager.');
  }

  /**
   * Get or create WhatsApp Business Account (WABA)
   */
  async getOrCreateWABA(accessToken: string, businessId: string): Promise<WABA> {
    // Try to get existing WABA
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${businessId}/whatsapp_business_accounts`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const wabas = response.data.data;
      if (wabas && wabas.length > 0) {
        // Get WABA details
        const details = await axios.get(
          `${WhatsAppOAuthService.META_API_URL}/${wabas[0].id}`,
          {
            params: { fields: 'id,name,message_template_namespace' },
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        return {
          id: details.data.id,
          name: details.data.name,
          messageTemplateNamespace: details.data.message_template_namespace
        };
      }
    } catch (error) {
      console.log('No existing WABA');
    }

    throw new Error('WABA not found. Embedded Signup should create it automatically.');
  }

  /**
   * Get phone numbers from WABA
   */
  async getPhoneNumbers(accessToken: string, wabaId: string): Promise<PhoneNumber[]> {
    const response = await axios.get(
      `${WhatsAppOAuthService.META_API_URL}/${wabaId}/phone_numbers`,
      {
        params: {
          fields: 'id,verified_name,display_phone_number,code_verification_status,quality_rating'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return response.data.data.map((phone: any) => ({
      id: phone.id,
      displayName: phone.verified_name,
      phoneNumber: phone.display_phone_number,
      verificationStatus: phone.code_verification_status,
      qualityScore: phone.quality_rating
    }));
  }

  /**
   * CRITICAL: Subscribe app to WABA (FIXED ENDPOINT!)
   */
  async subscribeToWABA(accessToken: string, wabaId: string): Promise<void> {
    // Step 1: Subscribe the app to the WABA
    await axios.post(
      `${WhatsAppOAuthService.META_API_URL}/${wabaId}/subscribed_apps`,
      { access_token: accessToken },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Step 2: Set webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhooks`;
    const verifyToken = randomBytes(32).toString('hex');

    await axios.post(
      `${WhatsAppOAuthService.META_API_URL}/${wabaId}/webhooks`,
      {
        url: webhookUrl,
        verify_token: verifyToken
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Step 3: Subscribe to fields
    const fields = ['messages', 'message_template_status', 'phone_number_quality', 'account_alerts'];
    
    for (const field of fields) {
      try {
        await axios.post(
          `${WhatsAppOAuthService.META_API_URL}/${wabaId}/webhooks`,
          { fields: field },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (error) {
        console.warn(`Failed to subscribe to field ${field}:`, error);
      }
    }
  }

  /**
   * Verify app subscription to WABA
   */
  async verifySubscription(accessToken: string, wabaId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${WhatsAppOAuthService.META_API_URL}/${wabaId}/subscribed_apps`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const appId = this.config.appId;
      const subscriptions = response.data.data;
      
      return subscriptions.some((sub: any) => sub.id === appId || sub.whatsapp_business_account === wabaId);
    } catch (error) {
      return false;
    }
  }
}
```

---

## 7. Frontend Integration

### 7.1 Embedded Signup Button Component

```tsx
// File: src/components/whatsapp/EmbeddedSignupButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmbeddedSignupButtonProps {
  organizationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type SignupStep = 'idle' | 'init' | 'oauth' | 'processing' | 'complete' | 'error';

export function EmbeddedSignupButton({
  organizationId,
  onSuccess,
  onError
}: EmbeddedSignupButtonProps) {
  const [step, setStep] = useState<SignupStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const handleConnect = async () => {
    setStep('init');
    setErrorMessage('');
    setProgress(10);

    try {
      // Step 1: Initialize embedded signup
      const initResponse = await fetch('/api/whatsapp/embedded/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orgId: organizationId
        })
      });

      const { url, state, error: initError } = await initResponse.json();

      if (initError) {
        throw new Error(initError);
      }

      setStep('oauth');
      setProgress(20);

      // Step 2: Open OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Store state for verification
      sessionStorage.setItem('whatsapp_oauth_state', state);
      sessionStorage.setItem('whatsapp_oauth_org', organizationId);

      // For embedded signup, we use a popup window
      const popup = window.open(
        url,
        'WhatsApp Connect',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Step 3: Poll for completion
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          await handleOAuthComplete();
        }
      }, 500);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (step !== 'complete') {
          setStep('error');
          setErrorMessage('Connection timed out. Please try again.');
        }
      }, 10 * 60 * 1000);

    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'Failed to start connection');
      onError?.(error.message);
      toast.error('Failed to connect WhatsApp account');
    }
  };

  const handleOAuthComplete = async () => {
    setStep('processing');
    setProgress(50);

    try {
      // Check signup status
      const statusResponse = await fetch(
        `/api/whatsapp/embedded/status?orgId=${organizationId}`
      );

      const statusData = await statusResponse.json();

      if (statusData.success) {
        setStep('complete');
        setProgress(100);
        onSuccess?.();
        toast.success('WhatsApp account connected successfully!');
      } else {
        throw new Error(statusData.error || 'Connection failed');
      }
    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'Failed to complete connection');
      onError?.(error.message);
    }
  };

  // Render different states
  if (step === 'idle') {
    return (
      <Button 
        onClick={handleConnect}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Connect WhatsApp
      </Button>
    );
  }

  if (step === 'oauth') {
    return (
      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-blue-700">
          Please complete the connection in the popup window...
        </span>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-green-600" />
          <span className="text-green-700">Processing your WhatsApp account...</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-green-700">WhatsApp connected successfully!</span>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
        <Button onClick={() => setStep('idle')} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}
```

---

## 8. Error Handling & Retry Mechanisms

### 8.1 Retry Logic for API Calls

```typescript
// File: src/lib/retry.ts

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
      
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

function defaultShouldRetry(error: any): boolean {
  // Retry on network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return true;
  }
  
  // Retry on rate limiting
  if (error.response?.status === 429) {
    return true;
  }
  
  // Retry on server errors
  if (error.response?.status >= 500) {
    return true;
  }
  
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 8.2 Error Categories and Handling

| Error Category | HTTP Code | User Message | Retry? |
|---------------|-----------|--------------|--------|
| Invalid credentials | 401 | "Session expired. Please reconnect." | No |
| Rate limited | 429 | "Too many requests. Please wait." | Yes (with delay) |
| Business not found | 404 | "No WhatsApp Business Account found." | No |
| Phone verification failed | 400 | "Verification code invalid." | No |
| Network error | - | "Network error. Please check connection." | Yes |
| Server error | 500+ | "Server error. Please try again later." | Yes |

---

## 9. Security Best Practices

### 9.1 Token Storage

```typescript
// Always encrypt tokens before storing
import { createCipheriv, randomBytes, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

function encryptToken(token: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 9.2 Environment Variables

```bash
# Required for Embedded Signup
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_OAUTH_REDIRECT_URI=https://your-domain.com/api/whatsapp/oauth/callback

# For encryption
ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Webhook
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
```

---

## 10. Testing Procedures

### 10.1 Test Checklist

| Step | Test | Expected Result |
|------|------|-----------------|
| 1 | Initialize embedded signup | OAuth URL generated with extras param |
| 2 | Open OAuth URL | Meta login page with WhatsApp setup |
| 3 | Complete OAuth flow | Redirect back with code + session_info |
| 4 | Exchange session_info | System User token returned |
| 5 | Get long-lived token | Token valid for 59 days |
| 6 | Fetch WABA | WABA info returned |
| 7 | Fetch phone numbers | Phone numbers list returned |
| 8 | Subscribe to webhooks | Subscription confirmed |
| 9 | Verify subscription | App shows as subscribed |
| 10 | Send test message | Message delivered |

### 10.2 Test Script

```bash
# Test the complete embedded signup flow
curl -X POST https://your-domain.com/api/whatsapp/embedded/init \
  -H "Content-Type: application/json" \
  -d '{"orgId": "test-org-123"}'

# Should return:
# {
#   "url": "https://www.facebook.com/v18.0/dialog/oauth?...",
#   "state": "...",
#   "expiresIn": 600
# }
```

---

## 11. Common Pitfalls & Troubleshooting

### 11.1 Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Missing session_info" | Not using Embedded Signup flow | Add `extras[setup]` to OAuth URL |
| "App not subscribed" | Using wrong endpoint | Use `/subscribed_apps` not `/webhooks` |
| "No WABA found" | Business not linked | Ensure app is added to Business Manager |
| "Token expired" | Long-lived token used | Implement token refresh at 50-day mark |
| "Webhook not receiving" | Subscription failed | Verify with `/subscribed_apps` endpoint |
| "Phone not verified" | Verification incomplete | Check phone verification status |

### 11.2 Debug Commands

```bash
# Check if app is subscribed to WABA
curl -X GET "https://graph.facebook.com/v18.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# Check webhook configuration
curl -X GET "https://graph.facebook.com/v18.0/{WABA_ID}/webhooks" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# List phone numbers
curl -X GET "https://graph.facebook.com/v18.0/{WABA_ID}/phone_numbers?fields=id,verified_name,code_verification_status" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

---

## 12. File-by-File Implementation Checklist

### Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/retry.ts` | Retry logic for API calls |
| 2 | `src/components/whatsapp/EmbeddedSignupButton.tsx` | Frontend signup component |
| 3 | `src/app/api/whatsapp/embedded/init/route.ts` | Initialize signup |
| 4 | `src/app/api/whatsapp/embedded/status/route.ts` | Check signup status |
| 5 | `src/app/api/whatsapp/accounts/list/route.ts` | List WhatsApp accounts |

### Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/lib/whatsapp-oauth.ts` | Add session_info exchange, fix webhook subscription |
| 2 | `src/app/api/whatsapp/oauth/callback/route.ts` | Handle session_info parameter |
| 3 | `src/app/api/whatsapp/oauth/url/route.ts` | Add Embedded Signup URL generation |
| 4 | `prisma/schema.prisma` | Add embedded signup fields |
| 5 | `src/app/api/whatsapp/health/check/route.ts` | Verify app subscription |

### Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | Yes | Facebook App ID |
| `META_APP_SECRET` | Yes | Facebook App Secret |
| `META_OAUTH_REDIRECT_URI` | Yes | OAuth callback URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes | Webhook verification |
| `ENCRYPTION_KEY` | Yes | Token encryption key |

---

## Summary

This implementation guide covers all aspects of implementing Meta Embedded Signup for the WhatsApp Marketing Tool. The key fixes are:

1. **Handle session_info** - Critical for Embedded Signup to work
2. **Fix webhook subscription** - Use `/subscribed_apps` endpoint
3. **Add pre-fill support** - Improve user experience
4. **Create missing APIs** - For account listing and selection
5. **Update schema** - Track embedded signup state
6. **Add error handling** - Retry logic and user-friendly messages

Follow the file-by-file checklist to implement all changes systematically.
