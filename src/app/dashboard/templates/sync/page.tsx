'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TemplateSyncStatus, Template } from '@/components/whatsapp/TemplateSyncStatus';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, FileText } from 'lucide-react';
import Link from 'next/link';

function TemplateSyncContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('orgId') || 'default';
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | undefined>();

  useEffect(() => {
    fetchTemplates();
  }, [organizationId]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/templates?orgId=${organizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        const templateList = (data.templates || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          status: t.status as 'approved' | 'pending' | 'rejected',
          language: t.language,
          updatedAt: t.updatedAt
        }));
        
        setTemplates(templateList);
        setLastSynced(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/templates/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    // Navigate to campaign creation with template
    router.push(`/dashboard/campaigns/new?template=${template.id}`);
  };

  const handleViewTemplate = (template: Template) => {
    // Show template details modal or navigate
    console.log('View template:', template);
  };

  const approvedCount = templates.filter(t => t.status === 'approved').length;
  const pendingCount = templates.filter(t => t.status === 'pending').length;
  const rejectedCount = templates.filter(t => t.status === 'rejected').length;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href="/dashboard/templates"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Templates
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📋 Template Sync
          </h1>
          <p className="text-gray-600 mt-1">
            Sync and manage your WhatsApp message templates
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard/templates/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Status */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Templates Found
          </h3>
          <p className="text-gray-500 mb-4">
            Sync templates from your WhatsApp Business Account or create new ones
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Sync Templates
            </Button>
            <Link href="/dashboard/templates/new">
              <Button className="bg-green-600 hover:bg-green-700">
                Create Template
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <TemplateSyncStatus
          templates={templates}
          lastSynced={lastSynced}
          onSync={handleSync}
          onUseTemplate={handleUseTemplate}
          onViewTemplate={handleViewTemplate}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

function TemplateSyncLoading() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </div>
  );
}

export default function TemplateSyncPage() {
  return (
    <Suspense fallback={<TemplateSyncLoading />}>
      <TemplateSyncContent />
    </Suspense>
  );
}
