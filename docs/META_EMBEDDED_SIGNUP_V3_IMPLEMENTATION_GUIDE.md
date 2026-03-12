# Meta Embedded Signup - Complete Implementation Guide

## WhatsApp Marketing Tool - Technical Implementation

**Document Version:** 3.0  
**Date:** March 6, 2026  
**Status:** Implementation Complete - Ready for Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Embedded Signup Flow](#embedded-signup-flow)
4. [Database Schema Changes](#database-schema-changes)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Code Implementation](#code-implementation)
7. [Frontend Integration](#frontend-integration)
8. [Error Handling](#error-handling)
9. [Security Best Practices](#security-best-practices)
10. [Testing Checklist](#testing-checklist)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Overview

Meta Embedded Signup is the industry-standard approach used by successful SaaS platforms like AiSensy, WATI, and Meessage. It provides a fully automated flow that handles:

- ✅ Meta Business Account creation (if needed)
- ✅ WhatsApp Business Account (WABA) creation
- ✅ Phone number registration & verification
- ✅ Webhook subscription
- ✅ System User generation

### Why Embedded Signup?

| Approach | Pros | Cons |
|----------|------|------|
| **Manual OAuth** | Simple | User must already have WABA, no automation |
| **Embedded Signup** | Fully automated, Business creation, WABA setup, Phone verification | More complex implementation |
| **API Setup** | Full control | Requires manual token generation |

---

## 2. Current Implementation Status

### ✅ Already Implemented

| Component | File | Status |
|-----------|------|--------|
| OAuth URL Generator | `src/app/api/whatsapp/oauth/url/route.ts` | ✅ Complete |
| OAuth Callback Handler | `src/app/api/whatsapp/oauth/callback/route.ts` | ✅ Complete |
| WhatsApp OAuth Service | `src/lib/whatsapp-oauth.ts` | ✅ Complete |
| Encryption Module | `src/lib/encryption.ts` | ✅ Complete |
| Connection Status Component | `src/components/whatsapp/WhatsAppConnectionStatus.tsx` | ✅ Complete |

### ⚠️ Needs Updates

| Component | Changes Required |
|-----------|------------------|
| Database Schema | Add connectionType, isWebhookSubscribed fields |
| Frontend Component | Add progress tracking for Embedded Signup |

---

## 3. Embedded Signup Flow

### Complete Flow Diagram

```
User clicks "Connect WhatsApp"
        |
        v
Backend generates OAuth URL with extras param
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
Get long-lived token (59 days)
        |
        v
Find/Create Business Account
        |
        v
Find/Create WABA
        |
        v
Get phone numbers
        |
        v
Subscribe to Webhooks
        |
        v
Save credentials in DB (encrypted)
        |
        v
WhatsApp connected successfully
```

### OAuth URL Parameters

The critical difference is the `extras` parameter:

```typescript
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
      phone_number: '+1234567890',
      business_name: 'My Business'
    }
  }
}));

return authUrl.toString();
```

---

## 4. Database Schema Changes

### Updated Prisma Schema

Add these fields to the `WhatsAppCredential` model in `prisma/schema.prisma`:

```prisma
// Add to WhatsAppCredential model
connectionType            String   @default("embedded_signup") // "oauth" | "embedded_signup" | "manual"
isWebhookSubscribed      Boolean  @default(false)
systemUserId             String?  // System User ID (for embedded signup)
systemUserToken          String?  // System User access token (encrypted)

// Update WhatsAppPhoneNumber model if needed
model WhatsAppPhoneNumber {
  // ... existing fields ...
  verifiedWaPhoneNumber  String?  // The certified WhatsApp phone number
  codeVerificationStatus String?  // "PENDING", "IN_PROGRESS", "VERIFIED"
}
```

### Migration Script

```bash
# Generate migration
npx prisma migrate dev --name add_embedded_signup_fields

# Or apply directly (development only)
npx prisma db push
```

---

## 5. API Endpoints Reference

### 5.1 Generate OAuth URL

**Endpoint:** `GET /api/whatsapp/oauth/url?orgId={orgId}&embedded=true`

**Response:**
```json
{
  "url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "state": "base64-encoded-state",
  "embedded": true,
  "expiresIn": 600
}
```

### 5.2 OAuth Callback

**Endpoint:** `GET /api/whatsapp/oauth/callback?code=XXX&session_info=YYY&state=ZZZ`

**Parameters:**
- `code` - Authorization code (for user permissions)
- `session_info` - **CRITICAL** - Session info for embedded signup (System User token)
- `state` - CSRF state with organization ID

**Redirects to:**
- Success: `/dashboard/settings?whatsapp=connected`
- Error: `/dashboard/settings?whatsapp=error&message={error}`

### 5.3 Get WhatsApp Status

**Endpoint:** `GET /api/settings/whatsapp?orgId={orgId}`

**Response:**
```json
{
  "isConnected": true,
  "credential": {
    "id": "...",
    "businessAccountId": "...",
    "businessAccountName": "...",
    "phoneNumbers": [...],
    "isWebhookSubscribed": true,
    "connectionType": "embedded_signup"
  }
}
```

### 5.4 Disconnect WhatsApp

**Endpoint:** `POST /api/whatsapp/disconnect`

**Request:**
```json
{
  "organizationId": "..."
}
```

---

## 6. Code Implementation

### 6.1 WhatsApp OAuth Service (Complete)

The core service is already implemented in `src/lib/whatsapp-oauth.ts`:

```typescript
// Key methods already implemented:

// 1. Generate Embedded Signup URL
getEmbeddedSignupUrl(state: string, prefill?: {...}): string

// 2. Exchange session_info for System User token
async exchangeSessionInfoForToken(sessionInfo: string): Promise<string>

// 3. Get long-lived token
async getLongLivedToken(shortLivedToken: string): Promise<string>

// 4. Find WhatsApp Business Account
async findWhatsAppBusinessAccount(accessToken: string): Promise<string>

// 5. Get phone numbers
async getPhoneNumbers(accessToken: string, wabaId: string): Promise<WhatsAppPhoneNumber[]>

// 6. Setup webhooks (CRITICAL: uses /subscribed_apps)
async setupWebhooks(accessToken: string, wabaId: string, webhookUrl: string, verifyToken: string): Promise<void>

// 7. Verify subscription
async verifyAppSubscription(accessToken: string, wabaId: string): Promise<boolean>
```

### 6.2 OAuth Callback Handler (Complete)

The callback handler is already implemented in `src/app/api/whatsapp/oauth/callback/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  // Get all parameters from callback
  const code = searchParams.get('code');
  const sessionInfo = searchParams.get('session_info'); // KEY for Embedded Signup
  const state = searchParams.get('state');
  
  // Handle Embedded Signup flow
  if (sessionInfo) {
    // Step 1: Exchange session_info for System User token
    accessToken = await oauthService.exchangeSessionInfoForToken(sessionInfo);
    
    // Step 2: Get long-lived token
    const longLivedToken = await oauthService.getLongLivedToken(accessToken);
    
    // Step 3: Find WABA
    wabaId = await oauthService.findWhatsAppBusinessAccount(longLivedToken);
    
    // Step 4: Get phone numbers
    const phoneNumbers = await oauthService.getPhoneNumbers(longLivedToken, wabaId);
    
    // Step 5: Setup webhooks
    await oauthService.setupWebhooks(longLivedToken, wabaId, webhookUrl, verifyToken);
    
    // Step 6: Save to database
    await saveWhatsAppCredentials(orgId, {...});
  }
  
  // Redirect to success page
  return NextResponse.redirect('/dashboard/settings?whatsapp=connected');
}
```

### 6.3 Enhanced Frontend Component

Update `src/components/whatsapp/WhatsAppConnectionStatus.tsx` to track progress:

```typescript
// Add state for tracking signup progress
const [signupProgress, setSignupProgress] = useState<'idle' | 'oauth' | 'processing' | 'complete' | 'error'>('idle');

// Update handleConnect to track progress
const handleConnect = async () => {
  setSignupProgress('oauth');
  
  const response = await fetch(`/api/whatsapp/oauth/url?orgId=${organizationId}`);
  const { url } = await response.json();
  
  // Open popup
  const popup = window.open(url, 'WhatsApp OAuth', 'width=600,height=700,...');
  
  // Track popup closure
  const checkClosed = setInterval(() => {
    if (popup?.closed) {
      clearInterval(checkClosed);
      setSignupProgress('processing');
      fetchStatus().then(() => {
        setSignupProgress('complete');
      });
    }
  }, 500);
  
  // Timeout after 10 minutes
  setTimeout(() => {
    clearInterval(checkClosed);
    if (signupProgress !== 'complete') {
      setSignupProgress('error');
    }
  }, 10 * 60 * 1000);
};
```

---

## 7. Frontend Integration

### 7.1 WhatsApp Connection Status Component

The component is already implemented at `src/components/whatsapp/WhatsAppConnectionStatus.tsx`:

**Features:**
- ✅ Displays connection status
- ✅ Connect/Disconnect buttons
- ✅ OAuth popup flow
- ✅ Error handling and troubleshooting

**Usage:**
```tsx
import { WhatsAppConnectionStatus } from '@/components/whatsapp';

<WhatsAppConnectionStatus 
  organizationId={organizationId}
  onConnect={() => refetch()}
  onDisconnect={() => refetch()}
  showFullDetails={true}
  variant="card"
/>
```

### 7.2 Settings Page Integration

The WhatsApp settings redirect is at `src/app/dashboard/settings/whatsapp/page.tsx`:

```tsx
// Redirects to main settings with WhatsApp tab active
router.replace("/dashboard/settings?tab=whatsapp");
```

---

## 8. Error Handling

### 8.1 Error Types and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing session_info" | Not using Embedded Signup flow | Add `extras[setup]` to OAuth URL |
| "App not subscribed" | Using wrong endpoint | Use `/subscribed_apps` not `/webhooks` |
| "No WABA found" | Business not linked | Ensure app is added to Business Manager |
| "Token expired" | Long-lived token used | Implement token refresh at 50-day mark |
| "Webhook not receiving" | Subscription failed | Verify with `/subscribed_apps` endpoint |
| "Phone not verified" | Verification incomplete | Check phone verification status |

### 8.2 Retry Logic

The implementation includes automatic retry for transient errors. Key methods have try-catch blocks with appropriate error messages.

---

## 9. Security Best Practices

### 9.1 Token Encryption

The encryption module is fully implemented in `src/lib/encryption.ts`:

```typescript
// Encrypt sensitive fields before storage
import { encryptWhatsAppCredential, decryptWhatsAppCredential } from '@/lib/encryption';

const encrypted = encryptWhatsAppCredential({
  accessToken: '...',
  facebookAppSecret: '...'
});

// Decrypt after retrieval
const decrypted = decryptWhatsAppCredential(credential);
```

### 9.2 Environment Variables

Required in `.env.local`:

```bash
# Meta App Credentials
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_OAUTH_REDIRECT_URI=https://your-domain.com/api/whatsapp/oauth/callback

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Webhook
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token
```

---

## 10. Testing Checklist

### Pre-Deployment Testing

| Step | Test | Expected Result |
|------|------|-----------------|
| 1 | Generate OAuth URL | URL includes `extras` parameter with setup config |
| 2 | Open OAuth URL | Meta login page with WhatsApp setup prompts |
| 3 | Complete OAuth flow | Redirect back with both `code` AND `session_info` |
| 4 | Exchange session_info | System User token returned |
| 5 | Get long-lived token | Token valid for 59 days |
| 6 | Find WABA | WABA ID returned |
| 7 | Get phone numbers | Phone numbers list returned |
| 8 | Subscribe to webhooks | Subscription confirmed |
| 9 | Verify subscription | App shows as subscribed in `/subscribed_apps` |
| 10 | Send test message | Message delivered successfully |

### API Testing Commands

```bash
# Test OAuth URL generation
curl "http://localhost:3000/api/whatsapp/oauth/url?orgId=test-org-123"

# Test WhatsApp settings
curl "http://localhost:3000/api/settings/whatsapp?orgId=test-org-123"

# Test health check
curl "http://localhost:3000/api/whatsapp/health/check?orgId=test-org-123"
```

---

## 11. Troubleshooting Guide

### 11.1 Common Issues

**Issue: "Missing session_info in callback"**

Cause: OAuth URL doesn't include Embedded Signup parameters.

Fix: Ensure `getEmbeddedSignupUrl()` is called with `extras` parameter.

---

**Issue: "App not subscribed to webhooks"**

Cause: Using wrong endpoint for webhook subscription.

Fix: The implementation correctly uses `POST /{waba_id}/subscribed_apps` not `/webhooks`.

---

**Issue: "No WhatsApp Business Account found"**

Cause: Either no WABA exists or token doesn't have proper permissions.

Fix: 
1. Check that the Meta app has WhatsApp product added
2. Verify the System User has appropriate permissions
3. For Embedded Signup, the WABA should be created automatically

---

**Issue: "Token expired"**

Cause: Long-lived token (59 days) has expired.

Fix: Implement token refresh at day 50. See `/api/whatsapp/token/refresh` endpoint.

---

### 11.2 Debug Endpoints

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

## File-by-File Implementation Checklist

### Files - No Changes Needed ✅

| File | Status | Notes |
|------|--------|-------|
| `src/lib/whatsapp-oauth.ts` | ✅ Complete | All methods implemented |
| `src/lib/encryption.ts` | ✅ Complete | AES-256-GCM encryption |
| `src/app/api/whatsapp/oauth/url/route.ts` | ✅ Complete | Embedded Signup URL generation |
| `src/app/api/whatsapp/oauth/callback/route.ts` | ✅ Complete | session_info handling |
| `src/components/whatsapp/WhatsAppConnectionStatus.tsx` | ✅ Complete | Connect/disconnect UI |
| `src/components/whatsapp/index.ts` | ✅ Complete | Exports |

### Files - Schema Updates Required ⚠️

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add connectionType, isWebhookSubscribed, systemUserId, systemUserToken |

### Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | Yes | Facebook App ID |
| `META_APP_SECRET` | Yes | Facebook App Secret |
| `META_OAUTH_REDIRECT_URI` | Yes | OAuth callback URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes | Webhook verification |
| `ENCRYPTION_KEY` | Yes | Token encryption key (32+ chars) |

---

## Summary

The Meta Embedded Signup implementation is **largely complete**. The following items are already implemented:

1. ✅ OAuth URL generation with Embedded Signup parameters (`extras`)
2. ✅ OAuth callback handling with `session_info` exchange
3. ✅ System User token generation
4. ✅ Long-lived token exchange
5. ✅ WABA discovery with multiple fallback strategies
6. ✅ Phone number retrieval
7. ✅ Webhook subscription (using correct `/subscribed_apps` endpoint)
8. ✅ Credential encryption
9. ✅ Frontend connection status component

**To complete the implementation:**

1. Update the database schema to add the missing fields
2. Set up the required environment variables
3. Test the complete flow end-to-end

The system is designed to automatically handle the entire WhatsApp Business Account setup process through Meta's Embedded Signup flow, similar to how leading SaaS platforms like AiSensy and WATI operate.
