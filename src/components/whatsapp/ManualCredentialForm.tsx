'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Key, 
  Phone, 
  Building2, 
  Webhook, 
  Eye, 
  EyeOff, 
  Loader2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ManualCredentialFormData {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  businessManagerId?: string;
  webhookVerifyToken?: string;
}

export interface ManualCredentialFormProps {
  onSubmit: (data: ManualCredentialFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function ManualCredentialForm({
  onSubmit,
  isLoading,
  error,
  className
}: ManualCredentialFormProps) {
  const [formData, setFormData] = useState<ManualCredentialFormData>({
    businessAccountId: '',
    phoneNumberId: '',
    accessToken: '',
    businessManagerId: '',
    webhookVerifyToken: ''
  });
  const [showToken, setShowToken] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ManualCredentialFormData, string>>>({});
  const [showHelp, setShowHelp] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ManualCredentialFormData, string>> = {};

    if (!formData.businessAccountId.trim()) {
      newErrors.businessAccountId = 'WhatsApp Business Account ID is required';
    }
    if (!formData.phoneNumberId.trim()) {
      newErrors.phoneNumberId = 'Phone Number ID is required';
    }
    if (!formData.accessToken.trim()) {
      newErrors.accessToken = 'Access Token is required';
    } else if (formData.accessToken.length < 50) {
      newErrors.accessToken = 'Access Token seems too short. Please check.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (field: keyof ManualCredentialFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Connect WhatsApp Account Manually
        </CardTitle>
        <CardDescription>
          Enter your WhatsApp API credentials to connect your existing account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Connection Failed</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Business Account ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="businessAccountId">
                WhatsApp Business Account ID <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowHelp(showHelp === 'waba' ? null : 'waba')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                Where to find?
              </button>
            </div>
            {showHelp === 'waba' && (
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                Go to <strong>Meta Business Manager</strong> → <strong>WhatsApp Accounts</strong> → 
                Your WABA → Copy the <strong>Account ID</strong> from the URL or settings.
              </div>
            )}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessAccountId"
                value={formData.businessAccountId}
                onChange={(e) => handleChange('businessAccountId', e.target.value)}
                placeholder="e.g., 1029384756"
                className={cn("pl-10 font-mono", errors.businessAccountId && "border-red-500")}
                disabled={isLoading}
              />
            </div>
            {errors.businessAccountId && (
              <p className="text-xs text-red-500">{errors.businessAccountId}</p>
            )}
          </div>

          {/* Phone Number ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="phoneNumberId">
                Phone Number ID <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowHelp(showHelp === 'phone' ? null : 'phone')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                Where to find?
              </button>
            </div>
            {showHelp === 'phone' && (
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                Go to <strong>Meta Business Manager</strong> → <strong>WhatsApp Accounts</strong> → 
                <strong>Phone Numbers</strong> → Copy the <strong>Phone Number ID</strong>.
              </div>
            )}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phoneNumberId"
                value={formData.phoneNumberId}
                onChange={(e) => handleChange('phoneNumberId', e.target.value)}
                placeholder="e.g., 991957080667897"
                className={cn("pl-10 font-mono", errors.phoneNumberId && "border-red-500")}
                disabled={isLoading}
              />
            </div>
            {errors.phoneNumberId && (
              <p className="text-xs text-red-500">{errors.phoneNumberId}</p>
            )}
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="accessToken">
                Permanent Access Token <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowHelp(showHelp === 'token' ? null : 'token')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                How to get?
              </button>
            </div>
            {showHelp === 'token' && (
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-2">
                <p><strong>To generate a permanent token:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Business Manager</a></li>
                  <li>Navigate to WhatsApp → Settings</li>
                  <li>Click "Generate Token" or "Create System User Token"</li>
                  <li>Copy the permanent access token</li>
                </ol>
              </div>
            )}
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="accessToken"
                type={showToken ? "text" : "password"}
                value={formData.accessToken}
                onChange={(e) => handleChange('accessToken', e.target.value)}
                placeholder="Enter your permanent access token"
                className={cn(
                  "pl-10 pr-20 font-mono text-sm",
                  errors.accessToken && "border-red-500"
                )}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            {errors.accessToken && (
              <p className="text-xs text-red-500">{errors.accessToken}</p>
            )}
          </div>

          <Separator />

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Manager ID */}
            <div className="space-y-2">
              <Label htmlFor="businessManagerId">
                Business Manager ID (Optional)
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="businessManagerId"
                  value={formData.businessManagerId}
                  onChange={(e) => handleChange('businessManagerId', e.target.value)}
                  placeholder="e.g., 123456789012345"
                  className="pl-10 font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Webhook Verify Token */}
            <div className="space-y-2">
              <Label htmlFor="webhookVerifyToken">
                Webhook Verify Token (Optional)
              </Label>
              <div className="relative">
                <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="webhookVerifyToken"
                  value={formData.webhookVerifyToken}
                  onChange={(e) => handleChange('webhookVerifyToken', e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="pl-10 font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600">
                All fields marked with <span className="text-red-500">*</span> are required. 
                The optional fields will be auto-detected when possible. 
                Your credentials are encrypted and stored securely.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connect Account
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ManualCredentialForm;
