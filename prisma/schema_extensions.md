# Prisma Schema Extensions for Settings Functionality

## Overview

This document describes the schema extensions needed to implement comprehensive settings functionality in the WhatsApp Marketing Tool. The current schema has several limitations that prevent proper implementation of advanced settings:

### Current Limitations

1. **Team Model is Too Simple**: The existing `Team` model lacks relationships with users, settings, and other resources needed for multi-tenant functionality.

2. **No Settings Storage**: There's no dedicated way to store organization-wide or user-specific settings. Settings are currently stored as JSON strings in other models (e.g., `apiCredentials` in `WhatsappNumber`, `messageContent` in `Campaign`).

3. **No API Key Management**: There's no model for managing API keys, which is essential for integrations and third-party access.

4. **No Webhook Infrastructure**: Webhooks are mentioned in the settings page plans but lack database support for configuration and delivery logging.

5. **No User Preferences**: User-specific preferences (theme, notifications, etc.) cannot be stored properly.

### Why We Need Schema Extensions

- **Multi-tenancy**: Support for multiple organizations/teams with isolated data
- **Configuration Management**: Store and manage complex settings structures
- **Security**: Proper API key management with scopes and expiration
- **Integrations**: Webhook support for event-driven architectures
- **User Experience**: Personalized settings per user

---

## New Models to Add

### 1. Organization Model

The `Organization` model replaces and extends the existing `Team` model. It provides a multi-tenant structure with proper relationships to users, settings, and resources.

```prisma
// Organization model - replaces/extends Team model for multi-tenancy
model Organization {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  slug        String   @unique // URL-friendly identifier for API calls
  description String?
  logoUrl     String?
  
  // Subscription and billing
  subscriptionTier   String   @default("free") // "free", "starter", "professional", "enterprise"
  subscriptionStatus String   @default("active") // "active", "past_due", "canceled", "expired"
  subscriptionExpiresAt DateTime?
  
  // Limits and quotas
  maxContacts      Int      @default(1000)
  maxWhatsappNumbers Int     @default(1)
  maxMessagesPerMonth Int   @default(1000)
  maxApiKeys       Int      @default(5)
  maxWebhooks      Int      @default(10)
  maxStorageMb     Int      @default(100)
  
  // Usage tracking
  currentContacts      Int      @default(0)
  currentMessagesThisMonth Int @default(0)
  storageUsedMb        Int      @default(0)
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Owner (first admin user)
  ownerId    String?  @db.ObjectId
  
  // Relations
  settings      OrganizationSettings?
  users         OrganizationMember[]
  whatsappNumbers WhatsappNumber[]
  apiKeys       ApiKey[]
  webhooks      Webhook[]
  campaigns     Campaign[]
  contacts      Contact[]
  automationWorkflows AutomationWorkflow[]
  messageTemplates MessageTemplate[]
  activityLogs  ActivityLog[]
  
  @@map("organizations")
}

// Organization membership - links users to organizations with roles
model OrganizationMember {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @db.ObjectId
  userId         String   @db.ObjectId
  role           String   @default("member") // "owner", "admin", "manager", "member", "viewer"
  invitedAt      DateTime @default(now())
  acceptedAt     DateTime?
  isActive       Boolean  @default(true)
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, userId])
  @@map("organizationMembers")
}
```

### 2. OrganizationSettings Model

Stores organization-wide configuration settings using JSON for flexibility.

```prisma
// Organization-specific settings - stores all configuration as JSON
model OrganizationSettings {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @unique @db.ObjectId
  
  // Core settings (JSON)
  general        String   @default("{}") // JSON: timezone, language, dateFormat, currency
  notifications  String   @default("{}") // JSON: email, push, slack integrations
  security       String   @default("{}") // JSON: mfaRequired, passwordPolicy, sessionTimeout
  messaging      String   @default("{}") // JSON: defaultSender, autoResponse, businessHours
  integrations   String   @default("{}") // JSON: external APIs, CRM sync, analytics
  
  // WhatsApp-specific settings
  whatsapp       String   @default("{}") // JSON: templateApproval, qualityThresholds, autoRetry
  
  // Compliance settings
  compliance     String   @default("{}") // JSON: gdpr, dataRetention, consentManagement
  
  // Branding settings
  branding       String   @default("{}") // JSON: primaryColor, logo, emailFooter
  
  // Audit
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  updatedBy      String?  @db.ObjectId
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@map("organizationSettings")
}
```

