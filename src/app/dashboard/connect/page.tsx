'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmbeddedSignupCard, ManualCredentialCard } from '@/components/whatsapp/ConnectionCard';
import { ManualCredentialForm, ManualCredentialFormData } from '@/components/whatsapp/ManualCredentialForm';
import { OAuthProgressStepper, OAuthStep } from '@/components/whatsapp/OAuthProgressStepper';
import { AccountInfoCard, WhatsAppAccountInfo } from '@/components/whatsapp/AccountInfoCard';
import { ErrorDisplay } from '@/components/whatsapp/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Settings, 
  Link2, 
  MessageSquare, 
  Shield,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

type ConnectPageState = 'entry' | 'connecting' | 'success' | 'error';

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<ConnectPageState>('entry');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState<OAuthStep>('idle');
  const [organizationId, setOrganizationId] = useState<string>('');

  // Check for existing connection and URL params
  useEffect(() => {
    const orgId = searchParams.get('orgId') || 'default';
    setOrganizationId(orgId);

    const status = searchParams.get('status');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (status === 'success') {
      setPageState('success');
    } else if (status === 'error' || error) {
      setPageState('error');
      setConnectionError(message || error || 'Connection failed');
      setErrorCode(searchParams.get('errorCode') || undefined);
    }
  }, [searchParams]);

  // Handle OAuth connection
  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setPageState('connecting');
    setCurrentStep('login_facebook');

    try {
      // Get OAuth URL
      const response = await fetch(`/api/whatsapp/oauth/url?orgId=${organizationId}`);
      const data = await response.json();

      if (data.error) {
        setConnectionError(data.error);
        setErrorCode(data.code);
        setPageState('error');
        return;
      }

      if (!data.url) {
        setConnectionError('Failed to generate OAuth URL');
        setPageState('error');
        return;
      }

      // Simulate progress steps (actual progress happens via callback)
      setCurrentStep('select_business');
      
      // Store org ID for callback
      sessionStorage.setItem('wa_oauth_orgId', organizationId);
      
      // Redirect to Meta
      window.location.href = data.url;
    } catch (error: any) {
      console.error('OAuth error:', error);
      setConnectionError(error.message || 'Failed to connect');
      setPageState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual credential connection
  const handleManualConnect = async (data: ManualCredentialFormData) => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          config: {
            apiKey: data.accessToken,
            phoneNumberId: data.phoneNumberId,
            businessAccountId: data.businessAccountId,
            webhookSecret: data.webhookVerifyToken
          },
          accountName: `Manual Account ${Date.now()}`
        })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to connect');
      }

      setPageState('success');
    } catch (error: any) {
      console.error('Manual connection error:', error);
      setConnectionError(error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setPageState('entry');
    setConnectionError(null);
    setErrorCode(undefined);
  };

  // Loading state
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Entry state - show connection options
  if (pageState === 'entry') {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Back Link */}
        <Link 
          href="/dashboard/settings?tab=whatsapp"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect Your WhatsApp Business Account
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose how you want to connect your WhatsApp Business Account. 
            We recommend using Meta Embedded Signup for the easiest setup.
          </p>
        </div>

        {/* Connection Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Embedded Signup (Recommended) */}
          <div onClick={() => !isLoading && handleOAuthConnect()}>
            <EmbeddedSignupCard
              onClick={handleOAuthConnect}
              isLoading={isLoading}
            />
          </div>

          {/* Manual Setup */}
          <div className="space-y-4">
            <ManualCredentialCard
              onClick={() => {}}
              isLoading={false}
            />
          </div>
        </div>

        {/* Already Connected? */}
        <div className="text-center">
          <Link 
            href="/dashboard/settings?tab=whatsapp"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Settings className="w-4 h-4" />
            Already connected? View your accounts
          </Link>
        </div>
      </div>
    );
  }

  // Connecting state - show progress
  if (pageState === 'connecting') {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-8 pb-8">
            <OAuthProgressStepper
              currentStep={currentStep}
              onCancel={() => setPageState('entry')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show account info
  if (pageState === 'success') {
    // In real implementation, fetch account details
    const mockAccount: WhatsAppAccountInfo = {
      id: '1',
      accountName: 'WhatsApp Business',
      businessAccountId: '123456789',
      businessAccountName: 'My Business',
      phoneNumber: '+91 9876543210',
      phoneNumberDisplayName: '+91 9876543210',
      accountStatus: 'approved',
      qualityRating: 'High',
      messagingTier: 'Tier 1 (1,000/day)',
      connectedAt: new Date().toISOString()
    };

    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="border-2 border-green-500 bg-green-50/50">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800">
                WhatsApp Account Connected! ✅
              </h2>
              <p className="text-green-700 mt-2">
                Your WhatsApp Business Account has been successfully connected.
              </p>
            </div>

            <AccountInfoCard
              account={mockAccount}
              onViewSettings={() => router.push('/dashboard/settings?tab=whatsapp')}
              onTestMessage={() => router.push('/dashboard/testing')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - show error with solutions
  if (pageState === 'error') {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Back Link */}
        <Link 
          href="/dashboard/connect"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Connection Options
        </Link>

        <ErrorDisplay
          errorCode={errorCode}
          errorMessage={connectionError || undefined}
          onTryAgain={handleRetry}
          onUseManualSetup={() => {}}
          onContactSupport={() => {}}
        />
      </div>
    );
  }

  return null;
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  );
}
