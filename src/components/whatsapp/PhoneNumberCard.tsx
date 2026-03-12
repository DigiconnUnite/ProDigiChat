'use client';

import { 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Shield,
  Settings,
  Copy,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface PhoneNumberData {
  id: string;
  displayName: string;
  phoneNumber: string;
  verificationStatus: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'FLAGGED';
  qualityScore?: string;
  qualityRating?: string;
  messagingLimitTier?: string;
  phoneNumberStatus?: string;
  nameStatus?: string;
  isDefault?: boolean;
}

export interface PhoneNumberCardProps {
  phoneNumber: PhoneNumberData;
  onSetDefault?: () => void;
  onVerify?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PhoneNumberCard({
  phoneNumber,
  onSetDefault,
  onVerify,
  onRefresh,
  isLoading,
  className
}: PhoneNumberCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'PENDING': return 'bg-gray-400';
      case 'FLAGGED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'PENDING': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      case 'FLAGGED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getQualityColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isVerified = phoneNumber.verificationStatus === 'VERIFIED';
  const isFlagged = phoneNumber.verificationStatus === 'FLAGGED';

  return (
    <Card className={cn(
      "border-2 transition-all",
      isVerified && "border-green-200 bg-green-50/50",
      isFlagged && "border-red-200 bg-red-50/50",
      !isVerified && !isFlagged && "border-gray-200",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Left Side - Phone Info */}
          <div className="flex items-start gap-4">
            {/* Status Indicator */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isVerified && "bg-green-100",
              isFlagged && "bg-red-100",
              !isVerified && !isFlagged && "bg-gray-100"
            )}>
              <Phone className={cn(
                "w-5 h-5",
                isVerified && "text-green-600",
                isFlagged && "text-red-600",
                !isVerified && !isFlagged && "text-gray-500"
              )} />
            </div>

            {/* Details */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {phoneNumber.displayName}
                </h3>
                {phoneNumber.isDefault && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Default
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-500 font-mono mt-1">
                {phoneNumber.phoneNumber}
              </p>

              {/* Verification Status */}
              <div className="flex items-center gap-2 mt-2">
                {getStatusIcon(phoneNumber.verificationStatus)}
                <span className={cn(
                  "text-sm font-medium",
                  isVerified && "text-green-700",
                  isFlagged && "text-red-700",
                  !isVerified && !isFlagged && "text-gray-600"
                )}>
                  {phoneNumber.verificationStatus === 'VERIFIED' && 'Verified'}
                  {phoneNumber.verificationStatus === 'IN_PROGRESS' && 'Verification In Progress'}
                  {phoneNumber.verificationStatus === 'PENDING' && 'Pending Verification'}
                  {phoneNumber.verificationStatus === 'FLAGGED' && 'Flagged'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Actions & Metrics */}
          <div className="flex items-center gap-3">
            {/* Metrics */}
            <div className="text-right hidden md:block">
              {phoneNumber.messagingLimitTier && (
                <p className="text-xs text-gray-500">
                  Tier: {phoneNumber.messagingLimitTier}
                </p>
              )}
              {phoneNumber.qualityRating && (
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <div className={cn("w-2 h-2 rounded-full", getQualityColor(phoneNumber.qualityRating))} />
                  <span className="text-xs text-gray-600">
                    {phoneNumber.qualityRating}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
              )}

              {!phoneNumber.isDefault && onSetDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSetDefault}
                >
                  Set Default
                </Button>
              )}

              {!isVerified && onVerify && phoneNumber.verificationStatus === 'PENDING' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={onVerify}
                >
                  Verify
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => copyToClipboard(phoneNumber.phoneNumber)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Phone Number
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyToClipboard(phoneNumber.id)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy ID
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Additional Info Row */}
        {(phoneNumber.nameStatus || phoneNumber.phoneNumberStatus) && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
            {phoneNumber.nameStatus && (
              <Badge variant="outline" className="text-xs">
                Name: {phoneNumber.nameStatus}
              </Badge>
            )}
            {phoneNumber.phoneNumberStatus && (
              <Badge variant="outline" className="text-xs">
                Status: {phoneNumber.phoneNumberStatus}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PhoneNumberCard;
