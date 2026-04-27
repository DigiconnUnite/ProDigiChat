'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  HelpCircle,
  Clock,
  Shield,
  ExternalLink,
  AlertTriangle,
  MessageCircle,
  Phone,
  RefreshCw,
  Unlink,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppCredential {
  id: string;
  businessAccountId: string;
  businessAccountName?: string;
  phoneNumberId?: string;
  isActive: boolean;
  connectedAt?: string | null;
  connectedDevice?: string | null;
  // Additional WABA details
  accountReviewStatus?: string;
  businessType?: string;
  currency?: string;
  timezoneId?: string;
  // Owner business info
  ownerBusinessId?: string;
  ownerBusinessName?: string;
  ownerBusinessPhone?: string;
  ownerBusinessEmail?: string;
  ownerBusinessAddress?: string;
  // Phone numbers
  phoneNumbers?: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    verificationStatus: string;
    qualityScore?: string;
    messagingLimitTier?: string;
    isDefault?: boolean;
  }>;
}

interface WhatsAppConnectionStatusProps {
  organizationId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  showFullDetails?: boolean;
  className?: string;
  variant?: 'card' | 'banner' | 'inline';
}

export function WhatsAppConnectionStatus({ 
  organizationId, 
  onConnect,
  onDisconnect,
  showFullDetails = false,
  className = '',
  variant = 'card'
}: WhatsAppConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [credential, setCredential] = useState<WhatsAppCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  // Fetch WhatsApp connection status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Get the default account or first account
        const defaultAccount = data.accounts?.find((a: any) => a.isDefault) || data.accounts?.[0];
        
        if (defaultAccount) {
          setCredential({
            id: defaultAccount.id,
            businessAccountId: defaultAccount.businessAccountId,
            businessAccountName: defaultAccount.businessAccountName,
            phoneNumberId: defaultAccount.phoneNumberId,
            isActive: defaultAccount.isActive,
            connectedAt: defaultAccount.connectedAt,
            connectedDevice: defaultAccount.connectedDevice,
            // Additional WABA details
            accountReviewStatus: defaultAccount.accountReviewStatus,
            businessType: defaultAccount.businessType,
            currency: defaultAccount.currency,
            timezoneId: defaultAccount.timezoneId,
            // Owner business info
            ownerBusinessId: defaultAccount.ownerBusinessId,
            ownerBusinessName: defaultAccount.ownerBusinessName,
            ownerBusinessPhone: defaultAccount.ownerBusinessPhone,
            ownerBusinessEmail: defaultAccount.ownerBusinessEmail,
            ownerBusinessAddress: defaultAccount.ownerBusinessAddress,
            // Phone numbers
            phoneNumbers: defaultAccount.phoneNumbers
          });
        }
        setIsConnected(data.isConnected || false);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle OAuth connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/whatsapp/oauth/url');
      const data = await response.json();
      const { url, error, redirectUri } = data;

      if (error) {
        setConnectionError(error);
        setIsConnecting(false);
        return;
      }

      // Check if redirect URI is using an allowed domain
      if (redirectUri) {
        console.log('[WhatsApp Connection] Using redirect URI:', redirectUri);
      }

      const width = 600;
      const height = 700;
      const left = typeof window !== 'undefined' 
        ? window.screenX + (window.outerWidth - width) / 2 
        : 100;
      const top = typeof window !== 'undefined' 
        ? window.screenY + (window.outerHeight - height) / 2 
        : 100;

      const popup = window.open(
        url,
        'WhatsApp OAuth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (popup) {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            fetchStatus();
            if (onConnect) onConnect();
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkClosed);
        }, 5 * 60 * 1000);
      }
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to initiate connection');
      toast.error('Failed to connect WhatsApp account');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp account?')) {
      return;
    }

    setIsDisconnecting(true);

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success('WhatsApp account disconnected');
      setIsConnected(false);
      setCredential(null);
      if (onDisconnect) onDisconnect();
      fetchStatus();
    } catch (error) {
      toast.error('Failed to disconnect WhatsApp account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error types for troubleshooting
  const errorType = connectionError?.toLowerCase().includes('oauth') ? 'oauth' 
    : connectionError?.toLowerCase().includes('token') ? 'token'
    : connectionError?.toLowerCase().includes('network') ? 'network'
    : connectionError?.toLowerCase().includes('permission') ? 'permission'
    : connectionError?.toLowerCase().includes('domain') || connectionError?.toLowerCase().includes('url') ? 'domain'
    : 'general';

  const troubleshootingSteps = {
    general: [
      'Make sure you have a valid Meta Business Account',
      'Clear your browser cache and try again',
      'Contact support if the issue persists'
    ],
    domain: [
      'The app domain is not registered in Meta Developer Console',
      'Go to developers.facebook.com → Your App → Settings → Basic',
      'Add your domain to "App Domains" field (e.g., localhost:3000 or your-production-domain.com)',
      'Save changes and try connecting again'
    ],
    oauth: [
      'Ensure you are logged into a valid Meta Business Account',
      'Verify that your Business Account has WhatsApp access'
    ],
    token: [
      'Your session may have expired',
      'Try reconnecting by clicking the Connect button again'
    ],
    network: [
      'Check your internet connection',
      'Verify firewall settings are not blocking the connection'
    ],
    permission: [
      'Ensure you have admin access to the Business Account',
      'Request WhatsApp management permissions from your Business Account'
    ]
  };

  // Not connected state - prominent Connect button
  if (!isConnected) {
    // Banner variant - dark theme
    if (variant === 'banner') {
      return (
        <div className={`${className}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-zinc-800/80 border border-slate-700 backdrop-blur-sm">
            {/* WhatsApp Icon */}
            <div className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            
            {/* Status & Message */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold text-lg">WhatsApp</span>
                <Badge variant="secondary" className="bg-slate-600 text-slate-300 border-slate-500">
                  Not Connected
                </Badge>
              </div>
              <p className="text-slate-400 text-sm">
                Connect your WhatsApp Business account to start sending messages
              </p>
            </div>
            
            {/* Connect Button */}
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-lg shadow-green-600/20 shrink-0"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }
    
    // Card variant (default)
    return (
      <Card className={`border-2 ${connectionError ? 'border-red-200 bg-red-50' : 'border-gray-200'} ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  WhatsApp
                  <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                    Not Connected
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Connect your WhatsApp Business account to start sending messages
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Error display with troubleshooting */}
        {connectionError && (
          <CardContent className="pb-0 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800 text-sm">{connectionError}</p>
                <p className="text-xs text-red-600 mt-1">
                  Error: WHATSAPP_{errorType.toUpperCase()}_ERROR
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-white rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 text-sm flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4" />
                Troubleshooting
              </h4>
              <ol className="list-decimal list-inside text-xs text-red-700 space-y-1">
                {(troubleshootingSteps as any)[errorType]?.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </CardContent>
        )}
        
        <CardContent className={connectionError ? "pt-3" : ""}>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Connect WhatsApp
              </>
            )}
          </Button>
          
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
            <Shield className="w-3 h-3" />
            <span>Secure connection with Meta</span>
          </div>
          
          {showFullDetails && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/dashboard/settings/whatsapp'}
              >
                <Settings2Icon className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Connected state - show status with details
  if (variant === 'banner') {
    return (
      <div className={`${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-500/30 backdrop-blur-sm">
          {/* WhatsApp Icon - Green for connected */}
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          
          {/* Status & Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-semibold text-lg">WhatsApp</span>
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 border-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            </div>
            <p className="text-green-400/80 text-sm flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              {credential?.businessAccountName || 'WhatsApp Business'} • Connected since {formatConnectionTime(credential?.connectedAt)}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings/whatsapp'}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Phone className="w-4 h-4 mr-1" />
              Manage
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-slate-600"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-1" />
              )}
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Card variant (default) - connected
  return (
    <Card className={`border-green-200 bg-green-50/30 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                WhatsApp
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </CardTitle>
              <CardDescription className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Successfully configured
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-1" />
              )}
              Disconnect
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Business Account */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <Building2Icon className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm text-gray-500">Business Account</p>
            <p className="font-medium">{credential?.businessAccountName || 'WhatsApp Business'}</p>
          </div>
        </div>
        
        {/* Account Status */}
        {credential?.accountReviewStatus && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
            <Shield className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Account Status</p>
              <Badge variant={credential.accountReviewStatus === 'approved' ? 'default' : 'secondary'}>
                {credential.accountReviewStatus}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Phone Numbers Summary */}
        {credential?.phoneNumbers && credential.phoneNumbers.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
            <Phone className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Phone Numbers</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {credential.phoneNumbers.slice(0, 3).map((phone, idx) => (
                  <Badge key={phone.id || idx} variant="outline" className="text-xs">
                    {phone.displayName}
                    {phone.qualityScore && <span className={`ml-1 ${phone.qualityScore === 'GREEN' ? 'text-green-600' : phone.qualityScore === 'YELLOW' ? 'text-yellow-600' : 'text-red-600'}`}>
                      ({phone.qualityScore})
                    </span>}
                  </Badge>
                ))}
                {credential.phoneNumbers.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{credential.phoneNumbers.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Connection timestamp */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
          <Clock className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm text-gray-500">Connected Since</p>
            <p className="font-medium">{formatConnectionTime(credential?.connectedAt)}</p>
          </div>
        </div>

        {/* Connection Type */}
        {credential?.connectedDevice && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
            <Monitor className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Connection Type</p>
              <p className="font-medium">{credential.connectedDevice}</p>
            </div>
          </div>
        )}

        {showFullDetails && (
          <>
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => window.location.href = '/dashboard/settings/whatsapp'}
            >
              <Phone className="w-4 h-4 mr-2" />
              Manage Phone Numbers
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Simple icon components to avoid additional imports
function Settings2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function Building2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

export default WhatsAppConnectionStatus;