### 3. UserSettings Model

Stores user-specific preferences and settings.

```prisma
// User-specific preferences - stores individual user settings
model UserSettings {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  userId         String   @unique @db.ObjectId
  
  // UI preferences (JSON)
  ui             String   @default("{}") // JSON: theme, compactMode, sidebarCollapsed, dashboardLayout
  
  // Notification preferences (JSON)
  notifications  String   @default("{}") // JSON: emailDigest, pushNotifications, soundEnabled
  
  // Communication preferences (JSON)
  communication  String   @default("{}") // JSON: autoAssign, defaultView, defaultSegment
  
  // Editor preferences (JSON)
  editor         String   @default("{}") // JSON: autoSave, spellCheck, markdownMode
  
  // Accessibility (JSON)
  accessibility  String   @default("{}") // JSON: fontSize, highContrast, keyboardShortcuts
  
  // Personal info for consistency
  displayName    String?
  avatarUrl      String?
  bio            String?
  
  // Session management
  lastActiveAt   DateTime?
  lastLoginAt    DateTime?
  
  // Audit
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("userSettings")
}
```

### 4. ApiKey Model

Manages API keys for programmatic access with scopes and expiration.

```prisma
// API Key model for programmatic access
model ApiKey {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @db.ObjectId
  
  // Key identification
  name           String   // Human-readable name for the key
  prefix         String   @unique // First 8 characters for identification (e.g., "wa_live_")
  
  // Key data (full key stored only once, never retrievable after creation)
  hashedKey      String   // Scrypt/hash of the full key
  encryptedKey   String?  // Encrypted backup of the key (optional, for recovery)
  
  // Key metadata
  scopes         String   // JSON array: ["campaigns:read", "contacts:write", "webhooks:manage"]
  permissions    String   @default("[]") // JSON: deprecated, use scopes instead
  
  // Usage limits
  rateLimit      Int      @default(1000) // Requests per hour
  maxRequests    Int?     // Total requests allowed (null = unlimited)
  requestCount   BigInt   @default(0)
  
  // Expiration
  expiresAt      DateTime?
  lastUsedAt     DateTime?
  
  // Status
  isActive       Boolean  @default(true)
  lastUsedIp     String?
  
  // Audit
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  createdBy      String   @db.ObjectId
  
  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Access logs
  accessLogs     ApiKeyAccessLog[]
  
  @@map("apiKeys")
}

// API Key access log for security monitoring
model ApiKeyAccessLog {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  apiKeyId  String   @db.ObjectId
  endpoint  String   // API endpoint called
  method    String   // HTTP method
  ipAddress String?
  userAgent String?
  statusCode Int?
  responseTime Int? // in milliseconds
  createdAt DateTime @default(now())
  
  // Relations
  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  
  @@index([apiKeyId, createdAt])
  @@map("apiKeyAccessLogs")
}
```

### 5. Webhook Model

Configures webhooks for event-driven integrations.

