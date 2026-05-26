'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Phone,
  Settings2,
  ExternalLink,
  AlertTriangle,
  Shield,
  Save,
  Eye,
  EyeOff,
  MessageCircle,
  Clock,
  Link2,
  Building2,
  HelpCircle,
  XCircle,
  Copy,
  Check,
  Info,
  BookOpen,
  Zap,
  Webhook,
  Key,
  Bell,
  Globe,
  Database,
  Play,
  Trash2,
  Edit,
  CheckSquare,
  AlertOctagon,
  Users,
  Star,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton';
import { WhatsAppStatusBanner } from '@/components/whatsapp/WhatsAppStatusBanner';

interface WhatsAppPhoneNumber {
  id: string;
  displayName: string;
  phoneNumber: string;
  verificationStatus: string;
  qualityScore?: string;
  isDefault?: boolean;
  messagingLimitTier?: string;
  phoneNumberStatus?: string;
  nameStatus?: string;
}

interface WhatsAppAccount {
  id: string;
  accountName: string;
  businessAccountId: string;
  businessAccountName?: string;
  phoneNumberId?: string;
  isActive: boolean;
  isDefault: boolean;
  connectedAt?: string | null;
  connectedDevice?: string | null;
  lastVerifiedAt?: string | null;
  tokenExpiresAt?: string | null;
  phoneNumbers?: WhatsAppPhoneNumber[];
  currency?: string;
  timezoneId?: string;
  accountReviewStatus?: string;
  businessType?: string;
  businessLocation?: string;
  ownerBusinessId?: string;
  ownerBusinessName?: string;
  ownerBusinessPhone?: string;
  ownerBusinessEmail?: string;
  ownerBusinessAddress?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastChecked?: string | null;
  issues?: Array<{
    severity: 'critical' | 'warning' | 'info';
    check: string;
    message: string;
    actionRequired: boolean;
  }>;
  actionRequired?: boolean;
}

interface TokenAlert {
  alertLevel: 'warning' | 'caution' | 'critical' | 'expired' | 'healthy';
  daysUntilExpiry: number | null;
  expirationDate: string | null;
  message: string;
  actionRequired: boolean;
  refreshTokenUrl: string;
}

interface WhatsAppSettings {
  autoRefreshToken?: boolean;
  webhookEnabled?: boolean;
  webhookUrl?: string;
  defaultPhoneNumberId?: string;
  notificationsEnabled?: boolean;
  notifyOnMessage?: boolean;
  notifyOnCampaign?: boolean;
  notifyOnError?: boolean;
  debugMode?: boolean;
  messageLimit?: number;
}

interface WhatsAppSettingsTabProps {
  organizationId: string;
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
  accent = false,
  danger = false,
  warning = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  warning?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
    : warning
      ? "border-2 border-yellow-400"
      : accent
        ? "border-l-4 border-l-green-500 border-2 border-green-200 bg-green-50/50"
        : "border-2 border-green-950";

