'use client';

import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Phone, 
  Building2, 
  Clock,
  Shield,
  Activity,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface WhatsAppAccountInfo {
  id: string;
  accountName: string;
  businessAccountId: string;
  businessAccountName?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  phoneNumberDisplayName?: string;
  accountStatus?: string;
  messagingTier?: string;
  qualityRating?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
}

export interface AccountInfoCardProps {
  account: WhatsAppAccountInfo;
  onTestMessage?: () => void;
  onViewSettings?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function AccountInfoCard({
  account,
  onTestMessage,
  onViewSettings,
  onRefresh,
  isRefreshing,
  className
}: AccountInfoCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add toast notification here
  };

  const getQualityColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityIcon = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case 'high': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card className={cn("border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {account.accountName}
                <Badge className="bg-green-600">Connected</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                {account.businessAccountName || 'WhatsApp Business Account'}
              </p>
            </div>
          </div>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <Activity className={cn("w-4 h-4 mr-1", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Main Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Business Name */}
          <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Name
            </p>
            <p className="font-semibold text-lg mt-1">
              {account.businessAccountName || account.accountName}
            </p>
          </div>

          {/* Phone Number */}
          {account.phoneNumber && (
            <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </p>
              <p className="font-semibold text-lg mt-1">
                {account.phoneNumberDisplayName || account.phoneNumber}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                {account.phoneNumber}
              </p>
            </div>
          )}

          {/* WABA ID */}
          <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              WABA ID
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-sm">{account.businessAccountId}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(account.businessAccountId)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Phone Number ID */}
          {account.phoneNumberId && (
            <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number ID
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono text-sm">{account.phoneNumberId}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(account.phoneNumberId!)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Account Status */}
          <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Account Status
            </p>
            <Badge 
              variant={account.accountStatus === 'approved' ? 'default' : 'secondary'}
              className="mt-1"
            >
              {getQualityIcon(account.accountStatus)}
              <span className="ml-1">{account.accountStatus || 'Active'}</span>
            </Badge>
          </div>

          {/* Connected Since */}
          {account.connectedAt && (
            <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Connected Since
              </p>
              <p className="font-semibold text-sm mt-1">
                {formatDate(account.connectedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Metrics Row */}
        {(account.messagingTier || account.qualityRating) && (
          <>
            <Separator className="mb-6" />
            <div className="flex flex-wrap gap-4">
              {/* Messaging Tier */}
              {account.messagingTier && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Tier: {account.messagingTier}
                  </span>
                </div>
              )}

              {/* Quality Rating */}
              {account.qualityRating && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
                  <div className={cn("w-3 h-3 rounded-full", getQualityColor(account.qualityRating))} />
                  <span className="text-sm font-medium">
                    Quality: {account.qualityRating}
                  </span>
                  {getQualityIcon(account.qualityRating)}
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <Separator className="mt-6" />
        <div className="flex flex-wrap gap-3 mt-4">
          {onViewSettings && (
            <Button variant="outline" onClick={onViewSettings}>
              View in Settings
            </Button>
          )}
          {onTestMessage && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onTestMessage}
            >
              Send Test Message
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AccountInfoCard;
