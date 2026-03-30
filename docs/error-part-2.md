Now I have the complete picture. Let me write the continuation — deep-diving the OAuth flow, WhatsApp client architecture, template service, and a final section with the complete environment variable manifest and deployment hardening guide.

---

# ProDigiChat — Production Audit Report (Continued)
**Part 2 of 2 — OAuth / Client Architecture / Template Engine / Deployment Hardening**

---

## 9. DEEPER BUG ANALYSIS — OAuth & Client Layer

---

### BUG-16 · **CRITICAL** — OAuth URL Route Accepts `orgId` from Query Parameter (Not JWT)

**File:** `src/app/api/whatsapp/oauth/url/route.ts` — `const orgId = searchParams.get('orgId')`

**Root Cause:** The OAuth URL generator takes `orgId` from the URL query string rather than from the verified JWT token. Any authenticated user can forge an `orgId` in the request to generate an OAuth URL that binds a connected WhatsApp account to an arbitrary organization they don't belong to. When the OAuth callback fires, it will create a `WhatsAppCredential` record for the forged `orgId`, handing one org's WABA access to another.

**Exploit Path:**
```
GET /api/whatsapp/oauth/url?orgId=<victim_org_id>
→ User completes Meta OAuth
→ Callback creates WhatsAppCredential for victim org
→ Attacker's org gains no credential, but victim org is now "connected" to the attacker's WABA
```