```prisma
// Webhook configuration for event-driven integrations
model Webhook {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @db.ObjectId
  
  // Webhook identification
  name           String
  description    String?
  
  // URL configuration
  url            String   // HTTPS webhook URL
  secret         String?  // Optional secret for signature verification
  
  // Events to subscribe to
  events         String   // JSON array: ["message.sent", "contact.created", "campaign.completed"]
  
  // Status and monitoring
  status         String   @default("active") // "active", "paused", "disabled", "failing"
  lastTriggeredAt DateTime?
  consecutiveFailures Int @default(0)
  
  // Retry configuration
  retryEnabled   Boolean  @default(true)
  maxRetries     Int      @default(3)
  retryDelayMs   Int      @default(1000) // Exponential backoff base
  
  // Authentication
  authType       String   @default("none") // "none", "basic", "bearer", "hmac"
  authConfig     String   @default("{}") // JSON: credentials for authType
  
  // Headers (custom headers to include)
  customHeaders  String   @default("{}") // JSON: additional HTTP headers
  
  // Filters (optional event filtering)
  filters        String   @default("{}") // JSON: conditions for when to trigger
  
  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  createdBy      String   @db.ObjectId
  
  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Delivery logs
  deliveryLogs   WebhookDeliveryLog[]
  
  @@map("webhooks")
}

// Webhook delivery log for monitoring and debugging
model WebhookDeliveryLog {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  webhookId   String   @db.ObjectId
  
  // Event information
  event       String   // Event type (e.g., "message.sent")
  eventId     String   @unique // Unique ID for idempotency
  payload     String   // Full JSON payload that was sent
  
  // Delivery information
  url         String   // URL that was called
  method      String   @default("POST")
  headers     String   // Request headers (JSON)
  
  // Response information
  statusCode  Int?
  responseBody String?
  responseHeaders String? // JSON
  
  // Timing
  attemptNumber Int     @default(1)
  sentAt      DateTime @default(now())
  receivedAt  DateTime?
  durationMs  Int?     // Total time from event to response
  
  // Status
  status      String   // "pending", "success", "failed", "retrying", "abandoned"
  errorMessage String?
  errorCode   String?
  
  // Next retry (if applicable)
  nextRetryAt DateTime?
  
  // Relations
  webhook     Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  
  @@index([webhookId, status])
  @@index([webhookId, sentAt])
  @@map("webhookDeliveryLogs")
}
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Organization                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ id, name, slug, subscription_tier, limits, usage tracking          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         │ 1:1                                                                │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OrganizationSettings                              │   │
│  │ general, notifications, security, messaging, integrations, etc.   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│         │                                                                    │
│         │ 1:N                                                                │
│         ├───────────────────────────────────────────────────────────────    │
│         │         │         │         │         │         │               │
│         ▼         ▼         ▼         ▼         ▼         ▼               │
│  ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐       │
│  │   User   │ │WhatsApp │ │ ApiKey  │ │ Webhook │ │  Campaign    │       │
│  │(members) │ │ Numbers │ │         │ │         │ │              │       │
│  └──────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────────┘       │
│                                                                              │
│  Each user can also have their own preferences:                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        UserSettings                                  │   │
│  │ ui, notifications, communication, editor, accessibility            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Details

#### Organization ↔ User (Many-to-Many through OrganizationMember)

```prisma
// User can belong to multiple organizations
// Organization can have multiple users with different roles

model User {
  // ... existing fields ...
  
  // New relations
  organizationMembers OrganizationMember[]
  userSettings        UserSettings?
  
  // Update existing relations to be organization-scoped
  createdCampaigns    Campaign[]         // @relation("CampaignCreator")
  createdWorkflows     AutomationWorkflow[] // @relation("WorkflowCreator")
  sentMessages         Message[]          @relation("MessageSender")
  createdSegments      Segment[]          // @relation("SegmentCreator")
  activityLogs         ActivityLog[]
  
  // Organizations created by this user (as owner)
  ownedOrganizations   Organization[]    @relation("OrganizationOwner")
}

