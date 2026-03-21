// Settings-related constants
// Centralized constants to replace magic strings

// Settings tabs
export const SETTINGS_TABS = {
  GENERAL: 'general',
  WHATSAPP: 'whatsapp',
  TEAM: 'team',
  API: 'api',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks',
  PRIVACY: 'privacy',
  BILLING: 'billing',
} as const

export type SettingsTab = typeof SETTINGS_TABS[keyof typeof SETTINGS_TABS]

// Notification events
export const NOTIFICATION_EVENTS = {
  CAMPAIGN_COMPLETED: 'campaign.completed',
  CAMPAIGN_FAILED: 'campaign.failed',
  MESSAGE_FAILED: 'message.failed',
  CONTACT_OPTED_OUT: 'contact.opted_out',
  LOW_BALANCE: 'low.balance',
} as const

// Team roles
export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const

// API Key scopes
export const API_KEY_SCOPES = {
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_WRITE: 'campaigns:write',
  CONTACTS_READ: 'contacts:read',
  CONTACTS_WRITE: 'contacts:write',
  MESSAGES_READ: 'messages:read',
  MESSAGES_WRITE: 'messages:write',
} as const

// Webhook events
export const WEBHOOK_EVENTS = [
  { id: 'message.sent', description: 'When a message is sent' },
  { id: 'message.delivered', description: 'When a message is delivered' },
  { id: 'message.read', description: 'When a message is read' },
  { id: 'message.failed', description: 'When a message fails to send' },
  { id: 'message.received', description: 'When a message is received' },
  { id: 'campaign.created', description: 'When a campaign is created' },
  { id: 'campaign.started', description: 'When a campaign starts' },
  { id: 'campaign.completed', description: 'When a campaign completes' },
  { id: 'contact.created', description: 'When a contact is created' },
  { id: 'contact.opted_in', description: 'When a contact opts in' },
  { id: 'contact.opted_out', description: 'When a contact opts out' },
  { id: 'webhook.test', description: 'Test webhook payload' },
] as const

// Timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const

// Language options
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
] as const

// Date format options
export const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
] as const

// Currency options
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
] as const

// Notification frequency options
export const NOTIFICATION_FREQUENCY_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'hourly', label: 'Hourly Digest' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Digest' },
] as const

// Default organization ID (DEPRECATED - for demo/development only)
// WARNING: Using this as a fallback is a security risk - it allows unauthenticated
// access to a single hardcoded organization's data. This should never be used as
// a fallback when a valid organizationId is required.
export const DEFAULT_ORG_ID = '000000000000000000000001'

// Billing plans
export const BILLING_PLANS = [
  { id: 'free', name: 'Free', price: 0, limits: { contacts: 1000, campaigns: 10, messagesPerMonth: 1000, whatsappNumbers: 1 } },
  { id: 'starter', name: 'Starter', price: 29, limits: { contacts: 5000, campaigns: 50, messagesPerMonth: 10000, whatsappNumbers: 3 } },
  { id: 'professional', name: 'Professional', price: 79, limits: { contacts: 25000, campaigns: 200, messagesPerMonth: 50000, whatsappNumbers: 10 } },
  { id: 'enterprise', name: 'Enterprise', price: 199, limits: { contacts: 100000, campaigns: -1, messagesPerMonth: 200000, whatsappNumbers: -1 } },
] as const
