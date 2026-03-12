'use client';

import { useState } from 'react';
import { 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorSolution {
  title: string;
  steps: string[];
}

export interface WhatsAppError {
  code?: string;
  message: string;
  solution?: ErrorSolution;
}

export const WHATSAPP_ERRORS: Record<string, WhatsAppError> = {
  'INVALID_ACCESS_TOKEN': {
    message: 'Invalid Access Token',
    solution: {
      title: 'How to fix:',
      steps: [
        'Go to Meta Business Manager (business.facebook.com)',
        'Navigate to WhatsApp → Settings',
        'Click "Generate Token" or create a System User token',
        'Copy the permanent access token',
        'Re-enter the credentials with the new token'
      ]
    }
  },
  'TOKEN_EXPIRED': {
    message: 'Access Token Expired',
    solution: {
      title: 'How to fix:',
      steps: [
        'Your token has expired and needs to be refreshed',
        'Click "Refresh Token" in your settings',
        'Or reconnect your account via OAuth'
      ]
    }
  },
  'NO_WHATSAPP_BUSINESS_ACCOUNT': {
    message: 'No WhatsApp Business Account Found',
    solution: {
      title: 'How to fix:',
      steps: [
        'You need to create a WhatsApp Business Account',
        'Go to business.facebook.com',
        'Create or use an existing Business Manager',
        'Go to WhatsApp Accounts → Create WhatsApp Account',
        'Follow the steps to set up your business profile',
        'Return here and try connecting again'
      ]
    }
  },
  'PHONE_NUMBER_NOT_VERIFIED': {
    message: 'Phone Number Not Verified',
    solution: {
      title: 'How to fix:',
      steps: [
        'Check your WhatsApp for a verification code',
        'Enter the code in Meta Business Manager',
        'Or request a new verification code',
        'Wait for WhatsApp to verify your number'
      ]
    }
  },
  'PERMISSION_DENIED': {
    message: 'Permission Denied',
    solution: {
      title: 'How to fix:',
      steps: [
        'Your account lacks required permissions',
        'Reconnect via OAuth with full permissions',
        'Ensure you have whatsapp_business_management permission',
        'Contact your Business Manager admin'
      ]
    }
  },
  'RATE_LIMIT_EXCEEDED': {
    message: 'Rate Limit Exceeded',
    solution: {
      title: 'How to fix:',
      steps: [
        'You have sent too many requests',
        'Wait 24 hours before trying again',
        'Consider upgrading your messaging tier',
        'Implement rate limiting in your campaigns'
      ]
    }
  },
  'PHONE_NUMBER_NOT_FOUND': {
    message: 'Phone Number Not Found',
    solution: {
      title: 'How to fix:',
      steps: [
        'The Phone Number ID may be incorrect',
        'Go to Meta Business Manager → WhatsApp → Phone Numbers',
        'Copy the correct Phone Number ID',
        'Update your credentials with the correct ID'
      ]
    }
  },
  'WEBHOOK_ERROR': {
    message: 'Webhook Configuration Error',
    solution: {
      title: 'How to fix:',
      steps: [
        'Go to Meta App Dashboard',
        'Navigate to WhatsApp → Configuration → Webhooks',
        'Verify your webhook URL is correct',
        'Ensure the verify token matches',
        'Subscribe to required fields'
      ]
    }
  }
};

export interface ErrorDisplayProps {
  errorCode?: string;
  errorMessage?: string;
  onTryAgain?: () => void;
  onUseManualSetup?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export function ErrorDisplay({
  errorCode,
  errorMessage,
  onTryAgain,
  onUseManualSetup,
  onContactSupport,
  className
}: ErrorDisplayProps) {
  // Try to find error in known errors
  const knownError = errorCode ? WHATSAPP_ERRORS[errorCode] : null;
  const displayMessage = errorMessage || knownError?.message || 'An unexpected error occurred';
  const solution = knownError?.solution;

  return (
    <Card className={cn("border-2 border-red-200 bg-red-50", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-red-800">
          <XCircle className="w-6 h-6" />
          Connection Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Reason */}
        <div className="p-4 bg-white rounded-lg border border-red-200">
          <p className="text-sm font-semibold text-gray-600 mb-2">Reason:</p>
          <p className="text-lg font-medium text-red-800">{displayMessage}</p>
          {errorCode && (
            <p className="text-xs text-gray-400 mt-2">Error code: {errorCode}</p>
          )}
        </div>

        {/* Solution */}
        {solution && (
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-gray-600 mb-3">{solution.title}</p>
            <ol className="space-y-2">
              {solution.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-medium text-red-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {onTryAgain && (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={onTryAgain}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onUseManualSetup && (
            <Button 
              variant="outline"
              onClick={onUseManualSetup}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Use Manual Setup
            </Button>
          )}
          {onContactSupport && (
            <Button 
              variant="ghost"
              onClick={onContactSupport}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          )}
        </div>

        {/* Help Link */}
        <div className="pt-4 border-t border-red-200">
          <a
            href="https://developers.facebook.com/docs/whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            View WhatsApp API Documentation
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified error banner for inline use
export function ErrorBanner({
  message,
  onDismiss,
  className
}: {
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border bg-red-50 border-red-200",
      className
    )}>
      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ErrorDisplay;
