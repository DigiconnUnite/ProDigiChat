# WABA Connection Flow - Technical Specification

> **Document Version:** 1.0  
> **Date:** 2026-03-12  
> **Status:** Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Existing Implementation Analysis](#existing-implementation-analysis)
3. [Screens to Implement](#screens-to-implement)
4. [Database Schema](#database-schema)
5. [API Routes Required](#api-routes-required)
6. [Component Architecture](#component-architecture)
7. [Implementation Tasks (Step-by-Step)](#implementation-tasks-step-by-step)
8. [UX/UI Guidelines](#uxui-guidelines)
9. [Error Handling](#error-handling)

---

## Overview

This document specifies the complete implementation of the WABA (WhatsApp Business Account) connection flow for the WhatsApp Marketing SaaS platform. The implementation follows the UX patterns used by leading platforms like AiSensy, WATI, and Interakt.

### Design Principles

1. **Simplicity First** - Users should be able to connect their WhatsApp account in under 2 minutes
2. **Clear Progress Indication** - Always show users what's happening during multi-step processes
3. **Actionable Error Messages** - When something fails, tell users exactly what to do
4. **Always Show Connection Health** - Dashboard header should always display WhatsApp connection status

---

## Existing Implementation Analysis

### What's Already Built ✅

| Component | Location | Status |
|-----------|----------|--------|
| Database Schema | `prisma/schema.prisma` | ✅ Complete |
| OAuth Service | `src/lib/whatsapp-oauth.ts` | ✅ Complete |
| OAuth Callback | `src/app/api/whatsapp/oauth/callback/route.ts` | ✅ Complete |
| Settings Tab | `src/components/settings/WhatsAppSettingsTab.tsx` | ✅ 80% Complete |
| Account Management | Same as above | ✅ Complete |
| Phone Number Management | Same as above | ✅ Complete |
| Token Refresh | `src/app/api/whatsapp/token/refresh/route.ts` | ✅ Complete |
| Health Check | `src/app/api/whatsapp/health/check/route.ts` | ✅ Complete |

### What's Missing ❌

| Feature | Priority | Complexity |
|---------|----------|------------|
| Dedicated Connection Entry Screen | High | Medium |
| Embedded Signup Progress UI | High | Medium |
| Connection Success Page | Medium | Low |
| Template Sync Page | Medium | Medium |
| Error Page with Solutions | Medium | Low |
| Dashboard Header Status | High | Medium |

---

## Screens to Implement

### 1. WABA Connection Entry Screen (`/dashboard/connect`)

**Purpose:** First screen users see when connecting WhatsApp

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Connect WhatsApp Business                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   🅣 Recommended     │  │      Advanced        │        │
│  │                      │  │                      │        │
│  │  Connect with Meta   │  │  Connect Using       │        │
│  │  (Embedded Signup)  │  │  Existing Credentials│        │
│  │                      │  │                      │        │
│  │  ○ No technical setup│  │  ○ For WABA owners  │        │
│  │  ○ Auto creates WABA │  │  ○ Requires keys    │        │
│  │  ○ Recommended       │  │                     │        │
│  │                      │  │                      │        │
│  │ [Connect via Facebook]│  │ [Connect Manually]  │        │
│  └──────────────────────┘  └──────────────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Already connected? [View Accounts]                          │
└─────────────────────────────────────────────────────────────┘
```

**Card 1 - Embedded Signup (Recommended):**
- Icon: Meta/Facebook logo
- Title: "Connect with Meta (Embedded Signup)"
- Description bullets:
  - No technical setup required
  - Automatically creates WABA
  - Recommended for new users
- Button: `[Connect via Facebook]` (Primary style)

**Card 2 - Manual (Advanced):**
- Icon: Key/Settings icon
- Title: "Connect Using Existing Credentials"
- Description bullets:
  - For existing WABA owners
  - Requires API credentials
- Button: `[Connect Manually]` (Secondary style)

---

### 2. Embedded Signup Flow Screen (Progress Stepper)

**Purpose:** Show users progress during OAuth connection

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              Connecting Your WhatsApp Account                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│   │ Step 1  │───▶│ Step 2  │───▶│ Step 3  │              │
│   │  ●  ✓   │    │  ●  ◐   │    │  ○      │              │
│   └─────────┘    └─────────┘    └─────────┘              │
│                                                             │
│   ┌─────────┐    ┌─────────┐                             │
│   │ Step 4  │───▶│ Step 5  │                             │
│   │  ○      │    │  ○      │                             │
│   └─────────┘    └─────────┘                             │
│                                                             │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  Current Step: Selecting Business Account                  │
│                                                             │
│  ████████████████████░░░░░░░░░░░░░░ 45%                │
│                                                             │
│  [Cancel]                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Steps:**
1. 🔴 **Login to Facebook** - User authenticates with Meta
2. 🟡 **Select Business Account** - Choose Business Manager
3. 🟡 **Create WhatsApp Account** - Create or select WABA
4. 🟡 **Add Phone Number** - Register WhatsApp number
5. 🟡 **Complete** - Finalize connection

**States per Step:**
- `pending` - Gray circle
- `in_progress` - Yellow spinning circle
- `completed` - Green checkmark
- `error` - Red X with retry option

---

### 3. Manual Credential Connection Screen

**Purpose:** For users who already have WABA

**Form Fields:**
```
┌─────────────────────────────────────────────────────────────┐
│              Connect WhatsApp Account Manually               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WhatsApp Business Account ID *                             │
│  ┌─────────────────────────────────────────────┐            │
│  │ 1029384756                                  │            │
│  └─────────────────────────────────────────────┘            │
│  📘 Where to find this?                                     │
│                                                             │
│  Phone Number ID *                                          │
│  ┌─────────────────────────────────────────────┐            │
│  │ 991957080667897                             │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  Permanent Access Token *                                   │
│  ┌─────────────────────────────────────────────┐            │
│  │ •••••••••••••••••••••••••••••••••••••••    │ [👁]       │
│  └─────────────────────────────────────────────┘            │
│  📘 Generate from Meta Business Manager                      │
│                                                             │
│  Business Manager ID (Optional)                             │
│  ┌─────────────────────────────────────────────┐            │
│  │ 123456789012345                             │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  Webhook Verify Token (Optional)                             │
│  ┌─────────────────────────────────────────────┐            │
│  │ my_verify_token                             │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  [Cancel]                                    [Connect]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Validation:**
- WABA ID: Required, numeric string
- Phone Number ID: Required, numeric string
- Access Token: Required, min 50 characters
- Business Manager ID: Optional
- Webhook Token: Optional

---

### 4. Connection Success Screen

**Purpose:** Show account info after successful connection

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              ✅ WhatsApp Account Connected                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🟢 Connected                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Account Information                                        │
│  ┌────────────────────┬────────────────────────────┐      │
│  │ Business Name      │ My Company Pvt Ltd          │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ Phone Number       │ +91 9876543210             │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ WABA ID            │ 1029384756                 │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ Phone Number ID    │ 991957080667897           │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ Account Status     │ 🟢 Active                  │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ Messaging Tier     │ 1,000 conversations/day    │      │
│  ├────────────────────┼────────────────────────────┤      │
│  │ Quality Rating     │ 🟢 High                   │      │
│  └────────────────────┴────────────────────────────┘      │
│                                                             │
│  [View in Settings]  [Send Test Message]  [Done]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. WhatsApp Settings Page (Enhanced)

**Location:** `/dashboard/settings?tab=whatsapp`

**Sections:**

**A. Account Info Card**
- Business Name
- WABA ID (with copy button)
- Phone Number
- Phone Number ID (with copy button)
- API Status: 🟢 Connected / 🔴 Disconnected
- Webhook Status: 🟢 Active / 🔴 Inactive

**B. Status Section**
- Last Sync: timestamp
- Token Expiry: date with countdown
- Messaging Limits
  - Tier Level: "Tier 1"
  - Daily Limit: "1,000"
  - Quality Rating: 🟢 High / 🟡 Medium / 🔴 Low

**C. Controls**
```
┌─────────────────────────────────────────────────────────────┐
│ [📤 Test Message] [🔄 Sync Templates] [🔃 Refresh Token]  │
│ [🗑️ Disconnect Account]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Phone Number Status Screen

**Location:** `/dashboard/settings/phone-numbers`

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              📱 Phone Numbers                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Phone: +91 9876543210                               │    │
│  │ Status: ✅ Verified                                 │    │
│  │ Quality Rating: 🟢 High                           │    │
│  │ Messaging Tier: 1,000/day                         │    │
│  │ Certificate: ✅ Active                            │    │
│  │                                                  [⚙️] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Phone: +91 9876543211                               │    │
│  │ Status: ⏳ Pending Verification                    │    │
│  │                                                  [📧] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Template Sync Screen

**Location:** `/dashboard/templates/sync`

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              📋 Template Sync Status                         │
├─────────────────────────────────────────────────────────────┤
│  Last Synced: 5 minutes ago        [🔄 Sync Now]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Approved (12)                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Welcome Message      [Use] [View]                   │    │
│  │ Order Confirmation   [Use] [View]                   │    │
│  │ OTP Verification     [Use] [View]                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ⏳ Pending (3)                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Promo Offer         [View Status]                   │    │
│  │ Newsletter          [View Status]                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ❌ Rejected (1)                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Discount Code      [View Reason] [Edit]             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 8. Error Screen

**Location:** `/dashboard/connect/error`

**Common Errors & Solutions:**

| Error | Reason | Solution |
|-------|--------|----------|
| `Invalid Access Token` | Token expired or wrong | Generate permanent token from Meta Business Manager |
| `No WhatsApp Business Account` | No WABA linked | Complete Embedded Signup to create WABA |
| `Phone Number Not Verified` | Number pending | Check WhatsApp for verification code |
| `Permission Denied` | Missing scopes | Reconnect with proper permissions |
| `Rate Limit Exceeded` | Too many requests | Wait 24 hours or upgrade tier |

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              ❌ Connection Failed                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Reason:                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Invalid Access Token                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Solution:                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Go to Meta Business Manager                      │    │
│  │ 2. Navigate to WhatsApp > Settings                 │    │
│  │ 3. Generate a permanent access token                │    │
│  │ 4. Copy and paste it here                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Try Again]  [Use Manual Setup]  [Contact Support]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 9. Dashboard Header Status

**Location:** Top-right of dashboard header

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Logo    Nav Links...                      [WhatsApp: 🟢] │
│                                          [+91 9876543210] │
│                                          [Quality: High]  │
│                                          [Limit: 1,000]  │
└─────────────────────────────────────────────────────────────┘
```

**States:**

| State | Icon | Color | Info Shown |
|-------|------|-------|------------|
| Connected | 🟢 | Green | Phone, Quality, Limit |
| Token Expiring | 🟡 | Yellow | "Reconnect Required" link |
| Disconnected | 🔴 | Red | "Connect Now" link |
| No Account | ⚪ | Gray | "Connect WhatsApp" |

---

## Database Schema

The database schema is already implemented in `prisma/schema.prisma`. Key models:

### WhatsAppCredential
```prisma
model WhatsAppCredential {
  id                        String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId            String   @db.ObjectId
  accountName               String?
  accessToken               String
  businessAccountId         String
  businessAccountName       String?
  phoneNumberId             String?
  connectionType            String   // "oauth", "embedded_signup", "manual"
  tokenExpiresAt            DateTime?
  qualityRating            String?
  accountStatus            String?
  connectedAt              DateTime
  // ... additional fields
  
  phoneNumbers             WhatsAppPhoneNumber[]
}
```

### WhatsAppPhoneNumber
```prisma
model WhatsAppPhoneNumber {
  id                 String   @id @default(auto()) @map("_id") @db.ObjectId
  credentialId       String   @db.ObjectId
  displayName        String
  phoneNumber        String
  verificationStatus String   // "PENDING", "IN_PROGRESS", "VERIFIED", "FLAGGED"
  qualityRating      String?
  messagingLimitTier String?
  // ...
}
```

---

## API Routes Required

### Existing Routes (Verify)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/whatsapp/oauth/url` | GET | Generate OAuth URL |
| `/api/whatsapp/oauth/callback` | GET | Handle OAuth callback |
| `/api/settings/whatsapp` | GET, PUT, POST, DELETE | CRUD operations |
| `/api/whatsapp/token/refresh` | POST | Refresh token |
| `/api/whatsapp/health/check` | GET, POST | Health status |
| `/api/whatsapp/accounts/refresh` | POST | Refresh account details |

### New Routes to Create
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/whatsapp/connect/manual` | POST | Validate & save manual credentials |
| `/api/whatsapp/phone-numbers` | GET | List phone numbers |
| `/api/whatsapp/templates/sync` | POST | Trigger template sync |
| `/api/whatsapp/test-message` | POST | Send test message |

---

## Component Architecture

```
src/
├── app/
│   ├── dashboard/
│   │   ├── connect/
│   │   │   ├── page.tsx              # Entry screen
│   │   │   ├── success/
│   │   │   │   └── page.tsx          # Success screen
│   │   │   ├── error/
│   │   │   │   └── page.tsx          # Error screen
│   │   │   └── manual/
│   │   │       └── page.tsx          # Manual connect
│   │   ├── settings/
│   │   │   └── phone-numbers/
│   │   │       └── page.tsx          # Phone status
│   │   └── templates/
│   │       └── sync/
│   │           └── page.tsx          # Template sync
│   └── api/
│       └── whatsapp/
│           ├── connect/
│           │   └── manual/
│           │       └── route.ts      # NEW
│           ├── test-message/
│           │   └── route.ts          # NEW
│           └── templates/
│               └── sync/
│                   └── route.ts      # ENHANCE
├── components/
│   ├── whatsapp/
│   │   ├── WhatsAppStatusIndicator.tsx    # NEW
│   │   ├── ConnectionCard.tsx             # NEW
│   │   ├── OAuthProgressStepper.tsx       # NEW
│   │   ├── ManualCredentialForm.tsx       # NEW
│   │   ├── AccountInfoCard.tsx            # NEW
│   │   ├── PhoneNumberCard.tsx            # NEW
│   │   ├── TemplateSyncStatus.tsx         # NEW
│   │   ├── ErrorDisplay.tsx               # NEW
│   │   └── EmbeddedSignupButton.tsx       # EXISTS
│   └── settings/
│       └── WhatsAppSettingsTab.tsx        # ENHANCE
└── lib/
    ├── whatsapp/
    │   ├── connection-flow.ts        # NEW - State management
    │   └── error-messages.ts         # NEW - Error mappings
    └── whatsapp-oauth.ts            # EXISTS
```

---

## Implementation Tasks (Step-by-Step)

### Phase 1: Core Connection Flow (Week 1)

#### Task 1.1: Create Connection Entry Page
- [ ] Create `src/app/dashboard/connect/page.tsx`
- [ ] Implement two-card layout (Embedded vs Manual)
- [ ] Add routing for success/error pages

#### Task 1.2: Create OAuth Progress Stepper
- [ ] Create `src/components/whatsapp/OAuthProgressStepper.tsx`
- [ ] Implement 5-step progress visualization
- [ ] Add state management for each step
- [ ] Handle timeout/error states

#### Task 1.3: Enhance Manual Credential Form
- [ ] Create `src/components/whatsapp/ManualCredentialForm.tsx`
- [ ] Add field validation with clear error messages
- [ ] Add tooltips with help text
- [ ] Implement credential verification API

#### Task 1.4: Create Success Page
- [ ] Create `src/app/dashboard/connect/success/page.tsx`
- [ ] Display full account information
- [ ] Add action buttons (Test Message, Settings, Done)

#### Task 1.5: Create Error Page
- [ ] Create `src/app/dashboard/connect/error/page.tsx`
- [ ] Map common errors to solutions
- [ ] Add "Try Again" and "Manual Setup" options

---

### Phase 2: Settings & Management (Week 2)

#### Task 2.1: Enhance WhatsApp Settings Tab
- [ ] Add "Test Message" button with dialog
- [ ] Add "Sync Templates" button
- [ ] Improve "Disconnect Account" UX with confirmation
- [ ] Add token expiry countdown

#### Task 2.2: Create Phone Number Status Page
- [ ] Create `src/app/dashboard/settings/phone-numbers/page.tsx`
- [ ] List all phone numbers with status
- [ ] Add verification actions
- [ ] Show quality rating and tier

#### Task 2.3: Enhance Template Sync
- [ ] Create `src/app/dashboard/templates/sync/page.tsx`
- [ ] Group templates by status (Approved/Pending/Rejected)
- [ ] Add sync button with last sync timestamp
- [ ] Show template details on click

---

### Phase 3: Dashboard Integration (Week 3)

#### Task 3.1: Create WhatsApp Status Indicator
- [ ] Create `src/components/whatsapp/WhatsAppStatusIndicator.tsx`
- [ ] Fetch connection status on mount
- [ ] Handle all connection states
- [ ] Add dropdown with quick actions

#### Task 3.2: Integrate Status in Header
- [ ] Modify `src/components/header.tsx`
- [ ] Add WhatsAppStatusIndicator to dashboard header
- [ ] Show status only on dashboard pages

#### Task 3.3: Add Real-time Updates
- [ ] Implement polling for token expiry
- [ ] Add webhook for connection status changes
- [ ] Show notifications for issues

---

## UX/UI Guidelines

### Color Palette
| Purpose | Color | Hex |
|---------|-------|-----|
| Primary (Connect) | Green | `#16a34a` |
| Secondary | Blue | `#3b82f6` |
| Success | Green | `#22c55e` |
| Warning | Yellow | `#eab308` |
| Error | Red | `#ef4444` |
| Background | Slate | `#f8fafc` |

### Typography
- **Headings:** Inter, bold, 24px-32px
- **Body:** Inter, regular, 14px-16px
- **Monospace (IDs):** JetBrains Mono, 12px-14px

### Spacing
- Card padding: 24px
- Section gaps: 24px
- Element gaps: 12px-16px

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid/expired token → Prompt reconnection
   - Permission denied → Show required permissions

2. **Configuration Errors**
   - Missing credentials → Highlight required fields
   - Invalid format → Show validation message

3. **API Errors**
   - Rate limit → Show countdown
   - Server error → Show retry option

### Error Message Format

```typescript
interface ErrorDisplay {
  title: string;        // "Connection Failed"
  reason: string;       // "Invalid Access Token"
  solution: string[];   // ["Step 1...", "Step 2..."]
  actions: {
    label: string;
    href?: string;
    onClick?: () => void;
  }[];
}
```

---

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Manual credentials validate correctly
- [ ] Progress stepper shows correct states
- [ ] Success page displays all account info
- [ ] Error page shows appropriate solutions
- [ ] Settings page actions work (test, sync, disconnect)
- [ ] Phone number status displays correctly
- [ ] Template sync shows all statuses
- [ ] Header indicator shows correct state
- [ ] Token expiry triggers warning

---

## Implementation Priority

| Priority | Tasks | Effort |
|----------|-------|--------|
| P0 (Must Have) | 1.1, 1.2, 1.4, 1.5, 3.1, 3.2 | 60% |
| P1 (Should Have) | 1.3, 2.1, 2.2 | 25% |
| P2 (Nice to Have) | 2.3, 3.3 | 15% |

---

## Notes

1. **Token Security:** All tokens should be encrypted at rest using the existing encryption utility
2. **Webhook URL:** Remind users that webhook URL must be configured in Meta App Dashboard
3. **Rate Limits:** Display rate limit warnings to users
4. **Multi-account:** Support multiple WhatsApp accounts per organization

---

*End of Specification*