// User belongs to organizations via membership
model OrganizationMember {
  userId         String   @db.ObjectId
  organizationId String   @db.ObjectId
  role           String   // "owner", "admin", "manager", "member", "viewer"
  
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### Organization ↔ WhatsAppNumber (One-to-Many)

```prisma
// Each WhatsApp number belongs to one organization
// Organization can have multiple WhatsApp numbers

model Organization {
  // ... existing fields ...
  whatsappNumbers WhatsappNumber[]
}

model WhatsappNumber {
  // ... existing fields ...
  
  // New relation
  organizationId String?  @db.ObjectId
  organization   Organization? @relation(fields: [organizationId], references: [id])
}
```

#### Organization ↔ Campaign (One-to-Many)

```prisma
// Each campaign belongs to one organization
// Organization can have multiple campaigns

model Organization {
  // ... existing fields ...
  campaigns Campaign[]
}

model Campaign {
  // ... existing fields ...
  
  // Update existing relation
  createdBy String?  @db.ObjectId
  
  // New relation
  organizationId String?  @db.ObjectId
  organization   Organization? @relation(fields: [organizationId], references: [id])
}
```

#### Organization ↔ Webhook (One-to-Many)

```prisma
// Each webhook belongs to one organization
// Organization can have multiple webhooks

model Organization {
  // ... existing fields ...
  maxWebhooks Int @default(10)
  webhooks    Webhook[]
}

model Webhook {
  // ... existing fields ...
  organizationId String @db.ObjectId
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### Organization ↔ ApiKey (One-to-Many)

```prisma
// Each API key belongs to one organization
// Organization can have multiple API keys

model Organization {
  // ... existing fields ...
  maxApiKeys Int @default(5)
  apiKeys    ApiKey[]
}

model ApiKey {
  // ... existing fields ...
  organizationId String @db.ObjectId
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

#### User ↔ UserSettings (One-to-One)

```prisma
// Each user has exactly one settings record

model User {
  // ... existing fields ...
  userSettings UserSettings?
}

model UserSettings {
  // ... existing fields ...
  userId String @unique @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Webhook ↔ WebhookDeliveryLog (One-to-Many)

```prisma
// Each webhook has many delivery logs
// Each delivery log belongs to one webhook

model Webhook {
  // ... existing fields ...
  deliveryLogs WebhookDeliveryLog[]
}

model WebhookDeliveryLog {
  // ... existing fields ...
  webhookId String @db.ObjectId
  webhook   Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)
}
```

#### ApiKey ↔ ApiKeyAccessLog (One-to-Many)

```prisma
// Each API key has many access logs
// Each access log belongs to one API key

model ApiKey {
  // ... existing fields ...
  accessLogs ApiKeyAccessLog[]
}

model ApiKeyAccessLog {
  // ... existing fields ...
  apiKeyId String @db.ObjectId
  apiKey   ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
}
```

---

## Migration Steps

### Phase 1: Preparation (Non-Breaking)

1. **Backup Database**
   ```bash
   # Create a backup before any migration
   mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d)
   ```

2. **Create Migration File**
   ```bash
   # Generate a new Prisma migration
   npx prisma migrate dev --name add_organization_settings
   ```

3. **Add New Models** (Schema.prisma additions)

   Add all new models to `prisma/schema.prisma`:

   ```prisma
   // Add after existing models
   
   model Organization {
     id        String   @id @default(auto()) @map("_id") @db.ObjectId
     name      String
     slug      String   @unique
     // ... all fields from above
   }
   
   model OrganizationMember {
     // ... fields
   }
   
   model OrganizationSettings {
     // ... fields
   }
   
   model UserSettings {
     // ... fields
   }
   
   model ApiKey {
     // ... fields
   }
   
   model ApiKeyAccessLog {
     // ... fields
   }
   
   model Webhook {
     // ... fields
   }
   
   model WebhookDeliveryLog {
     // ... fields
   }
   ```

### Phase 2: Data Migration (Optional - for existing data)

1. **Migrate Team → Organization**
   ```javascript
   // Migration script to convert Team data to Organization
   const teams = await prisma.team.findMany();
   
   for (const team of teams) {
     await prisma.organization.create({
       data: {
         name: team.name,
         slug: team.name.toLowerCase().replace(/\s+/g, '-'),
         ownerId: null, // Will need to be set manually
         // ... other fields
       }
     });
   }
   ```

2. **Migrate Users to OrganizationMembers**
   ```javascript
   // For each existing user, create an organization membership
   // This depends on your migration strategy
   ```

### Phase 3: Apply Changes

1. **Run Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Generate Client**
   ```bash
   npx prisma generate
   ```

3. **Verify Migration**
   ```bash
   # Check that all models exist
   npx prisma db pull
   ```

### Phase 4: Application Updates

1. **Update Authentication Middleware**
   - Add organization context to requests
   - Verify user membership and roles

2. **Update API Routes**
   - Add organization ID to CRUD operations
   - Implement role-based access control

3. **Update Seed Data**
   - Add default organization settings
   - Add default webhook event types

---

## Seed Data

### Default Organization Settings

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default organization settings template
  const defaultGeneralSettings = {
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    businessHours: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '09:00', end: '12:00' },
      sunday: null,
    },
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };

  const defaultNotificationSettings = {
    email: {
      enabled: true,
      frequency: 'instant', // 'instant', 'daily_digest', 'weekly_digest'
      events: [
        'campaign.started',
        'campaign.completed',
        'campaign.failed',
        'message.failed',
        'contact.opted_out',
      ],
    },
    push: {
      enabled: false,
      events: ['campaign.started', 'campaign.failed'],
    },
    slack: {
      enabled: false,
      webhookUrl: null,
      events: [],
    },
  };

  const defaultSecuritySettings = {
    mfaRequired: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    sessionTimeout: 3600, // 1 hour in seconds
    ipWhitelist: [],
    twoFactorEnabled: false,
  };

  const defaultMessagingSettings = {
    defaultSender: null,
    autoResponse: {
      enabled: false,
      message: null,
      delay: 0,
    },
    deliveryReports: {
      enabled: true,
      retentionDays: 30,
    },
    typingIndicators: {
      enabled: true,
    },
    readReceipts: {
      enabled: true,
    },
  };

  const defaultComplianceSettings = {
    gdpr: {
      enabled: false,
      dataRetentionDays: 365,
      rightToDeletion: true,
      rightToPortability: true,
      consentRequired: true,
    },
    optIn: {
      defaultStatus: 'pending',
      doubleOptIn: false,
      emailConfirmationRequired: false,
    },
    dataExport: {
      enabled: true,
      format: 'json',
    },
  };

  const defaultBrandingSettings = {
    primaryColor: '#25D366', // WhatsApp green
    logo: null,
    emailFooter: 'Sent from WhatsApp Marketing Tool',
    customDomain: null,
  };

  // Create a default organization for development
  const defaultOrg = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo-organization',
      description: 'Default organization for demonstration',
      subscriptionTier: 'professional',
      maxContacts: 10000,
      maxWhatsappNumbers: 5,
      maxMessagesPerMonth: 100000,
      maxApiKeys: 10,
      maxWebhooks: 20,
      maxStorageMb: 1000,
      settings: {
        create: {
          general: JSON.stringify(defaultGeneralSettings),
          notifications: JSON.stringify(defaultNotificationSettings),
          security: JSON.stringify(defaultSecuritySettings),
          messaging: JSON.stringify(defaultMessagingSettings),
          compliance: JSON.stringify(defaultComplianceSettings),
          branding: JSON.stringify(defaultBrandingSettings),
        },
      },
    },
  });

  console.log('✅ Default organization created:', defaultOrg.id);
  console.log('✅ Default settings created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Webhook Event Types

```typescript
// Available webhook events
export const WEBHOOK_EVENTS = {
  // Message events
  'message.sent': 'When a message is sent',
  'message.delivered': 'When a message is delivered',
  'message.read': 'When a message is read',
  'message.failed': 'When a message fails to send',
  'message.received': 'When a message is received',
  
  // Campaign events
  'campaign.created': 'When a campaign is created',
  'campaign.started': 'When a campaign starts',
  'campaign.paused': 'When a campaign is paused',
  'campaign.completed': 'When a campaign completes',
  'campaign.failed': 'When a campaign fails',
  
  // Contact events
  'contact.created': 'When a contact is created',
  'contact.updated': 'When a contact is updated',
  'contact.deleted': 'When a contact is deleted',
  'contact.opted_in': 'When a contact opts in',
  'contact.opted_out': 'When a contact opts out',
  
  // Automation events
  'automation.created': 'When an automation is created',
  'automation.activated': 'When an automation is activated',
  'automation.deactivated': 'When an automation is deactivated',
  'automation.triggered': 'When an automation is triggered',
  
  // Number events
  'number.created': 'When a WhatsApp number is added',
  'number.verified': 'When a number is verified',
  'number.flagged': 'When a number is flagged',
  'number.disabled': 'When a number is disabled',
  
  // Webhook events
  'webhook.test': 'Test webhook payload',
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;
```

### Default User Settings

```typescript
// Default user preferences
export const DEFAULT_USER_SETTINGS = {
  ui: {
    theme: 'system', // 'light', 'dark', 'system'
    compactMode: false,
    sidebarCollapsed: false,
    dashboardLayout: 'grid', // 'grid', 'list'
    fontSize: 'medium', // 'small', 'medium', 'large'
  },
  notifications: {
    emailDigest: 'daily', // 'instant', 'daily', 'weekly', 'none'
    pushNotifications: true,
    soundEnabled: true,
    desktopNotifications: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
  communication: {
    autoAssign: false,
    defaultView: 'all', // 'all', 'unread', 'starred'
    defaultSegment: null,
    enableShortcuts: true,
  },
  editor: {
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    spellCheck: true,
    markdownMode: false,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
    keyboardShortcuts: true,
  },
};
```

---

## TypeScript Types

### Organization Types

```typescript
// types/organization.ts

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'expired';
  subscriptionExpiresAt?: Date;
  maxContacts: number;
  maxWhatsappNumbers: number;
  maxMessagesPerMonth: number;
  maxApiKeys: number;
  maxWebhooks: number;
  maxStorageMb: number;
  currentContacts: number;
  currentMessagesThisMonth: number;
  storageUsedMb: number;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  invitedAt: Date;
  acceptedAt?: Date;
  isActive: boolean;
  organization?: Organization;
  user?: User;
}
```

### Organization Settings Types

```typescript
// types/organization-settings.ts

export interface GeneralSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  businessHours: BusinessHours;
  workingDays: string[];
}

