# WhatsApp OAuth Connection Script

This script provides a complete solution for connecting WhatsApp Business accounts via OAuth and managing all aspects of your WhatsApp marketing tool.

## Features

- **OAuth Authentication**: Connect WhatsApp Business accounts using Meta's OAuth flow
- **Multi-Account Support**: Connect multiple WhatsApp Business accounts per organization
- **Business Information**: Fetch all business details, phone numbers, and templates
- **Token Management**: Automatic token refresh and expiration handling
- **Message Sending**: Send text, template, and media messages
- **Webhook Configuration**: Automatic webhook setup for incoming messages
- **Health Monitoring**: Check connection status and API health

## Prerequisites

### Environment Variables

Add the following to your `.env.local` file:

```env
# Meta Developer Portal - Facebook App Credentials
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret

# OAuth Callback URL (must match Facebook App settings)
META_OAUTH_REDIRECT_URI=https://your-domain.com/api/whatsapp/oauth/callback

# Your Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# MongoDB Connection (for storing credentials)
MONGODB_URI=mongodb://localhost:27017/whatsapp-marketing
```

### Setting Up Meta App

1. Go to [Meta Developers Portal](https://developers.facebook.com/)
2. Create or use an existing App (type: Business)
3. Add **WhatsApp** product to your app
4. In App Settings > Basic:
   - Note your App ID
   - Note your App Secret
5. Add **Facebook Login** product:
   - Set Valid OAuth Redirect URIs to: `https://your-domain.com/api/whatsapp/oauth/callback`
6. In WhatsApp > Getting Started:
   - Note your Phone Number ID
   - Note your Business Account ID
   - Add test phone numbers

## Installation

The script is already configured in `package.json`. Install dependencies:

```bash
npm install
# or
bun install
```

## Usage

### Available Commands

```bash
# Initialize OAuth - Get authorization URL to connect an account
npm run whatsapp init -- --orgId=org_123

# Check connection status
npm run whatsapp status
npm run whatsapp status -- --orgId=org_123

# List connected business accounts
npm run whatsapp accounts
npm run whatsapp accounts -- --orgId=org_123

# List all phone numbers
npm run whatsapp phones
npm run whatsapp phones -- --orgId=org_123

# List all message templates
npm run whatsapp templates
npm run whatsapp templates -- --orgId=org_123

# Run health check
npm run whatsapp health
npm run whatsapp health -- --orgId=org_123

# Generate comprehensive business report
npm run whatsapp report
npm run whatsapp report -- --orgId=org_123

# Send a test message
npm run whatsapp send -- --to=+1234567890 --message="Hello from WhatsApp!"

# Disconnect an account
npm run whatsapp disconnect <credential-id>
```

### Command Details

#### `init` - Initialize OAuth

Generates an OAuth authorization URL. Open the URL in a browser to complete the OAuth flow:

```bash
npm run whatsapp init -- --orgId=org_abc123
```

The script will output:
- OAuth Authorization URL
- Instructions to complete the flow

After authorization, you'll be redirected to the callback URL which stores credentials automatically.

#### `status` - Check Connection Status

Shows all connected WhatsApp accounts:

```bash
npm run whatsapp status
```

Output:
```
=== WhatsApp Connection Status ===

Connected Accounts: 1

Account: My Business
  ID: 123456789
  Business Account ID: 987654321
  Business Account Name: My WhatsApp Business
  Default: Yes
  Active: Yes
  Connected: 2024-01-15T10:30:00.000Z
```

#### `accounts` - List Business Accounts

Shows detailed information about connected business accounts:

```bash
npm run whatsapp accounts
```

#### `phones` - List Phone Numbers

Shows all phone numbers associated with connected accounts:

```bash
npm run whatsapp phones
```

Output includes:
- Phone number
- Display name
- Verification status
- Quality score

#### `templates` - List Message Templates

Shows all WhatsApp message templates:

```bash
npm run whatsapp templates
```

Templates are grouped by status:
- APPROVED
- PENDING
- REJECTED
- PAUSED

#### `health` - Health Check

Runs comprehensive health checks on all connections:

```bash
npm run whatsapp health
```

Tests:
- ✓ Business Account API
- ✓ Phone Numbers API
- ✓ Templates API
- ✓ Access Token validity

#### `report` - Business Report

Generates comprehensive business report:

```bash
npm run whatsapp report
```

Report includes:
- Business account details
- All phone numbers with status
- All templates with approval status
- Webhook configuration
- API usage metrics

#### `send` - Send Test Message

Send a test message to verify the connection:

```bash
npm run whatsapp send -- --to=+1234567890 --message="Hello World!"
```

#### `disconnect` - Disconnect Account

Remove a connected WhatsApp account:

```bash
npm run whatsapp disconnect credential_id_123
```

## API Integration

The script is designed to work with the Next.js API routes in this project:

### OAuth Flow

1. **User clicks "Connect WhatsApp"** → Frontend calls `/api/whatsapp/oauth/url?orgId=xxx`
2. **API returns OAuth URL** → User redirected to Meta
3. **User authorizes** → Meta redirects to `/api/whatsapp/oauth/callback?code=xxx&state=xxx`
4. **API exchanges code for tokens** → Credentials stored in database
5. **User redirected to settings** → Shows "WhatsApp Connected"

### Sending Messages

Use the existing API routes:

```javascript
// Send a message
const response = await fetch('/api/whatsapp/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+1234567890',
    templateId: 'template_name',
    variables: { name: 'John' }
  })
});
```

## WhatsApp Marketing Tool Workflow

### 1. Connect Account
```bash
npm run whatsapp init -- --orgId=org_123
```

### 2. Verify Connection
```bash
npm run whatsapp status
npm run whatsapp health
```

### 3. Setup Templates
```bash
npm run whatsapp templates
```

### 4. Import Contacts
Upload contacts via the dashboard or API.

### 5. Create Campaign
Use the dashboard to create a campaign with templates.

### 6. Send & Monitor
- Monitor delivery in dashboard
- Check analytics
- Handle replies via webhook

## Error Handling

### Common Errors

**Token Expired**
```
Error: Token expired or invalid
Solution: Run `npm run whatsapp refresh` or reconnect via init
```

**No WhatsApp Business Account**
```
Error: No WhatsApp Business Account found
Solution: Create a WhatsApp Business Account at business.facebook.com
```

**Permission Denied**
```
Error: Permission denied
Solution: Ensure app has whatsapp_business_management permission
```

## File Structure

```
scripts/
  whatsapp-oauth-connection.js    # Main script

src/
  app/api/whatsapp/
    oauth/
      url/route.ts               # Generate OAuth URL
      callback/route.ts         # Handle OAuth callback
    token/
      refresh/route.ts           # Refresh tokens
    phone-numbers/route.ts       # Get phone numbers
    templates/route.ts           # Get templates
    messages.ts                  # Send messages
    client.ts                    # WhatsApp API client
    auth.ts                      # Auth utilities

lib/
  whatsapp-oauth.ts              # OAuth service class
  prisma.ts                      # Database client

prisma/
  schema.prisma                  # Database schema
```

## Database Schema

The following models store WhatsApp data:

- `WhatsAppCredential` - OAuth credentials per organization
- `WhatsAppPhoneNumber` - Phone numbers linked to credentials
- `MessageTemplate` - WhatsApp message templates
- `Message` - Message log
- `WhatsAppMessageQueue` - Message queue for sending

## Security

- Access tokens are encrypted before storage
- OAuth state parameter prevents CSRF
- Token refresh is automatic
- Webhook verification ensures authenticity

## Troubleshooting

### Check Logs
```bash
# View server logs
tail -f server.log

# View development logs
tail -f dev.log
```

### Debug OAuth
```bash
# Run diagnostic endpoint
curl https://your-domain.com/api/whatsapp/oauth/diagnostic
```

### Test Webhooks
```bash
# Check webhook status
curl https://your-domain.com/api/whatsapp/webhooks
```

## Additional Resources

- [Meta WhatsApp API Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business Management API](https://developers.facebook.com/docs/graph-api/reference/whatsapp-business-account)
- [WhatsApp Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Configuration](https://developers.facebook.com/docs/whatsapp/webhooks)
