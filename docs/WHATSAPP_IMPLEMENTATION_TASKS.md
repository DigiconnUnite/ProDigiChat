# WhatsApp Integration Implementation Tasks

**Date:** March 5, 2026  
**Project:** WhatsApp Marketing Tool  
**Task Type:** Implementation Guide

---

## Overview

This file contains the step-by-step implementation tasks to fix the WhatsApp integration according to your requirements:

1. **Keep OAuth (Embedded Signup)** - Already complete ✅
2. **Modify Manual Configuration** - Remove Facebook App ID/Secret requirements
3. **Use .env credentials for OAuth** - Already complete ✅

---

## Task List

### Phase 1: Backend Changes (Priority 1)

#### Task 1.1: Update WhatsApp Settings API - Remove FB App ID/Secret Validation

**File:** `src/app/api/settings/whatsapp/route.ts`

**Changes Required:**

1. **Remove Facebook App ID validation** (around lines 433-443)
   - Current code validates `facebookAppId` format
   - Need to make this optional/not required

2. **Update config destructuring** (around line 420)
   - Current: `const { apiKey, phoneNumberId, businessAccountId, webhookSecret, facebookAppId, facebookAppSecret } = config;`
   - Change to: `const { apiKey, phoneNumberId, businessAccountId, webhookSecret } = config;`
   - Or keep but make optional with fallback to null

3. **Update credential data** (around lines 479-497)
   - Current: `facebookAppId: facebookAppId?.trim() || null,`
   - Change to: Don't include or set to null

**Step-by-Step:**

```typescript
// Line ~420 - Update destructuring
// BEFORE:
const { apiKey, phoneNumberId, businessAccountId, webhookSecret, facebookAppId, facebookAppSecret } = config;

// AFTER:
const { apiKey, phoneNumberId, businessAccountId, webhookSecret } = config;
```

```typescript
// Line ~433-443 - Remove or make optional validation
// BEFORE:
if (facebookAppId?.trim()) {
  const facebookAppIdRegex = /^\d+$/;
  if (!facebookAppIdRegex.test(facebookAppId.trim())) {
    return NextResponse.json({ 
      error: "Facebook App ID must be numeric only", 
      validationError: true,
      field: "facebookAppId"
    }, { status: 400 });
  }
}

// AFTER: (Remove this entire block or comment it out)
```

```typescript
// Line ~494-496 - Remove from credential data
// BEFORE:
facebookAppId: facebookAppId?.trim() || null,
facebookAppSecret: facebookAppSecret?.trim() || null,

// AFTER: (Remove these lines or set to null)
```

---

### Phase 2: Frontend Changes (Priority 1)

#### Task 2.1: Remove Facebook App ID Field from Manual Config Form

**File:** `src/components/settings/WhatsAppSettingsTab.tsx`

**Step-by-Step:**

1. **Remove Facebook App ID state** (around line 150-157)
   - Current: `facebookAppId: '',`
   - Remove this line

2. **Remove Facebook App Secret state** (around line 150-157)
   - Current: `facebookAppSecret: ''`
   - Remove this line

3. **Update manualConfig state initialization** (lines 150-157)
   ```typescript
   // BEFORE:
   const [manualConfig, setManualConfig] = useState({
     apiKey: '',
     phoneNumberId: '',
     businessAccountId: '',
     webhookSecret: '',
     facebookAppId: '',
     facebookAppSecret: ''
   });
   
   // AFTER:
   const [manualConfig, setManualConfig] = useState({
     apiKey: '',
     phoneNumberId: '',
     businessAccountId: '',
     webhookSecret: ''
   });
   ```

4. **Remove Facebook App ID input field** (around lines 932-958)
   - This entire div block needs to be removed
   - The field shows as required with orange asterisk

5. **Remove Facebook App Secret input field** (around lines 959-993)
   - This entire div block needs to be removed

6. **Update validation in saveManualConfig** (around lines 440-447)
   - Current: Validates Facebook App ID format
   - Remove this validation

7. **Update saveManualConfig config object** (around lines 452-461)
   ```typescript
   // BEFORE:
   config: manualConfig,
   
   // AFTER:
   config: {
     apiKey: manualConfig.apiKey,
     phoneNumberId: manualConfig.phoneNumberId,
     businessAccountId: manualConfig.businessAccountId,
     webhookSecret: manualConfig.webhookSecret
   },
   ```

---

### Phase 3: Verification (Priority 2)

#### Task 3.1: Test Manual Configuration Flow

1. Start the development server
2. Navigate to Settings → WhatsApp
3. Scroll to Manual Configuration section
4. Verify fields:
   - ✅ WhatsApp API Access Token (required)
   - ✅ Phone Number ID (required)
   - ✅ Business Account ID (required)
   - ✅ Webhook Secret (optional)
5. Enter test credentials
6. Click "Add Account"
7. Verify success

#### Task 3.2: Test OAuth Flow

1. Click "Connect with Meta" button
2. Verify redirects to Meta OAuth
3. Complete authorization
4. Verify redirects back to settings
5. Verify account shows as connected

---

### Phase 4: Cleanup (Priority 3)

#### Task 4.1: Remove Unused Code

- Check for any remaining references to `facebookAppId` or `facebookAppSecret` in:
  - Settings storage
  - Type definitions
  - API responses

#### Task 4.2: Update Documentation

- Update any documentation that mentions Facebook App ID/Secret requirements
- Update setup guides to reflect new flow

---

## Quick Reference

### Files Modified

| File | Changes | Status |
|------|---------|--------|
| `src/app/api/settings/whatsapp/route.ts` | Remove FB validation | [ ] |
| `src/components/settings/WhatsAppSettingsTab.tsx` | Remove FB fields | [ ] |

### Fields After Changes

**Manual Configuration Form:**
- ✅ WhatsApp API Access Token (Required)
- ✅ Phone Number ID (Required)
- ✅ Business Account ID (Required)
- ✅ Webhook Secret (Optional)

**OAuth Flow:**
- Uses `META_APP_ID` and `META_APP_SECRET` from `.env`
- No changes needed

---

## Troubleshooting

### Issue: Still showing validation errors

**Solution:** Clear browser cache or restart the development server

### Issue: Old values still in form

**Solution:** Refresh the page - form state should reset

### Issue: API returns error

**Solution:** Check server console for detailed error messages

---

## Rollback Instructions

If you need to rollback these changes:

1. **Backend:** Revert changes to `src/app/api/settings/whatsapp/route.ts`
2. **Frontend:** Revert changes to `src/components/settings/WhatsAppSettingsTab.tsx`
3. Clear browser cache

---

**Last Updated:** March 5, 2026  
**Version:** 1.0