export interface BusinessHours {
  [key: string]: { start: string; end: string } | null;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    frequency: 'instant' | 'daily_digest' | 'weekly_digest';
    events: string[];
  };
  push: {
    enabled: boolean;
    events: string[];
  };
  slack: {
    enabled: boolean;
    webhookUrl?: string;
    events: string[];
  };
}

export interface SecuritySettings {
  mfaRequired: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  ipWhitelist: string[];
  twoFactorEnabled: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface MessagingSettings {
  defaultSender?: string;
  autoResponse: {
    enabled: boolean;
    message?: string;
    delay: number;
  };
  deliveryReports: {
    enabled: boolean;
    retentionDays: number;
  };
  typingIndicators: {
    enabled: boolean;
  };
  readReceipts: {
    enabled: boolean;
  };
}

export interface ComplianceSettings {
  gdpr: {
    enabled: boolean;
    dataRetentionDays: number;
    rightToDeletion: boolean;
    rightToPortability: boolean;
    consentRequired: boolean;
  };
  optIn: {
    defaultStatus: 'pending' | 'opted_in' | 'opted_out';
    doubleOptIn: boolean;
    emailConfirmationRequired: boolean;
  };
  dataExport: {
    enabled: boolean;
    format: 'json' | 'csv' | 'xml';
  };
}

export interface BrandingSettings {
  primaryColor: string;
  logo?: string;
  emailFooter: string;
  customDomain?: string;
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  messaging: MessagingSettings;
  compliance: ComplianceSettings;
  branding: BrandingSettings;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### User Settings Types

```typescript
// types/user-settings.ts

export interface UserUISettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  dashboardLayout: 'grid' | 'list';
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserNotificationSettings {
  emailDigest: 'instant' | 'daily' | 'weekly' | 'none';
  pushNotifications: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface UserCommunicationSettings {
  autoAssign: boolean;
  defaultView: 'all' | 'unread' | 'starred';
  defaultSegment?: string;
  enableShortcuts: boolean;
}

export interface UserEditorSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  markdownMode: boolean;
}

export interface UserAccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardShortcuts: boolean;
}

export interface UserSettings {
  id: string;
  userId: string;
  ui: UserUISettings;
  notifications: UserNotificationSettings;
  communication: UserCommunicationSettings;
  editor: UserEditorSettings;
  accessibility: UserAccessibilitySettings;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  lastActiveAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### API Key Types

```typescript
// types/api-key.ts

export type ApiKeyScopes = 
  | 'campaigns:read'
  | 'campaigns:write'
  | 'campaigns:delete'
  | 'contacts:read'
  | 'contacts:write'
  | 'contacts:delete'
  | 'messages:read'
  | 'messages:write'
  | 'webhooks:read'
  | 'webhooks:write'
  | 'webhooks:delete'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:write'
  | 'automation:read'
  | 'automation:write';

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScopes[];
  rateLimit: number;
  maxRequests?: number;
  requestCount: number;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  lastUsedIp?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScopes[];
  rateLimit?: number;
  maxRequests?: number;
  expiresAt?: Date;
}

export interface ApiKeyAccessLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  responseTime?: number;
  createdAt: Date;
}
```

### Webhook Types

```typescript
// types/webhook.ts

