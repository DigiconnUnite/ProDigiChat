'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PhoneNumberCard, PhoneNumberData } from '@/components/whatsapp/PhoneNumberCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, RefreshCw, Loader2, Phone } from 'lucide-react';
import Link from 'next/link';

function PhoneNumbersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('orgId') || 'default';
  
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPhoneNumbers();
  }, [organizationId]);

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/whatsapp?orgId=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        const accounts = data.accounts || [];
        
        // Collect all phone numbers from all accounts
        const allPhoneNumbers: PhoneNumberData[] = [];
        accounts.forEach((account: any) => {
          if (account.phoneNumbers && account.phoneNumbers.length > 0) {
            allPhoneNumbers.push(...account.phoneNumbers.map((p: any) => ({
              id: p.id,
              displayName: p.displayName,
              phoneNumber: p.phoneNumber,
              verificationStatus: p.verificationStatus,
              qualityScore: p.qualityScore,
              qualityRating: p.qualityRating,
              messagingLimitTier: p.messagingLimitTier,
              phoneNumberStatus: p.phoneNumberStatus,
              nameStatus: p.nameStatus,
              isDefault: p.isDefault
            })));
          }
        });
        
        setPhoneNumbers(allPhoneNumbers);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (phoneNumberId: string) => {
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'setDefault',
          phoneNumberId
        })
      });

      if (response.ok) {
        fetchPhoneNumbers();
      }
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger account refresh
      const response = await fetch('/api/whatsapp/accounts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });

      if (response.ok) {
        await fetchPhoneNumbers();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const verifiedCount = phoneNumbers.filter(p => p.verificationStatus === 'VERIFIED').length;
  const pendingCount = phoneNumbers.filter(p => p.verificationStatus === 'PENDING').length;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href="/dashboard/settings?tab=whatsapp"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to WhatsApp Settings
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📱 Phone Numbers
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your WhatsApp Business phone numbers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{phoneNumbers.length}</p>
              <p className="text-sm text-gray-500">Total Numbers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-700">{verifiedCount}</p>
              <p className="text-sm text-green-600">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone Numbers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Phone Numbers
            </h3>
            <p className="text-gray-500 mb-4">
              Connect a WhatsApp Business Account to see phone numbers
            </p>
            <Link href="/dashboard/connect">
              <Button className="bg-green-600 hover:bg-green-700">
                Connect Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {phoneNumbers.map((phoneNumber) => (
            <PhoneNumberCard
              key={phoneNumber.id}
              phoneNumber={phoneNumber}
              onSetDefault={() => handleSetDefault(phoneNumber.id)}
              onRefresh={handleRefresh}
              isLoading={isRefreshing}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneNumbersLoading() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </div>
  );
}

export default function PhoneNumbersPage() {
  return (
    <Suspense fallback={<PhoneNumbersLoading />}>
      <PhoneNumbersContent />
    </Suspense>
  );
}
