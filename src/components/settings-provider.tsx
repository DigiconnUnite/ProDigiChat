'use client';

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { toast } from 'sonner';

// Types matching settings-storage
export interface GeneralSettings {
  companyName: string;
  companyEmail: string;
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
}

export interface WhatsAppSettings {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookSecret: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  invitedAt: string;
  acceptedAt: string | null;
}

export interface TeamSettings {
  members: TeamMember[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  rateLimit: number;
  maxRequests: number | null;
  requestCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  email: { enabled: boolean; frequency: string; events: string[] };
  push: { enabled: boolean; events: string[] };
  slack: { enabled: boolean; webhookUrl: string | null; events: string[] };
}

export interface BillingSettings {
  subscriptionTier: string;
  subscriptionStatus: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: string;
  secret?: string;
  createdAt: string;
}

export interface PrivacySettings {
  gdpr: { enabled: boolean; dataRetentionDays: number; rightToDeletion: boolean; rightToPortability: boolean; consentRequired: boolean; dpoEmail: string | null };
  dataRetention: {
    contacts: { retentionDays: number; autoDelete: boolean };
    messages: { retentionDays: number; autoDelete: boolean };
    campaigns: { retentionDays: number; autoDelete: boolean };
    logs: { retentionDays: number; autoDelete: boolean };
  };
  optIn: { defaultStatus: string; doubleOptIn: boolean; emailConfirmationRequired: boolean; smsConfirmationRequired: boolean };
  dataExport: { enabled: boolean; format: string; includeMedia: boolean };
  thirdParty: { analyticsEnabled: boolean; advertisingEnabled: boolean; sharingEnabled: boolean };
}

// ==================== Context ====================

interface SettingsCache {
  general: GeneralSettings | null;
  whatsapp: WhatsAppSettings | null;
  team: TeamSettings | null;
  apiKeys: ApiKey[] | null;
  notifications: NotificationSettings | null;
  billing: BillingSettings | null;
  webhooks: Webhook[] | null;
  privacy: PrivacySettings | null;
}

interface SettingsContextValue {
  // Cache management
  cache: SettingsCache;
  
  // General Settings
  generalSettings: GeneralSettings | null;
  isLoadingGeneral: boolean;
  fetchGeneralSettings: () => Promise<void>;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  
  // WhatsApp Settings
  whatsappSettings: WhatsAppSettings | null;
  isLoadingWhatsApp: boolean;
  fetchWhatsAppSettings: () => Promise<void>;
  updateWhatsAppSettings: (settings: Partial<WhatsAppSettings>) => Promise<void>;
  
  // Team Settings
  teamSettings: TeamSettings | null;
  isLoadingTeam: boolean;
  fetchTeamSettings: () => Promise<void>;
  
  // API Keys
  apiKeys: ApiKey[] | null;
  isLoadingApiKeys: boolean;
  fetchApiKeys: () => Promise<void>;
  
  // Notification Settings
  notificationSettings: NotificationSettings | null;
  isLoadingNotifications: boolean;
  fetchNotificationSettings: () => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // Billing Settings
  billingSettings: BillingSettings | null;
  isLoadingBilling: boolean;
  fetchBillingSettings: () => Promise<void>;
  
  // Webhooks
  webhooks: Webhook[] | null;
  isLoadingWebhooks: boolean;
  fetchWebhooks: () => Promise<void>;
  