export type WebhookEventType = 
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'message.received'
  | 'campaign.created'
  | 'campaign.started'
  | 'campaign.paused'
  | 'campaign.completed'
  | 'campaign.failed'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'contact.opted_in'
  | 'contact.opted_out'
  | 'automation.created'
  | 'automation.activated'
  | 'automation.deactivated'
  | 'automation.triggered'
  | 'number.created'
  | 'number.verified'
  | 'number.flagged'
  | 'number.disabled'
  | 'webhook.test';

export type WebhookStatus = 'active' | 'paused' | 'disabled' | 'failing';

export type WebhookAuthType = 'none' | 'basic' | 'bearer' | 'hmac';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying' | 'abandoned';

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  status: WebhookStatus;
  lastTriggeredAt?: Date;
  consecutiveFailures: number;
  retryEnabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  authType: WebhookAuthType;
  authConfig: Record<string, unknown>;
  customHeaders: Record<string, string>;
  filters: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  eventId: string;
  payload: Record<string, unknown>;
  url: string;
  method: string;
  headers: Record<string, string>;
  statusCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  attemptNumber: number;
  sentAt: Date;
  receivedAt?: Date;
  durationMs?: number;
  status: WebhookDeliveryStatus;
  errorMessage?: string;
  errorCode?: string;
  nextRetryAt?: Date;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  organizationId: string;
  data: Record<string, unknown>;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  events: WebhookEventType[];
  retryEnabled?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  authType?: WebhookAuthType;
  authConfig?: Record<string, unknown>;
  customHeaders?: Record<string, string>;
  filters?: Record<string, unknown>;
}
```

---

## Summary

This schema extension document provides a comprehensive foundation for implementing advanced settings functionality in the WhatsApp Marketing Tool. The new models enable:

1. **Multi-tenancy** through the `Organization` model with proper user membership
2. **Flexible settings** through JSON-based configuration storage
3. **API key management** with scopes, expiration, and access logging
4. **Webhook infrastructure** for event-driven integrations
5. **User preferences** for personalized experiences

All changes are designed to be backward compatible with the existing schema while providing the flexibility needed for enterprise features.
