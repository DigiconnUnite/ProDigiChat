// Settings storage with database support
// Uses Prisma as primary storage with fallback to in-memory for development

import { prisma } from '@/lib/prisma'
import { DEFAULT_ORG_ID } from '@/lib/constants/settings'

// Types matching the UI expectations
export interface GeneralSettings {
  timezone: string
  language: string
  dateFormat: string
  currency: string
  companyName: string
  companyEmail: string
}

export interface NotificationSettings {
  email: { enabled: boolean; frequency: string; events: string[] }
  push: { enabled: boolean; events: string[] }
  slack: { enabled: boolean; webhookUrl: string | null; events: string[] }
}

export interface PrivacySettings {
  gdpr: { 
    enabled: boolean; 
    dataRetentionDays: number; 
    rightToDeletion: boolean; 
    rightToPortability: boolean; 
    consentRequired: boolean; 
    dpoEmail: string | null 
  }
  dataRetention: {
    contacts: { retentionDays: number; autoDelete: boolean }
    messages: { retentionDays: number; autoDelete: boolean }
    campaigns: { retentionDays: number; autoDelete: boolean }
    logs: { retentionDays: number; autoDelete: boolean }
  }
  optIn: { defaultStatus: string; doubleOptIn: boolean; emailConfirmationRequired: boolean; smsConfirmationRequired: boolean }
  dataExport: { enabled: boolean; format: string; includeMedia: boolean }
  thirdParty: { analyticsEnabled: boolean; advertisingEnabled: boolean; sharingEnabled: boolean }
}

export interface WhatsAppConfig {
  apiKey: string
  phoneNumberId: string
  businessAccountId: string
  webhookSecret: string
  connectedAt?: string
}

export interface SettingsStorage {
  general: GeneralSettings
  notifications: NotificationSettings
  privacy: PrivacySettings
  webhooks: any[]
  whatsapp: WhatsAppConfig
  team: any[]
  apiKeys: any[]
  billing: {
    subscriptionTier: string
    subscriptionStatus: string
  }
}

// Default settings factory
function getDefaultSettings(): SettingsStorage {
  return {
    general: {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
      companyName: '',
      companyEmail: '',
    },
    notifications: {
      email: { enabled: true, frequency: 'instant', events: ['campaign.completed', 'campaign.failed', 'message.failed'] },
      push: { enabled: false, events: [] },
      slack: { enabled: false, webhookUrl: null, events: [] },
    },
    privacy: {
      gdpr: { enabled: false, dataRetentionDays: 365, rightToDeletion: true, rightToPortability: true, consentRequired: true, dpoEmail: null },
      dataRetention: {
        contacts: { retentionDays: 730, autoDelete: false },
        messages: { retentionDays: 365, autoDelete: false },
        campaigns: { retentionDays: 1095, autoDelete: false },
        logs: { retentionDays: 90, autoDelete: true },
      },
      optIn: { defaultStatus: 'pending', doubleOptIn: false, emailConfirmationRequired: false, smsConfirmationRequired: false },
      dataExport: { enabled: true, format: 'json', includeMedia: false },
      thirdParty: { analyticsEnabled: true, advertisingEnabled: false, sharingEnabled: false },
    },
    webhooks: [],
    whatsapp: {
      apiKey: '',
      phoneNumberId: '',
      businessAccountId: '',
      webhookSecret: '',
      connectedAt: '',
    },
    team: [],
    apiKeys: [],
    billing: {
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    },
  }
}

// In-memory fallback storage (only for development when DB is unavailable)
const memoryStorage = new Map<string, SettingsStorage>()

// Check if database is available
let dbAvailable = false
let dbCheckDone = false

async function checkDatabase(): Promise<boolean> {
  if (dbCheckDone) return dbAvailable
  
  try {
    await prisma.$connect()
    dbAvailable = true
    console.log('Database connection available for settings storage')
  } catch (error) {
    console.warn('Database not available, using in-memory storage for settings')
    dbAvailable = false
  }
  dbCheckDone = true
  return dbAvailable
}