  // Privacy Settings
  privacySettings: PrivacySettings | null;
  isLoadingPrivacy: boolean;
  fetchPrivacySettings: () => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Default values
const defaultGeneralSettings: GeneralSettings = {
  companyName: '',
  companyEmail: '',
  timezone: 'UTC',
  language: 'en',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
};

const defaultWhatsAppSettings: WhatsAppSettings = {
  apiKey: '',
  phoneNumberId: '',
  businessAccountId: '',
  webhookSecret: '',
};

const defaultNotificationSettings: NotificationSettings = {
  email: { enabled: true, frequency: 'instant', events: ['campaign.completed', 'campaign.failed', 'message.failed'] },
  push: { enabled: false, events: [] },
  slack: { enabled: false, webhookUrl: null, events: [] },
};

const defaultPrivacySettings: PrivacySettings = {
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
};

// ==================== Provider ====================

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // Cache state
  const [cache, setCache] = useState<SettingsCache>({
    general: null,
    whatsapp: null,
    team: null,
    apiKeys: null,
    notifications: null,
    billing: null,
    webhooks: null,
    privacy: null,
  });

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    general: false,
    whatsapp: false,
    team: false,
    apiKeys: false,
    notifications: false,
    billing: false,
    webhooks: false,
    privacy: false,
  });

  // ==================== General Settings ====================
  
  const fetchGeneralSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, general: true }));
    try {
      const response = await fetch('/api/settings/general');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, general: data.general || defaultGeneralSettings }));
      }
    } catch (error) {
      console.error('Error fetching general settings:', error);
      toast.error('Failed to load general settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, general: false }));
    }
  }, []);

  const updateGeneralSettings = useCallback(async (settings: Partial<GeneralSettings>) => {
    try {
      const response = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, general: data.general || defaultGeneralSettings }));
        toast.success('General settings updated');
      }
    } catch (error) {
      console.error('Error updating general settings:', error);
      toast.error('Failed to update general settings');
      throw error;
    }
  }, []);

  // ==================== WhatsApp Settings ====================
  
  const fetchWhatsAppSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, whatsapp: true }));
    try {
      const response = await fetch('/api/settings/whatsapp');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, whatsapp: data.config || defaultWhatsAppSettings }));
      }
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error);
      toast.error('Failed to load WhatsApp settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, whatsapp: false }));
    }
  }, []);

  const updateWhatsAppSettings = useCallback(async (settings: Partial<WhatsAppSettings>) => {
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: settings }),
      });
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, whatsapp: data.config || defaultWhatsAppSettings }));
        toast.success('WhatsApp settings updated');
      }
    } catch (error) {
      console.error('Error updating WhatsApp settings:', error);
      toast.error('Failed to update WhatsApp settings');
      throw error;
    }
  }, []);

  // ==================== Team Settings ====================
  
  const fetchTeamSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, team: true }));
    try {
      const response = await fetch('/api/settings/team');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, team: { members: data.members || [] } }));
      }
    } catch (error) {
      console.error('Error fetching team settings:', error);
      toast.error('Failed to load team settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, team: false }));
    }
  }, []);

  // ==================== API Keys ====================
  
  const fetchApiKeys = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, apiKeys: true }));
    try {
      const response = await fetch('/api/settings/api-keys');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, apiKeys: data.apiKeys || [] }));
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoadingStates(prev => ({ ...prev, apiKeys: false }));
    }
  }, []);

  // ==================== Notification Settings ====================
  
  const fetchNotificationSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, notifications: true }));
    try {
      const response = await fetch('/api/settings/notifications');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, notifications: data.settings || defaultNotificationSettings }));
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  }, []);

  const updateNotificationSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, notifications: data.settings || defaultNotificationSettings }));
        toast.success('Notification settings updated');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
      throw error;
    }
  }, []);

  // ==================== Billing Settings ====================
  
  const fetchBillingSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, billing: true }));
    try {
      const response = await fetch('/api/settings/billing');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, billing: data.billing || { subscriptionTier: 'free', subscriptionStatus: 'active' } }));
      }
    } catch (error) {
      console.error('Error fetching billing settings:', error);
      toast.error('Failed to load billing settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, billing: false }));
    }
  }, []);

  // ==================== Webhooks ====================
  
  const fetchWebhooks = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, webhooks: true }));
    try {
      const response = await fetch('/api/settings/webhooks');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, webhooks: data.webhooks || [] }));
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoadingStates(prev => ({ ...prev, webhooks: false }));
    }
  }, []);

  // ==================== Privacy Settings ====================
  
  const fetchPrivacySettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, privacy: true }));
    try {
      const response = await fetch('/api/settings/privacy');
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, privacy: data.settings || defaultPrivacySettings }));
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoadingStates(prev => ({ ...prev, privacy: false }));
    }
  }, []);

  const updatePrivacySettings = useCallback(async (settings: Partial<PrivacySettings>) => {
    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
        const data = await response.json();
        setCache(prev => ({ ...prev, privacy: data.settings || defaultPrivacySettings }));
        toast.success('Privacy settings updated');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
      throw error;
    }
  }, []);

  // ==================== Context Value ====================
  
  const value: SettingsContextValue = {
    cache,
    
    // General
    generalSettings: cache.general,
    isLoadingGeneral: loadingStates.general,
    fetchGeneralSettings,
    updateGeneralSettings,
    
    // WhatsApp
    whatsappSettings: cache.whatsapp,
    isLoadingWhatsApp: loadingStates.whatsapp,
    fetchWhatsAppSettings,
    updateWhatsAppSettings,
    
    // Team
    teamSettings: cache.team,
    isLoadingTeam: loadingStates.team,
    fetchTeamSettings,
    
    // API Keys
    apiKeys: cache.apiKeys,
    isLoadingApiKeys: loadingStates.apiKeys,
    fetchApiKeys,
    
    // Notifications
    notificationSettings: cache.notifications,
    isLoadingNotifications: loadingStates.notifications,
    fetchNotificationSettings,
    updateNotificationSettings,
    
    // Billing
    billingSettings: cache.billing,
    isLoadingBilling: loadingStates.billing,
    fetchBillingSettings,
    
    // Webhooks
    webhooks: cache.webhooks,
    isLoadingWebhooks: loadingStates.webhooks,
    fetchWebhooks,
    
    // Privacy
    privacySettings: cache.privacy,
    isLoadingPrivacy: loadingStates.privacy,
    fetchPrivacySettings,
    updatePrivacySettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ==================== Hook ====================

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// ==================== Individual Settings Hooks ====================

export function useGeneralSettings() {
  const {
    generalSettings,
    isLoadingGeneral,
    fetchGeneralSettings,
    updateGeneralSettings,
  } = useSettings();

  return {
    settings: generalSettings,
    isLoading: isLoadingGeneral,
    fetch: fetchGeneralSettings,
    update: updateGeneralSettings,
  };
}

export function useWhatsAppSettings() {
  const {
    whatsappSettings,
    isLoadingWhatsApp,
    fetchWhatsAppSettings,
    updateWhatsAppSettings,
  } = useSettings();

  return {
    settings: whatsappSettings,
    isLoading: isLoadingWhatsApp,
    fetch: fetchWhatsAppSettings,
    update: updateWhatsAppSettings,
  };
}

export function useTeamSettings() {
  const {
    teamSettings,
    isLoadingTeam,
    fetchTeamSettings,
  } = useSettings();

  return {
    settings: teamSettings,
    isLoading: isLoadingTeam,
    fetch: fetchTeamSettings,
  };
}

export function useApiKeys() {
  const {
    apiKeys,
    isLoadingApiKeys,
    fetchApiKeys,
  } = useSettings();

  return {
    apiKeys,
    isLoading: isLoadingApiKeys,
    fetch: fetchApiKeys,
  };
}

export function useNotificationSettings() {
  const {
    notificationSettings,
    isLoadingNotifications,
    fetchNotificationSettings,
    updateNotificationSettings,
  } = useSettings();

  return {
    settings: notificationSettings,
    isLoading: isLoadingNotifications,
    fetch: fetchNotificationSettings,
    update: updateNotificationSettings,
  };
}

export function useBillingSettings() {
  const {
    billingSettings,
    isLoadingBilling,
    fetchBillingSettings,
  } = useSettings();

  return {
    settings: billingSettings,
    isLoading: isLoadingBilling,
    fetch: fetchBillingSettings,
  };
}

export function useWebhooks() {
  const {
    webhooks,
    isLoadingWebhooks,
    fetchWebhooks,
  } = useSettings();

  return {
    webhooks,
    isLoading: isLoadingWebhooks,
    fetch: fetchWebhooks,
  };
}

export function usePrivacySettings() {
  const {
    privacySettings,
    isLoadingPrivacy,
    fetchPrivacySettings,
    updatePrivacySettings,
  } = useSettings();

  return {
    settings: privacySettings,
    isLoading: isLoadingPrivacy,
    fetch: fetchPrivacySettings,
    update: updatePrivacySettings,
  };
}
