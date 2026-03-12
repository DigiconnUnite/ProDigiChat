'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronDown, 
  ExternalLink,
  Settings,
  RefreshCw,
  Phone,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface WhatsAppStatus {
  isConnected: boolean;
  accountName?: string;
  phoneNumber?: string;
  qualityRating?: string;
  messagingTier?: string;
  isTokenExpiring?: boolean;
  daysUntilExpiry?: number;
  error?: string;
}

export interface WhatsAppStatusIndicatorProps {
  organizationId: string;
  onConnect?: () => void;
  onViewSettings?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function WhatsAppStatusIndicator({
  organizationId,
  onConnect,
  onViewSettings,
  onRefresh,
  className
}: WhatsAppStatusIndicatorProps) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        const accounts = data.accounts || [];
        const defaultAccount = accounts.find((a: any) => a.isDefault) || accounts[0];
        
        if (defaultAccount) {
          const defaultPhone = defaultAccount.phoneNumbers?.find((p: any) => p.isDefault) || defaultAccount.phoneNumbers?.[0];
          
          // Check if token is expiring
          const tokenExpiry = defaultAccount.tokenExpiresAt;
          let isTokenExpiring = false;
          let daysUntilExpiry: number | undefined;
          
          if (tokenExpiry) {
            const expiryDate = new Date(tokenExpiry);
            const now = new Date();
            const diffTime = expiryDate.getTime() - now.getTime();
            daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isTokenExpiring = daysUntilExpiry <= 7;
          }

          setStatus({
            isConnected: defaultAccount.isActive,
            accountName: defaultAccount.accountName,
            phoneNumber: defaultPhone?.phoneNumber || defaultPhone?.displayName,
            qualityRating: defaultPhone?.qualityRating || defaultAccount.qualityRating,
            messagingTier: defaultPhone?.messagingLimitTier,
            isTokenExpiring,
            daysUntilExpiry
          });
        } else {
          setStatus({ isConnected: false });
        }
      } else {
        setStatus({ isConnected: false });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setStatus({ isConnected: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5", className)}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!status?.isConnected) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onConnect}
        className={cn("flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/10", className)}
      >
        <XCircle className="w-4 h-4 text-gray-400" />
        <span className="text-xs">Connect WhatsApp</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 hover:bg-white/10",
            status.isTokenExpiring ? "text-yellow-400" : "text-green-400",
            className
          )}
        >
          <div className="relative">
            {status.isTokenExpiring ? (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs hidden md:inline">
            {status.isTokenExpiring ? 'Reconnect' : 'WhatsApp'}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            {status.isTokenExpiring ? (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="font-semibold text-sm">
              {status.isTokenExpiring ? 'Token Expiring Soon' : 'WhatsApp Connected'}
            </span>
          </div>
          {status.isTokenExpiring && status.daysUntilExpiry !== undefined && (
            <p className="text-xs text-yellow-600 mt-1">
              Token expires in {status.daysUntilExpiry} days
            </p>
          )}
        </div>

        {/* Account Info */}
        <div className="px-3 py-2 space-y-2">
          {status.accountName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Account</span>
              <span className="text-sm font-medium">{status.accountName}</span>
            </div>
          )}
          
          {status.phoneNumber && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Phone
              </span>
              <span className="text-sm font-mono">{status.phoneNumber}</span>
            </div>
          )}

          {status.qualityRating && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Quality
              </span>
              <span className={cn(
                "text-sm font-medium",
                status.qualityRating === 'High' && "text-green-600",
                status.qualityRating === 'Medium' && "text-yellow-600",
                status.qualityRating === 'Low' && "text-red-600"
              )}>
                {status.qualityRating}
              </span>
            </div>
          )}

          {status.messagingTier && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Tier
              </span>
              <span className="text-sm">{status.messagingTier}</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        {status.isTokenExpiring && (
          <DropdownMenuItem onClick={onRefresh} className="cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Token
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onViewSettings} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          View Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => window.open('https://business.facebook.com', '_blank')}
          className="cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Business Manager
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simplified version for inline use
export function WhatsAppStatusBadge({
  status,
  className
}: {
  status: WhatsAppStatus;
  className?: string;
}) {
  if (!status.isConnected) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs",
        className
      )}>
        <XCircle className="w-3 h-3" />
        <span>Disconnected</span>
      </div>
    );
  }

  if (status.isTokenExpiring) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs",
        className
      )}>
        <AlertCircle className="w-3 h-3" />
        <span>Reconnect Required</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs",
      className
    )}>
      <CheckCircle className="w-3 h-3" />
      <span>Connected</span>
    </div>
  );
}

export default WhatsAppStatusIndicator;