// Database-backed settings functions
async function getSettingsFromDb(orgId: string): Promise<SettingsStorage | null> {
  try {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
    })
    
    if (!settings) return null
    
    // Parse JSON fields
    return {
      general: JSON.parse(settings.general),
      notifications: JSON.parse(settings.notifications),
      privacy: JSON.parse(settings.compliance || '{}'),
      webhooks: [],
      whatsapp: JSON.parse(settings.messaging || '{}'),
      team: [],
      apiKeys: [],
      billing: {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
      },
    }
  } catch (error) {
    console.error('Error fetching settings from database:', error)
    return null
  }
}

async function saveSettingsToDb(orgId: string, settings: SettingsStorage): Promise<void> {
  try {
    await prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      update: {
        general: JSON.stringify(settings.general),
        notifications: JSON.stringify(settings.notifications),
        compliance: JSON.stringify(settings.privacy),
        messaging: JSON.stringify(settings.whatsapp),
        updatedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        general: JSON.stringify(settings.general),
        notifications: JSON.stringify(settings.notifications),
        compliance: JSON.stringify(settings.privacy),
        messaging: JSON.stringify(settings.whatsapp),
        security: '{}',
        integrations: '{}',
        branding: '{}',
      },
    })
  } catch (error) {
    console.error('Error saving settings to database:', error)
    throw error
  }
}

// Public API - get settings with database-first (Prisma primary storage)
export async function getSettings(orgId: string = DEFAULT_ORG_ID): Promise<SettingsStorage> {
  // Always try database first for production safety
  const useDb = await checkDatabase()
  
  if (useDb) {
    const dbSettings = await getSettingsFromDb(orgId)
    if (dbSettings) {
      return dbSettings
    }
    // If no settings in DB, create default and return
    const defaultSettings = getDefaultSettings()
    try {
      await saveSettingsToDb(orgId, defaultSettings)
    } catch (e) {
      console.warn('Failed to create default settings in DB, using memory fallback')
    }
    return defaultSettings
  }
  
  // Fallback to memory storage only if DB is completely unavailable
  if (!memoryStorage.has(orgId)) {
    memoryStorage.set(orgId, getDefaultSettings())
  }
  return memoryStorage.get(orgId)!
}

// Public API - update settings with database-first (Prisma primary)
export async function updateSettings(
  orgId: string = DEFAULT_ORG_ID, 
  updates: Partial<SettingsStorage>
): Promise<SettingsStorage> {
  // Always try database first
  const useDb = await checkDatabase()
  
  // Get current settings
  const current = await getSettings(orgId)
  const updated = { ...current, ...updates }
  
  if (useDb) {
    try {
      await saveSettingsToDb(orgId, updated)
    } catch (error) {
      console.warn('Failed to save to database, using in-memory fallback')
      // Fallback to memory if DB fails
      memoryStorage.set(orgId, updated)
    }
  } else {
    // Use memory storage if DB unavailable
    memoryStorage.set(orgId, updated)
  }
  
  return updated
}

// Public API - get default organization ID
export function getDefaultOrgId(): string {
  return DEFAULT_ORG_ID
}

// For backward compatibility - sync version that only uses memory
// Deprecated: Use async version above
export function getSettingsSync(orgId: string = DEFAULT_ORG_ID): SettingsStorage {
  if (!memoryStorage.has(orgId)) {
    memoryStorage.set(orgId, getDefaultSettings())
  }
  return memoryStorage.get(orgId)!
}

export function updateSettingsSync(
  orgId: string = DEFAULT_ORG_ID, 
  updates: Partial<SettingsStorage>
): SettingsStorage {
  const current = getSettingsSync(orgId)
  const updated = { ...current, ...updates }
  memoryStorage.set(orgId, updated)
  return updated
}
