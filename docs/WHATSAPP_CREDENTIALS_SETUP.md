# WhatsApp Business API Credentials Guide

This guide explains how to find all the required credentials for connecting your WhatsApp Business account.

## Required Credentials

| Credential | Where to Find | Required For |
|------------|---------------|--------------|
| Facebook App ID | Meta Developer Portal | OAuth authentication |
| Facebook App Secret | Meta Developer Portal | OAuth authentication |
| WhatsApp Phone Number ID | Meta Developer Portal | Sending messages |
| WhatsApp Business Account ID | Meta Developer Portal | Managing templates |
| Access Token | From OAuth flow | API calls |

---

## Step 1: Create a Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Click "Log In" or "Sign Up"
3. Complete the registration process

---

## Step 2: Create a Facebook App

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Click **"My Apps"** in the top navigation
3. Click **"Create App"**
4. Select **"Other"** → **"Business"**
5. Enter your app name and contact email
6. Click "Create App"

---

## Step 3: Get Facebook App ID and App Secret

After creating your app:

1. Go to **App Settings** → **Basic**
2. You will see:
   - **App ID**: `1234567890123456` (18-digit number)
   - **App Secret**: `a1b2c3d4e5f6g7h8i9j0...` (click "Show" to reveal)

**Save these in your `.env` file:**
```env
META_APP_ID=1234567890123456
META_APP_SECRET=your_app_secret_here
```

---

## Step 4: Add WhatsApp Product

1. In your app dashboard, click **"Add products to your app"**
2. Find **WhatsApp** in the list
3. Click **"Set up"**

---

## Step 5: Get Phone Number ID and Business Account ID

After adding WhatsApp product:

1. Go to **WhatsApp** → **API Setup** (or Getting Started)
2. You will see:

### Temporary Access Token
- There's a **temporary access token** shown (for testing only)
- This expires after ~24 hours
- Use the OAuth flow instead for production

### Phone Number ID
- Find the **"From" phone number** section
- Each test phone number has an ID like: `123456789012345`
- This is your **Phone Number ID**

### Business Account ID
- Find the **"To" phone number** section
- Or look for **"Business Account ID"**: `123456789012345`
- This is your **WhatsApp Business Account ID**

---

## Step 6: Configure OAuth Redirect URI

1. Go to **App Settings** → **Facebook Login** → **Settings**
2. Under **Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:3000/api/whatsapp/oauth/callback
   ```
3. For production, add your domain:
   ```
   https://your-domain.com/api/whatsapp/oauth/callback
   ```

---

## Step 7: Set Up Webhooks (Optional)

1. Go to **WhatsApp** → **Configuration**
2. Click **"Edit"** next to Webhooks
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/whatsapp/webhooks
   ```
4. Enter a **Verify Token** (create a random string)
5. Click "Verify and Save"

---

## How the OAuth Flow Works

Instead of manually copying tokens, use the OAuth flow:

### Option A: Using the Script

```bash
npm run whatsapp init
```

This generates a URL like:
```
https://www.facebook.com/v18.0/dialog/oauth?client_id=123456789&redirect_uri=...
```

### Option B: Using the Dashboard

1. Go to your app's dashboard
2. Navigate to Settings → WhatsApp
3. Click "Connect WhatsApp Account"
4. Follow the OAuth prompts

---

## Where Credentials Are Stored

After OAuth flow completes, the following are stored in MongoDB:

| Field | Description |
|-------|-------------|
| `accessToken` | Long-lived access token (~60 days) |
| `businessAccountId` | WhatsApp Business Account ID |
| `businessAccountName` | Your business name |
| `phoneNumberId` | Default phone number ID |
| `messageTemplateNamespace` | For template management |

---

## Manual Setup (Alternative to OAuth)

If you prefer manual setup:

1. Get credentials from **WhatsApp** → **API Setup**
2. Add to your `.env`:
```env
WHATSAPP_API_KEY=your_temporary_or_permanent_token
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
```

Note: Temporary tokens expire. For production, use the OAuth flow.

---

## Testing Your Setup

After connecting via OAuth:

```bash
# Check status
npm run whatsapp status

# Run health check
npm run whatsapp health

# List phone numbers
npm run whatsapp phones

# List templates
npm run whatsapp templates
```

---

## Troubleshooting

### "No WhatsApp Business Account found"
- Create a WhatsApp Business Account at [business.facebook.com](https://business.facebook.com)
- Link it to your Meta Business Account

### "Token expired"
- Run `npm run whatsapp init` to reconnect
- Or use the dashboard to reconnect

### "Permission denied"
- Ensure your app has `whatsapp_business_management` permission
- Go to App Review → Permissions and Features

---

## Summary

| Credential | How to Get |
|------------|------------|
| **App ID** | App Settings → Basic |
| **App Secret** | App Settings → Basic (click "Show") |
| **Phone Number ID** | WhatsApp → API Setup |
| **Business Account ID** | WhatsApp → API Setup |
| **Access Token** | Generated via OAuth flow |

The easiest way to connect is:
1. Run `npm run whatsapp init`
2. Open the URL in a browser
3. Complete the OAuth flow
4. Credentials are automatically stored in the database