**Fix:**
```typescript
// NEVER read orgId from query params for security-sensitive flows
const token = await getToken({ req: request });
const orgId = token?.organizationId as string;
if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

---

### BUG-17 · **CRITICAL** — `WhatsAppPhoneNumber.phoneNumber` Stores E.164 Display Number, Not Meta Phone Number ID

**File:** `src/app/api/whatsapp/oauth/callback/route.ts` — inside `createMany`:
```typescript
phoneNumber: phone.phoneNumber || phone.id,
```

**Root Cause:** `phone.phoneNumber` is populated from `oauthService.getPhoneNumbers()`, which maps it from `certified_wa_phone_number` (e.g., `"+919123456789"`). `phone.id` is Meta's Phone Number ID (e.g., `"101553158498XXXX"`). The field `phoneNumber` in `WhatsAppPhoneNumber` ends up storing the E.164 phone string.

Then in `getWhatsAppCredentials` in `auth.ts`:
```typescript
phoneNumberId: dbCredential.phoneNumberId || defaultPhone?.phoneNumber || ''
```

When `phoneNumberId` is null on the credential (which it often is for new connections), the fallback is `defaultPhone?.phoneNumber` — the human-readable E.164 string. The `WhatsAppClient` then constructs API calls to `/{E.164_number}/messages`, which Meta rejects because that endpoint requires a numeric Phone Number ID, not a formatted phone string.

**This is the root cause of "messages silently fail after new connections."**

**Fix:**
In `getPhoneNumbers()` in `whatsapp-oauth.ts`, the return mapping is correct:
```typescript
return allPhoneNumbers.map((phone: any) => ({
  id: phone.id,  // This IS the Meta Phone Number ID — use this as phoneNumberId
  ...
  phoneNumber: phone.certified_wa_phone_number || phone.display_phone_number,  // Human-readable
```

In `oauth/callback/route.ts`, store them correctly:
```typescript
data: phoneNumbers.map((phone, index) => ({
  credentialId: newCredential.id,
  displayName: phone.displayName,
  phoneNumber: phone.phoneNumber,      // E.164 display number
  metaPhoneNumberId: phone.id,         // META'S NUMERIC ID — add this field
  isDefault: index === 0,
  ...
}))
```

Add `metaPhoneNumberId String?` to `WhatsAppPhoneNumber` schema and use it in `getWhatsAppCredentials`:
```typescript
phoneNumberId: dbCredential.phoneNumberId || defaultPhone?.metaPhoneNumberId || ''
```

---

### BUG-18 · **HIGH** — `WhatsAppClient.sendMessage` Has No `orgId`/`accountId` Parameters But Auth Proxy Does

**File:** `src/app/api/whatsapp/client.ts` — `sendMessage(payload: any): Promise<AxiosResponse>` — no org/account params

**File:** `src/app/api/whatsapp/auth.ts` — `whatsappClient.sendMessage(payload, orgId, accountId)` — calls with 3 args

**Root Cause:** The `WhatsAppClient` class's `sendMessage` method accepts only `payload`. The `whatsappClient` proxy object in `auth.ts` accepts `(payload, orgId, accountId)` and calls `getWhatsAppClient(orgId, accountId)` first, which is correct. However, legacy code that imports directly from `client.ts` and calls `sendMessage` bypasses the org/account resolution.

In `edge-cases.ts`:
```typescript
import { whatsappClient } from "./auth";
const response = await whatsappClient.sendMessage({ to, type: "text", text: { body: message } });
// No orgId passed — falls back to default org
```

This means `sendMessageWithRetry` in edge-cases will always use the default org's credentials regardless of which org triggered it.

**Fix:** Always pass `orgId` and `accountId` to all `whatsappClient.*` calls. Remove any call site that omits these parameters.

---

### BUG-19 · **HIGH** — `validateMessageContent` in `edge-cases.ts` Would Block Legitimate Marketing Messages

**File:** `src/app/api/whatsapp/edge-cases.ts`

```typescript
const forbiddenPatterns = [/spam/, /promotion/, /discount/];
```

This function is labeled "validate message content" but blocks messages containing the word `"promotion"` or `"discount"`. A WhatsApp marketing platform whose primary use case is sending promotional messages — that silently drops any message containing the word "discount" — is a critical functional issue.

This function is not currently called in any production path (queue processor doesn't invoke it), but if wired in it would cause silent message drops with no error to the user.

**Fix:** Remove this function entirely or replace with an actual Meta content policy check. The words "promotion" and "discount" are not prohibited by Meta's WhatsApp Business Policy.

---

### BUG-20 · **HIGH** — OAuth Callback Has No CSRF Token (Nonce) Validation

**File:** `src/app/api/whatsapp/oauth/callback/route.ts`

The `state` parameter is decoded from Base64 JSON and validates `orgId` and `timestamp` (15-minute expiry). However, the `nonce` field generated in the URL route (`randomBytes(16).toString('hex')`) is included in the `state` but **never stored server-side and never validated**. This means the nonce provides no replay protection — it's generated and discarded.

**Root Cause:** A valid nonce requires server-side storage (Redis, DB) of the issued nonce, and verification that the nonce in the callback matches exactly one previously issued URL. Without storage, the nonce is cosmetic.

**Fix:** Store the nonce in the database or Redis with a 15-minute TTL on URL generation, and verify+delete it in the callback:
```typescript
// On URL generation:
await prisma.oauthState.create({ data: { nonce, orgId, expiresAt: new Date(Date.now() + 900000) } });

// On callback:
const stateRecord = await prisma.oauthState.findUnique({ where: { nonce } });
if (!stateRecord || stateRecord.expiresAt < new Date()) return 403;
await prisma.oauthState.delete({ where: { nonce } }); // One-time use
```

---

### BUG-21 · **HIGH** — OAuth Callback Can Update a Credential It Doesn't Own

**File:** `src/app/api/whatsapp/oauth/callback/route.ts` — the "update existing credential" block

```typescript
const existingCred = await prisma.whatsAppCredential.findFirst({
  where: { organizationId: orgId, businessAccountId: wabaId },
});
if (existingCred) {
  await prisma.whatsAppCredential.update({ where: { id: existingCred.id }, data: updatedData });
```

The query filters by both `organizationId` and `businessAccountId`. This is correct but relies entirely on the `orgId` from the state parameter being trustworthy. Given BUG-16 (orgId from query params before this fix), an attacker who forged the orgId in state could overwrite another org's credential.

Once BUG-16 is fixed (orgId from JWT, not query param), this becomes safe. The fix here is a dependency on BUG-16.

---

### BUG-22 · **MEDIUM** — `setupWebhooks` Posts `access_token` in Body AND Authorization Header

**File:** `src/lib/whatsapp-oauth.ts` — `setupWebhooks` method

```typescript
await axios.post(
  `${META_API_URL}/${businessAccountId}/subscribed_apps`,
  { access_token: accessToken },        // ← Token in POST body
  { headers: { Authorization: `Bearer ${accessToken}` } }  // ← Also in header
);
```

Sending the access token in both the request body and the Authorization header is redundant and doubles the surface area for token leakage (e.g., in access logs that capture request bodies). Meta accepts the token via the Authorization header alone.

**Fix:** Remove the `{ access_token: accessToken }` from the POST body. The Authorization header is sufficient.

---

### BUG-23 · **MEDIUM** — Long-Lived Token Expiry Set to 59 Days But Meta Issues 60-Day Tokens

**File:** `src/app/api/whatsapp/oauth/callback/route.ts`

```typescript
tokenExpiresAt: new Date(Date.now() + 59 * 24 * 60 * 60 * 1000),
```

Meta long-lived User tokens expire in approximately 60 days. The 59-day value is close but the actual expiry from Meta's `fb_exchange_token` response includes an `expires_in` field in seconds. You're discarding this and hardcoding a duration.

**Fix:**
```typescript
const longLivedToken = await oauthService.getLongLivedToken(accessToken);
// getLongLivedToken should return { access_token, expires_in }
// Use the actual expires_in from Meta:
tokenExpiresAt: new Date(Date.now() + (expiresIn * 1000)),
```
Update `getLongLivedToken` to return `{ token, expiresIn }` instead of just the token string.

---

### BUG-24 · **MEDIUM** — `whatsapp-template-service.ts` Calls `whatsappClient.submitTemplate` with No `orgId`/`accountId` Fallback Check

**File:** `src/lib/whatsapp-template-service.ts` — `submitTemplateToMeta` and `checkTemplateStatusFromMeta`

Both functions accept `orgId?` and `accountId?` and pass them to `whatsappClient.*`. When called from `src/app/api/templates/route.ts`, `orgId` is passed correctly. However, `syncTemplatesWithMeta` and `deleteTemplateFromMeta` can be called with no orgId (e.g., from the sync route), causing them to fall through to `getDefaultOrgId()` — which returns the hardcoded string `'000000000000000000000001'`.

If no org with that ID exists in the DB, the credential lookup fails silently and template operations fail.

**Fix:** Require `orgId` as a non-optional parameter in all template service functions. Remove the ability to call them without an org context.

---

## 10. DEEPER ANALYSIS — Schema & Data Model Issues

---

### SCHEMA-01 · **HIGH** — `Contact` Unique Constraint Is Wrong for Multi-Tenancy

**Current:** `@@unique([phoneNumber, userId])`
**Required:** `@@unique([phoneNumber, organizationId])`

As described in BUG-05. But there's a deeper impact: the current constraint means the same phone number can exist multiple times in the database if imported by multiple users in the same org. When the webhook fires a status update for a phone number, `prisma.contact.findFirst({ where: { phoneNumber: recipient } })` returns an arbitrary one of the duplicates — possibly from the wrong org.

**Fix:** Run a deduplication script before migration, then change the constraint.

---

### SCHEMA-02 · **HIGH** — `Message.organizationId` Is Required But Webhook Creates Messages Without One

**Schema:** `organizationId String @db.ObjectId` — NOT optional, no `?`

**File:** `src/app/api/whatsapp/webhooks/route.ts` — legacy handler

```typescript
// Only create message if we have an organizationId
if (messageOrgId) {
  await prisma.message.create({ ... })
}
```

The guard is correct — but this means status webhooks for messages where `messageOrgId` cannot be resolved are **silently dropped**. The delivery/read status never gets written to the database. Campaign stats never update from webhook events because the underlying `Message` records are never created.

**Root Cause:** The system never stores a `whatsappAccountId` or `organizationId` on outgoing messages at send time. When the webhook arrives with a `wamid`, there's no way to reverse-map it to an org without going through the campaign.

**Fix:** When a message is sent successfully by `processQueueItem`, immediately create a `Message` record with the `whatsappMessageId`, `organizationId`, `contactId`, and `campaignId`. This creates the pre-existing record that the webhook can find and update by `whatsappMessageId`.

---

### SCHEMA-03 · **MEDIUM** — `AutomationWorkflow` Has No `organizationId`

**Schema:** `model AutomationWorkflow` — has `createdBy` (userId) but no `organizationId`

This mirrors the same multi-tenancy flaw as `Contact`. Automation workflows are siloed per user, not per org. When the automation engine is eventually built, two users in the same org will have separate workflow universes.

**Fix:** Add `organizationId String @db.ObjectId` to `AutomationWorkflow` and add `@@index([organizationId])`.

---

### SCHEMA-04 · **MEDIUM** — JSON Fields Stored as `String` Instead of Using Native MongoDB Documents

Multiple models store JSON as serialized strings: `Campaign.messageContent`, `Campaign.stats`, `Campaign.schedule`, `Contact.tags`, `Contact.attributes`. MongoDB natively supports document fields. Storing JSON as strings means:
- No index support on nested properties
- No partial update support (must read-parse-update-serialize-write)
- No schema validation at the DB level

**Fix (Long-term):** For MongoDB with Prisma, switch to `Json` type where possible:
```prisma
messageContent Json
stats          Json
tags           String[] // Use native array for tags
```
`Json` type is supported in Prisma + MongoDB. Note: this requires a migration to parse and re-store existing string values.

---

## 11. DEEPER ANALYSIS — Frontend & UI Issues

---

### UI-01 · **HIGH** — `edge-cases.ts` (WhatsApp) Exports Are Never Called in Production — File Is Dead Code

**File:** `src/app/api/whatsapp/edge-cases.ts`

The functions `sendMessageWithRetry`, `validateMessageContent`, `validatePhoneNumber`, `validateMediaFile` are defined but not imported anywhere in the production code path. The queue processor (`queue.ts`) handles retries itself. The message routes don't validate content before sending.

This is dead code that creates maintenance confusion and has the dangerous `validateMessageContent` bug (BUG-19).

**Fix:** Either delete the file or properly integrate `validatePhoneNumber` into the message send path (phone validation before queuing is genuinely useful).

---

### UI-02 · **HIGH** — Campaign Creation Page Has No WhatsApp Account Selector When Multiple Accounts Exist

**File:** `src/app/dashboard/campaigns/new/page.tsx` — `fromNumber` field in `CampaignFormData`

The campaign creation form has a `fromNumber` field, but when an org has multiple WhatsApp credentials (e.g., one for marketing, one for support), the UI must let the user select which account to send from. Without this selector, the campaign always uses whichever account the `getWhatsAppCredentials` fallback returns (the default account or the most recently connected one).

**Fix:** Fetch `/api/settings/whatsapp` on campaign creation page load and render a `<Select>` for "Send from account" that populates `fromNumber` in the form state. This value must be saved to `Campaign.whatsappAccountId` (already in the schema) at creation time.

---

### UI-03 · **MEDIUM** — `WhatsAppConnectionStatus` Component Polls Aggressively

Without seeing the full component code, the `WhatsAppConnectionStatus` in the dashboard banner should not poll the connection status API on every render or on a tight interval — this wastes Meta API quota and adds DB load. Ensure any polling uses `useEffect` with a minimum 30-second interval and stops when the component unmounts.

---

### UI-04 · **MEDIUM** — Error Boundaries Are Absent

The dashboard is a client-side SPA with multiple data-fetching `useEffect` calls. There are no React Error Boundaries wrapping any dashboard section. If any component throws (e.g., due to a malformed API response), the entire dashboard goes blank with no user-facing error. Given the number of JSON.parse calls in components, this is a real risk.

**Fix:** Wrap major sections in `<ErrorBoundary>` components:
```tsx
<ErrorBoundary fallback={<ErrorCard message="Failed to load campaigns" />}>
  <CampaignList />
</ErrorBoundary>
```

---

### UI-05 · **LOW** — `SelectTrigger` in Analytics Page Renders Value Without `<SelectValue />`

**File:** `src/app/dashboard/analytics/page.tsx`

```tsx
<SelectTrigger className="w-[140px]">
  {dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : "Last 90 days"}
</SelectTrigger>
```

This bypasses the Radix `<SelectValue />` component and uses a manual ternary. This breaks accessibility (the trigger has no `aria-label` derived from the value) and won't respond correctly to keyboard navigation or screen readers.

**Fix:**
```tsx
<SelectTrigger className="w-[140px]">
  <SelectValue />
</SelectTrigger>
```
And add `<SelectItem>` children with the labels. The `Select` component handles display automatically.

---

## 12. DEPLOYMENT HARDENING — Complete Environment Variable Manifest

Below is the complete, authoritative list of every environment variable ProDigiChat requires. Use this as your Vercel/production checklist.

---

### Required — Application Will Crash Without These

| Variable | Example Value | Source |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/prodigichat` | MongoDB Atlas |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` output | Generate locally |
| `NEXTAUTH_URL` | `https://prodigichat.com` | Your domain |
| `ENCRYPTION_KEY` | 32+ random alphanumeric chars | Generate locally |

---

### Required — Meta WhatsApp Integration

| Variable | Example Value | Source |
|---|---|---|
| `META_APP_ID` | `12345678901234` | Meta Developer Console → App Settings |
| `META_APP_SECRET` | `abc123def456...` | Meta Developer Console → App Settings |
| `META_OAUTH_REDIRECT_URI` | `https://prodigichat.com/api/whatsapp/oauth/callback` | Must match Meta App Dashboard exactly |
| `META_APP_SECRET` | (same as above — used for webhook HMAC) | — |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `your-random-secret-token-2026` | Set this in Meta App Dashboard too |
| `META_APP_SECRET` | (same — used in `verifyMetaSignature`) | — |
| `META_API_VERSION` | `v22.0` | Optional — defaults to `v21.0` |

---

### Required — Authentication Providers

| Variable | Example Value | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud Console — optional if Google OAuth disabled |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud Console |

---

### Required — File Storage

| Variable | Example Value | Notes |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Required if upload feature used |
| `AWS_SECRET_ACCESS_KEY` | `...` | Required if upload feature used |
| `AWS_REGION` | `ap-south-1` | — |
| `AWS_S3_BUCKET` | `prodigichat-uploads` | — |

---

### Optional — Rate Limiting (Required for Production)

| Variable | Example Value | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` | Required once in-memory rate limit is replaced |
| `UPSTASH_REDIS_REST_TOKEN` | `AX...` | Required once in-memory rate limit is replaced |

---

### Deprecated / Should Be Removed

| Variable | Status | Reason |
|---|---|---|
| `WHATSAPP_API_KEY` | Remove | Replaced by DB credentials |
| `WHATSAPP_PHONE_NUMBER_ID` | Remove | Replaced by DB credentials |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Remove | Replaced by DB credentials |
| `WHATSAPP_WEBHOOK_SECRET` | Consolidate | Duplicate of `META_APP_SECRET` for HMAC verification |

---

## 13. CRON ARCHITECTURE — Current State vs. Required State

**Current state:** `vercel.json` fires `/api/cron/queue` every minute. This endpoint needs to be passed an `organizationId` explicitly — it has no logic to discover which orgs have pending messages.

**Required state (production-safe):**

```typescript
// /api/cron/queue/route.ts — REPLACE with:
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgsWithWork = await prisma.whatsAppMessageQueue.findMany({
    distinct: ['organizationId'],
    where: {
      status: { in: ['queued', 'pending'] },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    select: { organizationId: true },
  });

  const results = await Promise.allSettled(
    orgsWithWork.map(({ organizationId }) =>
      processQueue(organizationId, 50) // 50 per org per minute = 3,000/hr per org
    )
  );

  return NextResponse.json({ processed: results.length });
}
```

Add to `vercel.json`:
```json
{ "env": { "CRON_SECRET": "@cron-secret" } }
```
And set `CRON_SECRET` as a Vercel environment variable.

---

## 14. SECURITY HARDENING — Complete Checklist

Beyond the specific bugs already listed, these systematic hardening steps are required before production:

---

### HARDEN-01 — Add `X-Content-Type-Options`, `X-Frame-Options`, HSTS Headers

**File:** `next.config.ts`

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

---

### HARDEN-02 — Add `CRON_SECRET` Verification to All Cron Routes

Both `/api/cron/queue` and `/api/cron/health` are publicly accessible with no authentication. On Vercel, Cron jobs set an `Authorization: Bearer <CRON_SECRET>` header. Verify it:

```typescript
if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### HARDEN-03 — Restrict Public API Surface in Middleware

**File:** `src/middleware.ts`

Current public routes: `/login`, `/signup`, `/api/auth`. The routes `/api/whatsapp/webhooks` and `/api/cron/*` also need to be accessible without a session (they use their own verification). But routes like `/api/analytics`, `/api/campaigns`, `/api/contacts` should **always** require authentication even if directly curl'd. The current middleware only redirects browsers to `/login` — API calls return `NextResponse.next()` and reach the route handler which must then do its own `getToken()` check. This is correct in theory but verifying that every single route does this check is fragile.

**Fix:** Add explicit API authentication in middleware for all `/api/*` routes except the explicitly listed exceptions:

```typescript
// In middleware.ts
const publicApiRoutes = ['/api/auth', '/api/whatsapp/webhooks', '/api/cron'];
const isPublicApi = publicApiRoutes.some(r => request.nextUrl.pathname.startsWith(r));

if (request.nextUrl.pathname.startsWith('/api/') && !isPublicApi) {
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

### HARDEN-04 — Remove `console.log` of Sensitive Data in Production

Search the codebase for these patterns that log sensitive values:

```bash
grep -r "console.log.*token\|console.log.*apiKey\|console.log.*secret\|console.log.*password" src/
```

Found examples:
- `src/app/api/whatsapp/auth.ts` — logs `credentials` object which includes `apiKey`
- `src/app/api/whatsapp/oauth/callback/route.ts` — logs `accessToken` length (safe) but may log `businessAccountInfo` which includes owner email/phone
- `src/app/api/whatsapp/client.ts` — logs full message payload including recipient phone numbers

**Fix:** In `NODE_ENV === 'production'`, replace all `console.log` with a structured logger (e.g., `pino`) that redacts sensitive fields. At minimum, ensure tokens and API keys are never logged.

---

### HARDEN-05 — Webhook Endpoint Should Return 200 Immediately, Process Async

**File:** `src/app/api/whatsapp/webhooks/route.ts`

Meta's webhook documentation states that your server must respond to webhook events with a `200 OK` within **5 seconds** or Meta will consider the delivery failed and retry. The current POST handler does synchronous DB operations (multiple Prisma queries, message creation, campaign status updates) before returning. Under load, this can exceed 5 seconds, causing Meta to resend the webhook and creating duplicate processing.

**Fix — Queue the webhook event and acknowledge immediately:**
```typescript
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Acknowledge immediately — BEFORE processing
  // Queue the payload for async processing
  await prisma.webhookEvent.create({
    data: { payload: rawBody, status: 'pending', receivedAt: new Date() }
  });

  return NextResponse.json({ success: true }); // Return 200 immediately
}
```
Then process webhook events in the cron job. Alternatively, use a background job via Vercel Edge Functions or a queue.

---

## 15. FINAL CONSOLIDATED ACTION PLAN

A single prioritized reference for the complete set of issues across both parts of this audit:

---

### 🚨 P0 — Security Emergencies (Do Before Anything Else)

| ID | Action | File |
|---|---|---|
| P0-1 | Revoke live API token committed to git | `tests/send-bulk-messages.js` |
| P0-2 | Remove `expected: verifyToken` from webhook 403 | `src/app/api/whatsapp/webhooks/route.ts` |
| P0-3 | Remove hardcoded fallback verify token | Same file |
| P0-4 | Fix OAuth URL to read orgId from JWT, not query param | `src/app/api/whatsapp/oauth/url/route.ts` |

---

### 🔴 P1 — Blocking Production Launch

| ID | Action | Root Cause Ref |
|---|---|---|
| P1-1 | Fix contacts GET/PUT/DELETE to filter by organizationId | BUG-01 |
| P1-2 | Fix contacts import dedup + schema unique constraint | BUG-05, SCHEMA-01 |
| P1-3 | Fix MessageTemplate global unique constraint | BUG-03 |
| P1-4 | Fix campaign launch authorization to check org membership | BUG-02 |
| P1-5 | Remove inline processQueue from campaign launch | BUG-06, CODE-01 |
| P1-6 | Fix cron to iterate all orgs with pending work | MISS-01 |
| P1-7 | Fix WhatsAppPhoneNumber to store Meta Phone Number ID correctly | BUG-04, BUG-17 |
| P1-8 | Replace in-memory rate limiter with Upstash Redis | SEC-02, SEC-03 |
| P1-9 | Wrap registration in `$transaction` | BUG-14 |
| P1-10 | Fix PrismaClient double-instantiation in queue.ts | CODE-02 |
| P1-11 | Fix analytics to use organizationId filters | BUG-09, CODE-03 |
| P1-12 | Implement opt-out handling in webhook processor | MISS-04 |
| P1-13 | Remove mock data from automation page | MISS-02 |
| P1-14 | Fix cron route with CRON_SECRET header verification | HARDEN-02 |
| P1-15 | Add Middleware API auth guard for all /api/* routes | HARDEN-03 |
| P1-16 | Create Message records at send time (for webhook status lookups) | SCHEMA-02, ERR-01 |

---

### 🟡 P2 — Required Before Meta App Review / Public Beta

| ID | Action | Root Cause Ref |
|---|---|---|
| P2-1 | Implement server-side nonce storage for OAuth CSRF | BUG-20 |
| P2-2 | Fix Meta token refresh endpoint (fb_exchange_token) | BUG-12 |
| P2-3 | Fix JWT org refresh on token rotation | BUG-11 |
| P2-4 | Implement RBAC enforcement on mutation routes | SEC-04 |
| P2-5 | Require ENCRYPTION_KEY in production | SEC-06 |
| P2-6 | Fix Long-Lived token expiry to use Meta's actual `expires_in` | BUG-23 |
| P2-7 | Remove `access_token` from OAuth POST body | BUG-22 |
| P2-8 | Add File model to Prisma, implement file metadata | MISS-07 |
| P2-9 | Update Meta API version to v22.0 | META-02 |
| P2-10 | Populate Privacy Policy and Terms of Service pages | META-05 |
| P2-11 | Submit Meta App for review + Business Verification | META-05 |
| P2-12 | Add `organizationId` to AutomationWorkflow schema | SCHEMA-03 |
| P2-13 | Implement campaign stats rollup from queue events | ERR-01 |
| P2-14 | Add security headers in next.config.ts | HARDEN-01 |
| P2-15 | Webhook endpoint: acknowledge before processing | HARDEN-05 |
| P2-16 | Remove or properly integrate edge-cases.ts | UI-01, BUG-19 |

---

### 🟢 P3 — Backlog / Quality of Life

| ID | Action |
|---|---|
| P3-1 | Replace console.log of sensitive values with structured logger |
| P3-2 | Add React Error Boundaries across dashboard sections |
| P3-3 | Fix SelectTrigger without SelectValue (a11y) |
| P3-4 | Add campaign creation WhatsApp account selector for multi-account orgs |
| P3-5 | Remove click rate metric until tracking is implemented |
| P3-6 | Consolidate getToken() calls (called 3x per request in launch route) |
| P3-7 | Remove getDefaultOrgId() legacy fallback from settings-storage.ts |
| P3-8 | Add @@index on WhatsAppMessageQueue.whatsappAccountId |
| P3-9 | Add 130429 rate-limit pause logic (pause whole account, not per-message) |
| P3-10 | Migrate JSON string fields to Prisma Json type for MongoDB |
| P3-11 | Implement long-polling fallback for Inbox (Vercel incompatible with Socket.IO) |
| P3-12 | Implement billing route (Razorpay/Stripe) |
| P3-13 | Build template sync pagination verification |
| P3-14 | Add webhook re-subscription on credential reconnect |

---

## Closing Assessment

ProDigiChat has a well-thought-out architecture for a WhatsApp SaaS platform. The OAuth flow is sophisticated (5 WABA discovery strategies), the credential encryption system is production-grade, the queue/retry mechanism is structurally sound, and the Prisma schema is comprehensive. These are not easy things to get right and they show serious engineering investment.

The critical issues are all solvable in one focused sprint. The data isolation bugs (contacts/analytics scoped to `userId` instead of `organizationId`) appear to be a single systematic find-and-replace across 6–8 files. The credential storage bug (E.164 vs. Phone Number ID) is a 3-line fix with a data migration script for existing records. The rate limiting and cron issues are architectural but well-understood problems with proven solutions.

The platform is approximately **3–4 weeks of focused engineering effort** away from a production-ready state, assuming the P0 and P1 items are addressed first.