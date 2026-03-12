// Validation schemas for settings using Zod
import { z } from 'zod'

// General Settings Schema
export const generalSettingsSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100).optional().or(z.literal('')),
  companyEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  timezone: z.string().optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().optional(),
})

// Phone number validation
export const phoneNumberSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required').regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890)'),
  apiKey: z.string().min(1, 'API key is required'),
})

// WhatsApp Config Schema
export const whatsappConfigSchema = z.object({
  apiKey: z.string().optional(),
  phoneNumberId: z.string().min(1, 'WhatsApp Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'WhatsApp Business Account ID is required'),
  webhookSecret: z.string().optional(),
  facebookAppId: z.string().regex(/^\d*$/, 'Facebook App ID must be numeric only').optional(),
  facebookAppSecret: z.string().optional(),
})

// Team Member Invitation Schema
export const teamInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'manager', 'member', 'viewer']),
})

// API Key Schema
export const apiKeySchema = z.object({
  name: z.string().min(3, 'Key name must be at least 3 characters'),
  scopes: z.array(z.string()).optional(),
})

// Webhook Schema
export const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
})

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    frequency: z.string(),
    events: z.array(z.string()),
  }),
  push: z.object({
    enabled: z.boolean(),
    events: z.array(z.string()),
  }),
  slack: z.object({
    enabled: z.boolean(),
    webhookUrl: z.string().url().optional().or(z.literal('')),
    events: z.array(z.string()),
  }),
})

// Privacy Settings Schema
export const privacySettingsSchema = z.object({
  gdpr: z.object({
    enabled: z.boolean(),
    dataRetentionDays: z.number().min(30, 'Minimum 30 days required for GDPR compliance'),
    rightToDeletion: z.boolean(),
    rightToPortability: z.boolean(),
    consentRequired: z.boolean(),
    dpoEmail: z.string().email().optional().or(z.literal('')),
  }),
  dataRetention: z.object({
    contacts: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }),
    messages: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }),
    campaigns: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }),
    logs: z.object({ retentionDays: z.number(), autoDelete: z.boolean() }),
  }),
  optIn: z.object({
    defaultStatus: z.string(),
    doubleOptIn: z.boolean(),
    emailConfirmationRequired: z.boolean(),
    smsConfirmationRequired: z.boolean(),
  }),
  dataExport: z.object({
    enabled: z.boolean(),
    format: z.string(),
    includeMedia: z.boolean(),
  }),
  thirdParty: z.object({
    analyticsEnabled: z.boolean(),
    advertisingEnabled: z.boolean(),
    sharingEnabled: z.boolean(),
  }),
})

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhoneNumber = (phone: string): boolean => {
  const re = /^\+?[1-9]\d{1,14}$/
  return re.test(phone.replace(/[\s-]/g, ''))
}

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Type exports
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>
export type PhoneNumberInput = z.infer<typeof phoneNumberSchema>
export type WhatsAppConfigInput = z.infer<typeof whatsappConfigSchema>
export type TeamInviteInput = z.infer<typeof teamInviteSchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type WebhookInput = z.infer<typeof webhookSchema>
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>
