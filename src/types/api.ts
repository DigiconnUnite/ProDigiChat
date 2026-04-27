import { z } from 'zod';

// Contact types
export const CreateContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().min(10),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.object({}).optional(),
  optInStatus: z.enum(['opted_in', 'opted_out', 'pending']).optional(),
  lifecycleStatus: z.enum(['lead', 'active', 'suppressed', 'blocked', 'bounced']).optional()
});

export const UpdateContactSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().min(10).optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.object({}).optional(),
  optInStatus: z.enum(['opted_in', 'opted_out', 'pending']).optional(),
  lifecycleStatus: z.enum(['lead', 'active', 'suppressed', 'blocked', 'bounced']).optional()
});

// Campaign types
export const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['broadcast', 'recurring', 'ab_test']),
  audienceSegmentId: z.string().optional(),
  whatsappNumberId: z.string().optional(),
  whatsappAccountId: z.string().optional(),
  messageContent: z.object({
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
    mediaAttachments: z.array(z.object({
      type: z.enum(['image', 'video', 'document']),
      url: z.string().url()
    })).optional()
  }),
  schedule: z.object({
    sendAt: z.string().datetime().optional(),
    timezone: z.string().optional(),
    throttleRate: z.number().optional()
  }).optional()
});

export const UpdateCampaignSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'failed']).optional(),
  audienceSegmentId: z.string().optional(),
  whatsappNumberId: z.string().optional(),
  whatsappAccountId: z.string().optional(),
  messageContent: z.object({
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
    mediaAttachments: z.array(z.object({
      type: z.enum(['image', 'video', 'document']),
      url: z.string().url()
    })).optional()
  }).optional(),
  schedule: z.object({
    sendAt: z.string().datetime().optional(),
    timezone: z.string().optional(),
    throttleRate: z.number().optional()
  }).optional()
});

// Message types
export const SendMessageSchema = z.object({
  contactId: z.string(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'document', 'template']).default('text')
});

// Template types
export const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['marketing', 'utility', 'authentication']),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  language: z.string().default('en_US')
});

// Settings types
export const GeneralSettingsSchema = z.object({
  companyName: z.string().min(1),
  companyEmail: z.string().email(),
  timezone: z.string(),
  language: z.string(),
  dateFormat: z.string(),
  currency: z.string()
});

export const NotificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    address: z.string().email().optional()
  }),
  push: z.object({
    enabled: z.boolean()
  }),
  slack: z.object({
    enabled: z.boolean(),
    webhookUrl: z.string().url().optional()
  })
});

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Contact type
export interface Contact {
  id: string;
  firstName: string;
  lastName?: string | null;
  displayName?: string | null;
  phoneNumber: string;
  email?: string | null;
  lifecycleStatus: string;
  optInStatus: string;
  tags: string;
  attributes: string;
  isDeleted: boolean;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign type
export interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  createdBy?: string | null;
  organizationId?: string | null;
  audienceSegmentId?: string | null;
  whatsappNumberId?: string | null;
  whatsappAccountId?: string | null;
  messageContent: string;
  schedule?: string | null;
  stats: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message type
export interface Message {
  id: string;
  contactId: string;
  campaignId?: string | null;
  direction: string;
  status: string;
  content: string;
  whatsappMessageId?: string | null;
  sentBy?: string | null;
  organizationId: string;
  stats?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