  return (
    <div className={`p-5 rounded-xl bg-white transition-all ${borderClass} ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 group">
      <div className="pr-4">
        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="flex-shrink-0" />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT WITH SUSPENSE
// ═══════════════════════════════════════════════════════════════

function WhatsAppSettingsTabContent({ organizationId }: WhatsAppSettingsTabProps) {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState<boolean | null>(null);
  const [tokenAlert, setTokenAlert] = useState<TokenAlert | null>(null);
  const [isLoadingAlert, setIsLoadingAlert] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const [showAccountNameDialog, setShowAccountNameDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const [editingAccount, setEditingAccount] = useState<WhatsAppAccount | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [manualConfig, setManualConfig] = useState({
    apiKey: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookSecret: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const [localSettings, setLocalSettings] = useState<WhatsAppSettings>({
    autoRefreshToken: true,
    webhookEnabled: true,
    notificationsEnabled: true,
    notifyOnMessage: true,
    notifyOnCampaign: true,
    notifyOnError: true,
    debugMode: false
  });
  const [savedSettings, setSavedSettings] = useState<WhatsAppSettings>({
    autoRefreshToken: true,
    webhookEnabled: true,
    notificationsEnabled: true,
    notifyOnMessage: true,
    notifyOnCampaign: true,
    notifyOnError: true,
    debugMode: false
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [activeGuideTab, setActiveGuideTab] = useState('getting-started');
  const [connectionMethodTab, setConnectionMethodTab] = useState<'auth' | 'manual'>('auth');

  useEffect(() => {
    const whatsappStatus = searchParams.get('whatsapp');
    const errorMessage = searchParams.get('message');

    if (whatsappStatus === 'error' && errorMessage) {
      setConnectionError(decodeURIComponent(errorMessage));
      window.history.replaceState({}, '', '/dashboard/settings?tab=whatsapp');
    }
  }, [searchParams]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const isConnected = accounts.length > 0 && accounts.some(a => a.isActive);

  const formatConnectionTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'expired': return <XCircle className="w-5 h-5" />;
      case 'critical': return <AlertCircle className="w-5 h-5" />;
      case 'caution': return <AlertTriangle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
        setSelectedAccountId(data.selectedAccountId || (data.accounts && data.accounts[0]?.id) || null);
        setDefaultAccountId(data.defaultAccountId || (data.accounts && data.accounts[0]?.id) || null);

        if (data.config) {
          setManualConfig({
            apiKey: data.config.apiKey || '',
            phoneNumberId: data.config.phoneNumberId || '',
            businessAccountId: data.config.businessAccountId || '',
            webhookSecret: data.config.webhookSecret || ''
          });
        }

        if (data.settings) {
          const fetched: WhatsAppSettings = {
            autoRefreshToken: data.settings.autoRefreshToken ?? true,
            webhookEnabled: data.settings.webhookEnabled ?? true,
            webhookUrl: data.settings.webhookUrl,
            defaultPhoneNumberId: data.settings.defaultPhoneNumberId,
            notificationsEnabled: data.settings.notificationsEnabled ?? true,
            notifyOnMessage: data.settings.notifyOnMessage ?? true,
            notifyOnCampaign: data.settings.notifyOnCampaign ?? true,
            notifyOnError: data.settings.notifyOnError ?? true,
            debugMode: data.settings.debugMode ?? false
          };
          setLocalSettings(fetched);
          setSavedSettings(fetched);
        }

        if (!data.isConnected) {
          checkOauthAvailability();
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const checkOauthAvailability = async () => {
    try {
      const response = await fetch('/api/whatsapp/oauth/url');
      const data = await response.json();
      setOauthAvailable(!data.error && data.url);

      if (data.error) {
        console.error('OAuth availability check failed:', data.error);
        try {
          const diagResponse = await fetch('/api/whatsapp/oauth/diagnostic');
          const diagData = await diagResponse.json();
          console.log('OAuth diagnostic:', diagData);
          if (diagData.issues?.length > 0) {
            setConnectionError(diagData.issues.join('. ') + '. ' + diagData.recommendations?.[0] || '');
          }
        } catch (diagError) {
          console.error('Failed to get diagnostic:', diagError);
        }
      }
    } catch {
      setOauthAvailable(false);
    }
  };

  const fetchTokenAlert = useCallback(async () => {
    try {
      setIsLoadingAlert(true);
      const response = await fetch('/api/whatsapp/token/alerts');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.alert) {
          setTokenAlert(data.alert);
        }
      }
    } catch (error) {
      console.error('Error fetching token alert:', error);
    } finally {
      setIsLoadingAlert(false);
    }
  }, []);

  const fetchHealthStatus = useCallback(async () => {
    try {
      setIsLoadingHealth(true);
      const response = await fetch(`/api/whatsapp/health/check?orgId=${organizationId}&force=true`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHealthStatus({
            status: data.status,
            lastChecked: data.lastChecked,
            issues: data.issues,
            actionRequired: data.actionRequired
          });
        }
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setIsLoadingHealth(false);
    }
  }, [organizationId]);

  const runHealthCheck = async () => {
    try {
      setIsLoadingHealth(true);
      const response = await fetch('/api/whatsapp/health/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHealthStatus({
            status: data.status,
            lastChecked: data.lastChecked,
            issues: data.issues,
            actionRequired: data.actionRequired
          });
          toast.success('Health check completed');
        } else {
          toast.error(data.error || 'Health check failed');
        }
      }
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check');
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const refreshAccountDetails = async (accountId: string) => {
    try {
      toast.loading('Refreshing account details...');
      const response = await fetch('/api/whatsapp/accounts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      const data = await response.json();
      if (data.success) {
        toast.dismiss();
        toast.success('Account details refreshed successfully');
        fetchWhatsAppStatus();
      } else {
        toast.dismiss();
        if (data.code === 'TOKEN_EXPIRED') {
          toast.error('Your token has expired. Please reconnect your account.');
        } else {
          toast.error(data.error || 'Failed to refresh account details');
        }
      }
    } catch (error) {
      console.error('Error refreshing account:', error);
      toast.dismiss();
      toast.error('Failed to refresh account details');
    }
  };

  const handleAddAccountClick = () => {
    setNewAccountName('');
    setConnectionError(null);
    setManualConfig({ apiKey: '', phoneNumberId: '', businessAccountId: '', webhookSecret: '' });
    setConnectionMethodTab('auth');
    setIsAddingAccount(true);
  };

  const saveManualConfig = async () => {
    if (!manualConfig.apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }
    if (!manualConfig.phoneNumberId.trim()) {
      toast.error('Phone Number ID is required');
      return;
    }
    if (!manualConfig.businessAccountId.trim()) {
      toast.error('Business Account ID is required');
      return;
    }

    setIsSavingConfig(true);
    setConnectionError(null);
    try {
      console.log('Saving manual config:', { organizationId, config: manualConfig, accountName: newAccountName });
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          config: {
            apiKey: manualConfig.apiKey,
            phoneNumberId: manualConfig.phoneNumberId,
            businessAccountId: manualConfig.businessAccountId,
            webhookSecret: manualConfig.webhookSecret
          },
          accountName: newAccountName || `Account ${accounts.length + 1}`
        })
      });

      const data = await response.json();
      console.log('Save response:', data);

      if (response.ok && data.isConnected) {
        toast.success('WhatsApp account added successfully!');
        fetchWhatsAppStatus();
        setIsConnecting(false);
        setIsAddingAccount(false);
        setNewAccountName('');
      } else if (data.validationError) {
        setConnectionError(data.error || 'Invalid credentials');
        toast.error(data.error || 'Invalid credentials - please check your API key and IDs');
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error.message || 'Failed to save configuration';

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setConnectionError('Network error - please check your server is running');
        toast.error('Network error - please ensure the server is running');
      } else {
        setConnectionError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          settings: localSettings
        })
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
        setSavedSettings(localSettings);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, accountId, action: 'setDefaultAccount' })
      });

      if (response.ok) {
        toast.success('Default account updated');
        setDefaultAccountId(accountId);
        fetchWhatsAppStatus();
      }
    } catch (error) {
      toast.error('Failed to update default account');
    }
  };

  const handleEditAccountName = (account: WhatsAppAccount) => {
    setEditingAccount(account);
    setEditAccountName(account.accountName);
    setShowEditDialog(true);
  };

  const saveEditedAccountName = async () => {
    if (!editingAccount || !editAccountName.trim()) return;

    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          accountId: editingAccount.id,
          accountName: editAccountName.trim(),
          action: 'renameAccount'
        })
      });

      if (response.ok) {
        toast.success('Account renamed successfully');
        fetchWhatsAppStatus();
      }
    } catch (error) {
      toast.error('Failed to rename account');
    } finally {
      setShowEditDialog(false);
      setEditingAccount(null);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setDeleteAccountId(accountId);
    setShowDeleteAccountDialog(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deleteAccountId) return;
    setIsDisconnecting(true);
    setShowDeleteAccountDialog(false);

    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, accountId: deleteAccountId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('WhatsApp account deleted');
      fetchWhatsAppStatus();
    } catch (error) {
      toast.error('Failed to delete WhatsApp account');
    } finally {
      setIsDisconnecting(false);
      setDeleteAccountId(null);
    }
  };

  const handleSetDefault = async (accountId: string, phoneNumberId: string) => {
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, accountId, phoneNumberId, action: 'setDefault' })
      });

      if (response.ok) {
        toast.success('Default phone number updated');
        fetchWhatsAppStatus();
      }
    } catch (error) {
      toast.error('Failed to update default phone number');
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchTokenAlert();
    fetchHealthStatus();
  }, [fetchWhatsAppStatus, fetchTokenAlert, fetchHealthStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/whatsapp/oauth/url');
      const data = await response.json();

      if (data.error) {
        setConnectionError(data.error);
        setIsConnecting(false);
        return;
      }

      if (!data.url) {
        setConnectionError('Failed to generate OAuth URL. Please check your configuration.');
        setIsConnecting(false);
        return;
      }

      console.log('OAuth URL received, redirecting to Meta...');
      sessionStorage.setItem('wa_oauth_orgId', organizationId);
      window.location.href = data.url;
    } catch (error: any) {
      console.error('OAuth connection error:', error);
      setConnectionError(error.message || 'Failed to initiate connection');
      toast.error('Failed to connect WhatsApp account');
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const GuideContent = () => (
    <div className="space-y-4">
      <Tabs value={activeGuideTab} onValueChange={setActiveGuideTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted border rounded-lg">
          <TabsTrigger
            value="getting-started"
            className="text-xs py-2 text-muted-foreground rounded-md data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Getting Started
          </TabsTrigger>
          <TabsTrigger
            value="api-reference"
            className="text-xs py-2 text-muted-foreground rounded-md data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            API Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-4 mt-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Step 1: Connect Your Account
            </h4>
            <p className="text-xs text-muted-foreground pl-6">
              Use the OAuth connection to securely connect your Meta Business Account.
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-green-500" />
              Step 2: Add Multiple Accounts
            </h4>
            <p className="text-xs text-muted-foreground pl-6">
              Connect multiple WhatsApp Business accounts to your organization.
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Star className="w-4 h-4 text-green-500" />
              Step 3: Set Default Account
            </h4>
            <p className="text-xs text-muted-foreground pl-6">
              Choose which account should be used for sending messages by default.
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Settings2 className="w-4 h-4 text-green-500" />
              Step 4: Configure Settings
            </h4>
            <p className="text-xs text-muted-foreground pl-6">
              Configure your webhook URL, enable notifications, and set your default phone number.
            </p>
          </div>

          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mt-4">
            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-green-400" />
              Important Notes
            </h5>
            <ul className="text-xs text-gray-300 mt-2 space-y-1 pl-6 list-disc">
              <li>Your API tokens are encrypted and stored securely</li>
              <li>Tokens expire after 59 days - OAuth handles refresh automatically</li>
              <li>Webhook messages are signed for security verification</li>
              <li>Daily message limit is 1,000 per phone number</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="api-reference" className="space-y-4 mt-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Key className="w-4 h-4 text-green-500" />
              Finding Your Credentials
            </h4>
            <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <p className="text-green-400"># From Meta Business Manager → WhatsApp → Settings</p>
              <p className="mt-2 text-slate-300">1. Access Token - Temporary token for API calls</p>
              <p className="text-slate-300">2. Phone Number ID - Your WhatsApp number identifier</p>
              <p className="text-slate-300">3. Business Account ID - Your business account identifier</p>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Webhook className="w-4 h-4 text-green-500" />
              Webhook Setup
            </h4>
            <div className="text-xs text-muted-foreground pl-6 space-y-1">
              <p>Your webhook URL:</p>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-foreground block mt-1">
                {typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp/webhooks
              </code>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Zap className="w-4 h-4 text-green-500" />
              Rate Limits
            </h4>
            <ul className="text-xs text-muted-foreground pl-6 space-y-1 list-disc">
              <li>1,000 messages per phone number per day</li>
              <li>250 messages to new customers per day</li>
              <li>10 webhook requests per second</li>
            </ul>
          </div>

          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mt-4">
            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-green-400" />
              Troubleshooting
            </h5>
            <ul className="text-xs text-gray-300 mt-2 space-y-1 pl-6 list-disc">
              <li>"Invalid credentials" - Check your API key</li>
              <li>"Phone number not found" - Verify Phone Number ID</li>
              <li>"Token expired" - Reconnect via OAuth</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const needsWhatsAppBusiness = connectionError?.includes('No WhatsApp Business Account found');
  const getDefaultPhoneNumber = (account: WhatsAppAccount) => {
    return account.phoneNumbers?.find(p => p.isDefault) || account.phoneNumbers?.[0];
  };

  // ═══════════════════════════════════════════════════════════════
  // NOT CONNECTED STATE
  // ═══════════════════════════════════════════════════════════════

  if (!isConnected && !isConnecting && !isAddingAccount) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Connection */}
          <div className="lg:col-span-2">
            <StyledCard
              title="Connect WhatsApp Account"
              description="Connect your WhatsApp Business account using OAuth or manual configuration"
              titleIcon={Link2}
            >
              <Tabs
                value={connectionMethodTab}
                onValueChange={(value) => setConnectionMethodTab(value as 'auth' | 'manual')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted border rounded-lg mb-6">
                  <TabsTrigger
                    value="auth"
                    className="text-sm py-2.5  rounded-md text-muted-foreground data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-green-950 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Auth (OAuth)
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className="text-sm py-2.5 text-muted-foreground rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-green-950 flex items-center justify-center gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    Manual
                  </TabsTrigger>
                </TabsList>

                {/* Auth Tab */}
                <TabsContent value="auth" className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50/50">
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Recommended Method
                    </h4>
                    <p className="text-xs text-green-700 mt-1">
                      Connect using Meta's official OAuth flow for automatic token refresh.
                    </p>
                  </div>

                  <EmbeddedSignupButton
                    organizationId={organizationId}
                    onSuccess={() => fetchWhatsAppStatus()}
                    onError={(error) => setConnectionError(error)}
                  />

                  {connectionError && (
                    <div className="p-5 rounded-xl border-2 border-red-300 bg-red-50">
                      <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {needsWhatsAppBusiness ? 'WhatsApp Business Account Required' : 'Connection Error'}
                      </h4>
                      <p className="text-xs text-red-600 mt-2">
                        {needsWhatsAppBusiness
                          ? 'You need a WhatsApp Business Account to connect.'
                          : connectionError}
                      </p>

                      {needsWhatsAppBusiness && (
                        <div className="p-4 rounded-lg border border-red-200 bg-white mt-3">
                          <h4 className="text-xs font-semibold mb-2">How to create a WhatsApp Business Account:</h4>
                          <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
                            <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">business.facebook.com</a></li>
                            <li>Create or use an existing Business Manager account</li>
                            <li>Go to WhatsApp Accounts → Create WhatsApp Account</li>
                            <li>Once created, return here and try connecting again</li>
                          </ol>
                          <Button
                            className="w-full mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                            onClick={() => window.open('https://business.facebook.com', '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Business Manager
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full mt-4 rounded-lg border-red-300 text-red-700 hover:bg-red-50 text-sm"
                        onClick={() => setConnectionError(null)}
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Manual Tab */}
                <TabsContent value="manual" className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50">
                    <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Manual Configuration
                    </h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Enter credentials manually if OAuth is not available.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="manualApiKey" className="text-sm font-medium text-foreground">
                        WhatsApp API Access Token <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manualApiKey"
                          type={showApiKey ? "text" : "password"}
                          value={manualConfig.apiKey}
                          onChange={(e) => setManualConfig({ ...manualConfig, apiKey: e.target.value })}
                          placeholder="Enter your access token"
                          className="pl-10 pr-10 font-mono text-sm rounded-lg border-slate-300"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 bg-transparent border-l rounded-l-none rounded-r-lg"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualPhoneNumberId" className="text-sm font-medium text-foreground">Phone Number ID</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manualPhoneNumberId"
                          value={manualConfig.phoneNumberId}
                          onChange={(e) => setManualConfig({ ...manualConfig, phoneNumberId: e.target.value })}
                          placeholder="e.g., 991957080667897"
                          className="pl-10 font-mono text-sm rounded-lg border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualBusinessAccountId" className="text-sm font-medium text-foreground">Business Account ID</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manualBusinessAccountId"
                          value={manualConfig.businessAccountId}
                          onChange={(e) => setManualConfig({ ...manualConfig, businessAccountId: e.target.value })}
                          placeholder="e.g., 1545549869849783"
                          className="pl-10 font-mono text-sm rounded-lg border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualWebhookSecret" className="text-sm font-medium text-foreground">Webhook Secret (Optional)</Label>
                      <div className="relative">
                        <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manualWebhookSecret"
                          value={manualConfig.webhookSecret}
                          onChange={(e) => setManualConfig({ ...manualConfig, webhookSecret: e.target.value })}
                          placeholder="Optional webhook secret"
                          className="pl-10 font-mono text-sm rounded-lg border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    <Label htmlFor="accountName" className="text-sm font-medium text-foreground">Account Name (Optional)</Label>
                    <Input
                      id="accountName"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Marketing Team, Support, Sales"
                      className="text-sm rounded-lg border-slate-300"
                    />
                    <p className="text-xs text-muted-foreground">Give this account a friendly name</p>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">Get these values from Meta Business Manager</p>
                    <Button onClick={saveManualConfig} disabled={isSavingConfig} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                      {isSavingConfig ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Add Account
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </StyledCard>
          </div>

          {/* Right Section - Guide */}
          <div className="lg:col-span-1">
            <StyledCard
              title="Setup Guide"
              description="Follow our step-by-step instructions"
              titleIcon={BookOpen}
              className="h-full"
            >
              <GuideContent />
            </StyledCard>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ADDING ACCOUNT STATE (connected but adding another)
  // ═══════════════════════════════════════════════════════════════

  if (isConnecting || isAddingAccount) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold mb-1">Add WhatsApp Account</h1>
            <p className="text-muted-foreground">Connect another WhatsApp Business account to your organization</p>
          </div>
          <Button variant="outline" onClick={() => { setIsConnecting(false); setIsAddingAccount(false); setConnectionError(null); }} className="rounded-lg border-slate-300 text-sm">
            ← Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StyledCard
              title="Connect Account"
              description="Choose a connection method for the new account"
              titleIcon={Link2}
            >
              <Tabs
                value={connectionMethodTab}
                onValueChange={(value) => setConnectionMethodTab(value as 'auth' | 'manual')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted border rounded-lg mb-6">
                  <TabsTrigger
                    value="auth"
                    className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-green-950 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Auth (OAuth)
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className="text-sm py-2.5 text-muted-foreground rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-green-950 flex items-center justify-center gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="auth" className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50/50">
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Recommended Method
                    </h4>
                    <p className="text-xs text-green-700 mt-1">
                      Connect using Meta's official OAuth flow for automatic token refresh.
                    </p>
                  </div>

                  <EmbeddedSignupButton
                    organizationId={organizationId}
                    onSuccess={() => { fetchWhatsAppStatus(); setIsAddingAccount(false); setIsConnecting(false); }}
                    onError={(error) => setConnectionError(error)}
                  />

                  {connectionError && (
                    <div className="p-5 rounded-xl border-2 border-red-300 bg-red-50">
                      <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Connection Error
                      </h4>
                      <p className="text-xs text-red-600 mt-2">{connectionError}</p>
                      <Button variant="outline" className="w-full mt-4 rounded-lg border-red-300 text-red-700 hover:bg-red-50 text-sm" onClick={() => setConnectionError(null)}>
                        Try Again
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="addAccountName" className="text-sm font-medium text-foreground">Account Name (Optional)</Label>
                    <Input
                      id="addAccountName"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Marketing Team, Support, Sales"
                      className="text-sm rounded-lg border-slate-300"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">WhatsApp API Access Token <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={manualConfig.apiKey}
                          onChange={(e) => setManualConfig({ ...manualConfig, apiKey: e.target.value })}
                          placeholder="Enter your access token"
                          className="pl-10 pr-10 font-mono text-sm rounded-lg border-slate-300"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 bg-transparent border-l rounded-l-none rounded-r-lg" onClick={() => setShowApiKey(!showApiKey)}>
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Phone Number ID</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={manualConfig.phoneNumberId} onChange={(e) => setManualConfig({ ...manualConfig, phoneNumberId: e.target.value })} placeholder="e.g., 991957080667897" className="pl-10 font-mono text-sm rounded-lg border-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Business Account ID</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={manualConfig.businessAccountId} onChange={(e) => setManualConfig({ ...manualConfig, businessAccountId: e.target.value })} placeholder="e.g., 1545549869849783" className="pl-10 font-mono text-sm rounded-lg border-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Webhook Secret (Optional)</Label>
                      <div className="relative">
                        <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={manualConfig.webhookSecret} onChange={(e) => setManualConfig({ ...manualConfig, webhookSecret: e.target.value })} placeholder="Optional webhook secret" className="pl-10 font-mono text-sm rounded-lg border-slate-300" />
                      </div>
                    </div>
                  </div>

                  {connectionError && (
                    <div className="flex items-start text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
                      <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                      {connectionError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <p className="text-xs text-muted-foreground">Get these values from Meta Business Manager</p>
                    <Button onClick={saveManualConfig} disabled={isSavingConfig} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                      {isSavingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Add Account
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </StyledCard>
          </div>

          <div className="lg:col-span-1">
            <StyledCard title="Setup Guide" description="Follow our step-by-step instructions" titleIcon={BookOpen} className="h-full">
              <GuideContent />
            </StyledCard>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTED STATE
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold mb-1">WhatsApp Configuration</h1>
        <p className="text-muted-foreground text-lg">Manage your Meta WhatsApp Business API accounts and phone numbers</p>
      </div>

      <WhatsAppStatusBanner onRetry={handleConnect} />

      {/* Connection Status */}
      <StyledCard accent>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-green-800">Connected via Meta Embedded Signup</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>WABA ID: {selectedAccount?.businessAccountId || 'N/A'}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>Last verified: {selectedAccount?.lastVerifiedAt ? formatConnectionTime(selectedAccount.lastVerifiedAt) : 'Unknown'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleConnect} className="rounded-lg border-slate-300 text-sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </StyledCard>

      {/* Token Alert */}
      {tokenAlert && tokenAlert.alertLevel !== 'healthy' && tokenAlert.alertLevel !== 'warning' && (
        <StyledCard danger={tokenAlert.alertLevel === 'expired' || tokenAlert.alertLevel === 'critical'} warning={tokenAlert.alertLevel === 'caution'}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${tokenAlert.alertLevel === 'expired' ? 'text-red-600' :
                tokenAlert.alertLevel === 'critical' ? 'text-red-500' :
                  'text-yellow-600'
              }`}>
              {getAlertIcon(tokenAlert.alertLevel)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h4 className={`text-sm font-semibold ${tokenAlert.alertLevel === 'expired' ? 'text-red-800' :
                    tokenAlert.alertLevel === 'critical' ? 'text-red-700' :
                      'text-yellow-800'
                  }`}>
                  {tokenAlert.alertLevel === 'expired' ? 'Token Expired!' :
                    tokenAlert.alertLevel === 'critical' ? 'Token Expiring Soon!' :
                      'Token Expiration Warning'}
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  className={`rounded-lg border-2 text-xs ${tokenAlert.alertLevel === 'expired' ? 'border-red-600 text-red-600 hover:bg-red-50' :
                      tokenAlert.alertLevel === 'critical' ? 'border-red-500 text-red-500 hover:bg-red-50' :
                        'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                    }`}
                  onClick={() => window.location.href = '/api/whatsapp/token/refresh'}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh Token
                </Button>
              </div>
              <p className={`text-xs mt-1 ${tokenAlert.alertLevel === 'expired' ? 'text-red-700' :
                  tokenAlert.alertLevel === 'critical' ? 'text-red-600' :
                    'text-yellow-700'
                }`}>
                {tokenAlert.message}
              </p>
            </div>
          </div>
        </StyledCard>
      )}

