'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Loader2, 
  Plus, 
  RefreshCw, 
  Unlink, 
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
  BarChart3,
  Clock,
  Link2,
  Building2,
  Monitor,
  HelpCircle,
  XCircle,
  ChevronRight,
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
  RefreshCcw,
  Play,
  Pause,
  Trash2,
  Edit,
  ArrowRight,
  CheckSquare,
  AlertOctagon,
  Users,
  Star,
  MoreVertical,
  Pencil
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
  // Additional phone number fields
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
  // Additional WABA account details
  currency?: string;
  timezoneId?: string;
  accountReviewStatus?: string;
  businessType?: string;
  businessLocation?: string;
  // Owner Business Info
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

export function WhatsAppSettingsTab({ organizationId }: WhatsAppSettingsTabProps) {
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
  
  // Account name dialog
  const [showAccountNameDialog, setShowAccountNameDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  // Edit account dialog
  const [editingAccount, setEditingAccount] = useState<WhatsAppAccount | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Manual config state (fallback when OAuth not available)
  const [manualConfig, setManualConfig] = useState({
    apiKey: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookSecret: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Settings toggles
  const [localSettings, setLocalSettings] = useState<WhatsAppSettings>({
    autoRefreshToken: true,
    webhookEnabled: true,
    notificationsEnabled: true,
    notifyOnMessage: true,
    notifyOnCampaign: true,
    notifyOnError: true,
    debugMode: false
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Active tab for guide
  const [activeGuideTab, setActiveGuideTab] = useState('getting-started');

  // Active tab for connection method (Auth or Manual)
  const [connectionMethodTab, setConnectionMethodTab] = useState<'auth' | 'manual'>('auth');

  // Handle error from URL params
  useEffect(() => {
    const whatsappStatus = searchParams.get('whatsapp');
    const errorMessage = searchParams.get('message');
    
    if (whatsappStatus === 'error' && errorMessage) {
      setConnectionError(decodeURIComponent(errorMessage));
      // Clear the URL params
      window.history.replaceState({}, '', '/dashboard/settings?tab=whatsapp');
    }
  }, [searchParams]);

  // Get the currently selected account
  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const isConnected = accounts.length > 0 && accounts.some(a => a.isActive);

  // Helper function to format connection timestamp
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

  // Helper function to format expiration date
  const formatExpirationDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get alert color based on alert level
  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'expired':
        return 'bg-red-600';
      case 'critical':
        return 'bg-red-500';
      case 'caution':
        return 'bg-yellow-500';
      case 'warning':
        return 'bg-green-500';
      default:
        return 'bg-green-500';
    }
  };

  // Get alert icon based on alert level
  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'expired':
        return <XCircle className="w-5 h-5" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  // Helper function to format device info
  const formatDeviceInfo = (device: string | null | undefined) => {
    if (!device) return 'Unknown device';
    if (device.length > 60) {
      return device.substring(0, 60) + '...';
    }
    return device;
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Fetch all WhatsApp accounts
  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
        setSelectedAccountId(data.selectedAccountId || (data.accounts && data.accounts[0]?.id) || null);
        setDefaultAccountId(data.defaultAccountId || (data.accounts && data.accounts[0]?.id) || null);
        
        // Load manual config if available (for legacy connections)
        if (data.config) {
          setManualConfig({
            apiKey: data.config.apiKey || '',
            phoneNumberId: data.config.phoneNumberId || '',
            businessAccountId: data.config.businessAccountId || '',
            webhookSecret: data.config.webhookSecret || ''
          });
        }

        // Load settings
        if (data.settings) {
          setLocalSettings(prev => ({
            ...prev,
            autoRefreshToken: data.settings.autoRefreshToken ?? true,
            webhookEnabled: data.settings.webhookEnabled ?? true,
            webhookUrl: data.settings.webhookUrl,
            defaultPhoneNumberId: data.settings.defaultPhoneNumberId,
            notificationsEnabled: data.settings.notificationsEnabled ?? true,
            notifyOnMessage: data.settings.notifyOnMessage ?? true,
            notifyOnCampaign: data.settings.notifyOnCampaign ?? true,
            notifyOnError: data.settings.notifyOnError ?? true,
            debugMode: data.settings.debugMode ?? false
          }));
        }
        
        // Check if OAuth is available
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
  
  // Check if OAuth is available
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

  // Fetch token expiration alert
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

  // Fetch health status
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

  // Run manual health check
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

  // Refresh account details from Meta API
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

  // Add new account - first step: get account name
  const handleAddAccountClick = () => {
    setNewAccountName('');
    setShowAccountNameDialog(true);
    setIsAddingAccount(true);
  };

  // Proceed with adding account after name is provided
  const proceedToAddAccount = () => {
    setShowAccountNameDialog(false);
    setIsConnecting(true);
    // The actual connection will happen via OAuth or manual config
    // For now, show the manual config form
  };

  // Save manual configuration (for adding new account)
  const saveManualConfig = async () => {
    // Validate required fields
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
    
    // Note: Facebook App ID and Facebook App Secret are NOT required for manual config
    // They are only needed for OAuth flow which uses env variables
    
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

  // Save WhatsApp settings
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
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle set default account
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

  // Handle edit account name
  const handleEditAccountName = (account: WhatsAppAccount) => {
    setEditingAccount(account);
    setEditAccountName(account.accountName);
    setShowEditDialog(true);
  };

  // Save edited account name
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

  // Handle disconnect/delete account
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this WhatsApp account? This will remove all associated phone numbers and cannot be undone.')) {
      return;
    }

    setIsDisconnecting(true);

    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, accountId })
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
    }
  };

  // Handle set default phone number
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

  // Handle OAuth connection - now uses embedded signup
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Check if embedded signup is supported (show iframe)
      // The EmbeddedSignupButton component will handle this
      // This function is kept for backward compatibility
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guide content component
  const GuideContent = () => (
    <div className="space-y-4">
      <Tabs
        value={activeGuideTab}
        onValueChange={setActiveGuideTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="api-reference">API Guide</TabsTrigger>
        </TabsList>

        {/* GETTING STARTED SECTION */}
        <TabsContent value="getting-started" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-lime-500" />
              Step 1: Connect Your Account
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Use the OAuth connection on the left to securely connect your Meta
              Business Account. This is the recommended method as it provides
              automatic token refresh and easy management.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-lime-500" />
              Step 2: Add Multiple Accounts
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              You can connect multiple WhatsApp Business accounts to your organization.
              Each account can have its own phone numbers and settings. Use the "Add Account" 
              button to connect additional accounts.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-lime-500" />
              Step 3: Set Default Account
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Choose which WhatsApp account should be used for sending messages by default.
              You can always switch between accounts when sending campaigns.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-lime-500" />
              Step 4: Configure Settings
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              After connecting, configure your webhook URL, enable notifications,
              and set your default phone number for outgoing messages.
            </p>
          </div>

          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mt-4">
            <h5 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-lime-500" />
              Important Notes
            </h5>
            <ul className="text-sm text-gray-300 mt-2 space-y-1 pl-6 list-disc">
              <li>Your API tokens are encrypted and stored securely</li>
              <li>Tokens expire after 59 days - OAuth handles refresh automatically</li>
              <li>Webhook messages are signed for security verification</li>
              <li>Daily message limit is 1,000 per phone number</li>
              <li>You can switch between accounts when sending messages</li>
            </ul>
          </div>
        </TabsContent>

        {/* API GUIDE SECTION */}
        <TabsContent value="api-reference" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-lime-500" />
              Finding Your Credentials
            </h4>
            <div className="">
              <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <p className="text-lime-400">
                  # From Meta Business Manager {">"} WhatsApp {">"} Settings
                </p>
                <p className="mt-2 text-slate-300">
                  1. Access Token - Temporary token for API calls
                </p>
                <p className="text-slate-300">
                  2. Phone Number ID - Your WhatsApp number identifier
                </p>
                <p className="text-slate-300">
                  3. Business Account ID - Your business account identifier
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Webhook className="w-4 h-4 text-lime-500" />
              Webhook Setup
            </h4>
            <div className="text-sm text-muted-foreground pl-6 space-y-2">
              <p>
                Your webhook URL:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /api/whatsapp/webhooks
                </code>
              </p>
              <p>
                Verify token is automatically generated. Use it to verify webhooks
                in Meta.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime-500" />
              Rate Limits
            </h4>
            <div className="text-sm text-muted-foreground pl-6">
              <ul className="space-y-1 list-disc pl-4">
                <li>1,000 messages per phone number per day</li>
                <li>250 messages to new customers per day</li>
                <li>5,000 messages to existing customers per day</li>
                <li>10 webhook requests per second</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mt-4">
            <h5 className="font-semibold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-lime-500" />
              Troubleshooting
            </h5>
            <ul className="text-sm text-gray-300 mt-2 space-y-1 pl-6 list-disc">
              <li>"Invalid credentials" - Check your API key</li>
              <li>"Phone number not found" - Verify Phone Number ID</li>
              <li>"Token expired" - Reconnect via OAuth</li>
              <li>"Rate limit exceeded" - Wait and try again</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Not connected state - show single card with Auth and Manual tabs
  const needsWhatsAppBusiness = connectionError?.includes('No WhatsApp Business Account found');
  
  if (!isConnected && !isConnecting && !isAddingAccount) {
    return (
      <div className="space-y-6">
        {/* Main Grid: Left (Connection with Tabs) + Right (Guide) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Connection Card with Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Single Card with Auth and Manual Tabs */}
            <Card className="border-2 bg-slate-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connect WhatsApp Account
                </CardTitle>
                <CardDescription>
                  Connect your WhatsApp Business account using OAuth or manual configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tabs for Auth and Manual */}
                <Tabs 
                  value={connectionMethodTab} 
                  onValueChange={(value) => setConnectionMethodTab(value as 'auth' | 'manual')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="auth" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Auth (OAuth)
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Manual
                    </TabsTrigger>
                  </TabsList>

                  {/* Auth Tab - OAuth Connection */}
                  <TabsContent value="auth" className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Recommended Method
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Connect your WhatsApp Business Account using Meta's official OAuth flow. 
                        This provides automatic token refresh and easy account management.
                      </p>
                    </div>
                    
                    <EmbeddedSignupButton
                      organizationId={organizationId}
                      onSuccess={() => {
                        fetchWhatsAppStatus();
                      }}
                      onError={(error) => {
                        setConnectionError(error);
                      }}
                    />

                    {/* Error Display with Action Button */}
                    {connectionError && (
                      <div className="border-2 bg-red-50 border-red-300 rounded-lg p-4 mt-4">
                        <h4 className="font-semibold text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {needsWhatsAppBusiness ? 'WhatsApp Business Account Required' : 'Connection Error'}
                        </h4>
                        <p className="text-sm text-red-600 mt-2">
                          {needsWhatsAppBusiness 
                            ? 'You need a WhatsApp Business Account to connect. You don\'t have one linked to your Meta Business Manager yet.'
                            : connectionError}
                        </p>
                        
                        {needsWhatsAppBusiness && (
                          <div className="bg-white p-4 rounded-lg border border-red-200 mt-3">
                            <h4 className="font-semibold text-sm mb-2">How to create a WhatsApp Business Account:</h4>
                            <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
                              <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">business.facebook.com</a></li>
                              <li>Create or use an existing Business Manager account</li>
                              <li>Go to WhatsApp Accounts → Create WhatsApp Account</li>
                              <li>Follow the steps to set up your business profile</li>
                              <li>Once created, return here and try connecting again</li>
                            </ol>
                            <Button 
                              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                              onClick={() => window.open('https://business.facebook.com', '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Business Manager
                            </Button>
                          </div>
                        )}
                        
                        <Button 
                          variant="outline" 
                          className="w-full mt-4 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setConnectionError(null)}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Manual Tab - Manual Configuration */}
                  <TabsContent value="manual" className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Manual Configuration
                      </h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Enter your WhatsApp API credentials manually. Use this if OAuth is not available 
                        or you need to connect using existing credentials.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* WhatsApp API Access Token */}
                      <div className="space-y-2">
                        <Label htmlFor="manualApiKey">
                          WhatsApp API Access Token
                          <span className="text-orange-500 ml-1">*</span>
                        </Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manualApiKey"
                            type={showApiKey ? "text" : "password"}
                            value={manualConfig.apiKey}
                            onChange={(e) =>
                              setManualConfig({
                                ...manualConfig,
                                apiKey: e.target.value,
                              })
                            }
                            placeholder="Enter your WhatsApp API access token"
                            className="pl-10 pr-10 font-mono text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 rounded-none rounded-r-md border-l bg-transparent"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualPhoneNumberId">Phone Number ID</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manualPhoneNumberId"
                            value={manualConfig.phoneNumberId}
                            onChange={(e) =>
                              setManualConfig({
                                ...manualConfig,
                                phoneNumberId: e.target.value,
                              })
                            }
                            placeholder="e.g., 991957080667897"
                            className="pl-10 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualBusinessAccountId">
                          Business Account ID
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manualBusinessAccountId"
                            value={manualConfig.businessAccountId}
                            onChange={(e) =>
                              setManualConfig({
                                ...manualConfig,
                                businessAccountId: e.target.value,
                              })
                            }
                            placeholder="e.g., 1545549869849783"
                            className="pl-10 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manualWebhookSecret">
                          Webhook Secret (Optional)
                        </Label>
                        <div className="relative">
                          <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manualWebhookSecret"
                            value={manualConfig.webhookSecret}
                            onChange={(e) =>
                              setManualConfig({
                                ...manualConfig,
                                webhookSecret: e.target.value,
                              })
                            }
                            placeholder="Optional webhook secret"
                            className="pl-10 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Account Name */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label htmlFor="accountName">
                        Account Name (Optional)
                      </Label>
                      <Input
                        id="accountName"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="e.g., Marketing Team, Support, Sales"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Give this account a friendly name to help you identify it
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <p className="text-xs text-muted-foreground">
                        Get these values from Meta Business Manager
                      </p>
                      <Button onClick={saveManualConfig} disabled={isSavingConfig}>
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
              </CardContent>
            </Card>
          </div>

          {/* Right Section - Guide */}
          <div className="lg:col-span-1">
            <Card className="h-full bg-slate-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Setup Guide
                </CardTitle>
                <CardDescription>
                  Follow our step-by-step instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuideContent />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Connecting or adding account state
  if (isConnecting || isAddingAccount) {
    return (
      <div className="space-y-6">
        <Card className="border-2 bg-slate-50 border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add WhatsApp Account
            </CardTitle>
            <CardDescription>
              Connect another WhatsApp Business account to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">
                Account Name
              </Label>
              <Input
                id="accountName"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g., Marketing Team, Support, Sales"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Give this account a friendly name to help you identify it
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manualApiKey">WhatsApp API Access Token</Label>
                <Input
                  id="manualApiKey"
                  type={showApiKey ? "text" : "password"}
                  value={manualConfig.apiKey}
                  onChange={(e) => setManualConfig({ ...manualConfig, apiKey: e.target.value })}
                  placeholder="Enter your WhatsApp API access token"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualPhoneNumberId">Phone Number ID</Label>
                <Input
                  id="manualPhoneNumberId"
                  value={manualConfig.phoneNumberId}
                  onChange={(e) => setManualConfig({ ...manualConfig, phoneNumberId: e.target.value })}
                  placeholder="e.g., 991957080667897"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualBusinessAccountId">Business Account ID</Label>
                <Input
                  id="manualBusinessAccountId"
                  value={manualConfig.businessAccountId}
                  onChange={(e) => setManualConfig({ ...manualConfig, businessAccountId: e.target.value })}
                  placeholder="e.g., 1545549869849783"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualWebhookSecret">Webhook Secret (Optional)</Label>
                <Input
                  id="manualWebhookSecret"
                  value={manualConfig.webhookSecret}
                  onChange={(e) => setManualConfig({ ...manualConfig, webhookSecret: e.target.value })}
                  placeholder="Optional webhook secret"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Error message */}
            {connectionError && (
              <div className="flex items-start text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                {connectionError}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => { setIsConnecting(false); setIsAddingAccount(false); }}>
                Cancel
              </Button>
              <Button onClick={saveManualConfig} disabled={isSavingConfig}>
                {isSavingConfig ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state - show accounts list with prominent account info
  // Get the primary/default phone number for display
  const getDefaultPhoneNumber = (account: WhatsAppAccount) => {
    return account.phoneNumbers?.find(p => p.isDefault) || account.phoneNumbers?.[0];
  };

  return (
    <div className="space-y-6">
      <WhatsAppStatusBanner onRetry={handleConnect} />

      {/* Token Expiration Alert Banner */}
      {tokenAlert && tokenAlert.alertLevel !== 'healthy' && tokenAlert.alertLevel !== 'warning' && (
        <div className={`rounded-lg p-4 border-2 ${
          tokenAlert.alertLevel === 'expired' ? 'bg-red-50 border-red-500' :
          tokenAlert.alertLevel === 'critical' ? 'bg-red-50 border-red-400' :
          'bg-yellow-50 border-yellow-400'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${
              tokenAlert.alertLevel === 'expired' ? 'text-red-600' :
              tokenAlert.alertLevel === 'critical' ? 'text-red-500' :
              'text-yellow-600'
            }`}>
              {getAlertIcon(tokenAlert.alertLevel)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${
                  tokenAlert.alertLevel === 'expired' ? 'text-red-800' :
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
                  className={`border-2 font-semibold ${
                    tokenAlert.alertLevel === 'expired' ? 'border-red-600 text-red-600 hover:bg-red-50' :
                    tokenAlert.alertLevel === 'critical' ? 'border-red-500 text-red-500 hover:bg-red-50' :
                    'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                  }`}
                  onClick={() => window.location.href = '/api/whatsapp/token/refresh'}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh Token
                </Button>
              </div>
              <p className={`text-sm mt-1 ${
                tokenAlert.alertLevel === 'expired' ? 'text-red-700' :
                tokenAlert.alertLevel === 'critical' ? 'text-red-600' :
                'text-yellow-700'
              }`}>
                {tokenAlert.message}
              </p>
            </div>
          </div>
        </div>
      )}

  
      {/* Connected Account Info Card - Prominent Display */}
      {selectedAccount && (
        <Card className="border-2 border-green-500 bg-linear-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {selectedAccount.accountName}
                    {selectedAccount.isDefault && (
                      <Badge className="bg-green-600">Default</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {selectedAccount.businessAccountName || 'WhatsApp Business Account'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshAccountDetails(selectedAccount.id)}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Name */}
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Account Name
                </p>
                <p className="font-semibold text-lg mt-1">{selectedAccount.accountName}</p>
              </div>
              
              {/* Phone Number */}
              {getDefaultPhoneNumber(selectedAccount) && (
                <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </p>
                  <p className="font-semibold text-lg mt-1">
                    {getDefaultPhoneNumber(selectedAccount)?.displayName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {getDefaultPhoneNumber(selectedAccount)?.phoneNumber}
                  </p>
                </div>
              )}
              
              {/* Verification Status */}
              {getDefaultPhoneNumber(selectedAccount) && (
                <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Verification Status
                  </p>
                  <div className="mt-1">
                    {getDefaultPhoneNumber(selectedAccount)?.verificationStatus === 'VERIFIED' ? (
                      <Badge className="bg-green-600 text-white px-3 py-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="px-3 py-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {getDefaultPhoneNumber(selectedAccount)?.verificationStatus || 'Pending'}
                      </Badge>
                    )}
                  </div>
                  {getDefaultPhoneNumber(selectedAccount)?.qualityScore && (
                    <p className="text-xs text-gray-500 mt-2">
                      Quality Score: {getDefaultPhoneNumber(selectedAccount)?.qualityScore}
                    </p>
                  )}
                </div>
              )}
              
              {/* Account ID */}
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Account ID
                </p>
                <p className="font-mono text-sm mt-1">{selectedAccount.businessAccountId}</p>
              </div>
              
              {/* Account Status */}
              {selectedAccount.accountReviewStatus && (
                <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Account Status
                  </p>
                  <Badge variant={selectedAccount.accountReviewStatus === 'approved' ? 'default' : 'secondary'} className="mt-1">
                    {selectedAccount.accountReviewStatus}
                  </Badge>
                </div>
              )}
              
              {/* Connected Since */}
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Connected Since
                </p>
                <p className="font-semibold text-sm mt-1">{formatConnectionTime(selectedAccount.connectedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            WhatsApp Accounts
          </h2>
          <p className="text-muted-foreground">
            Manage your connected WhatsApp Business accounts
          </p>
        </div>
        <Button onClick={handleAddAccountClick} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Accounts List */}
      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card 
            key={account.id} 
            className={`border-2 ${
              account.id === selectedAccountId ? 'border-green-900 bg-slate-50' :
              account.isDefault ? 'border-blue-300 bg-blue-50' :
              'border-gray-200'
            }`}
          >
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    account.id === selectedAccountId ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{account.accountName}</CardTitle>
                      {account.isDefault && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {account.id === selectedAccountId && (
                        <Badge className="bg-green-600">Active</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {account.businessAccountName || 'WhatsApp Business'} • Connected {formatConnectionTime(account.connectedAt)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.isDefault && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefaultAccount(account.id)}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Set as Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => refreshAccountDetails(account.id)}
                    title="Refresh account details from Meta"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditAccountName(account)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteAccount(account.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Account Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-gray-500">Business Account</p>
                  <p className="font-semibold">{account.businessAccountName || 'WhatsApp Business'}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-semibold">
                    {account.phoneNumbers?.find(p => p.isDefault)?.displayName || 
                     account.phoneNumbers?.[0]?.displayName || 
                     account.phoneNumberId || 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-gray-500">Account ID</p>
                  <p className="font-mono text-sm truncate">{account.businessAccountId}</p>
                </div>
                {/* Additional WABA Account Details */}
                {account.currency && (
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-500">Currency</p>
                    <p className="font-semibold">{account.currency}</p>
                  </div>
                )}
                {account.timezoneId && (
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-500">Timezone</p>
                    <p className="font-semibold">{account.timezoneId}</p>
                  </div>
                )}
                {account.accountReviewStatus && (
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-500">Account Status</p>
                    <Badge variant={account.accountReviewStatus === 'approved' ? 'default' : 'secondary'}>
                      {account.accountReviewStatus}
                    </Badge>
                  </div>
                )}
                {account.businessType && (
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-500">Business Type</p>
                    <p className="font-semibold">{account.businessType}</p>
                  </div>
                )}
                {account.businessLocation && (
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-500">Business Location</p>
                    <p className="font-semibold text-sm">{account.businessLocation}</p>
                  </div>
                )}
              </div>

              {/* Owner Business Info */}
              {(account.ownerBusinessId || account.ownerBusinessName) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-3">Business Manager Info</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {account.ownerBusinessName && (
                      <div className="p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-500">Business Name</p>
                        <p className="font-semibold">{account.ownerBusinessName}</p>
                      </div>
                    )}
                    {account.ownerBusinessId && (
                      <div className="p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-500">Business ID</p>
                        <p className="font-mono text-sm">{account.ownerBusinessId}</p>
                      </div>
                    )}
                    {account.ownerBusinessPhone && (
                      <div className="p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-semibold">{account.ownerBusinessPhone}</p>
                      </div>
                    )}
                    {account.ownerBusinessEmail && (
                      <div className="p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold">{account.ownerBusinessEmail}</p>
                      </div>
                    )}
                    {account.ownerBusinessAddress && (
                      <div className="p-3 bg-white rounded-lg border md:col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-semibold text-sm">{account.ownerBusinessAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Phone Numbers */}
              {account.phoneNumbers && account.phoneNumbers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-3">Phone Numbers ({account.phoneNumbers.length})</p>
                  <div className="space-y-2">
                    {account.phoneNumbers.map((number) => (
                      <div 
                        key={number.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="font-medium">{number.displayName}</p>
                            <p className="text-xs text-gray-500 font-mono">ID: {number.phoneNumber}</p>
                            {number.messagingLimitTier && (
                              <p className="text-xs text-blue-500">Tier: {number.messagingLimitTier}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={number.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}>
                            {number.verificationStatus === 'VERIFIED' ? '✓ Verified' : '⏳ Pending'}
                          </Badge>
                          {number.phoneNumberStatus && (
                            <Badge variant="outline">{number.phoneNumberStatus}</Badge>
                          )}
                          {number.isDefault && (
                            <Badge variant="outline" className="bg-blue-50">Default</Badge>
                          )}
                          {!number.isDefault && account.id === selectedAccountId && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSetDefault(account.id, number.id)}
                            >
                              Set as Default
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Account Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Give this account a friendly name to help you identify it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Account Name</Label>
              <Input
                id="editName"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                placeholder="e.g., Marketing Team, Support"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={saveEditedAccountName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WhatsAppSettingsTab;
