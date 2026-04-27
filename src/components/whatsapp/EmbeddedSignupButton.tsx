'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface EmbeddedSignupButtonProps {
  organizationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

type SignupStep = 'idle' | 'init' | 'oauth' | 'processing' | 'complete' | 'error';

export function EmbeddedSignupButton({
  organizationId,
  onSuccess,
  onError,
  className = ''
}: EmbeddedSignupButtonProps) {
  const [step, setStep] = useState<SignupStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const handleConnect = async () => {
    setStep('init');
    setErrorMessage('');
    setProgress(10);

    try {
      // Step 1: Initialize embedded signup
      const initResponse = await fetch('/api/whatsapp/oauth/url?embedded=true');
      const { url, state, error: initError } = await initResponse.json();

      if (initError) {
        throw new Error(initError);
      }

      if (!url) {
        throw new Error('Failed to generate OAuth URL');
      }

      setStep('oauth');
      setProgress(20);

      // Store state for verification
      sessionStorage.setItem('whatsapp_oauth_state', state);
      sessionStorage.setItem('whatsapp_oauth_org', organizationId);

      // Open OAuth in popup window
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
        'WhatsApp Connect',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for popup closure
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          await handleOAuthComplete();
        }
      }, 1000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (step !== 'complete') {
          setStep('error');
          setErrorMessage('Connection timed out. Please try again.');
        }
      }, 10 * 60 * 1000);

    } catch (error: any) {
      console.error('Embedded signup error:', error);
      setStep('error');
      setErrorMessage(error.message || 'Failed to start connection');
      onError?.(error.message);
      toast.error('Failed to connect WhatsApp account');
    }
  };

  const handleOAuthComplete = async () => {
    setStep('processing');
    setProgress(50);

    try {
      // Check status via API
      const statusResponse = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);
      const statusData = await statusResponse.json();

      if (statusData.isConnected || (statusData.accounts && statusData.accounts.length > 0)) {
        setStep('complete');
        setProgress(100);
        onSuccess?.();
        toast.success('WhatsApp account connected successfully!');
      } else {
        throw new Error(statusData.error || 'Connection not completed');
      }
    } catch (error: any) {
      console.error('OAuth completion error:', error);
      setStep('error');
      setErrorMessage(error.message || 'Failed to complete connection');
      onError?.(error.message);
    }
  };

  // Render different states
  if (step === 'idle') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Connect WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your WhatsApp Business account to start sending messages. 
            We'll automatically handle business verification and phone number setup.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Automatic Business Account creation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Phone number verification</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Webhook setup</span>
            </div>
          </div>

          <Button 
            onClick={handleConnect}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            Connect with Meta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'oauth') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Connecting WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">
                Please complete the connection in the popup window...
              </p>
              <p className="text-sm text-gray-500">
                If the popup doesn't appear, please check your browser's popup blocker.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'processing') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-sm">Setting up your WhatsApp account...</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Connecting to Meta</p>
              <p>• Fetching account details</p>
              <p>• Setting up webhooks</p>
              <p>• Saving credentials</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Connected!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-green-100 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">WhatsApp connected successfully!</p>
              <p className="text-sm text-green-600">You can now send messages to your customers.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Connection Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Troubleshooting:</p>
            <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
              <li>Make sure you're logged into a valid Meta Business Account</li>
              <li>Verify that your Business Account has WhatsApp access</li>
              <li>Check that popups are allowed for this site</li>
            </ul>
          </div>

          <Button 
            onClick={() => setStep('idle')}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default EmbeddedSignupButton;
