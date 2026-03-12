import axios from 'axios';

// API base URL - defaults to relative path for same-origin API calls
const API_BASE_URL = '/api/settings';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Types ====================

export interface GeneralSettings {
  companyName: string;
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  autoSaveInterval: number;
}

export interface WhatsAppSettings {
  instanceId: string;
  phoneNumber: string;
  businessName: string;
  businessDescription: string;
  autoReply: boolean;
  autoReplyMessage: string;
  awayMode: boolean;
  awayMessage: string;
  defaultQuickReplies: string[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastActive?: string;
}

export interface TeamSettings {
  members: TeamMember[];
  maxMembers: number;
  invitationMethod: 'email' | 'link';
  defaultRole: TeamMember['role'];
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

export interface NotificationSettings {
  email: {
    campaignUpdates: boolean;
    teamInvites: boolean;
    billingAlerts: boolean;
    weeklyReports: boolean;
    securityAlerts: boolean;
  };
  push: {
    newMessages: boolean;
    campaignStatus: boolean;
    teamActivity: boolean;
    systemUpdates: boolean;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channels: string[];
  };
}

export interface BillingSettings {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  paymentMethod: {
    type: 'card' | 'bank';
    last4: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    pdfUrl?: string;
  }>;
  usage: {
    contacts: { used: number; limit: number };
    messages: { used: number; limit: number };
    campaigns: { used: number; limit: number };
    storage: { used: number; limit: number };
  };
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
  headers?: Record<string, string>;
}

export interface PrivacySettings {
  dataRetention: {
    contacts: number; // days
    messages: number; // days
    campaigns: number; // days
    logs: number; // days
  };
  gdpr: {
    enabled: boolean;
    allowDataExport: boolean;
    allowDataDeletion: boolean;
    anonymizeOldData: boolean;
  };
  analytics: {
    trackPageViews: boolean;
    trackEvents: boolean;
    thirdPartySharing: boolean;
  };
  twoFactorAuth: {
    enabled: boolean;
    method: 'totp' | 'sms' | 'email';
  };
}

// ==================== API Functions ====================

// General Settings
export const getGeneralSettings = async (): Promise<GeneralSettings> => {
  const { data } = await apiClient.get<GeneralSettings>('/general');
  return data;
};

export const updateGeneralSettings = async (settings: Partial<GeneralSettings>): Promise<GeneralSettings> => {
  const { data } = await apiClient.put<GeneralSettings>('/general', settings);
  return data;
};

// WhatsApp Settings
export const getWhatsAppSettings = async (): Promise<WhatsAppSettings> => {
  const { data } = await apiClient.get<WhatsAppSettings>('/whatsapp');
  return data;
};

export const updateWhatsAppSettings = async (settings: Partial<WhatsAppSettings>): Promise<WhatsAppSettings> => {
  const { data } = await apiClient.put<WhatsAppSettings>('/whatsapp', settings);
  return data;
};

export const disconnectWhatsApp = async (): Promise<void> => {
  await apiClient.delete('/whatsapp/connection');
};

export const reconnectWhatsApp = async (): Promise<WhatsAppSettings> => {
  const { data } = await apiClient.post<WhatsAppSettings>('/whatsapp/reconnect');
  return data;
};

// Team Settings
export const getTeamSettings = async (): Promise<TeamSettings> => {
  const { data } = await apiClient.get<TeamSettings>('/team');
  return data;
};

export const inviteTeamMember = async (email: string, role: TeamMember['role']): Promise<TeamMember> => {
  const { data } = await apiClient.post<TeamMember>('/team/invite', { email, role });
  return data;
};

export const updateTeamMember = async (id: string, role: Partial<TeamMember>): Promise<TeamMember> => {
  const { data } = await apiClient.put<TeamMember>(`/team/${id}`, role);
  return data;
};

export const removeTeamMember = async (id: string): Promise<void> => {
  await apiClient.delete(`/team/${id}`);
};

export const resendInvitation = async (id: string): Promise<void> => {
  await apiClient.post(`/team/${id}/resend-invitation`);
};

// API Keys
export const getApiKeys = async (): Promise<ApiKey[]> => {
  const { data } = await apiClient.get<ApiKey[]>('/api-keys');
  return data;
};

export const createApiKey = async (name: string, permissions: string[]): Promise<ApiKey> => {
  const { data } = await apiClient.post<ApiKey>('/api-keys', { name, permissions });
  return data;
};

export const deleteApiKey = async (id: string): Promise<void> => {
  await apiClient.delete(`/api-keys/${id}`);
};

export const regenerateApiKey = async (id: string): Promise<ApiKey> => {
  const { data } = await apiClient.post<ApiKey>(`/api-keys/${id}/regenerate`);
  return data;
};

// Notification Settings
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const { data } = await apiClient.get<NotificationSettings>('/notifications');
  return data;
};

export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
  const { data } = await apiClient.put<NotificationSettings>('/notifications', settings);
  return data;
};

// Billing Settings
export const getBillingSettings = async (): Promise<BillingSettings> => {
  const { data } = await apiClient.get<BillingSettings>('/billing');
  return data;
};

export const updateBillingSettings = async (settings: Partial<BillingSettings>): Promise<BillingSettings> => {
  const { data } = await apiClient.put<BillingSettings>('/billing', settings);
  return data;
};

export const cancelSubscription = async (): Promise<void> => {
  await apiClient.post('/billing/cancel-subscription');
};

export const reactivateSubscription = async (): Promise<BillingSettings> => {
  const { data } = await apiClient.post<BillingSettings>('/billing/reactivate-subscription');
  return data;
};

export const getInvoices = async (): Promise<BillingSettings['invoices']> => {
  const { data } = await apiClient.get<BillingSettings['invoices']>('/billing/invoices');
  return data;
};

// Webhooks
export const getWebhooks = async (): Promise<Webhook[]> => {
  const { data } = await apiClient.get<Webhook[]>('/webhooks');
  return data;
};

export const createWebhook = async (webhook: Omit<Webhook, 'id' | 'createdAt'>): Promise<Webhook> => {
  const { data } = await apiClient.post<Webhook>('/webhooks', webhook);
  return data;
};

export const updateWebhook = async (id: string, webhook: Partial<Webhook>): Promise<Webhook> => {
  const { data } = await apiClient.put<Webhook>(`/webhooks/${id}`, webhook);
  return data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await apiClient.delete(`/webhooks/${id}`);
};

export const testWebhook = async (id: string): Promise<{ success: boolean; response?: unknown }> => {
  const { data } = await apiClient.post<{ success: boolean; response?: unknown }>(`/webhooks/${id}/test`);
  return data;
};

// Privacy Settings
export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const { data } = await apiClient.get<PrivacySettings>('/privacy');
  return data;
};

export const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
  const { data } = await apiClient.put<PrivacySettings>('/privacy', settings);
  return data;
};

export const exportUserData = async (): Promise<Blob> => {
  const { data } = await apiClient.get('/privacy/export', { responseType: 'blob' });
  return data;
};

export const deleteUserData = async (): Promise<void> => {
  await apiClient.post('/privacy/delete-data');
};

// ==================== Utility Functions ====================

export const resetAllSettings = async (): Promise<void> => {
  await apiClient.post('/reset-all');
};

export const importSettings = async (settings: Record<string, unknown>): Promise<void> => {
  await apiClient.post('/import', settings);
};

export const exportSettings = async (): Promise<Record<string, unknown>> => {
  const { data } = await apiClient.get<Record<string, unknown>>('/export');
  return data;
};

// Error handling helper
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An API error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};