      {/* Connected Accounts */}
      <StyledCard
        title="Connected Accounts"
        description="Your WhatsApp Business Accounts"
        headerRight={
          <Button onClick={handleAddAccountClick} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        }
      >

        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all group ${account.id === selectedAccountId
                  ? 'border-green-950 bg-green-50/30'
                  : 'border-slate-200 bg-white hover:border-green-950/50'
                }`}
            >
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{account.accountName}</span>
                  {account.isDefault && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Default</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="font-mono">{account.businessAccountId}</span>
                  <span className="text-slate-300">·</span>
                  <span>{getDefaultPhoneNumber(account)?.phoneNumber || 'No phone'}</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${account.isActive ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  <span>{account.isActive ? 'Healthy' : 'Warning'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs h-8" onClick={() => refreshAccountDetails(account.id)}>
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs h-8" onClick={() => handleEditAccountName(account)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs h-8" onClick={() => handleDeleteAccount(account.id)} disabled={isDisconnecting}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </StyledCard>

      {/* Phone Numbers */}
      <StyledCard>
        <SectionHeader title="Phone Numbers" description="Manage and configure individual phone numbers" />

        <div className="rounded-xl border border-green-950 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-950 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Display Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Number</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Quality</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Default</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedAccount?.phoneNumbers?.map((number) => (
                <tr key={number.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{number.displayName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{number.phoneNumber}</td>
                  <td className="py-3 px-4">
                    {number.qualityScore ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{number.qualityScore}</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">N/A</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={
                      number.verificationStatus === 'VERIFIED'
                        ? 'bg-green-100 text-green-800 border-green-200 text-xs'
                        : 'bg-amber-100 text-amber-800 border-amber-200 text-xs'
                    }>
                      {number.verificationStatus === 'VERIFIED' ? 'Active' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="radio"
                      name="default-phone"
                      checked={number.isDefault}
                      onChange={() => handleSetDefault(selectedAccount.id, number.id)}
                      className="w-4 h-4 text-green-600 accent-green-600"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs h-8 text-muted-foreground hover:text-foreground">
                      Details
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              )) || (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      No phone numbers found
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </StyledCard>

      {/* API Settings */}
      <StyledCard>
        <SectionHeader title="API Settings" description="Configure tokens, webhook, and API behaviour" />

        <div className="divide-y divide-slate-100">
          <ToggleRow
            title="Auto-refresh Access Token"
            description="Automatically renew token before expiry to prevent disruptions"
            checked={localSettings.autoRefreshToken || false}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoRefreshToken: checked })}
          />

          <ToggleRow
            title="Webhook Enabled"
            description="Receive real-time events for messages and status updates"
            checked={localSettings.webhookEnabled || false}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, webhookEnabled: checked })}
          />

          <ToggleRow
            title="Debug Mode"
            description="Log all API requests and responses for troubleshooting"
            checked={localSettings.debugMode || false}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, debugMode: checked })}
          />

          <ToggleRow
            title="Notify on Error"
            description="Send email alerts when message delivery fails"
            checked={localSettings.notifyOnError || false}
            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, notifyOnError: checked })}
          />
        </div>

        <Separator className="bg-slate-200 my-4" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Webhook URL</Label>
            <Input
              value={localSettings.webhookUrl || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, webhookUrl: e.target.value })}
              placeholder="https://yourdomain.com/api/whatsapp/webhooks"
              className="text-sm font-mono rounded-lg border-slate-300"
            />
            <p className="text-xs text-muted-foreground">Your Meta webhook endpoint. Must be publicly accessible and use HTTPS.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Webhook Verify Token</Label>
            <Input
              type="password"
              value={manualConfig.webhookSecret || ''}
              onChange={(e) => setManualConfig({ ...manualConfig, webhookSecret: e.target.value })}
              placeholder="Enter webhook verify token"
              className="text-sm font-mono rounded-lg border-slate-300"
            />
          </div>
        </div>
      </StyledCard>

      {/* Health Check */}
      <StyledCard>
        <SectionHeader title="Health Check" description="Current status of your WhatsApp integration" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-green-500' :
                  healthStatus?.status === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                }`}></span>
              API Status
            </div>
            <div className={`text-lg font-bold mt-2 ${healthStatus?.status === 'healthy' ? 'text-green-700' :
                healthStatus?.status === 'degraded' ? 'text-yellow-700' :
                  'text-red-700'
              }`}>
              {healthStatus?.status === 'healthy' ? 'Healthy' :
                healthStatus?.status === 'degraded' ? 'Degraded' :
                  healthStatus?.status === 'unhealthy' ? 'Unhealthy' : 'Unknown'}
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50">
            <div className="text-xs text-muted-foreground">Token Expires</div>
            <div className="text-lg font-bold mt-2 text-foreground">
              {tokenAlert?.daysUntilExpiry ? `${tokenAlert.daysUntilExpiry} days` : 'Unknown'}
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50">
            <div className="text-xs text-muted-foreground">Messages Today</div>
            <div className="text-sm font-medium mt-2 text-muted-foreground">See Analytics</div>
          </div>

          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50">
            <div className="text-xs text-muted-foreground">Delivery Rate</div>
            <div className="text-sm font-medium mt-2 text-muted-foreground">See Analytics</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs" onClick={runHealthCheck} disabled={isLoadingHealth}>
            {isLoadingHealth ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            Run Health Check
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs" onClick={() => window.open('/dashboard/analytics', '_self')}>
            View Analytics
          </Button>
        </div>
      </StyledCard>

      {/* Save Actions */}
      <div className="p-5 rounded-xl border-2 border-orange-400 bg-white shadow-lg sticky bottom-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <span className="text-md text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
            WhatsApp changes may affect live campaigns
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-lg border-slate-300 text-sm" onClick={() => setLocalSettings(savedSettings)}>
              Discard
            </Button>
            <Button onClick={saveSettings} disabled={isSavingSettings} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
              {isSavingSettings ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save WhatsApp Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent className="rounded-xl border-2 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete WhatsApp Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently remove the account and all associated phone numbers. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)} className="rounded-lg border-slate-300">Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteAccount} disabled={isDisconnecting} className="rounded-lg">
              {isDisconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-xl border-2 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rename Account</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Give this account a friendly name to help you identify it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-sm font-medium text-foreground">Account Name</Label>
              <Input
                id="editName"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                placeholder="e.g., Marketing Team, Support"
                className="rounded-lg border-slate-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-lg border-slate-300">Cancel</Button>
            <Button onClick={saveEditedAccountName} className="rounded-lg bg-green-600 hover:bg-green-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WhatsAppSettingsTab({ organizationId }: WhatsAppSettingsTabProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WhatsAppSettingsTabContent organizationId={organizationId} />
    </Suspense>
  );
}